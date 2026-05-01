-- 🧹 RESETE DE SEGURANÇA TOTAL (CORREÇÃO ERRO 500)
-- Este script remove todas as políticas problemáticas e cria novas simplificadas.

-- 1. Desabilitar temporariamente o RLS em todas as tabelas principais
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;

-- 2. Deletar TODAS as políticas existentes para começar do zero
DROP POLICY IF EXISTS "Admin_Full_Access_Invoices" ON invoices;
DROP POLICY IF EXISTS "Admin_Full_Access_Clients" ON clients;
DROP POLICY IF EXISTS "Admin_Full_Access_Items" ON invoice_items;
DROP POLICY IF EXISTS "Admin_Full_Access_Companies" ON companies;
DROP POLICY IF EXISTS "Admins have full access" ON profiles;
DROP POLICY IF EXISTS "Admins can do everything on invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can do everything on clients" ON clients;
DROP POLICY IF EXISTS "Public: Ver fatura por ID" ON invoices;

-- 3. Re-abilitar o RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas de ACESSO TOTAL para usuários autenticados (Simplificado)
-- Nota: Isso permite que qualquer administrador logado veja os dados.
CREATE POLICY "Acesso_Total_Autenticado_Invoices" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso_Total_Autenticado_Clients" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso_Total_Autenticado_Services" ON services FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso_Total_Autenticado_Profiles" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso_Total_Autenticado_Companies" ON companies FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso_Total_Autenticado_Items" ON invoice_items FOR ALL TO authenticated USING (true);

-- 5. Restaurar as Políticas PÚBLICAS para os links de pagamento (Sem login)
CREATE POLICY "Publico_Ver_Fatura" ON invoices FOR SELECT TO public USING (true);
CREATE POLICY "Publico_Ver_Itens" ON invoice_items FOR SELECT TO public USING (true);
CREATE POLICY "Publico_Ver_Cliente" ON clients FOR SELECT TO public USING (true);
