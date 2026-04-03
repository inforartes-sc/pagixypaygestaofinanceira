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

// Endpoint de integração para o SmartCartao (PagiXyPay billing integration)
app.post("/api/clients", async (req, res) => {
  const { id: scUserId, name, email, document, amount } = req.body;
  
  if (!email || !name) return res.status(400).json({ error: "Email/Name required" });

  try {
    // 1. Resolve Empresa (Multi-tenant)
    const { data: company } = await supabaseAdmin.from('companies').select('id').limit(1).single();
    const companyId = company?.id;

    if (!companyId) throw new Error("No company found");

    // 2. Registro do Cliente (Manual Upsert para evitar erro de constraint)
    let { data: client, error: cErr } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', email)
      .maybeSingle();

    if (cErr) throw cErr;

    if (!client) {
      const { data: newClient, error: insertErr } = await supabaseAdmin
        .from('clients')
        .insert({
          company_id: companyId,
          name, email, document, status: 'active'
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;
      client = newClient;
    } else {
      // Update name/document if exists
      const { error: updateErr } = await supabaseAdmin
        .from('clients')
        .update({ name, document })
        .eq('id', client.id);
      if (updateErr) throw updateErr;
    }

    // 3. Criar Fatura Pendente
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const { data: invoice, error: iErr } = await supabaseAdmin.from('invoices').insert({
      company_id: companyId,
      client_id: client.id,
      amount: parseFloat(String(amount || '49.00').replace(',', '.')),
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      payment_method: 'pix',
      external_reference: scUserId
    }).select().single();

    if (iErr) throw iErr;

    res.status(201).json({
      success: true,
      id: client.id,
      amount: invoice.amount.toFixed(2),
      due_date: invoice.due_date,
      payment_link: `${process.env.APP_URL || 'https://pagixypay.vercel.app'}/fatura/${invoice.id}`,
      url: `${process.env.APP_URL || 'https://pagixypay.vercel.app'}/fatura/${invoice.id}`
    });
  } catch (err: any) {
    console.error("Erro na integração SmartCartao:", err);
    res.status(500).json({ error: err.message });
  }
});

// Criar Cliente com Acesso ao Portal (Admin only action)
app.post("/api/admin/create-client", async (req, res) => {
  const { 
    email, 
    password, 
    name, 
    company_id,
    document,
    phone,
    address_zip,
    address_street,
    address_number,
    address_neighborhood,
    address_city,
    address_state
  } = req.body;

  if (!email || !password || !name || !company_id) {
    return res.status(400).json({ error: "Campos obrigatórios: email, password, name, company_id" });
  }

  try {
    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 2. Criar Perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        company_id,
        full_name: name,
        role: 'client'
      });

    if (profileError) throw profileError;

    // 3. Criar registro de Cliente
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        company_id,
        user_id: userId,
        name,
        email,
        document,
        phone,
        status: 'active',
        address_zip,
        address_street,
        address_number,
        address_neighborhood,
        address_city,
        address_state
      })
      .select()
      .single();

    if (clientError) throw clientError;

    res.status(201).json({ 
      success: true, 
      message: "Cliente e acesso ao portal criados com sucesso!",
      client: clientData 
    });

  } catch (error: any) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

// Webhook Mercado Pago
app.post("/api/webhooks/mercadopago/:companyId", async (req, res) => {
  const { companyId } = req.params;
  const notification = req.body;
  const resourceId = notification.data?.id || notification.id;
  const type = notification.type;

  if (type === 'payment' && resourceId) {
    try {
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('gateways_config')
        .eq('id', companyId)
        .single();

      if (company?.gateways_config?.mercado_pago?.access_token) {
        const accessToken = company.gateways_config.mercado_pago.access_token;
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (mpResponse.ok) {
          const paymentDetails = await mpResponse.json();
          const invoiceId = paymentDetails.external_reference;
          const status = paymentDetails.status;

          if (status === 'approved' && invoiceId) {
            await supabaseAdmin.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
          }
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).send("Erro");
    }
  } else {
    res.status(200).send("OK");
  }
});

// Webhook Asaas
app.post("/api/webhooks/asaas/:companyId", async (req, res) => {
  const { companyId } = req.params;
  const notification = req.body;
  const event = notification.event;
  const payment = notification.payment;

  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    try {
      const invoiceId = payment.externalReference;
      if (invoiceId) {
        await supabaseAdmin.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
      }
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).send("Erro");
    }
  } else {
    res.status(200).send("OK");
  }
});

export default app;