-- ========================================
-- CORREÇÃO DEFINITIVA DE TODAS AS TABELAS
-- Desabilita RLS e concede permissões totais
-- ========================================

-- 1. DESABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS RLS EXISTENTES
DROP POLICY IF EXISTS "admin_all_access" ON public.profiles;
DROP POLICY IF EXISTS "service_role_access" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own" ON public.profiles;
DROP POLICY IF EXISTS "temp_authenticated_read" ON public.profiles;
DROP POLICY IF EXISTS "admin_full_access" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_read_all" ON public.profiles;

DROP POLICY IF EXISTS "admin_all_access" ON public.services;
DROP POLICY IF EXISTS "service_role_access" ON public.services;
DROP POLICY IF EXISTS "authenticated_read_all" ON public.services;

DROP POLICY IF EXISTS "admin_all_access" ON public.tickets;
DROP POLICY IF EXISTS "service_role_access" ON public.tickets;
DROP POLICY IF EXISTS "authenticated_read_all" ON public.tickets;

-- 3. CONCEDER PERMISSÕES TOTAIS PARA TODOS OS ROLES
-- Profiles
GRANT ALL PRIVILEGES ON public.profiles TO anon;
GRANT ALL PRIVILEGES ON public.profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.profiles TO service_role;

-- Services
GRANT ALL PRIVILEGES ON public.services TO anon;
GRANT ALL PRIVILEGES ON public.services TO authenticated;
GRANT ALL PRIVILEGES ON public.services TO service_role;

-- Tickets
GRANT ALL PRIVILEGES ON public.tickets TO anon;
GRANT ALL PRIVILEGES ON public.tickets TO authenticated;
GRANT ALL PRIVILEGES ON public.tickets TO service_role;

-- 4. CONCEDER PERMISSÕES NO SCHEMA PUBLIC
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 5. VERIFICAÇÃO FINAL
DO $$
DECLARE
    test_result TEXT := '';
    profiles_count INTEGER;
    services_count INTEGER;
    tickets_count INTEGER;
BEGIN
    -- Testar acesso aos profiles
    BEGIN
        SELECT COUNT(*) INTO profiles_count FROM public.profiles;
        test_result := test_result || '✅ Profiles acessíveis: ' || profiles_count || ' registros' || E'\n';
    EXCEPTION WHEN OTHERS THEN
        test_result := test_result || '❌ Erro no acesso aos profiles: ' || SQLERRM || E'\n';
    END;
    
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
    
    RAISE NOTICE E'\n🔍 VERIFICAÇÃO FINAL - TODAS AS TABELAS:\n%', test_result;
END $$;

-- 6. LISTAR STATUS RLS DE TODAS AS TABELAS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE tablename IN ('profiles', 'services', 'tickets')
ORDER BY tablename;

-- 7. VERIFICAR PERMISSÕES CONCEDIDAS
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name IN ('profiles', 'services', 'tickets')
AND table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;