-- ========================================
-- DEBUG FINAL - INVESTIGAR PROBLEMA RLS
-- ========================================

-- 1. VERIFICAR SE OS USUÁRIOS EXISTEM NA TABELA
SELECT 'USUÁRIOS_NA_TABELA' as info, count(*) as total FROM profiles;

-- 2. LISTAR TODOS OS USUÁRIOS (SEM RLS)
SET row_security = off;
SELECT 
    'USUÁRIOS_SEM_RLS' as info,
    id,
    email,
    full_name,
    role,
    created_at
FROM profiles
ORDER BY email;
SET row_security = on;

-- 3. VERIFICAR STATUS DO RLS
SELECT 
    'STATUS_RLS' as info,
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename = 'profiles';

-- 4. LISTAR POLÍTICAS ATIVAS
SELECT 
    'POLÍTICAS_ATIVAS' as info,
    policyname,
    cmd,
    permissive,
    roles,
    qual as condicao
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 5. TESTAR ACESSO COM RLS HABILITADO
SELECT 'TESTE_COM_RLS' as info, count(*) as usuarios_visiveis FROM profiles;

-- 6. VERIFICAR CONTEXTO ATUAL
SELECT 
    'CONTEXTO_ATUAL' as info,
    current_user as usuario_atual,
    current_setting('role') as role_atual,
    current_setting('request.jwt.claims', true) as jwt_claims;

-- 7. SIMULAR ACESSO COMO ADMIN
DO $$
BEGIN
    -- Tentar definir contexto de admin
    PERFORM set_config('request.jwt.claims', '{"role": "admin", "email": "social@ekklesia.com"}', true);
    
    -- Testar acesso
    RAISE NOTICE 'Testando acesso como admin...';
END $$;

SELECT 'TESTE_COMO_ADMIN' as info, count(*) as usuarios_visiveis FROM profiles;

-- 8. VERIFICAR PERMISSÕES DA TABELA
SELECT 
    'PERMISSÕES_TABELA' as info,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'profiles'
ORDER BY grantee, privilege_type;

-- 9. VERIFICAR SE A TABELA ESTÁ NO SCHEMA CORRETO
SELECT 
    'SCHEMA_TABELA' as info,
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'profiles';

-- 10. TENTAR DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

SELECT 'TESTE_SEM_RLS_TEMPORÁRIO' as info, count(*) as usuarios_visiveis FROM profiles;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

SELECT '🔍 DEBUG FINAL CONCLUÍDO! Analise os resultados acima.' as status_final;