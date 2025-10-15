-- ========================================
-- CORREÇÃO DEFINITIVA DAS POLÍTICAS RLS
-- ========================================
-- Este script resolve definitivamente o problema de RLS
-- que impede o carregamento dos usuários no painel admin

-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES (LIMPEZA TOTAL)
DROP POLICY IF EXISTS "admin_all_access" ON profiles;
DROP POLICY IF EXISTS "users_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own" ON profiles;
DROP POLICY IF EXISTS "service_role_access" ON profiles;
DROP POLICY IF EXISTS "temp_authenticated_read" ON profiles;
DROP POLICY IF EXISTS "admin_full_access" ON profiles;
DROP POLICY IF EXISTS "user_own_profile" ON profiles;
DROP POLICY IF EXISTS "authenticated_read_profiles" ON profiles;

-- 2. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS SIMPLES E FUNCIONAIS

-- Política 1: Admins podem fazer tudo
CREATE POLICY "admin_full_access" ON profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- Política 2: Usuários podem ver e editar apenas seu próprio perfil
CREATE POLICY "users_own_profile" ON profiles
    FOR ALL
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Política 3: Service role tem acesso total (para Edge Functions)
CREATE POLICY "service_role_full_access" ON profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. GARANTIR QUE O USUÁRIO ADMIN EXISTE E TEM ROLE CORRETO
DO $$
DECLARE
    admin_user_id UUID;
    admin_exists BOOLEAN := FALSE;
BEGIN
    -- Buscar usuário admin
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Verificar se perfil existe
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id = admin_user_id) INTO admin_exists;
        
        IF admin_exists THEN
            -- Atualizar role para admin
            UPDATE profiles 
            SET role = 'admin', updated_at = NOW()
            WHERE id = admin_user_id;
            RAISE NOTICE '✅ Perfil admin atualizado com sucesso!';
        ELSE
            -- Criar perfil admin
            INSERT INTO profiles (id, email, full_name, role)
            VALUES (admin_user_id, 'social@ekklesia.com', 'Administrador', 'admin');
            RAISE NOTICE '✅ Perfil admin criado com sucesso!';
        END IF;
    ELSE
        RAISE NOTICE '❌ ATENÇÃO: Usuário social@ekklesia.com não encontrado na auth.users!';
        RAISE NOTICE '   Você precisa criar este usuário no Supabase Auth primeiro.';
    END IF;
END $$;

-- 5. TESTAR AS POLÍTICAS
DO $$
DECLARE
    admin_user_id UUID;
    test_result TEXT := '';
    profiles_count INTEGER;
BEGIN
    -- Buscar usuário admin
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        test_result := test_result || '✅ Usuário admin encontrado: ' || admin_user_id || E'\n';
        
        -- Testar acesso aos profiles
        BEGIN
            SELECT COUNT(*) INTO profiles_count FROM profiles;
            test_result := test_result || '✅ Profiles acessíveis: ' || profiles_count || ' registros' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro no acesso aos profiles: ' || SQLERRM || E'\n';
        END;
        
        -- Verificar se o admin tem role correto
        BEGIN
            SELECT COUNT(*) INTO profiles_count FROM profiles WHERE id = admin_user_id AND role = 'admin';
            IF profiles_count > 0 THEN
                test_result := test_result || '✅ Usuário tem role admin confirmado!' || E'\n';
            ELSE
                test_result := test_result || '❌ Usuário NÃO tem role admin!' || E'\n';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro ao verificar role admin: ' || SQLERRM || E'\n';
        END;
    ELSE
        test_result := test_result || '❌ Usuário admin não encontrado!' || E'\n';
    END IF;
    
    RAISE NOTICE E'\n🔍 TESTE DAS POLÍTICAS RLS:\n%', test_result;
END $$;

-- 6. MOSTRAR POLÍTICAS ATIVAS
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

-- 7. MOSTRAR USUÁRIOS PARA CONFIRMAÇÃO
SELECT 
    'USUÁRIOS_CADASTRADOS' as info,
    id,
    email,
    full_name,
    role,
    created_at
FROM profiles
ORDER BY email
LIMIT 10;

SELECT '🎉 CORREÇÃO RLS CONCLUÍDA! Teste o painel admin agora.' as status_final;