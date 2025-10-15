-- Debug: Verificar acesso à tabela profiles
-- Este arquivo será usado para diagnosticar problemas de RLS

-- 1. Verificar políticas RLS da tabela profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- 2. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 3. Contar registros na tabela profiles (bypass RLS)
SET row_security = off;
SELECT COUNT(*) as total_profiles FROM profiles;
SET row_security = on;

-- 4. Tentar selecionar registros com RLS ativo
SELECT id, email, full_name, role, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Verificar usuário atual e suas permissões
SELECT current_user, current_role;

-- 6. Verificar se existe algum usuário admin
SELECT id, email, role 
FROM profiles 
WHERE role = 'admin' 
LIMIT 5;