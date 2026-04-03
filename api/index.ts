import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const app = express();
app.use(express.json());

// Endpoint de integraÃ§Ã£o para o SmartCartao
app.post("/api/clients", async (req, res) => {
  const { id: scUserId, name, email, document, amount } = req.body;
  
  if (!email || !name) return res.status(400).json({ error: "Email/Name required" });

  try {
    // 1. Resolve Empresa (Multi-tenant)
    const { data: company } = await supabaseAdmin.from('companies').select('id').limit(1).single();
    const companyId = company?.id;

    if (!companyId) throw new Error("No company found");

    // 2. Registro do Cliente (Upsert)
    const { data: client, error: cErr } = await supabaseAdmin.from('clients').upsert({
      company_id: companyId,
      name, email, document, status: 'active'
    }, { onConflict: 'email' }).select('id').single();

    if (cErr) throw cErr;

    // 3. Criar Fatura Pendente
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const { data: invoice, error: iErr } = await supabaseAdmin.from('invoices').insert({
      company_id: companyId,
      client_id: client.id,
      amount: parseFloat(String(amount || '49.00').replace(',', '.')),
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      external_reference: scUserId
    }).select().single();

    if (iErr) throw iErr;

    res.status(201).json({
      success: true,
      id: client.id,
      amount: invoice.amount.toFixed(2),
      due_date: invoice.due_date,
      payment_link: `https://pagixypay.vercel.app/fatura/${invoice.id}`,
      url: `https://pagixypay.vercel.app/fatura/${invoice.id}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;