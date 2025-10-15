-- DIAGNÓSTICO DE EMERGÊNCIA PARA LISTAGEM DE USUÁRIOS
-- Executar para identificar o problema crítico

-- 1. Verificar se existem usuários na tabela
SELECT 'TOTAL_USERS' as check_type, count(*) as count FROM profiles;

-- 2. Verificar usuários sem RLS (como superuser)
SET row_security = off;
SELECT 'USERS_WITHOUT_RLS' as check_type, id, email, full_name, role FROM profiles LIMIT 5;
SET row_security = on;

-- 3. Verificar políticas RLS ativas
SELECT 
    'RLS_POLICIES' as check_type,
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

-- 4. Verificar status RLS da tabela
SELECT 
    'RLS_STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- 5. Testar query como usuário anônimo (simulando o problema)
SELECT 'ANON_USER_TEST' as check_type, current_user as current_user_role;

-- 6. Verificar se há usuários com role admin
SELECT 'ADMIN_USERS' as check_type, count(*) as admin_count 
FROM profiles 
WHERE role = 'admin';

-- 7. Verificar estrutura da tabela
SELECT 
    'TABLE_STRUCTURE' as check_type,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;