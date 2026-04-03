import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente Supabase com privilégios administrativos (Service Role)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // --- API ROUTES ---
  
  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
      // 1. Criar usuário no Supabase Auth (pula confirmação de e-mail)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      });

      if (authError) throw authError;
      const userId = authData.user.id;

      // 2. Criar Perfil (profiles)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          company_id,
          full_name: name,
          role: 'client'
        });

      if (profileError) throw profileError;

      // 3. Criar registro de Cliente (clients)
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
        payment_link: `${process.env.APP_URL || 'http://localhost:3000'}/fatura/${invoice.id}`,
        url: `${process.env.APP_URL || 'http://localhost:3000'}/fatura/${invoice.id}`
      });
    } catch (err: any) {
      console.error("Erro na integração SmartCartao:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Webhook Mercado Pago: Baixa Automática de Faturas
  app.post("/api/webhooks/mercadopago/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const notification = req.body;

    console.log(`[Webhook MP] Notificação recebida para empresa ${companyId}:`, notification);

    // Mercado Pago envia o ID do recurso na propriedade data.id ou id
    const resourceId = notification.data?.id || notification.id;
    const type = notification.type;

    if (type === 'payment' && resourceId) {
      try {
        console.log(`[Webhook MP] Processando pagamento ID: ${resourceId}`);

        // 1. Buscar a configuração da empresa para obter o Access Token
        const { data: company, error: companyError } = await supabaseAdmin
          .from('companies')
          .select('gateways_config')
          .eq('id', companyId)
          .single();

        if (companyError || !company?.gateways_config?.mercado_pago?.access_token) {
          console.error(`[Webhook MP] Erro ao buscar token da empresa ${companyId}:`, companyError);
          return res.status(404).send("Configuração da empresa não encontrada");
        }

        const accessToken = company.gateways_config.mercado_pago.access_token;

        // 2. Buscar detalhes do pagamento no Mercado Pago
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!mpResponse.ok) {
          const errorData = await mpResponse.json();
          console.error(`[Webhook MP] Erro ao buscar detalhes no MP:`, errorData);
          return res.status(mpResponse.status).send("Erro ao consultar Mercado Pago");
        }

        const paymentDetails = await mpResponse.json();
        const invoiceId = paymentDetails.external_reference; // Usamos o ID da nossa fatura como referência externa
        const status = paymentDetails.status;

        console.log(`[Webhook MP] Pagamento ${resourceId} para Fatura ${invoiceId} tem status: ${status}`);

        // 3. Se o status for aprovado, atualizar a fatura no banco
        if (status === 'approved' && invoiceId) {
          const { data: invoiceData, error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({ status: 'paid' })
            .eq('id', invoiceId)
            .select() // Precisamos do retorno para enviar via Webhook
            .single();

          if (updateError) {
            console.error(`[Webhook MP] Erro ao atualizar fatura no Supabase:`, updateError);
            return res.status(500).send("Erro interno ao atualizar banco");
          }

          console.log(`[Webhook MP] Fatura ${invoiceId} marcada como PAGA com sucesso!`);

          // 4. Disparar Webhooks Externos (Outbound) caso a empresa possua URLs configuradas
          try {
            const { data: cData } = await supabaseAdmin
              .from('companies')
              .select('webhook_endpoints')
              .eq('id', companyId)
              .single();

            if (cData && Array.isArray(cData.webhook_endpoints)) {
              for (const endpoint of cData.webhook_endpoints) {
                console.log(`[Outbound Webhook] Disparando confirmação para: ${endpoint}`);
                fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event: 'payment.received',
                    timestamp: new Date().toISOString(),
                    invoice: invoiceData
                  })
                }).catch(err => console.error(`[Outbound Webhook] Erro ao enviar para ${endpoint}:`, err));
              }
            }
          } catch (hookError: any) {
            // Ignorado em caso de falha de coluna ou timeout no envio
            console.log("[Outbound Webhook] Falha ao tentar despachar webhooks:", hookError.message);
          }
        }

        res.status(200).send("OK");
      } catch (error) {
        console.error(`[Webhook MP] Erro crítico no processamento:`, error);
        res.status(500).send("Erro interno");
      }
    } else {
      // Outros tipos de notificações (testes, faturas, etc) apenas confirmamos o recebimento
      res.status(200).send("OK");
    }
  });

  // Webhook Asaas: Baixa Automática de Faturas
  app.post("/api/webhooks/asaas/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const notification = req.body;

    console.log(`[Webhook Asaas] Notificação recebida para empresa ${companyId}:`, notification);

    const event = notification.event;
    const payment = notification.payment;

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      try {
        const invoiceId = payment.externalReference; // Referência que enviamos na criação da cobrança no Asaas
        console.log(`[Webhook Asaas] Pagamento confirmado para Fatura ${invoiceId}`);

        if (invoiceId) {
          const { error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({ status: 'paid' })
            .eq('id', invoiceId);

          if (updateError) {
            console.error(`[Webhook Asaas] Erro ao marcar como paga:`, updateError);
            return res.status(500).send("Erro no banco");
          }

          console.log(`[Webhook Asaas] Fatura ${invoiceId} liquidada com sucesso!`);
        }
        res.status(200).send("OK");
      } catch (error) {
        console.error(`[Webhook Asaas] Erro no processamento:`, error);
        res.status(500).send("Erro interno");
      }
    } else {
      // Outros eventos (vencimento, criação, etc) apenas confirmamos
      res.status(200).send("OK");
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 FinFlow Server running on http://localhost:${PORT}`);
  });
}

startServer();
