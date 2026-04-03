import express from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const app = express();
app.use(express.json());
app.use(cors());

// --- API ROUTES ---

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * ENDPOINT DE INTEGRAÇÃO SMARTCARTÃO (PagiXyPay billing)
 * Agora cria uma ASSINATURA e uma FATURA inicial.
 */
app.post("/api/clients", async (req, res) => {
  const { id: scUserId, name, email, document, amount, password } = req.body;
  
  if (!email || !name) return res.status(400).json({ error: "Email/Name required" });

  try {
    // 1. Resolve Empresa (Multi-tenant)
    const { data: company } = await supabaseAdmin.from('companies').select('id').limit(1).single();
    const companyId = company?.id;

    if (!companyId) throw new Error("No company found");

    // 2. Sincronização de Usuário (Auth)
    let userId: string | undefined;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || 'Mudar@123',
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (authError) {
      // Se usuário já existe, buscamos o ID para vincular
      if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already exists')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = (listData?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        userId = existingAuthUser?.id;
        
        // Se temos uma senha nova do SmartCartão, atualizamos no Portal
        if (userId && password) {
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        }
      } else {
        throw authError;
      }
    } else {
      userId = authData.user?.id;
    }

    // Garantir perfil (profiles) existe para o login funcionar
    if (userId) {
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        company_id: companyId,
        full_name: name,
        role: 'client'
      });
    }

      // 3. Cliente Sync
      let { data: client, error: cErr } = await supabaseAdmin
        .from('clients')
        .select('id, user_id, notes')
        .eq('company_id', companyId)
        .eq('email', email)
        .maybeSingle();

      if (cErr) throw cErr;

      const clientNotes = `sc_id:${scUserId}`;

      if (!client) {
        const { data: newClient, error: insertErr } = await supabaseAdmin
          .from('clients')
          .insert({
            company_id: companyId,
            user_id: userId,
            name, email, document, status: 'active',
            notes: clientNotes
          })
          .select('id, user_id, notes')
          .single();
        if (insertErr) throw insertErr;
        client = newClient;
      } else {
        const { error: updateErr } = await supabaseAdmin
          .from('clients')
          .update({ 
            name, 
            document, 
            user_id: client.user_id || userId,
            notes: client.notes?.includes('sc_id:') ? client.notes : (client.notes ? `${client.notes} | ${clientNotes}` : clientNotes)
          })
          .eq('id', client.id);
        if (updateErr) throw updateErr;
      }

      res.status(201).json({
        success: true,
        id: client.id,
        message: "Cliente sincronizado com sucesso. Nenhuma fatura foi gerada automaticamente."
      });
  } catch (err: any) {
    console.error("Erro na integração SmartCartao:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/create-invoice", async (req, res) => {
  const { invoice } = req.body;
  if (!invoice) return res.status(400).json({ error: "Dados da fatura ausentes" });

  try {
    const { data: newInvoice, error: invError } = await supabaseAdmin
      .from('invoices')
      .insert(invoice)
      .select('*, clients (notes)')
      .single();

    if (invError) throw invError;

    const companyId = newInvoice.company_id;
    const { data: companyData } = await supabaseAdmin.from('companies').select('webhook_endpoints').eq('id', companyId).single();

    if (companyData?.webhook_endpoints && Array.isArray(companyData.webhook_endpoints)) {
      const clientNotes = (newInvoice.clients as any)?.notes || "";
      const scMatch = clientNotes.match(/sc_id:([^\s|]+)/);
      const scUserId = scMatch ? scMatch[1] : null;

      const payload = {
        event: 'invoice.created',
        timestamp: new Date().toISOString(),
        invoice: {
          ...newInvoice,
          payment_link: `${process.env.APP_URL || 'https://pagixypay.vercel.app'}/pay/${newInvoice.id}`,
          smartcartao_user_id: scUserId
        }
      };

      for (const endpoint of companyData.webhook_endpoints) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.error("[Outbound Webhook Error]", err));
      }
    }

    res.status(201).json({ success: true, invoice: newInvoice });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cron/process-billing", async (req, res) => {
  // Segurança Básica: Recomenda-se configurar CRON_SECRET nas variáveis de ambiente da Vercel
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 10);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // 1. Buscar assinaturas que vencem exatamente em 10 dias
    const { data: subs, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*, clients(id, name, email, notes)')
      .eq('status', 'active')
      .eq('next_billing_date', targetDateStr);
    
    if (subError) throw subError;

    if (!subs || subs.length === 0) {
      return res.json({ success: true, message: "Nenhuma assinatura para faturar hoje." });
    }

    const processed = [];
    for (const sub of subs) {
      // 2. Gerar Fatura Pendente
      const { data: invoice, error: invErr } = await supabaseAdmin
        .from('invoices')
        .insert({
          company_id: sub.company_id,
          client_id: sub.client_id,
          service_id: sub.service_id,
          subscription_id: sub.id,
          amount: sub.amount,
          due_date: sub.next_billing_date,
          status: 'pending',
          payment_method: 'pix'
        })
        .select()
        .single();

      if (invErr) continue;

      // 3. Avançar Data da Assinatura
      const nextDate = new Date(sub.next_billing_date);
      if (sub.interval === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (sub.interval === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (sub.interval === 'semiannual') nextDate.setMonth(nextDate.getMonth() + 6);
      else if (sub.interval === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

      await supabaseAdmin.from('subscriptions').update({ 
        next_billing_date: nextDate.toISOString().split('T')[0] 
      }).eq('id', sub.id);

      // 4. Notificar SmartCartão
      const { data: cData } = await supabaseAdmin.from('companies').select('webhook_endpoints').eq('id', sub.company_id).single();
      if (cData?.webhook_endpoints && Array.isArray(cData.webhook_endpoints)) {
        const scMatch = (sub.clients?.notes || "").match(/sc_id:([^\s|]+)/);
        const scUserId = scMatch ? scMatch[1] : null;

        for (const endpoint of cData.webhook_endpoints) {
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'invoice.created',
              timestamp: new Date().toISOString(),
              invoice: { 
                ...invoice, 
                payment_link: `${process.env.APP_URL || 'https://pagixypay.vercel.app'}/pay/${invoice.id}`, 
                smartcartao_user_id: scUserId 
              }
            })
          }).catch(() => {});
        }
      }
      processed.push(sub.id);
    }

    res.json({ success: true, processed_count: processed.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RESTANTE DAS ROTAS (MANTER IGUAL AO ORIGINAL) ---

app.post("/api/admin/create-client", async (req, res) => {
  const { email, password, name, company_id, document, phone, address_zip, address_street, address_number, address_neighborhood, address_city, address_state } = req.body;
  if (!email || !password || !name || !company_id) return res.status(400).json({ error: "Campos obrigatórios: email, password, name, company_id" });
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (authError) throw authError;
    const userId = authData.user.id;
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({ id: userId, company_id, full_name: name, role: 'client' });
    if (profileError) throw profileError;
    const { data: clientData, error: clientError } = await supabaseAdmin.from('clients').insert({ company_id, user_id: userId, name, email, document, phone, status: 'active', address_zip, address_street, address_number, address_neighborhood, address_city, address_state }).select().single();
    if (clientError) throw clientError;
    res.status(201).json({ success: true, message: "Cliente e acesso ao portal criados com sucesso!", client: clientData });
  } catch (error: any) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

app.post("/api/webhooks/mercadopago/:companyId", async (req, res) => {
  const { companyId } = req.params;
  const notification = req.body;
  const resourceId = notification.data?.id || notification.id;
  if (notification.type === 'payment' && resourceId) {
    try {
      const { data: company } = await supabaseAdmin.from('companies').select('gateways_config').eq('id', companyId).single();
      if (company?.gateways_config?.mercado_pago?.access_token) {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, { headers: { 'Authorization': `Bearer ${company.gateways_config.mercado_pago.access_token}` } });
        if (mpResponse.ok) {
          const details = await mpResponse.json();
          if (details.status === 'approved' && details.external_reference) await supabaseAdmin.from('invoices').update({ status: 'paid' }).eq('id', details.external_reference);
        }
      }
      res.status(200).send("OK");
    } catch { res.status(500).send("Erro"); }
  } else res.status(200).send("OK");
});

app.post("/api/webhooks/asaas/:companyId", async (req, res) => {
  const { event, payment } = req.body;
  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    try {
      if (payment.externalReference) await supabaseAdmin.from('invoices').update({ status: 'paid' }).eq('id', payment.externalReference);
      res.status(200).send("OK");
    } catch { res.status(500).send("Erro"); }
  } else res.status(200).send("OK");
});

export default app;
