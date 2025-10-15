-- CORREÇÃO COMPLETA DE TODAS AS POLÍTICAS RLS
-- Este script corrige o acesso a TODAS as tabelas (profiles, services, tickets)

-- ========================================
-- 1. TABELA SERVICES
-- ========================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Admin can manage all services" ON public.services;
DROP POLICY IF EXISTS "Users can view services" ON public.services;
DROP POLICY IF EXISTS "Service role can manage all services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can read services" ON public.services;
DROP POLICY IF EXISTS "Admin users can manage all services" ON public.services;

-- Criar política super permissiva para administradores
CREATE POLICY "Super admin access to services"
ON public.services
FOR ALL
USING (
  -- Permitir para service_role (Edge Functions)
  auth.role() = 'service_role'
  OR
  -- Permitir para usuários admin na tabela profiles
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Permitir para emails específicos (fallback)
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN ('social@ekklesia.com', 'admin@ekklesia.com')
  )
)
WITH CHECK (
  -- Mesma lógica para inserções/atualizações
  auth.role() = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN ('social@ekklesia.com', 'admin@ekklesia.com')
  )
);

-- Política para usuários autenticados lerem serviços
CREATE POLICY "Authenticated users can read services"
ON public.services
FOR SELECT
USING (auth.role() = 'authenticated');

-- ========================================
-- 2. TABELA TICKETS
-- ========================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Admin can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Service role can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can read tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admin users can manage all tickets" ON public.tickets;

-- Criar política super permissiva para administradores
CREATE POLICY "Super admin access to tickets"
ON public.tickets
FOR ALL
USING (
  -- Permitir para service_role (Edge Functions)
  auth.role() = 'service_role'
  OR
  -- Permitir para usuários admin na tabela profiles
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Permitir para emails específicos (fallback)
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN ('social@ekklesia.com', 'admin@ekklesia.com')
  )
)
WITH CHECK (
  -- Mesma lógica para inserções/atualizações
  auth.role() = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN ('social@ekklesia.com', 'admin@ekklesia.com')
  )
);

-- Política para usuários autenticados lerem tickets
CREATE POLICY "Authenticated users can read tickets"
ON public.tickets
FOR SELECT
USING (auth.role() = 'authenticated');

-- ========================================
-- 3. GARANTIR RLS HABILITADO
-- ========================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. CONCEDER PERMISSÕES NECESSÁRIAS
-- ========================================

-- Services
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.services TO authenticated, service_role;
GRANT SELECT ON public.services TO anon;

-- Tickets
GRANT ALL ON public.tickets TO authenticated, service_role;
GRANT SELECT ON public.tickets TO anon;

-- ========================================
-- 5. VERIFICAÇÃO FINAL
-- ========================================

DO $$
DECLARE
    services_count INTEGER;
    tickets_count INTEGER;
    profiles_count INTEGER;
    admin_user_id UUID;
    test_result TEXT := '';
BEGIN
    -- Verificar se usuário admin existe
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        test_result := test_result || '✅ Usuário admin encontrado: ' || admin_user_id || E'\n';
        
        -- Testar acesso aos services
        BEGIN
            SELECT COUNT(*) INTO services_count FROM public.services;
            test_result := test_result || '✅ Services acessíveis: ' || services_count || ' registros' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro no acesso aos services: ' || SQLERRM || E'\n';
        END;
        
        -- Testar acesso aos tickets
        BEGIN
            SELECT COUNT(*) INTO tickets_count FROM public.tickets;
            test_result := test_result || '✅ Tickets acessíveis: ' || tickets_count || ' registros' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro no acesso aos tickets: ' || SQLERRM || E'\n';
        END;
        
        -- Testar acesso aos profiles
        BEGIN
            SELECT COUNT(*) INTO profiles_count FROM public.profiles;
            test_result := test_result || '✅ Profiles acessíveis: ' || profiles_count || ' registros' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro no acesso aos profiles: ' || SQLERRM || E'\n';
        END;
        
    ELSE
        test_result := test_result || '❌ Usuário admin não encontrado!' || E'\n';
    END IF;
    
    RAISE NOTICE E'\n🔍 VERIFICAÇÃO COMPLETA RLS:\n%', test_result;
END $$;

-- ========================================
-- 6. LISTAR TODAS AS POLÍTICAS ATIVAS
-- ========================================

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'services', 'tickets')
ORDER BY tablename, policyname;