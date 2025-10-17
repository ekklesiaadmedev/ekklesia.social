-- CORREÇÃO CRÍTICA DE SEGURANÇA - HABILITAR RLS E CRIAR POLÍTICAS RESTRITIVAS
-- Data: 2024-01-XX
-- Descrição: Corrige exposição pública de dados pessoais e informações da equipe
-- PRIORIDADE MÁXIMA: Dados pessoais expostos publicamente

-- =====================================================
-- 1. HABILITAR RLS NAS TABELAS CRÍTICAS
-- =====================================================

-- Habilitar RLS na tabela services (se não estiver habilitado)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela tickets (CRÍTICO - contém dados pessoais)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. REMOVER POLÍTICAS EXISTENTES PARA RECRIAR
-- =====================================================

-- Services
DROP POLICY IF EXISTS "services_select_policy" ON public.services;
DROP POLICY IF EXISTS "services_insert_policy" ON public.services;
DROP POLICY IF EXISTS "services_update_policy" ON public.services;
DROP POLICY IF EXISTS "services_delete_policy" ON public.services;

-- Tickets
DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete_policy" ON public.tickets;

-- =====================================================
-- 3. POLÍTICAS RESTRITIVAS PARA TABELA SERVICES
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
-- 4. POLÍTICAS CRÍTICAS PARA TABELA TICKETS (DADOS PESSOAIS)
-- =====================================================

-- Política RESTRITIVA para leitura de tickets (apenas usuários autenticados com roles específicos)
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

-- Política para inserção de tickets (usuários autenticados com roles específicos)
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
-- 5. VERIFICAÇÃO FINAL DE SEGURANÇA
-- =====================================================

-- Verificar se RLS está habilitado em todas as tabelas críticas
DO $$
BEGIN
    -- Verificar services
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'services' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: RLS não está habilitado na tabela services!';
    END IF;
    
    -- Verificar tickets
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'tickets' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: RLS não está habilitado na tabela tickets!';
    END IF;
    
    RAISE NOTICE 'SUCESSO: RLS habilitado em todas as tabelas críticas';
END $$;

-- =====================================================
-- 6. COMENTÁRIOS DE SEGURANÇA
-- =====================================================

COMMENT ON POLICY "services_select_policy" ON public.services IS 
'Permite leitura de serviços apenas para usuários autenticados';

COMMENT ON POLICY "tickets_select_policy" ON public.tickets IS 
'CRÍTICO: Protege dados pessoais dos clientes (nome, CPF, telefone, email) - apenas roles autorizados podem acessar';

COMMENT ON TABLE public.tickets IS 
'TABELA CRÍTICA: Contém dados pessoais sensíveis (PII) - acesso restrito por RLS';

-- =====================================================
-- 7. LOG DE AUDITORIA DA CORREÇÃO
-- =====================================================

INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    action,
    entity,
    entity_id,
    details
) VALUES (
    auth.uid(),
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    'SECURITY_FIX',
    'RLS_POLICIES',
    'critical_security_fix',
    jsonb_build_object(
        'description', 'Correção crítica de segurança - habilitação de RLS e políticas restritivas',
        'tables_affected', ARRAY['services', 'tickets'],
        'security_level', 'CRITICAL',
        'data_protected', ARRAY['customer_personal_info', 'staff_information']
    )
);

-- =====================================================
-- 8. RELATÓRIO FINAL
-- =====================================================

SELECT 
    'RELATÓRIO DE SEGURANÇA - CORREÇÃO APLICADA' as status,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO ✓'
        ELSE 'RLS DESABILITADO ✗'
    END as rls_status,
    (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = pg_tables.tablename
    ) as total_policies
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'tickets', 'profiles', 'audit_logs')
ORDER BY tablename;