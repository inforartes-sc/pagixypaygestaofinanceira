-- SCRIPT DE CORREÇÃO DE BANCO DE DADOS - PagixyPay
-- Execute este script no SQL Editor do seu painel Supabase

-- 1. Adicionar colunas faltantes na tabela 'clients' (Causa do Erro 500 atual e outros)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Adicionar colunas faltantes na tabela 'companies' (Para evitar erros nas Configurações)
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

-- 3. (Opcional) Criar função para execuções SQL via RPC no futuro
-- Isso permite que scripts de manutenção rodem via código se necessário
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN jsonb_build_object('status', 'success');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;
