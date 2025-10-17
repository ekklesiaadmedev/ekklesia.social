-- DIAGNÓSTICO CRÍTICO DE AUTENTICAÇÃO
-- Investigar por que apenas social@ekklesia.com consegue fazer login

-- 1. Comparar dados entre social@ekklesia.com e painel@ekklesia.com
SELECT 
    'COMPARAÇÃO AUTH.USERS' as check_type,
    email,
    id,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    raw_user_meta_data,
    raw_app_meta_data,
    is_sso_user,
    aud,
    role,
    created_at,
    updated_at,
    last_sign_in_at,
    banned_until,
    deleted_at
FROM auth.users 
WHERE email IN ('social@ekklesia.com', 'painel@ekklesia.com')
ORDER BY email;

-- 2. Verificar diferenças nos profiles
SELECT 
    'COMPARAÇÃO PROFILES' as check_type,
    email,
    id,
    full_name,
    role,
    created_at,
    updated_at
FROM public.profiles 
WHERE email IN ('social@ekklesia.com', 'painel@ekklesia.com')
ORDER BY email;

-- 3. Verificar se há problemas de sincronização
SELECT 
    'SINCRONIZAÇÃO CHECK' as check_type,
    au.email as auth_email,
    p.email as profile_email,
    au.id as auth_id,
    p.id as profile_id,
    CASE 
        WHEN au.id = p.id THEN 'SINCRONIZADO ✅'
        ELSE 'DESSINCRONIZADO ❌'
    END as sync_status
FROM auth.users au
FULL OUTER JOIN public.profiles p ON au.id = p.id
WHERE au.email IN ('social@ekklesia.com', 'painel@ekklesia.com')
   OR p.email IN ('social@ekklesia.com', 'painel@ekklesia.com')
ORDER BY au.email, p.email;

-- 4. Verificar políticas RLS que podem estar afetando login
SELECT 
    'POLÍTICAS RLS AUTH' as check_type,
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'auth' OR (schemaname = 'public' AND tablename = 'profiles')
ORDER BY schemaname, tablename, policyname;

-- 5. Verificar configurações específicas do Supabase Auth
SELECT 
    'AUTH CONFIG' as check_type,
    'Verificar se há configurações específicas bloqueando usuários' as info;

-- 6. Testar criação de usuário simples para comparação
DO $$
DECLARE
    test_user_id UUID;
    social_user_data RECORD;
    painel_user_data RECORD;
BEGIN
    -- Buscar dados do usuário que funciona
    SELECT * INTO social_user_data
    FROM auth.users
    WHERE email = 'social@ekklesia.com';
    
    -- Buscar dados do usuário que não funciona
    SELECT * INTO painel_user_data
    FROM auth.users
    WHERE email = 'painel@ekklesia.com';
    
    RAISE NOTICE 'SOCIAL USER DATA:';
    RAISE NOTICE '  Email confirmed: %', social_user_data.email_confirmed_at IS NOT NULL;
    RAISE NOTICE '  Has password: %', social_user_data.encrypted_password IS NOT NULL;
    RAISE NOTICE '  Role: %', social_user_data.role;
    RAISE NOTICE '  Aud: %', social_user_data.aud;
    RAISE NOTICE '  Is SSO: %', social_user_data.is_sso_user;
    RAISE NOTICE '  Banned until: %', social_user_data.banned_until;
    RAISE NOTICE '  Deleted at: %', social_user_data.deleted_at;
    
    RAISE NOTICE 'PAINEL USER DATA:';
    RAISE NOTICE '  Email confirmed: %', painel_user_data.email_confirmed_at IS NOT NULL;
    RAISE NOTICE '  Has password: %', painel_user_data.encrypted_password IS NOT NULL;
    RAISE NOTICE '  Role: %', painel_user_data.role;
    RAISE NOTICE '  Aud: %', painel_user_data.aud;
    RAISE NOTICE '  Is SSO: %', painel_user_data.is_sso_user;
    RAISE NOTICE '  Banned until: %', painel_user_data.banned_until;
    RAISE NOTICE '  Deleted at: %', painel_user_data.deleted_at;
END $$;

-- 7. Verificar se há triggers ou funções que podem estar interferindo
SELECT 
    'TRIGGERS AUTH' as check_type,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
ORDER BY trigger_name;

-- 8. Listar todos os usuários para análise completa
SELECT 
    'TODOS OS USUÁRIOS' as check_type,
    email,
    email_confirmed_at IS NOT NULL as confirmed,
    encrypted_password IS NOT NULL as has_pwd,
    role,
    aud,
    created_at
FROM auth.users
ORDER BY created_at DESC;