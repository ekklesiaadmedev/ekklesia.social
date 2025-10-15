-- DIAGNÓSTICO COMPLETO DO PROBLEMA DE ACESSO
-- Este script vai investigar TUDO que pode estar bloqueando o acesso

-- ========================================
-- 1. VERIFICAR USUÁRIO ATUAL
-- ========================================

SELECT 
    'USUÁRIO ATUAL' as tipo,
    auth.uid() as user_id,
    auth.role() as user_role,
    current_user as db_user;

-- ========================================
-- 2. VERIFICAR USUÁRIO ADMIN
-- ========================================

SELECT 
    'USUÁRIO ADMIN' as tipo,
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at
FROM auth.users u
WHERE lower(u.email) = 'social@ekklesia.com';

-- ========================================
-- 3. VERIFICAR PROFILE DO ADMIN
-- ========================================

SELECT 
    'PROFILE ADMIN' as tipo,
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(u.email) = 'social@ekklesia.com';

-- ========================================
-- 4. TESTAR ACESSO DIRETO ÀS TABELAS
-- ========================================

-- Profiles
SELECT 'PROFILES - CONTAGEM' as teste, COUNT(*) as total FROM public.profiles;
SELECT 'PROFILES - DADOS' as teste, id, email, role FROM public.profiles LIMIT 5;

-- Services
SELECT 'SERVICES - CONTAGEM' as teste, COUNT(*) as total FROM public.services;
SELECT 'SERVICES - DADOS' as teste, id, name, service_id FROM public.services LIMIT 5;

-- Tickets
SELECT 'TICKETS - CONTAGEM' as teste, COUNT(*) as total FROM public.tickets;
SELECT 'TICKETS - DADOS' as teste, id, ticket_number, status FROM public.tickets LIMIT 5;

-- ========================================
-- 5. VERIFICAR POLÍTICAS RLS ATIVAS
-- ========================================

SELECT 
    'POLÍTICAS RLS' as tipo,
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

-- ========================================
-- 6. VERIFICAR PERMISSÕES DE SCHEMA
-- ========================================

SELECT 
    'PERMISSÕES SCHEMA' as tipo,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.schema_privileges
WHERE schema_name = 'public'
ORDER BY grantee, privilege_type;

-- ========================================
-- 7. VERIFICAR PERMISSÕES DE TABELA
-- ========================================

SELECT 
    'PERMISSÕES TABELA' as tipo,
    table_name,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'services', 'tickets')
ORDER BY table_name, grantee, privilege_type;

-- ========================================
-- 8. VERIFICAR STATUS RLS
-- ========================================

SELECT 
    'STATUS RLS' as tipo,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as rls_forced
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'services', 'tickets');

-- ========================================
-- 9. TESTAR SIMULAÇÃO DE ACESSO ADMIN
-- ========================================

DO $$
DECLARE
    admin_id UUID;
    test_result TEXT := '';
    profiles_count INTEGER;
    services_count INTEGER;
    tickets_count INTEGER;
BEGIN
    -- Buscar ID do admin
    SELECT id INTO admin_id
    FROM auth.users
    WHERE lower(email) = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        test_result := test_result || '✅ Admin ID encontrado: ' || admin_id || E'\n';
        
        -- Testar se o admin tem perfil
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_id AND role = 'admin') THEN
            test_result := test_result || '✅ Admin tem perfil com role admin' || E'\n';
        ELSE
            test_result := test_result || '❌ Admin NÃO tem perfil admin' || E'\n';
        END IF;
        
        -- Testar acesso às tabelas
        BEGIN
            SELECT COUNT(*) INTO profiles_count FROM public.profiles;
            test_result := test_result || '✅ Profiles acessível: ' || profiles_count || ' registros' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro profiles: ' || SQLERRM || E'\n';
        END;
        
        BEGIN
            SELECT COUNT(*) INTO services_count FROM public.services;
            test_result := test_result || '✅ Services acessível: ' || services_count || ' registros' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro services: ' || SQLERRM || E'\n';
        END;
        
        BEGIN
            SELECT COUNT(*) INTO tickets_count FROM public.tickets;
            test_result := test_result || '✅ Tickets acessível: ' || tickets_count || ' registros' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro tickets: ' || SQLERRM || E'\n';
        END;
        
    ELSE
        test_result := test_result || '❌ Admin não encontrado!' || E'\n';
    END IF;
    
    RAISE NOTICE E'\n🔍 TESTE DE ACESSO ADMIN:\n%', test_result;
END $$;