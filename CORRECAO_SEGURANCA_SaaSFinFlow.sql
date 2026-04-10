-- 🛡️ SEGURANÇA TOTAL: Habilitar RLS e Corrigir Vulnerabilidades
-- Este script resolve os alertas do Supabase: "rls_desativado_em_público" e "colunas_sensíveis_expostas"

-- 0. Criar Funções Auxiliares de Segurança (Security Definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'admin_master')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Habilitar RLS em todas as tabelas críticas
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas para garantir uma base limpa
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
    END LOOP;
END $$;

-- 3. POLÍTICAS PARA PROFILES (Perfis)
CREATE POLICY "Profiles: Ver próprio ou admin vê todos" ON profiles
  FOR SELECT TO authenticated 
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Profiles: Atualizar próprio ou admin atualiza todos" ON profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Profiles: Admin insere" ON profiles
  FOR INSERT TO authenticated 
  WITH CHECK (is_admin());

-- 4. POLÍTICAS PARA CLIENTS (Clientes)
CREATE POLICY "Clients: Cliente vê próprio ou admin vê todos" ON clients
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Clients: Admin gerencia todos" ON clients
  FOR ALL TO authenticated 
  USING (is_admin());

-- 5. POLÍTICAS PARA INVOICES (Faturas)
CREATE POLICY "Invoices: Cliente vê próprias ou admin vê todas" ON invoices
  FOR SELECT TO authenticated 
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) 
    OR is_admin()
  );

CREATE POLICY "Invoices: Admin gerencia todas" ON invoices
  FOR ALL TO authenticated 
  USING (is_admin());

-- 6. POLÍTICAS PARA SUBSCRIPTIONS (Assinaturas)
CREATE POLICY "Subscriptions: Cliente vê próprias ou admin vê todas" ON subscriptions
  FOR SELECT TO authenticated 
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) 
    OR is_admin()
  );

CREATE POLICY "Subscriptions: Admin gerencia todas" ON subscriptions
  FOR ALL TO authenticated 
  USING (is_admin());

-- 7. POLÍTICAS PARA SERVICES E COMPANIES (Catálogo)
-- Visível para o público para permitir landing pages e fluxos de checkout, mas editável apenas por admins
CREATE POLICY "Services: Público vê" ON services FOR SELECT TO public USING (true);
CREATE POLICY "Services: Admin gerencia" ON services FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Companies: Público vê" ON companies FOR SELECT TO public USING (true);
CREATE POLICY "Companies: Admin gerencia" ON companies FOR ALL TO authenticated USING (is_admin());

-- 8. POLÍTICAS PARA ITENS (Invoice Items / Subscription Items)
CREATE POLICY "Invoice Items: Ver se tiver acesso à fatura" ON invoice_items
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.id = invoice_id 
      AND (i.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR is_admin())
    )
  );

CREATE POLICY "Invoice Items: Admin gerencia" ON invoice_items FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Subscription Items: Ver se tiver acesso à assinatura" ON subscription_items
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s 
      WHERE s.id = subscription_id 
      AND (s.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR is_admin())
    )
  );

CREATE POLICY "Subscription Items: Admin gerencia" ON subscription_items FOR ALL TO authenticated USING (is_admin());

-- 9. NOTIFICAÇÕES
CREATE POLICY "Notifications: Usuário vê as suas" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Notifications: Usuário marca como lida" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Notifications: Admin insere" ON notifications
  FOR INSERT TO authenticated WITH CHECK (is_admin());

-- 10. SUPORTE (Tickets e Mensagens)
CREATE POLICY "Tickets: Cliente vê próprios ou admin vê todos" ON support_tickets
  FOR SELECT TO authenticated 
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "Tickets: Cliente cria ou admin cria" ON support_tickets
  FOR INSERT TO authenticated 
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "Tickets: Admin gerencia status" ON support_tickets
  FOR UPDATE TO authenticated 
  USING (is_admin());

CREATE POLICY "Support Messages: Ver se tiver acesso ao ticket" ON support_messages
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets t 
      WHERE t.id = ticket_id 
      AND (t.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR is_admin())
    )
  );

CREATE POLICY "Support Messages: Inserir se tiver acesso ao ticket" ON support_messages
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets t 
      WHERE t.id = ticket_id 
      AND (t.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR is_admin())
    )
  );

-- FINAL: Verificar se RLS está ativo
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
