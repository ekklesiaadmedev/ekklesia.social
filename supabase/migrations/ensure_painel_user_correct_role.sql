-- GARANTIR QUE USUÁRIO PAINEL TEM ROLE CORRETO
-- Verificar e corrigir role do usuário painel@ekklesia.com

-- 1. Verificar estado atual
SELECT 
    'ESTADO ATUAL USUÁRIO PAINEL' as info,
    au.email,
    au.id as user_id,
    p.role as current_role,
    p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 2. Garantir que o usuário tem role 'panel'
UPDATE public.profiles 
SET 
    role = 'panel',
    updated_at = NOW()
WHERE email = 'painel@ekklesia.com'
    AND role != 'panel';

-- 3. Verificar se a atualização funcionou
SELECT 
    'APÓS CORREÇÃO' as info,
    au.email,
    p.role as corrected_role,
    p.full_name,
    p.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 4. Verificar se role 'panel' está na constraint
SELECT 
    'CONSTRAINT ROLES' as info,
    pg_get_constraintdef(c.oid) as allowed_roles
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'profiles' AND conname = 'profiles_role_check';

-- 5. Listar todos os usuários com role 'panel'
SELECT 
    'USUÁRIOS COM ROLE PANEL' as info,
    email,
    full_name,
    created_at
FROM public.profiles
WHERE role = 'panel'
ORDER BY created_at;