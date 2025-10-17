-- VERIFICAÇÃO FINAL DO STATUS DO USUÁRIO painel@ekklesia.com
-- Executar para confirmar se o usuário está funcionando corretamente

-- 1. Verificar usuário em auth.users
SELECT 
    'AUTH.USERS STATUS' as check_type,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at,
    updated_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'painel@ekklesia.com';

-- 2. Verificar perfil em profiles
SELECT 
    'PROFILES STATUS' as check_type,
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'painel@ekklesia.com';

-- 3. Verificar se há sincronização entre auth e profiles
SELECT 
    'SYNC CHECK' as check_type,
    CASE 
        WHEN au.id = p.id THEN 'SINCRONIZADO'
        ELSE 'DESSINCRONIZADO'
    END as sync_status,
    au.email as auth_email,
    p.email as profile_email,
    au.id as auth_id,
    p.id as profile_id
FROM auth.users au
FULL OUTER JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com' OR p.email = 'painel@ekklesia.com';

-- 4. Testar políticas RLS - verificar se o usuário seria visível
SELECT 
    'RLS TEST' as check_type,
    COUNT(*) as visible_profiles
FROM public.profiles 
WHERE email = 'painel@ekklesia.com';

-- 5. Listar todos os usuários para comparação
SELECT 
    'ALL USERS' as check_type,
    email,
    role,
    created_at
FROM public.profiles 
ORDER BY created_at DESC
LIMIT 10;