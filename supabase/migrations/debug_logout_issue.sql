-- DIAGNÓSTICO DO PROBLEMA DE LOGOUT AUTOMÁTICO
-- Data: 2024-12-15
-- Investigar por que o usuário é deslogado automaticamente após login

-- 1. Verificar estado atual dos usuários
SELECT 
    'ESTADO ATUAL USUÁRIOS' as check_type,
    au.email,
    au.id,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    au.encrypted_password IS NOT NULL as has_password,
    au.role as auth_role,
    au.aud,
    au.is_sso_user,
    au.banned_until,
    au.deleted_at,
    p.role as profile_role,
    p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email IN ('painel@ekklesia.com', 'social@ekklesia.com')
ORDER BY au.email;

-- 2. Verificar políticas RLS que podem estar causando problemas
SELECT 
    'POLÍTICAS RLS PROFILES' as check_type,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- 3. Testar se usuário consegue acessar seu próprio perfil
DO $$
DECLARE
    painel_user_id UUID;
    profile_accessible BOOLEAN := FALSE;
BEGIN
    -- Buscar ID do usuário painel
    SELECT id INTO painel_user_id
    FROM auth.users
    WHERE email = 'painel@ekklesia.com'
    LIMIT 1;
    
    IF painel_user_id IS NOT NULL THEN
        -- Testar se consegue acessar perfil
        BEGIN
            PERFORM 1 FROM public.profiles WHERE id = painel_user_id;
            profile_accessible := TRUE;
        EXCEPTION WHEN OTHERS THEN
            profile_accessible := FALSE;
        END;
        
        RAISE NOTICE '👤 TESTE ACESSO PERFIL PAINEL:';
        RAISE NOTICE '  User ID: %', painel_user_id;
        RAISE NOTICE '  Pode acessar perfil: %', profile_accessible;
        
        IF NOT profile_accessible THEN
            RAISE NOTICE '❌ PROBLEMA: Usuário não consegue acessar próprio perfil!';
            RAISE NOTICE '   Isso pode causar logout automático no frontend';
        END IF;
    ELSE
        RAISE NOTICE '❌ Usuário painel@ekklesia.com não encontrado';
    END IF;
END $$;

-- 4. Verificar se há triggers que podem estar interferindo
SELECT 
    'TRIGGERS PROFILES' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 5. Verificar configurações de sessão do Supabase
SELECT 
    'CONFIGURAÇÕES AUTH' as check_type,
    'Verificar se há configurações que invalidam sessão rapidamente' as info;

-- 6. Criar política temporária para debug (permitir acesso total)
DROP POLICY IF EXISTS "debug_full_access" ON profiles;
CREATE POLICY "debug_full_access" ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DO $$
BEGIN
    RAISE NOTICE '🔧 POLÍTICA DEBUG CRIADA: Todos os usuários autenticados podem acessar todos os perfis';
    RAISE NOTICE '   Esta é uma política temporária para debug - REMOVER em produção!';
END $$;

-- 7. Testar novamente após criar política debug
DO $$
DECLARE
    painel_user_id UUID;
    profile_count INTEGER;
BEGIN
    -- Buscar ID do usuário painel
    SELECT id INTO painel_user_id
    FROM auth.users
    WHERE email = 'painel@ekklesia.com'
    LIMIT 1;
    
    IF painel_user_id IS NOT NULL THEN
        -- Contar perfis acessíveis
        SELECT COUNT(*) INTO profile_count FROM public.profiles;
        
        RAISE NOTICE '📊 APÓS POLÍTICA DEBUG:';
        RAISE NOTICE '  Total de perfis acessíveis: %', profile_count;
        
        IF profile_count > 0 THEN
            RAISE NOTICE '✅ Política debug funcionando - usuário deve conseguir acessar dados';
        ELSE
            RAISE NOTICE '❌ Ainda há problemas mesmo com política debug';
        END IF;
    END IF;
END $$;

-- 8. Verificar se há problemas de encoding ou caracteres especiais
SELECT 
    'VERIFICAÇÃO ENCODING' as check_type,
    au.email,
    length(au.email) as email_length,
    au.email = 'painel@ekklesia.com' as email_match_exact,
    lower(trim(au.email)) = 'painel@ekklesia.com' as email_match_normalized
FROM auth.users au
WHERE au.email ILIKE '%painel%'
ORDER BY au.email;

-- 9. Verificar se usuário tem todas as permissões necessárias
SELECT 
    'VERIFICAÇÃO FINAL' as check_type,
    au.email,
    au.email_confirmed_at IS NOT NULL as can_login,
    p.id IS NOT NULL as has_profile,
    p.role as user_role,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL AND p.id IS NOT NULL THEN 'DEVE FUNCIONAR ✅'
        WHEN au.email_confirmed_at IS NULL THEN 'EMAIL NÃO CONFIRMADO ❌'
        WHEN p.id IS NULL THEN 'SEM PERFIL ❌'
        ELSE 'PROBLEMA DESCONHECIDO ❌'
    END as status_login
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';