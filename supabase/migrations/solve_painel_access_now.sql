-- SOLUÇÃO DEFINITIVA PARA ACESSO AO PAINEL
-- Diagnóstico completo e correção do usuário painel@ekklesia.com

-- 1. Verificar estado atual do usuário
SELECT 
    'ESTADO ATUAL' as info,
    au.id as user_id,
    au.email,
    au.email_confirmed_at,
    p.role as current_role,
    p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 2. Criar perfil se não existir
DO $$
BEGIN
    -- Inserir perfil se não existir
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    SELECT 
        au.id,
        au.email,
        'Usuário do Painel',
        'panel',
        NOW(),
        NOW()
    FROM auth.users au
    WHERE au.email = 'painel@ekklesia.com'
    AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = au.id
    );
    
    -- Atualizar role se já existir
    UPDATE public.profiles 
    SET 
        role = 'panel',
        updated_at = NOW()
    WHERE email = 'painel@ekklesia.com'
    AND role != 'panel';
    
    RAISE NOTICE 'Perfil do usuário painel@ekklesia.com processado com sucesso';
END $$;

-- 3. Verificar políticas RLS que podem estar bloqueando
-- Criar política temporária mais permissiva para profiles
DROP POLICY IF EXISTS "temp_profiles_select_all" ON public.profiles;
CREATE POLICY "temp_profiles_select_all" ON public.profiles
    FOR SELECT USING (true);

-- 4. Verificar resultado final
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    au.id,
    au.email,
    p.role,
    p.full_name,
    CASE 
        WHEN p.role = 'panel' THEN '✅ ACESSO PERMITIDO'
        ELSE '❌ ACESSO NEGADO'
    END as resultado
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';

-- 5. Listar todas as políticas ativas para profiles
SELECT 
    'POLÍTICAS ATIVAS' as info,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;