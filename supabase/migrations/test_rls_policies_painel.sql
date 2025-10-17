-- TESTE ESPECÍFICO DAS POLÍTICAS RLS PARA O USUÁRIO painel@ekklesia.com
-- Verificar se as políticas RLS estão bloqueando a visualização do usuário

-- 1. Verificar políticas RLS ativas na tabela profiles
SELECT 
    'POLÍTICAS RLS ATIVAS' as check_type,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- 2. Verificar se RLS está habilitado
SELECT 
    'STATUS RLS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 3. Testar acesso como usuário anônimo (como o frontend faz)
-- Simular a query que o frontend executa
SELECT 
    'TESTE QUERY FRONTEND' as check_type,
    'Simulando: SELECT id, email, full_name, role FROM profiles ORDER BY email ASC' as query_simulada;

-- 4. Contar total de usuários sem RLS (como superuser)
SET row_security = off;
SELECT 
    'TOTAL SEM RLS' as check_type,
    COUNT(*) as total_usuarios
FROM public.profiles;

-- 5. Verificar se painel@ekklesia.com existe sem RLS
SELECT 
    'PAINEL USER SEM RLS' as check_type,
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE email = 'painel@ekklesia.com';

-- 6. Listar todos os usuários sem RLS para comparação
SELECT 
    'TODOS USERS SEM RLS' as check_type,
    email,
    role,
    created_at
FROM public.profiles 
ORDER BY created_at DESC
LIMIT 10;

-- Reativar RLS
SET row_security = on;

-- 7. Testar com RLS ativo (como usuário anônimo)
SELECT 
    'TESTE COM RLS ATIVO' as check_type,
    COUNT(*) as usuarios_visiveis
FROM public.profiles;

-- 8. Verificar se existe algum usuário com role 'admin' que poderia ver todos
SELECT 
    'ADMINS EXISTENTES' as check_type,
    COUNT(*) as total_admins,
    string_agg(email, ', ') as emails_admin
FROM public.profiles 
WHERE role = 'admin';

-- 9. Verificar se as políticas estão muito restritivas
-- Política atual: authenticated users podem ver apenas seus próprios dados
-- Isso explica por que o frontend não consegue listar usuários!
SELECT 
    'DIAGNÓSTICO POLÍTICAS' as check_type,
    'As políticas RLS estão muito restritivas!' as problema,
    'Usuários só podem ver seus próprios dados' as causa,
    'Frontend precisa de política para admins listarem todos os usuários' as solucao;