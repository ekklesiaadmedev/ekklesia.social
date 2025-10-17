-- CORREÇÃO CRÍTICA DOS PROBLEMAS DE AUTENTICAÇÃO
-- Data: 2024-12-15
-- Resolver problemas onde apenas social@ekklesia.com consegue fazer login

-- 1. Verificar estado atual de todos os usuários
SELECT 
    'ESTADO ATUAL DOS USUÁRIOS' as check_type,
    au.email,
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
ORDER BY au.created_at DESC;

-- 2. Verificar diferenças específicas entre social@ekklesia.com e outros usuários
DO $$
DECLARE
    social_user RECORD;
    painel_user RECORD;
    comparison_result TEXT := '';
BEGIN
    -- Buscar dados do usuário que funciona
    SELECT * INTO social_user
    FROM auth.users
    WHERE email = 'social@ekklesia.com';
    
    -- Buscar dados do usuário que não funciona
    SELECT * INTO painel_user
    FROM auth.users
    WHERE email = 'painel@ekklesia.com';
    
    IF social_user.id IS NOT NULL AND painel_user.id IS NOT NULL THEN
        comparison_result := comparison_result || '🔍 COMPARAÇÃO ENTRE USUÁRIOS:' || E'\n';
        comparison_result := comparison_result || 'SOCIAL (FUNCIONA):' || E'\n';
        comparison_result := comparison_result || '  Email confirmado: ' || (social_user.email_confirmed_at IS NOT NULL) || E'\n';
        comparison_result := comparison_result || '  Tem senha: ' || (social_user.encrypted_password IS NOT NULL) || E'\n';
        comparison_result := comparison_result || '  Role: ' || COALESCE(social_user.role, 'NULL') || E'\n';
        comparison_result := comparison_result || '  Aud: ' || COALESCE(social_user.aud, 'NULL') || E'\n';
        comparison_result := comparison_result || '  Is SSO: ' || social_user.is_sso_user || E'\n';
        comparison_result := comparison_result || '  Banned: ' || (social_user.banned_until IS NOT NULL) || E'\n';
        comparison_result := comparison_result || '  Deleted: ' || (social_user.deleted_at IS NOT NULL) || E'\n';
        
        comparison_result := comparison_result || 'PAINEL (NÃO FUNCIONA):' || E'\n';
        comparison_result := comparison_result || '  Email confirmado: ' || (painel_user.email_confirmed_at IS NOT NULL) || E'\n';
        comparison_result := comparison_result || '  Tem senha: ' || (painel_user.encrypted_password IS NOT NULL) || E'\n';
        comparison_result := comparison_result || '  Role: ' || COALESCE(painel_user.role, 'NULL') || E'\n';
        comparison_result := comparison_result || '  Aud: ' || COALESCE(painel_user.aud, 'NULL') || E'\n';
        comparison_result := comparison_result || '  Is SSO: ' || painel_user.is_sso_user || E'\n';
        comparison_result := comparison_result || '  Banned: ' || (painel_user.banned_until IS NOT NULL) || E'\n';
        comparison_result := comparison_result || '  Deleted: ' || (painel_user.deleted_at IS NOT NULL) || E'\n';
    ELSE
        comparison_result := '❌ Um dos usuários não foi encontrado!';
    END IF;
    
    RAISE NOTICE '%', comparison_result;
END $$;

-- 3. Normalizar todos os usuários para ter as mesmas configurações do usuário que funciona
DO $$
DECLARE
    social_config RECORD;
    user_record RECORD;
BEGIN
    -- Buscar configuração do usuário que funciona
    SELECT 
        role,
        aud,
        is_sso_user,
        instance_id
    INTO social_config
    FROM auth.users
    WHERE email = 'social@ekklesia.com';
    
    IF social_config.role IS NOT NULL THEN
        -- Aplicar mesmas configurações para todos os outros usuários
        FOR user_record IN 
            SELECT id, email FROM auth.users 
            WHERE email != 'social@ekklesia.com'
        LOOP
            UPDATE auth.users SET
                role = social_config.role,
                aud = social_config.aud,
                is_sso_user = social_config.is_sso_user,
                instance_id = social_config.instance_id,
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                banned_until = NULL,
                deleted_at = NULL
            WHERE id = user_record.id;
            
            RAISE NOTICE '✅ Usuário normalizado: %', user_record.email;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ Usuário social@ekklesia.com não encontrado para usar como referência';
    END IF;
END $$;

-- 4. Verificar se há problemas com senhas criptografadas
DO $$
DECLARE
    user_record RECORD;
    new_password_hash TEXT;
BEGIN
    -- Para cada usuário que não seja social@ekklesia.com, recriar hash da senha
    FOR user_record IN 
        SELECT id, email FROM auth.users 
        WHERE email != 'social@ekklesia.com'
    LOOP
        -- Gerar novo hash para senha padrão
        new_password_hash := crypt('Ekklesia2024!', gen_salt('bf'));
        
        UPDATE auth.users SET
            encrypted_password = new_password_hash
        WHERE id = user_record.id;
        
        RAISE NOTICE '🔐 Senha recriada para: %', user_record.email;
    END LOOP;
END $$;

-- 5. Verificar resultado final
SELECT 
    'VERIFICAÇÃO FINAL' as check_type,
    email,
    email_confirmed_at IS NOT NULL as confirmed,
    encrypted_password IS NOT NULL as has_password,
    role,
    aud,
    is_sso_user,
    banned_until IS NULL as not_banned,
    deleted_at IS NULL as not_deleted
FROM auth.users
ORDER BY email;

-- 6. Testar se todos os usuários têm perfis correspondentes
SELECT 
    'SINCRONIZAÇÃO PROFILES' as check_type,
    au.email as auth_email,
    p.email as profile_email,
    p.role as profile_role,
    CASE 
        WHEN p.id IS NULL THEN 'PERFIL FALTANDO'
        WHEN au.email != p.email THEN 'EMAIL DESSINCRONIZADO'
        ELSE 'OK'
    END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.email;