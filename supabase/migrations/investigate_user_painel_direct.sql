-- INVESTIGAÇÃO DIRETA DO USUÁRIO painel@ekklesia.com
-- Executar queries diretas para diagnosticar o problema

-- Query 1: Verificar usuário na tabela auth.users
SELECT 
    'VERIFICANDO AUTH.USERS' as status,
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'painel@ekklesia.com';

-- Query 2: Verificar perfil na tabela profiles  
SELECT 
    'VERIFICANDO PROFILES' as status,
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE email = 'painel@ekklesia.com';

-- Query 3: Listar últimos usuários criados para comparação
SELECT 
    'ULTIMOS USUARIOS' as status,
    email,
    role,
    created_at
FROM public.profiles 
ORDER BY created_at DESC
LIMIT 5;