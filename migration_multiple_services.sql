-- Migration to support multiple services per subscription and invoice

-- 1. Create subscription_items table
CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  description TEXT, -- Optional description for this specific line item
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 4. Policies for subscription_items
DROP POLICY IF EXISTS "Admins have full access to subscription_items" ON subscription_items;
CREATE POLICY "Admins have full access to subscription_items" 
ON subscription_items FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')));

-- 5. Policies for invoice_items
DROP POLICY IF EXISTS "Admins have full access to invoice_items" ON invoice_items;
CREATE POLICY "Admins have full access to invoice_items" 
ON invoice_items FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_master')));

-- 6. Add policies for clients to view their own items
CREATE POLICY "Clients can view their own subscription items"
ON subscription_items FOR SELECT
TO authenticated
USING (
  subscription_id IN (
    SELECT id FROM subscriptions 
    WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Clients can view their own invoice items"
ON invoice_items FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  )
);

-- Note: We keep service_id and amount in subscriptions/invoices for backward compatibility 
-- and as a cache for the main service/total amount.
