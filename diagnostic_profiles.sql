-- Script de Diagnóstico da Tabela Profiles
-- Execute este script no SQL Editor do Supabase Studio para diagnosticar problemas

-- 1. Verificar se a tabela profiles existe
SELECT 
    'Tabela profiles existe' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'profiles' AND table_schema = 'public'
        ) THEN 'SIM ✅'
        ELSE 'NÃO ❌'
    END as resultado;

-- 2. Verificar estrutura da tabela profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO ✅'
        ELSE 'RLS DESABILITADO ❌'
    END as status_rls
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 4. Listar todas as políticas RLS da tabela profiles
SELECT 
    policyname as nome_politica,
    cmd as comando,
    permissive as permissiva,
    roles as papeis,
    qual as condicao_using,
    with_check as condicao_with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 5. Verificar se o usuário social@ekklesia.com existe na tabela auth.users
SELECT 
    'Usuário social@ekklesia.com na auth.users' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users 
            WHERE email = 'social@ekklesia.com'
        ) THEN 'EXISTE ✅'
        ELSE 'NÃO EXISTE ❌'
    END as resultado;

-- 6. Buscar dados do usuário social@ekklesia.com na auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    raw_user_meta_data,
    raw_app_meta_data
FROM auth.users 
WHERE email = 'social@ekklesia.com';

-- 7. Verificar se existe perfil para social@ekklesia.com na tabela profiles
SELECT 
    'Perfil social@ekklesia.com na profiles' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE u.email = 'social@ekklesia.com'
        ) THEN 'EXISTE ✅'
        ELSE 'NÃO EXISTE ❌'
    END as resultado;

-- 8. Buscar dados do perfil social@ekklesia.com (se existir)
SELECT 
    p.id,
    p.email,
    p.role,
    p.created_at,
    p.updated_at,
    u.email as email_auth_users
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'social@ekklesia.com';

-- 9. Listar todos os perfis existentes
SELECT 
    'Total de perfis na tabela' as info,
    COUNT(*) as quantidade
FROM public.profiles;

SELECT 
    p.email,
    p.role,
    p.created_at,
    u.email as email_auth_users,
    CASE 
        WHEN p.email = u.email THEN 'EMAILS COINCIDEM ✅'
        ELSE 'EMAILS DIFERENTES ❌'
    END as status_email
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- 10. Testar se conseguimos inserir um perfil admin manualmente
-- (Este comando pode falhar se já existir, mas nos dará informações sobre o erro)
DO $$
DECLARE
    admin_user_id UUID;
    insert_result TEXT;
BEGIN
    -- Buscar ID do usuário
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        BEGIN
            -- Tentar inserir perfil
            INSERT INTO public.profiles (id, email, role)
            VALUES (admin_user_id, 'social@ekklesia.com', 'admin')
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                role = 'admin',
                updated_at = NOW();
            
            insert_result := 'PERFIL INSERIDO/ATUALIZADO COM SUCESSO ✅';
        EXCEPTION WHEN OTHERS THEN
            insert_result := 'ERRO AO INSERIR PERFIL: ' || SQLERRM || ' ❌';
        END;
    ELSE
        insert_result := 'USUÁRIO NÃO ENCONTRADO NA AUTH.USERS ❌';
    END IF;
    
    RAISE NOTICE 'Resultado da inserção: %', insert_result;
END $$;

-- 11. Verificar permissões da tabela profiles
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 12. Verificar se existem triggers na tabela profiles
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' AND event_object_schema = 'public';

-- 13. Verificar se existem constraints na tabela profiles
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 14. Teste final: simular consulta que o frontend faz
DO $$
DECLARE
    admin_user_id UUID;
    profile_data RECORD;
    test_result TEXT;
BEGIN
    -- Buscar ID do usuário
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        BEGIN
            -- Simular consulta do frontend
            SELECT * INTO profile_data
            FROM public.profiles
            WHERE id = admin_user_id;
            
            IF FOUND THEN
                test_result := 'CONSULTA FRONTEND FUNCIONARIA ✅ - Role: ' || profile_data.role;
            ELSE
                test_result := 'CONSULTA FRONTEND FALHARIA - PERFIL NÃO ENCONTRADO ❌';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            test_result := 'CONSULTA FRONTEND FALHARIA - ERRO: ' || SQLERRM || ' ❌';
        END;
    ELSE
        test_result := 'USUÁRIO NÃO ENCONTRADO ❌';
    END IF;
    
    RAISE NOTICE 'Teste da consulta frontend: %', test_result;
END $$;

SELECT 'Diagnóstico completo! Verifique os resultados acima.' as status_final;