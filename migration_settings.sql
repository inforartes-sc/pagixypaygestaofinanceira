-- Adicionar colunas de configuração à tabela de empresas
ALTER TABLE companies ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS gateways_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "new_invoice": true,
  "payment_received": true,
  "invoice_overdue": true,
  "weekly_report": false
}'::jsonb;

-- Garantir que cada empresa tenha uma chave de API inicial (opcional, mas bom pra teste)
UPDATE companies SET api_key = 'sk_live_' || lower(substring(replace(gen_random_uuid()::text, '-', ''), 1, 24))
WHERE api_key IS NULL;
