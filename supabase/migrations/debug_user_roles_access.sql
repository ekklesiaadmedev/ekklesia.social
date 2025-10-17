-- DIAGNÓSTICO CRÍTICO: PROBLEMA DE ACESSO AO PAINEL
-- Data: 2024-12-15
-- Usuário consegue fazer login mas é redirecionado quando tenta acessar o painel

-- 1. Verificar estado atual dos usuários e seus roles
SELECT 
    '=== ESTADO ATUAL DOS USUÁRIOS ===' as info,
    au.email,
    au.id as user_id,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    p.id IS NOT NULL as has_profile,
    p.role as profile_role,
    p.full_name,
    p.created_at as profile_created,
    p.updated_at as profile_updated
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email IN ('painel@ekklesia.com', 'social@ekklesia.com')
ORDER BY au.email;

-- 2. Verificar quais roles existem no sistema
SELECT 
    '=== ROLES DISPONÍVEIS NO SISTEMA ===' as info,
    DISTINCT role as available_roles,
    COUNT(*) as user_count
FROM public.profiles
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

-- 3. Verificar se o usuário painel@ekklesia.com tem o role correto
DO $$
DECLARE
    painel_user_id UUID;
    painel_role TEXT;
    expected_roles TEXT[] := ARRAY['admin', 'panel', 'painel'];
BEGIN
    -- Buscar dados do usuário painel
    SELECT au.id, p.role 
    INTO painel_user_id, painel_role
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE au.email = 'painel@ekklesia.com'
    LIMIT 1;
    
    RAISE NOTICE '=== ANÁLISE USUÁRIO PAINEL ===';
    
    IF painel_user_id IS NULL THEN
        RAISE NOTICE '❌ ERRO CRÍTICO: Usuário painel@ekklesia.com não encontrado!';
    ELSE
        RAISE NOTICE '✅ Usuário encontrado: %', painel_user_id;
        
        IF painel_role IS NULL THEN
            RAISE NOTICE '❌ PROBLEMA: Usuário não tem role definido!';
            RAISE NOTICE '   Isso pode causar redirecionamento no frontend';
        ELSE
            RAISE NOTICE '📋 Role atual: %', painel_role;
            
            IF painel_role = ANY(expected_roles) THEN
                RAISE NOTICE '✅ Role adequado para acesso ao painel';
            ELSE
                RAISE NOTICE '⚠️  Role pode não ter permissão para painel';
                RAISE NOTICE '   Roles esperados: %', expected_roles;
            END IF;
        END IF;
    END IF;
END $$;

-- 4. Comparar com usuário que funciona (social@ekklesia.com)
DO $$
DECLARE
    social_user_id UUID;
    social_role TEXT;
BEGIN
    -- Buscar dados do usuário social
    SELECT au.id, p.role 
    INTO social_user_id, social_role
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE au.email = 'social@ekklesia.com'
    LIMIT 1;
    
    RAISE NOTICE '=== COMPARAÇÃO COM USUÁRIO SOCIAL ===';
    
    IF social_user_id IS NULL THEN
        RAISE NOTICE '⚠️  Usuário social@ekklesia.com não encontrado';
    ELSE
        RAISE NOTICE '✅ Usuário social encontrado: %', social_user