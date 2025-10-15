-- CORREÇÃO DEFINITIVA DAS POLÍTICAS RLS
-- Resolver o problema de acesso aos dados reais da tabela profiles

-- 1. Primeiro, vamos ver o que temos atualmente
SELECT 'DIAGNÓSTICO_INICIAL' as step, 'Verificando usuários existentes' as description;
SELECT count(*) as total_users FROM profiles;

-- 2. Verificar políticas RLS atuais
SELECT 'POLÍTICAS_ATUAIS' as step, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. REMOVER TODAS as políticas RLS problemáticas da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- 4. CRIAR POLÍTICAS RLS SIMPLES E FUNCIONAIS

-- Política para admins: acesso total
CREATE POLICY "admin_full_access" ON profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- Política para usuários: podem ver seu próprio perfil
CREATE POLICY "users_own_profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Política para usuários: podem atualizar seu próprio perfil
CREATE POLICY "users_update_own" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 5. POLÍTICA ESPECIAL: Permitir acesso via service_role (para Edge Functions)
CREATE POLICY "service_role_access" ON profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. POLÍTICA TEMPORÁRIA: Permitir leitura para usuários autenticados (para debug)
CREATE POLICY "temp_authenticated_read" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- 7. Verificar se as políticas foram criadas
SELECT 'POLÍTICAS_NOVAS' as step, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 8. Testar acesso aos dados
SELECT 'TESTE_ACESSO' as step, count(*) as usuarios_visiveis FROM profiles;

-- 9. Mostrar alguns usuários para confirmar
SELECT 'DADOS_EXEMPLO' as step, id, email, full_name, role FROM profiles LIMIT 3;