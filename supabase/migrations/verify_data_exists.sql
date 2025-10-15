-- ========================================
-- VERIFICAÇÃO SE OS DADOS EXISTEM REALMENTE
-- ========================================

-- 1. VERIFICAR QUANTOS USUÁRIOS EXISTEM (SEM RLS)
SET row_security = off;
SELECT 'TOTAL_USERS_NO_RLS' as check_type, count(*) as count FROM profiles;
SELECT 'USERS_DATA_NO_RLS' as check_type, id, email, full_name, role FROM profiles ORDER BY email LIMIT 10;
SET row_security = on;

-- 2. VERIFICAR COM RLS HABILITADO
SELECT 'TOTAL_USERS_WITH_RLS' as check_type, count(*) as count FROM profiles;

-- 3. VERIFICAR SE O USUÁRIO ADMIN EXISTE E TEM PERMISSÕES
DO $$
DECLARE
    admin_user_id UUID;
    admin_profile RECORD;
    test_result TEXT := '';
BEGIN
    -- Buscar usuário admin na auth.users
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        test_result := test_result || '✅ Usuário admin encontrado na auth.users: ' || admin_user_id || E'\n';
        
        -- Verificar se existe perfil
        SELECT * INTO admin_profile
        FROM profiles
        WHERE id = admin_user_id;
        
        IF FOUND THEN
            test_result := test_result || '✅ Perfil admin encontrado - Role: ' || admin_profile.role || E'\n';
            test_result := test_result || '   Email: ' || admin_profile.email || E'\n';
            test_result := test_result || '   Nome: ' || COALESCE(admin_profile.full_name, 'NULL') || E'\n';
        ELSE
            test_result := test_result || '❌ PERFIL ADMIN NÃO ENCONTRADO!' || E'\n';
            
            -- Tentar criar o perfil
            BEGIN
                INSERT INTO profiles (id, email, full_name, role)
                VALUES (admin_user_id, 'social@ekklesia.com', 'Administrador', 'admin');
                test_result := test_result || '✅ Perfil admin criado com sucesso!' || E'\n';
            EXCEPTION WHEN OTHERS THEN
                test_result := test_result || '❌ Erro ao criar perfil: ' || SQLERRM || E'\n';
            END;
        END IF;
    ELSE
        test_result := test_result || '❌ USUÁRIO ADMIN NÃO ENCONTRADO NA AUTH.USERS!' || E'\n';
    END IF;
    
    RAISE NOTICE E'\n🔍 VERIFICAÇÃO DO ADMIN:\n%', test_result;
END $$;

-- 4. TESTAR POLÍTICAS RLS SIMULANDO USUÁRIO ADMIN
DO $$
DECLARE
    admin_user_id UUID;
    profiles_count INTEGER;
    test_result TEXT := '';
BEGIN
    -- Buscar usuário admin
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Simular contexto de usuário autenticado
        PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_user_id)::text, true);
        
        -- Testar acesso aos profiles
        BEGIN
            SELECT COUNT(*) INTO profiles_count FROM profiles;
            test_result := test_result || '✅ Como admin, pode ver ' || profiles_count || ' profiles' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro ao acessar profiles como admin: ' || SQLERRM || E'\n';
        END;
    ELSE
        test_result := test_result || '❌ Não foi possível testar - admin não existe' || E'\n';
    END IF;
    
    RAISE NOTICE E'\n🔍 TESTE DE POLÍTICAS RLS:\n%', test_result;
END $$;

-- 5. VERIFICAR POLÍTICAS ATIVAS
SELECT 
    'POLÍTICAS_ATIVAS' as info,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. VERIFICAR STATUS RLS
SELECT 
    'RLS_STATUS' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- 7. MOSTRAR TODOS OS USUÁRIOS (PARA DEBUG)
SELECT 
    'TODOS_OS_USUARIOS' as info,
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
FROM profiles
ORDER BY created_at;

SELECT '🔍 VERIFICAÇÃO COMPLETA! Analise os resultados acima.' as status_final;