-- PATCH DE SEGURANÇA EMERGENCIAL - CORREÇÃO CRÍTICA RLS
-- Data: 2024-01-XX
-- Descrição: Corrige exposição pública IMEDIATA de dados pessoais
-- ALERTA: Dados de clientes e equipe expostos publicamente!

-- =====================================================
-- CORREÇÃO IMEDIATA - HABILITAR RLS
-- =====================================================

-- Habilitar RLS nas tabelas críticas
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE EMERGÊNCIA - ACESSO RESTRITO
-- =====================================================

-- SERVICES: Apenas usuários autenticados
DROP POLICY IF EXISTS "emergency_services_policy" ON public.services;
CREATE POLICY "emergency_services_policy" ON public.services
    FOR ALL
    USING (auth.role() = 'authenticated');

-- TICKETS: CRÍTICO - Proteger dados pessoais
DROP POLICY IF EXISTS "emergency_tickets_policy" ON public.tickets;
CREATE POLICY "emergency_tickets_policy" ON public.tickets
    FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'triage', 'service', 'panel')
        )
    );

-- =====================================================
-- VERIFICAÇÃO IMEDIATA
-- =====================================================

-- Confirmar RLS habilitado
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'PROTEGIDO ✓'
        ELSE 'EXPOSTO ✗ CRÍTICO!'
    END as status_seguranca
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'tickets')
ORDER BY tablename;