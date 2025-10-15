-- Teste direto da query que o frontend está fazendo
-- Este arquivo testa se conseguimos acessar os dados da tabela profiles

-- 1. Verificar se conseguimos listar todos os profiles
SELECT 
    'Teste de listagem de profiles' as teste,
    COUNT(*) as total_profiles
FROM public.profiles;

-- 2. Listar todos os profiles com detalhes
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY email ASC;

-- 3. Verificar políticas RLS ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Testar se conseguimos inserir um novo perfil (simulação)
-- NOTA: Este comando pode falhar se as políticas RLS estiverem muito restritivas
DO $$
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Tentar uma operação de leitura simples
        PERFORM COUNT(*) FROM public.profiles;
        test_result := '✅ LEITURA FUNCIONOU - Políticas RLS permitem SELECT';
    EXCEPTION WHEN OTHERS THEN
        test_result := '❌ LEITURA FALHOU - Erro: ' || SQLERRM;
    END;
    
    RAISE NOTICE 'Resultado do teste de leitura: %', test_result;
END $$;

-- 5. Verificar se o usuário atual tem permissões
SELECT 
    'Usuário atual' as info,
    current_user as usuario_atual,
    session_user as sessao_usuario;

-- 6. Verificar grants na tabela profiles
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;