-- 🛠️ SCRIPT DE CORREÇÃO TOTAL DO BANCO DE DADOS (PAGIXYPAY)
-- Execute este script completo no SQL Editor do Supabase para sincronizar a estrutura com o código.

-- 1. TABELAS DE ITENS (Obrigatório para as faturas aparecerem)
CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. COLUNAS FALTANTES EM CLIENTES E EMPRESAS
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS webhook_endpoints JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS gateways_config JSONB DEFAULT '{}'::jsonb;

-- 3. POLÍTICAS DE ACESSO PÚBLICO (Para os links de pagamento funcionarem sem login)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public: Ver fatura por ID" ON invoices;
CREATE POLICY "Public: Ver fatura por ID" ON invoices FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public: Atualizar fatura ao pagar" ON invoices;
CREATE POLICY "Public: Atualizar fatura ao pagar" ON invoices FOR UPDATE TO public USING (status = 'pending') WITH CHECK (status IN ('pending', 'paid', 'cancelled'));

DROP POLICY IF EXISTS "Public: Ver cliente da fatura" ON clients;
CREATE POLICY "Public: Ver cliente da fatura" ON clients FOR SELECT TO public USING (EXISTS (SELECT 1 FROM invoices WHERE client_id = clients.id));

DROP POLICY IF EXISTS "Public: Ver itens da fatura" ON invoice_items;
CREATE POLICY "Public: Ver itens da fatura" ON invoice_items FOR SELECT TO public USING (EXISTS (SELECT 1 FROM invoices WHERE id = invoice_id));

-- 4. POLÍTICAS PARA ADMINS (Garantir que você veja tudo no painel)
DROP POLICY IF EXISTS "Admins can do everything on invoices" ON invoices;
CREATE POLICY "Admins can do everything on invoices" ON invoices FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')));

DROP POLICY IF EXISTS "Admins can do everything on clients" ON clients;
CREATE POLICY "Admins can do everything on clients" ON clients FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')));

DROP POLICY IF EXISTS "Admins have full access to invoice_items" ON invoice_items;
CREATE POLICY "Admins have full access to invoice_items" ON invoice_items FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')));
