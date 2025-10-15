-- ========================================
-- CRIAR USUÁRIOS DE TESTE PARA O SISTEMA
-- ========================================
-- Este script cria usuários de teste para popular o sistema

-- 1. PRIMEIRO, VERIFICAR SE JÁ EXISTEM USUÁRIOS
SELECT 'USUÁRIOS_EXISTENTES' as info, count(*) as total FROM profiles;

-- 2. CRIAR USUÁRIOS DE TESTE (APENAS SE NÃO EXISTIREM)
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Verificar quantos usuários existem
    SELECT count(*) INTO user_count FROM profiles;
    
    IF user_count = 0 THEN
        RAISE NOTICE '📝 Criando usuários de teste...';
        
        -- Usuário 1: Admin principal
        INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'social@ekklesia.com',
            'Administrador Principal',
            'admin',
            NOW(),
            NOW()
        );
        
        -- Usuário 2: Admin secundário
        INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'admin@ekklesia.com',
            'Administrador Secundário',
            'admin',
            NOW(),
            NOW()
        );
        
        -- Usuário 3: Atendente de triagem
        INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'triagem@ekklesia.com',
            'Atendente de Triagem',
            'triage',
            NOW(),
            NOW()
        );
        
        -- Usuário 4: Atendente de serviço
        INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'servico@ekklesia.com',
            'Atendente de Serviço',
            'service',
            NOW(),
            NOW()
        );
        
        -- Usuário 5: Painel de exibição
        INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'painel@ekklesia.com',
            'Painel de Exibição',
            'panel',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ 5 usuários de teste criados com sucesso!';
    ELSE
        RAISE NOTICE '⚠️ Já existem %s usuários. Não criando novos.', user_count;
    END IF;
END $$;

-- 3. VERIFICAR USUÁRIOS CRIADOS
SELECT 
    'USUÁRIOS_APÓS_CRIAÇÃO' as info,
    id,
    email,
    full_name,
    role,
    created_at
FROM profiles
ORDER BY email;

-- 4. TESTAR ACESSO COM RLS
SELECT 'TESTE_RLS' as info, count(*) as usuarios_visiveis FROM profiles;

-- 5. VERIFICAR POLÍTICAS ATIVAS
SELECT 
    'POLÍTICAS_RLS' as info,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '🎉 USUÁRIOS DE TESTE CRIADOS! Teste o painel admin agora.' as status_final;