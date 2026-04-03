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
    const { id: scUserId, name, email, document, amount, password } = req.body;
    
    const log = (msg: string) => {
      const entry = `[${new Date().toISOString()}] [Integration] ${msg}\n`;
      console.log(entry.trim());
      try {
        require('fs').appendFileSync('integration_log.txt', entry);
      } catch (e) {
        console.error("Erro ao gravar log no arquivo:", e);
      }
    };

    log(`>>> INÍCIO DA INTEGRAÇÃO: user=${email}, id_origem=${scUserId}`);
    
    if (!email || !name) {
      log("ERRO: Dados incompletos (e-mail ou nome ausente).");
      return res.status(400).json({ error: "Email and Name are required" });
    }

    try {
      // 1. Resolve Empresa
      const { data: company } = await supabaseAdmin.from('companies').select('id').limit(1).single();
      const companyId = company?.id;
      if (!companyId) throw new Error("Empresa padrão não encontrada no banco.");
      log(`Empresa resolvida: ${companyId}`);

      // 2. Auth User Sync
      let userId: string | null = null;
      
      // Tentar encontrar usuário existente
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = (usersData?.users || []).find((u: any) => u.email === email);
      
      const finalPassword = password || (document ? String(document).replace(/\D/g, '').slice(0, 8) : "Pagixy@2026");

      if (!existingUser) {
        log("Auth User não encontrado. Criando novo usuário...");
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: finalPassword.length >= 6 ? finalPassword : "Pagixy@2026",
          email_confirm: true,
          user_metadata: { full_name: name }
        });
        
        if (authErr) {
          log(`AVISO: Falha ao criar Auth User: ${authErr.message}`);
          // Se o erro for que já existe (race condition), tenta buscar novamente
          if (authErr.message.includes("already registered") || authErr.message.includes("exists")) {
             const { data: retryList } = await supabaseAdmin.auth.admin.listUsers();
             userId = (retryList?.users || []).find((u: any) => u.email === email)?.id || null;
          }
        } else {
          userId = authData.user.id;
          log(`Auth User criado com sucesso: ${userId}`);
        }
      } else {
        userId = existingUser.id;
        log(`Auth User já existe: ${userId}`);
        if (password) {
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
          log("Senha sincronizada conforme payload.");
        }
      }

      // Garantir Perfil (importante para o login funcionar)
      if (userId) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).maybeSingle();
        if (!profile) {
          log("Perfil não encontrado. Criando perfil...");
          await supabaseAdmin.from('profiles').insert({
            id: userId,
            company_id: companyId,
            full_name: name,
            role: 'client'
          });
          log("Perfil criado.");
        }
      }

      // 3. Cliente Sync
      let { data: client, error: cErr } = await supabaseAdmin
        .from('clients')
        .select('id, user_id, notes')
        .eq('company_id', companyId)
        .eq('email', email)
        .maybeSingle();

      if (cErr) {
        log(`Erro ao buscar cliente: ${cErr.message}`);
        throw cErr;
      }

      const clientNotes = `sc_id:${scUserId}`;

      if (!client) {
        log("Cliente não encontrado na tabela 'clients'. Inserindo...");
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
        
        if (insertErr) {
          log(`Erro na inserção do cliente: ${insertErr.message}`);
          throw insertErr;
        }
        client = newClient;
        log(`Novo cliente inserido: ${client.id}`);
      } else {
        log(`Cliente já existe: ${client.id}. Atualizando dados...`);
        const { error: updateErr } = await supabaseAdmin
          .from('clients')
          .update({ 
            name, 
            document, 
            user_id: client.user_id || userId,
            notes: client.notes?.includes('sc_id:') ? client.notes : (client.notes ? `${client.notes} | ${clientNotes}` : clientNotes)
          })
          .eq('id', client.id);
        
        if (updateErr) {
          log(`Erro na atualização do cliente: ${updateErr.message}`);
          throw updateErr;
        }
      }

      res.status(201).json({
        success: true,
        id: client.id,
        message: "Cliente sincronizado com sucesso. Nenhuma fatura foi gerada automaticamente."
      });

    } catch (err: any) {
      log(`ERRO FATAL NA INTEGRAÇÃO: ${err.message}`);
      res.status(500).json({ error: err.message || "Erro interno do servidor." });
    }
  });

  // Criar Fatura Manual com Dispatch de Webhook (Sincronização SmartCartão)
  app.post("/api/admin/create-invoice", async (req, res) => {
    const { invoice } = req.body;
    if (!invoice) return res.status(400).json({ error: "Dados da fatura ausentes" });

    try {
      // 1. Inserir fatura no banco
      const { data: newInvoice, error: invError } = await supabaseAdmin
        .from('invoices')
        .insert(invoice)
        .select(`
          *,
          clients (name, email, notes),
          services (name)
        `)
        .single();

      if (invError) throw invError;

      // 2. Tentar disparar webhooks para sistemas externos (SmartCartão)
      const companyId = newInvoice.company_id;
      const { data: companyData } = await supabaseAdmin
        .from('companies')
        .select('webhook_endpoints')
        .eq('id', companyId)
        .single();

      if (companyData?.webhook_endpoints && Array.isArray(companyData.webhook_endpoints)) {
        // Extrair o ID da SmartCartão das notas do cliente
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
          console.log(`[Outbound Webhook] Sincronizando nova fatura com: ${endpoint}`);
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(err => console.error(`[Outbound Webhook] Erro ao enviar para ${endpoint}:`, err));
        }
      }

      res.status(201).json({ success: true, invoice: newInvoice });
    } catch (error: any) {
      console.error("Erro ao criar fatura e disparar webhook:", error);
      res.status(500).json({ error: error.message || "Erro interno ao processar fatura" });
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

          // OUTBOUND WEBHOOK: Notificar SmartCartão sobre o pagamento via Asaas
          try {
            const { data: invData } = await supabaseAdmin.from('invoices').select('*, clients(notes)').eq('id', invoiceId).single();
            const { data: cData } = await supabaseAdmin.from('companies').select('webhook_endpoints').eq('id', companyId).single();

            if (cData && Array.isArray(cData.webhook_endpoints) && invData) {
              for (const endpoint of cData.webhook_endpoints) {
                fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event: 'payment.received',
                    timestamp: new Date().toISOString(),
                    invoice: invData
                  })
                }).catch(err => console.error(`[Outbound Webhook Error]`, err));
              }
            }
          } catch (hookError: any) {
            console.log("[Outbound Webhook] Falha ao despachar webhook Asaas:", hookError.message);
          }
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

  // --- AUTOMAÇÃO DE ASSINATURAS (Gerar fatura 10 dias antes) ---
  async function processAutomaticBilling() {
    console.log("[Automation] Verificando assinaturas para faturamento antecipado (10 dias)...");
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 10);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const { data: subs, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*, clients(id, name, email, notes)')
      .eq('status', 'active')
      .eq('next_billing_date', targetDateStr);

    if (error) {
      console.error("[Automation] Erro ao buscar assinaturas:", error);
      return;
    }

    if (!subs || subs.length === 0) {
      console.log(`[Automation] Nenhuma assinatura para faturar em ${targetDateStr}.`);
      return;
    }

    for (const sub of subs) {
      try {
        console.log(`[Automation] Gerando fatura para assinatura ${sub.id} (Cliente: ${sub.clients?.name})`);
        
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

        if (invErr) throw invErr;

        // Avançar data de cobrança
        const nextDueDate = new Date(sub.next_billing_date);
        if (sub.interval === 'monthly' || sub.interval === 'monthly') nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        else if (sub.interval === 'weekly') nextDueDate.setDate(nextDueDate.getDate() + 7);
        else if (sub.interval === 'semiannual') nextDueDate.setMonth(nextDueDate.getMonth() + 6);
        else if (sub.interval === 'yearly') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

        await supabaseAdmin
          .from('subscriptions')
          .update({ next_billing_date: nextDueDate.toISOString().split('T')[0] })
          .eq('id', sub.id);

        // Notificar SmartCartão
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
             }).catch(e => console.error("[Automation Webhook Error]", e));
          }
        }
      } catch (e: any) {
        console.error(`[Automation] Erro na sub ${sub.id}:`, e.message);
      }
    }
  }

  // Rodar a cada 12 horas
  setInterval(processAutomaticBilling, 12 * 60 * 60 * 1000);
  // Rodar uma vez ao iniciar (com delay para não sobrepor boot)
  setTimeout(processAutomaticBilling, 30000);

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
