-- DIAGNÓSTICO CRÍTICO DO USUÁRIO painel@ekklesia.com
-- Data: 2024-01-XX
-- Investigar por que o usuário não aparece na aplicação e não consegue fazer login

-- 1. Verificar se o usuário existe na tabela auth.users
SELECT 
    'AUTH.USERS' as tabela,
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_user_meta_data,
    is_sso_user,
    deleted_at
FROM auth.users 
WHERE email = 'painel@ekklesia.com';

-- 2. Verificar se o perfil existe na tabela profiles
SELECT 
    'PROFILES' as tabela,
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'painel@ekklesia.com';

-- 3. Verificar todos os usuários na tabela profiles para comparação
SELECT 
    'TODOS_PROFILES' as tabela,
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar se há inconsistências entre auth.users e profiles
SELECT 
    'INCONSISTENCIAS' as tipo,
    au.id as auth_id,
    au.email as auth_email,
    p.id as profile_id,
    p.email as profile_email,
    p.role as profile_role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com'
   OR p.email = 'painel@ekklesia.com';

-- 5. Verificar políticas RLS na tabela profiles
SELECT 
    'POLITICAS_RLS' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;