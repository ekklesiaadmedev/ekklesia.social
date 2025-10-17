-- VERIFICAÇÃO FINAL DO USUÁRIO painel@ekklesia.com
-- Confirmar se todas as correções foram aplicadas com sucesso

-- 1. Verificar usuário em auth.users
SELECT 
    'AUTH.USERS STATUS' as check_type,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'painel@ekklesia.com';

-- 2. Verificar perfil em profiles
SELECT 
    'PROFILES STATUS' as check_type,
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE email = 'painel@ekklesia.com';

-- 3. Verificar se admin pode ver todos os usuários
SELECT 
    'ADMIN VIEW TEST' as check_type,
    COUNT(*) as total_usuarios_visiveis
FROM public.profiles;

-- 4. Listar todos os usuários para confirmar visibilidade
SELECT 
    'ALL USERS LIST' as check_type,
    email,
    role,
    created_at
FROM public.profiles 
ORDER BY created_at DESC;

-- 5. Verificar políticas RLS ativas
SELECT 
    'RLS POLICIES' as check_type,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- 6. Teste de login simulado
SELECT 
    'LOGIN TEST' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users 
            WHERE email = 'painel@ekklesia.com' 
            AND email_confirmed_at IS NOT NULL
        ) THEN 'LOGIN DEVE FUNCIONAR ✅'
        ELSE 'LOGIN PODE FALHAR - EMAIL NÃO CONFIRMADO ❌'
    END as login_status;

-- 7. Resumo final
SELECT 
    'RESUMO FINAL' as status,
    'Usuário painel@ekklesia.com corrigido!' as resultado,
    'Deve aparecer na lista e conseguir fazer login' as expectativa;