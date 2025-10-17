-- CORREÇÃO CRÍTICA DE SEGURANÇA - HABILITAR RLS E CRIAR POLÍTICAS RESTRITIVAS
-- Data: 2024-01-XX
-- Descrição: Corrige exposição pública de dados pessoais e informações da equipe

-- =====================================================
-- 1. HABILITAR RLS NAS TABELAS CRÍTICAS
-- =====================================================

-- Habilitar RLS na tabela services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela tickets (CRÍTICO - contém dados pessoais)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. POLÍTICAS PARA TABELA SERVICES
-- =====================================================

-- Política para leitura de serviços (apenas usuários autenticados)
CREATE POLICY "services_select_policy" ON public.services
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política para inserção de serviços (apenas admins)
CREATE POLICY "services_insert_policy" ON public.services
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Política para atualização de serviços (apenas admins)
CREATE POLICY "services_update_policy" ON public.services
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Política para exclusão de serviços (apenas admins)
CREATE POLICY "services_delete_policy" ON public.services
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- 3. POLÍTICAS PARA TABELA TICKETS (DADOS PESSOAIS)
-- =====================================================

-- Política para leitura de tickets (apenas usuários autenticados com roles específicos)
CREATE POLICY "tickets_select_policy" ON public.tickets
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'triage', 'service', 'panel')
        )
    );

-- Política para inserção de tickets (usuários autenticados)
CREATE POLICY "tickets_insert_policy" ON public.tickets
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'triage', 'service', 'panel')
        )
    );

-- Política para atualização de tickets (apenas roles autorizados)
CREATE POLICY "tickets_update_policy" ON public.tickets
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'triage', 'service')
        )
    );

-- Política para exclusão de tickets (apenas admins)
CREATE POLICY "tickets_delete_policy" ON public.tickets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- 4. REFORÇAR POLÍTICAS DA TABELA PROFILES
-- =====================================================

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Política restritiva para leitura de profiles (apenas próprio perfil ou admins)
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Política para inserção de profiles (apenas durante registro)
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Política para atualização de profiles (próprio perfil ou admin)
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Política para exclusão de profiles (apenas admins)
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON POLICY "services_select_policy" ON public.services IS 
'Permite leitura de serviços apenas para usuários autenticados';

COMMENT ON POLICY "tickets_select_policy" ON public.tickets IS 
'CRÍTICO: Protege dados pessoais dos clientes - apenas roles autorizados';

COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS 
'Protege informações da equipe - apenas próprio perfil ou admins';

-- =====================================================
-- 6. VERIFICAÇÃO DE SEGURANÇA
-- =====================================================

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as rls_forced
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'tickets', 'profiles', 'audit_logs')
ORDER BY tablename;

-- Listar todas as políticas criadas
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;