-- 🚀 HABILITAR LINKS DE PAGAMENTO PÚBLICOS
-- Este script ajusta as políticas de Row Level Security (RLS) para permitir que faturas 
-- sejam visualizadas e pagas por qualquer pessoa que possua o link direto, sem necessidade de login.

-- 1. Invoices (Faturas)
-- Permite visualizar uma fatura específica pelo ID (UUID)
DROP POLICY IF EXISTS "Public: Ver fatura por ID" ON invoices;
CREATE POLICY "Public: Ver fatura por ID" ON invoices
  FOR SELECT TO public
  USING (true);

-- Permite atualizar a fatura (status e método de pagamento) durante o processo de pagamento público
DROP POLICY IF EXISTS "Public: Atualizar fatura ao pagar" ON invoices;
CREATE POLICY "Public: Atualizar fatura ao pagar" ON invoices
  FOR UPDATE TO public
  USING (status = 'pending')
  WITH CHECK (status IN ('pending', 'paid', 'cancelled'));

-- 2. Clients (Clientes)
-- Permite visualizar os dados do cliente vinculado a uma fatura (necessário para exibir o nome do pagador)
DROP POLICY IF EXISTS "Public: Ver cliente da fatura" ON clients;
CREATE POLICY "Public: Ver cliente da fatura" ON clients
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM invoices WHERE client_id = clients.id));

-- 3. Invoice Items (Itens da Fatura)
-- Permite visualizar os itens que compõem a fatura
DROP POLICY IF EXISTS "Public: Ver itens da fatura" ON invoice_items;
CREATE POLICY "Public: Ver itens da fatura" ON invoice_items
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM invoices WHERE id = invoice_id));

-- 4. Companies (Empresas)
-- Garante que o público veja os dados da empresa emissora (Logo, Nome, Configurações de Checkout)
DROP POLICY IF EXISTS "Companies: Público vê" ON companies;
CREATE POLICY "Companies: Público vê" ON companies 
  FOR SELECT TO public 
  USING (true);

-- 5. Services (Serviços)
-- Permite visualizar o nome dos serviços vinculados aos itens
DROP POLICY IF EXISTS "Services: Público vê" ON services;
CREATE POLICY "Services: Público vê" ON services 
  FOR SELECT TO public 
  USING (true);

-- Garantir que o RLS está ativado nessas tabelas
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
