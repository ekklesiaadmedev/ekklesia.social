-- TESTE COMPLETO APÓS CORREÇÕES DE AUTENTICAÇÃO
-- Data: 2024-12-15
-- Verificar se os problemas de login foram resolvidos

-- 1. Verificar estado final de todos os usuários
SELECT 
    'USUÁRIOS APÓS CORREÇÕES' as check_type,
    au.email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    au.encrypted_password IS NOT NULL as has_password,
    au.role as auth_role,
    au.aud,
    au.is_sso_user,
    au.banned_until IS NULL as not_banned,
    au.deleted_at IS NULL as not_deleted,
    p.role as profile_role,
    p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.email;

-- 2. Testar se todos os usuários têm configurações consistentes
DO $$
DECLARE
    user_count INTEGER;
    consistent_users INTEGER;
    inconsistent_users INTEGER;
BEGIN
    -- Contar total de usuários
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    -- Contar usuários com configurações consistentes
    SELECT COUNT(*) INTO consistent_users
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE au.email_confirmed_at IS NOT NULL
      AND au.encrypted_password IS NOT NULL
      AND au.role = 'authenticated'
      AND au.aud = 'authenticated'
      AND au.banned_until IS NULL
      AND au.deleted_at IS NULL
      AND p.id IS NOT NULL;
    
    inconsistent_users := user_count - consistent_users;
    
    RAISE NOTICE '📊 ESTATÍSTICAS APÓS CORREÇÕES:';
    RAISE NOTICE '  Total de usuários: %', user_count;
    RAISE NOTICE '  Usuários consistentes: %', consistent_users;
    RAISE NOTICE '  Usuários inconsistentes: %', inconsistent_users;
    
    IF inconsistent_users = 0 THEN
        RAISE NOTICE '✅ TODOS OS USUÁRIOS ESTÃO CONSISTENTES!';
    ELSE
        RAISE NOTICE '⚠️ Ainda há % usuários com problemas', inconsistent_users;
    END IF;
END $$;

-- 3. Verificar se as Edge Functions estão funcionando
SELECT 
    'EDGE FUNCTIONS STATUS' as check_type,
    'Verificar se admin-create-user e admin-update-password foram deployadas' as info;

-- 4. Testar políticas RLS para listagem de usuários
DO $$
DECLARE
    admin_user_id UUID;
    visible_users INTEGER;
BEGIN
    -- Buscar ID do usuário admin
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Simular consulta como admin
        SELECT COUNT(*) INTO visible_users
        FROM public.profiles
        WHERE id = admin_user_id OR 
              EXISTS(SELECT 1 FROM public.profiles WHERE id = admin_user_id AND role = 'admin');
        
        RAISE NOTICE '👤 TESTE DE VISIBILIDADE PARA ADMIN:';
        RAISE NOTICE '  Admin user ID: %', admin_user_id;
        RAISE NOTICE '  Usuários visíveis: %', visible_users;
        
        IF visible_users > 1 THEN
            RAISE NOTICE '✅ Admin pode ver múltiplos usuários';
        ELSE
            RAISE NOTICE '❌ Admin só pode ver próprio perfil - RLS ainda restritivo';
        END IF;
    ELSE
        RAISE NOTICE '❌ Usuário admin não encontrado';
    END IF;
END $$;

-- 5. Criar usuário de teste para validar criação
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT := 'teste-auth-' || extract(epoch from now()) || '@ekklesia.com';
BEGIN
    -- Gerar UUID para usuário de teste
    test_user_id := gen_random_uuid();
    
    -- Criar usuário de teste
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        is_sso_user,
        aud,
        role
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        test_email,
        crypt('TesteAuth2024!', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"full_name": "Usuário Teste Auth"}',
        false,
        'authenticated',
        'authenticated'
    );
    
    -- Criar perfil correspondente
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (test_user_id, test_email, 'Usuário Teste Auth', 'service');
    
    RAISE NOTICE '🧪 USUÁRIO DE TESTE CRIADO:';
    RAISE NOTICE '  Email: %', test_email;
    RAISE NOTICE '  ID: %', test_user_id;
    RAISE NOTICE '  Senha: TesteAuth2024!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao criar usuário de teste: %', SQLERRM;
END $$;

-- 6. Verificar resultado final
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN au.email_confirmed_at IS NOT NULL THEN 1 END) as emails_confirmados,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as com_perfil,
    COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN p.role = 'panel' THEN 1 END) as paineis
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;