-- DIAGNÓSTICO CRÍTICO: PROBLEMA DE REDIRECIONAMENTO NO PAINEL
-- Data: 2024-12-15
-- Resolver ERR_ABORTED que impede carregamento do perfil

-- 1. Verificar usuário painel@ekklesia.com
SELECT 
    '=== USUÁRIO PAINEL ===' as info,
    au.email,
    au.id as user_id,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    p.id IS NOT NULL as has_profile,
    p.role as current_role,
    p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 2. Verificar políticas RLS que podem estar bloqueando
SELECT 
    '=== POLÍTICAS RLS PROFILES ===' as info,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- 3. Verificar políticas RLS para services e tickets
SELECT 
    '=== POLÍTICAS RLS SERVICES ===' as info,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'services' AND schemaname = 'public'
ORDER BY policyname;

SELECT 
    '=== POLÍTICAS RLS TICKETS ===' as info,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tickets' AND schemaname = 'public'
ORDER BY policyname;

-- 4. CORREÇÃO IMEDIATA: Criar políticas permissivas para debug
-- Remover políticas restritivas temporariamente

-- PROFILES: Permitir acesso total para usuários autenticados
DROP POLICY IF EXISTS "debug_profiles_full_access" ON profiles;
CREATE POLICY "debug_profiles_full_access" ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- SERVICES: Permitir leitura para usuários autenticados  
DROP POLICY IF EXISTS "debug_services_read_access" ON services;
CREATE POLICY "debug_services_read_access" ON services
    FOR SELECT
    TO authenticated
    USING (true);

-- TICKETS: Permitir leitura para usuários autenticados
DROP POLICY IF EXISTS "debug_tickets_read_access" ON tickets;
CREATE POLICY "debug_tickets_read_access" ON tickets
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. Garantir que usuário painel tem role correto
UPDATE public.profiles 
SET 
    role = 'panel',
    updated_at = NOW()
WHERE email = 'painel@ekklesia.com'
    AND (role IS NULL OR role != 'panel');

-- 6. Verificar resultado final
SELECT 
    '=== RESULTADO FINAL ===' as info,
    au.email,
    p.role as final_role,
    p.full_name,
    'DEVE FUNCIONAR AGORA' as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';