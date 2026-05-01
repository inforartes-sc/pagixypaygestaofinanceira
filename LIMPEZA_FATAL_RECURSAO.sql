-- 🧨 LIMPEZA FATAL DE RECURSÃO (Zerar e Reconstruir RLS)
-- Este script força a remoção de QUALQUER política que esteja causando o loop infinito.

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    -- 1. Deletar TODAS as políticas das tabelas principais, não importa o nome
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('invoices', 'clients', 'profiles', 'companies', 'invoice_items', 'services')) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. Desabilitar e Reabilitar o RLS para garantir um estado limpo
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas ÚNICAS e ULTRA-SIMPLES (Sem subqueries para evitar recursão)
-- Para usuários logados: Ver tudo
CREATE POLICY "Permissao_Total_Autenticado_Profiles" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Permissao_Total_Autenticado_Companies" ON companies FOR ALL TO authenticated USING (true);
CREATE POLICY "Permissao_Total_Autenticado_Clients" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Permissao_Total_Autenticado_Invoices" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Permissao_Total_Autenticado_Services" ON services FOR ALL TO authenticated USING (true);
CREATE POLICY "Permissao_Total_Autenticado_Items" ON invoice_items FOR ALL TO authenticated USING (true);

-- 4. Políticas PÚBLICAS (Para os links de pagamento funcionarem)
-- Usamos 'true' direto para evitar qualquer processamento extra que gere loop
CREATE POLICY "Acesso_Publico_Invoices" ON invoices FOR SELECT TO public USING (true);
CREATE POLICY "Acesso_Publico_Items" ON invoice_items FOR SELECT TO public USING (true);
CREATE POLICY "Acesso_Publico_Clients" ON clients FOR SELECT TO public USING (true);
CREATE POLICY "Acesso_Publico_Companies" ON companies FOR SELECT TO public USING (true);
