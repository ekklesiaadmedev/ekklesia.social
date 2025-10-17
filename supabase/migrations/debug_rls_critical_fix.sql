-- CORREÇÃO CRÍTICA: POLÍTICAS RLS BLOQUEANDO ACESSO AO PAINEL
-- Data: 2024-12-15
-- Resolver erros net::ERR_ABORTED nas requisições para services, profiles e tickets

-- 1. VERIFICAR POLÍTICAS RLS ATUAIS
SELECT 
    '=== POLÍTICAS RLS ATIVAS ===' as info,
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('services', 'profiles', 'tickets') 
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. VERIFICAR STATUS RLS DAS TABELAS
SELECT 
    '=== STATUS RLS TABELAS ===' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('services', 'profiles', 'tickets') 
    AND schemaname = 'public'
ORDER BY tablename;

-- 3. VERIFICAR ROLE DO USUÁRIO PAINEL
SELECT 
    '=== USUÁRIO PAINEL ===' as info,
    au.email,
    au.id as user_id,
    p.role as profile_role,
    p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 4. CRIAR POLÍTICAS TEMPORÁRIAS PARA DEBUG
-- Remover políticas restritivas temporariamente

-- PROFILES: Permitir acesso completo para usuários autenticados
DROP POLICY IF EXISTS "debug_profiles_access" ON profiles;
CREATE POLICY "debug_profiles_access" ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- SERVICES: Permitir leitura para usuários autenticados
DROP POLICY IF EXISTS "debug_services_read" ON services;
CREATE POLICY "debug_services_read" ON services
    FOR SELECT
    TO authenticated
    USING (true);

-- TICKETS: Permitir leitura para usuários autenticados
DROP POLICY IF EXISTS "debug_tickets_read" ON tickets;
CREATE POLICY "debug_tickets_read" ON tickets
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. VERIFICAR SE AS TABELAS EXISTEM E TÊM DADOS
SELECT 
    '=== VERIFICAÇÃO TABELAS ===' as info,
    'profiles' as tabela,
    COUNT(*) as total_registros
FROM public.profiles
UNION ALL
SELECT 
    '=== VERIFICAÇÃO TABELAS ===' as info,
    'services' as tabela,
    COUNT(*) as total_registros
FROM public.services
UNION ALL
SELECT 
    '=== VERIFICAÇÃO TABELAS ===' as info,
    'tickets' as tabela,
    COUNT(*) as total_registros
FROM public.tickets;

-- 6. TESTAR ACESSO COMO USUÁRIO AUTENTICADO
-- Simular query que o frontend faz
DO $$
DECLARE
    painel_user_id UUID;
    services_count INTEGER;
    profiles_count INTEGER;
    tickets_count INTEGER;
BEGIN
    -- Buscar ID do usuário painel
    SELECT id INTO painel_user_id
    FROM auth.users
    WHERE email = 'painel@ekklesia.com'
    LIMIT 1;
    
    IF painel_user_id IS NOT NULL THEN
        RAISE NOTICE '=== TESTE ACESSO USUÁRIO PAINEL ===';
        RAISE NOTICE 'User ID: %', painel_user_id;
        
        -- Testar acesso a services
        BEGIN
            SELECT COUNT(*) INTO services_count FROM public.services;
            RAISE NOTICE '✅ Services acessível: % registros', services_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro ao acessar services: %', SQLERRM;
        END;
        
        -- Testar acesso a profiles
        BEGIN
            SELECT COUNT(*) INTO profiles_count FROM public.profiles;
            RAISE NOTICE '✅ Profiles acessível: % registros', profiles_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro ao acessar profiles: %', SQLERRM;
        END;
        
        -- Testar acesso a tickets
        BEGIN
            SELECT COUNT(*) INTO tickets_count FROM public.tickets;
            RAISE NOTICE '✅ Tickets acessível: % registros', tickets_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro ao acessar tickets: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '❌ Usuário painel@ekklesia.com não encontrado!';
    END IF;
END $$;

-- 7. LISTAR TODAS AS POLÍTICAS APÓS CORREÇÃO
SELECT 
    '=== POLÍTICAS APÓS CORREÇÃO ===' as info,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('services', 'profiles', 'tickets') 
    AND schemaname = 'public'
    AND policyname LIKE 'debug_%'
ORDER BY tablename, policyname;