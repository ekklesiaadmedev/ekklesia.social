-- CORREÇÃO CRÍTICA: DEFINIR ROLE CORRETO PARA painel@ekklesia.com
-- O usuário precisa ter role 'panel' para acessar a rota /painel

-- 1. Verificar estado atual do usuário
SELECT 
    'ESTADO ATUAL' as info,
    au.email,
    p.role as role_atual,
    p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 2. Atualizar role do usuário painel@ekklesia.com para 'panel'
UPDATE public.profiles 
SET 
    role = 'panel',
    updated_at = NOW()
WHERE email = 'painel@ekklesia.com';

-- 3. Verificar se a atualização funcionou
SELECT 
    'APÓS CORREÇÃO' as info,
    au.email,
    p.role as role_corrigido,
    p.full_name,
    p.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 4. Verificar se o role 'panel' está permitido na constraint
SELECT 
    'CONSTRAINT CHECK' as info,
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'profiles' AND conname = 'profiles_role_check';

-- 5. Listar todos os roles válidos
SELECT 
    'ROLES VÁLIDOS' as info,
    unnest(ARRAY['admin', 'triage', 'service', 'user', 'panel']) as roles_permitidos;

-- 6. Verificar se há outros usuários com role 'panel'
SELECT 
    'USUÁRIOS COM ROLE PANEL' as info,
    email,
    full_name,
    created_at
FROM public.profiles
WHERE role = 'panel'
ORDER BY created_at;