-- CORREÇÃO CRÍTICA DE SEGURANÇA - EMERGENCIAL
-- Data: 2024-01-XX
-- Habilitar RLS e criar políticas básicas para proteger dados pessoais IMEDIATAMENTE

-- Habilitar RLS nas tabelas críticas
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "services_select_policy" ON public.services;
DROP POLICY IF EXISTS "services_insert_policy" ON public.services;
DROP POLICY IF EXISTS "services_update_policy" ON public.services;
DROP POLICY IF EXISTS "services_delete_policy" ON public.services;

DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete_policy" ON public.tickets;

-- POLÍTICAS PARA SERVICES (apenas usuários autenticados)
CREATE POLICY "services_select_policy" ON public.services
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "services_insert_policy" ON public.services
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "services_update_policy" ON public.services
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "services_delete_policy" ON public.services
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- POLÍTICAS CRÍTICAS PARA TICKETS (proteger dados pessoais)
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

CREATE POLICY "tickets_delete_policy" ON public.tickets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Verificar se RLS foi habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'tickets')
ORDER BY tablename;