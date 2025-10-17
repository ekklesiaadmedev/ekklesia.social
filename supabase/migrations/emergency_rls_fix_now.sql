-- CORREÇÃO EMERGENCIAL DE SEGURANÇA - SEM DEADLOCK
-- Aplicar RLS de forma segura para proteger dados pessoais

-- Habilitar RLS na tabela services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela tickets (CRÍTICO - contém dados pessoais)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes e recriar
DROP POLICY IF EXISTS "emergency_services_access" ON public.services;
DROP POLICY IF EXISTS "emergency_tickets_protection" ON public.tickets;

-- Política básica para services (apenas usuários autenticados)
CREATE POLICY "emergency_services_access" ON public.services
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Política crítica para tickets (proteger dados pessoais)
CREATE POLICY "emergency_tickets_protection" ON public.tickets
    FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'triage', 'service', 'panel')
        )
    );

-- Verificação final
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'PROTEGIDO'
        ELSE 'EXPOSTO'
    END as status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'tickets')
ORDER BY tablename;