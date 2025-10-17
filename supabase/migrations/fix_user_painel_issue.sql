-- CORREÇÃO CRÍTICA DO PROBLEMA DO USUÁRIO painel@ekklesia.com - EMERGENCIAL
-- Data: 2024-12-15 - EXECUTAR IMEDIATAMENTE
-- Criar o usuário corretamente se não existir ou corrigir problemas existentes

-- Primeiro, vamos verificar se o usuário existe
DO $$
DECLARE
    user_exists_auth boolean := false;
    user_exists_profiles boolean := false;
    auth_user_id uuid;
BEGIN
    -- Verificar se existe em auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'painel@ekklesia.com') INTO user_exists_auth;
    
    -- Verificar se existe em profiles
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = 'painel@ekklesia.com') INTO user_exists_profiles;
    
    RAISE NOTICE 'Usuário existe em auth.users: %', user_exists_auth;
    RAISE NOTICE 'Usuário existe em profiles: %', user_exists_profiles;
    
    -- Se existe em auth mas não em profiles, criar o perfil
    IF user_exists_auth AND NOT user_exists_profiles THEN
        SELECT id INTO auth_user_id FROM auth.users WHERE email = 'painel@ekklesia.com';
        
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            auth_user_id,
            'painel@ekklesia.com',
            'Usuário Painel',
            'panel'
        );
        
        RAISE NOTICE 'Perfil criado para usuário existente em auth.users';
    END IF;
    
    -- Se não existe em auth, criar tanto em auth quanto em profiles
    IF NOT user_exists_auth THEN
        -- Gerar um UUID para o usuário
        auth_user_id := gen_random_uuid();
        
        -- Inserir em auth.users (simulando criação via Supabase Auth)
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_user_meta_data,
            is_sso_user,
            aud,
            role
        ) VALUES (
            auth_user_id,
            '00000000-0000-0000-0000-000000000000',
            'painel@ekklesia.com',
            crypt('Ekklesia2024!', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"full_name": "Usuário Painel"}',
            false,
            'authenticated',
            'authenticated'
        );
        
        -- Inserir em profiles
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            auth_user_id,
            'painel@ekklesia.com',
            'Usuário Painel',
            'panel'
        );
        
        RAISE NOTICE 'Usuário criado em auth.users e profiles com ID: %', auth_user_id;
    END IF;
    
    -- Verificar se o usuário está confirmado
    UPDATE auth.users 
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE email = 'painel@ekklesia.com' AND email_confirmed_at IS NULL;
    
END $$;

-- Verificar o resultado final
SELECT 
    'RESULTADO FINAL' as status,
    au.id,
    au.email as auth_email,
    au.email_confirmed_at,
    p.email as profile_email,
    p.full_name,
    p.role,
    p.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'painel@ekklesia.com';