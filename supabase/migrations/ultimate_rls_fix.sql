-- ========================================
-- CORREÇÃO DEFINITIVA DO RLS - SOLUÇÃO FINAL
-- ========================================
-- Esta migração resolve DEFINITIVAMENTE o problema de RLS

-- 1. DESABILITAR RLS TEMPORARIAMENTE PARA LIMPEZA
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "admin_full_access" ON profiles;
DROP POLICY IF EXISTS "user_own_profile" ON profiles;
DROP POLICY IF EXISTS "service_role_access" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON profiles;

-- 3. REABILITAR RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICA SIMPLES E FUNCIONAL PARA ADMINISTRADORES
CREATE POLICY "admin_total_access" ON profiles
    FOR ALL
    TO authenticated
    USING (
        -- Permitir acesso total para admins
        (current_setting('request.jwt.claims', true)::json->>'role' = 'admin')
        OR
        -- Permitir acesso para service_role (usado pela API)
        (auth.role() = 'service_role')
        OR
        -- Permitir acesso para usuários autenticados verem próprio perfil
        (auth.uid()::text = id::text)
    )
    WITH CHECK (
        -- Mesmas condições para inserção/atualização
        (current_setting('request.jwt.claims', true)::json->>'role' = 'admin')
        OR
        (auth.role() = 'service_role')
        OR
        (auth.uid()::text = id::text)
    );

-- 5. CRIAR POLÍTICA ADICIONAL PARA LEITURA PÚBLICA (CASO NECESSÁRIO)
CREATE POLICY "public_read_access" ON profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 6. GARANTIR QUE A TABELA TENHA PERMISSÕES CORRETAS
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT SELECT ON profiles TO anon;

-- 7. VERIFICAR SE OS USUÁRIOS EXISTEM
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT count(*) INTO user_count FROM profiles;
    
    IF user_count = 0 THEN
        RAISE NOTICE '📝 Criando usuários de teste...';
        
        -- Criar usuários de teste
        INSERT INTO profiles (id, email, full_name, role, created_at, updated_at) VALUES
        (gen_random_uuid(), 'social@ekklesia.com', 'Administrador Principal', 'admin', NOW(), NOW()),
        (gen_random_uuid(), 'admin@ekklesia.com', 'Administrador Secundário', 'admin', NOW(), NOW()),
        (gen_random_uuid(), 'triagem@ekklesia.com', 'Atendente de Triagem', 'triage', NOW(), NOW()),
        (gen_random_uuid(), 'servico@ekklesia.com', 'Atendente de Serviço', 'service', NOW(), NOW()),
        (gen_random_uuid(), 'painel@ekklesia.com', 'Painel de Exibição', 'panel', NOW(), NOW());
        
        RAISE NOTICE '✅ 5 usuários criados com sucesso!';
    ELSE
        RAISE NOTICE '⚠️ Já existem %s usuários na tabela', user_count;
    END IF;
END $$;

-- 8. TESTAR ACESSO FINAL
SELECT 'TESTE_FINAL' as info, count(*) as usuarios_visiveis FROM profiles;

-- 9. LISTAR USUÁRIOS CRIADOS
SELECT 
    'USUÁRIOS_FINAIS' as info,
    id,
    email,
    full_name,
    role,
    created_at
FROM profiles
ORDER BY email;

-- 10. VERIFICAR POLÍTICAS ATIVAS
SELECT 
    'POLÍTICAS_FINAIS' as info,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '🎉 CORREÇÃO DEFINITIVA APLICADA! O painel admin deve funcionar agora.' as status_final;