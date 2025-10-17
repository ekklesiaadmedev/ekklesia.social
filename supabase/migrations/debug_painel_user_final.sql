-- DIAGNÓSTICO COMPLETO DO USUÁRIO painel@ekklesia.com
-- Verificar todos os dados relacionados ao acesso ao painel

-- 1. Verificar se o usuário existe em auth.users
SELECT 
    'AUTH.USERS' as tabela,
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data,
    user_metadata
FROM auth.users 
WHERE email = 'painel@ekklesia.com';

-- 2. Verificar se existe perfil em profiles
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

-- 3. Verificar se há inconsistência entre auth.users e profiles
SELECT 
    'INCONSISTÊNCIA' as tipo,
    au.id as auth_id,
    p.id as profile_id,
    au.email as auth_email,
    p.email as profile_email,
    p.role as profile_role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 4. Se não existe perfil, criar um
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'Usuário do Painel',
    'panel',
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'painel@ekklesia.com'
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- 5. Se existe perfil mas role está errado, corrigir
UPDATE public.profiles 
SET 
    role = 'panel',
    updated_at = NOW()
WHERE email = 'painel@ekklesia.com'
AND role != 'panel';

-- 6. Verificar resultado final
SELECT 
    'RESULTADO FINAL' as info,
    au.id,
    au.email,
    p.role,
    p.full_name,
    CASE 
        WHEN p.role = 'panel' THEN 'ACESSO PERMITIDO'
        ELSE 'ACESSO NEGADO'
    END as status_acesso
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 7. Verificar políticas RLS para profiles
SELECT 
    'POLÍTICAS RLS' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';