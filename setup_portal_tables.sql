-- 1. Criar Tabela de Chamados de Suporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'closed'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar Tabela de Solicitações de Serviço
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS (Segurança de Linha)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança para support_tickets
DROP POLICY IF EXISTS "Clientes podem ver seus próprios chamados" ON support_tickets;
CREATE POLICY "Clientes podem ver seus próprios chamados" 
ON support_tickets FOR SELECT 
TO authenticated 
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Clientes podem inserir chamados" ON support_tickets;
CREATE POLICY "Clientes podem inserir chamados" 
ON support_tickets FOR INSERT 
TO authenticated 
WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- 5. Políticas de Segurança para service_requests
DROP POLICY IF EXISTS "Clientes podem ver suas próprias solicitações" ON service_requests;
CREATE POLICY "Clientes podem ver suas próprias solicitações" 
ON service_requests FOR SELECT 
TO authenticated 
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Clientes podem inserir solicitações" ON service_requests;
CREATE POLICY "Clientes podem inserir solicitações" 
ON service_requests FOR INSERT 
TO authenticated 
WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- 6. Políticas para Administradores (Acesso Total)
DROP POLICY IF EXISTS "Admins tem acesso total aos chamados" ON support_tickets;
CREATE POLICY "Admins tem acesso total aos chamados" 
ON support_tickets FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')));

DROP POLICY IF EXISTS "Admins tem acesso total as solicitações" ON service_requests;
CREATE POLICY "Admins tem acesso total as solicitações" 
ON service_requests FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')));

-- 7. Criar Tabela de Mensagens de Suporte (Chat)
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL, -- 'admin' ou 'client'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para mensagens
DROP POLICY IF EXISTS "Usuários podem ver mensagens de seus próprios chamados" ON support_messages;
CREATE POLICY "Usuários podem ver mensagens de seus próprios chamados" 
ON support_messages FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_messages.ticket_id 
    AND (support_tickets.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) 
         OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')))
  )
);

DROP POLICY IF EXISTS "Usuários podem inserir mensagens nos seus chamados" ON support_messages;
CREATE POLICY "Usuários podem inserir mensagens nos seus chamados" 
ON support_messages FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = ticket_id 
    AND (support_tickets.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) 
         OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')))
  )
);

-- 8. Criar Tabela de Mensagens de Solicitação de Serviço
CREATE TABLE IF NOT EXISTS service_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL, -- 'admin' ou 'client'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_request_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para mensagens de solicitação
DROP POLICY IF EXISTS "Usuários podem ver mensagens de suas próprias solicitações" ON service_request_messages;
CREATE POLICY "Usuários podem ver mensagens de suas próprias solicitações" 
ON service_request_messages FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM service_requests 
    WHERE service_requests.id = service_request_messages.request_id 
    AND (service_requests.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) 
         OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')))
  )
);

DROP POLICY IF EXISTS "Usuários podem inserir mensagens em suas solicitações" ON service_request_messages;
CREATE POLICY "Usuários podem inserir mensagens em suas solicitações" 
ON service_request_messages FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM service_requests 
    WHERE service_requests.id = request_id 
    AND (service_requests.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) 
         OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')))
  )
);

-- 9. Criar Tabela de Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'ticket', 'service', 'payment', 'system'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias notificações" ON notifications;
CREATE POLICY "Usuários podem ver suas próprias notificações" 
ON notifications FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem marcar suas notificações como lidas" ON notifications;
CREATE POLICY "Usuários podem marcar suas notificações como lidas" 
ON notifications FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Qualquer um autenticado pode inserir notificações" ON notifications;
CREATE POLICY "Qualquer um autenticado pode inserir notificações" 
ON notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

