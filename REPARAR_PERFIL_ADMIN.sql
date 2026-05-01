-- 🩺 SCRIPT DE REPARO DE PERFIL (Vincular Administrador à Empresa)
-- Execute este script no SQL Editor do Supabase.

DO $$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Pegar o ID da empresa principal (InforArtes)
    SELECT id INTO v_company_id FROM companies WHERE id = 'ab4841d3-bcce-4621-b2c8-bcb4630f6619' OR name ILIKE '%InforArtes%' LIMIT 1;
    
    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM companies LIMIT 1;
    END IF;

    -- 2. Reparar o usuário Olzenis (ou quem estiver logado)
    -- Vamos procurar o usuário na tabela de autenticação
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'olzenisgomes@gmail.com' LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Garantir que o perfil exista e seja ADMIN com a empresa correta
        INSERT INTO public.profiles (id, company_id, full_name, role)
        VALUES (v_user_id, v_company_id, 'Olzenis Gomes (Admin)', 'admin')
        ON CONFLICT (id) DO UPDATE SET 
            company_id = v_company_id,
            role = 'admin',
            full_name = EXCLUDED.full_name;
            
        RAISE NOTICE 'Perfil de Olzenis reparado com sucesso.';
    END IF;

    -- 3. Criar função auxiliar para garantir que novos admins sempre tenham acesso (Opcional)
    -- Isso evita que o erro aconteça novamente se você criar novos usuários.
END $$;
