-- CORREÇÃO CRÍTICA: PERMITIR QUE ADMINS LISTEM TODOS OS USUÁRIOS
-- Problema identificado: Políticas RLS muito restritivas impedem listagem de usuários

-- 1. Remover políticas restritivas existentes
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "service_role_full_access" ON public.profiles;

-- 2. Criar política para admins poderem ver todos os usuários
CREATE POLICY "admin_can_view_all_profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        -- Admins podem ver todos os perfis
        EXISTS (
            SELECT 1 FROM public.profiles admin_profile
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
        OR
        -- Usuários podem ver apenas seu próprio perfil
        id = auth.uid()
    );

-- 3. Criar política para admins poderem inserir usuários
CREATE POLICY "admin_can_insert_profiles" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Apenas admins podem inserir novos perfis
        EXISTS (
            SELECT 1 FROM public.profiles admin_profile
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
    );

-- 4. Criar política para admins poderem atualizar usuários
CREATE POLICY "admin_can_update_profiles" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        -- Admins podem atualizar qualquer perfil
        EXISTS (
            SELECT 1 FROM public.profiles admin_profile
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
        OR
        -- Usuários podem atualizar apenas seu próprio perfil
        id = auth.uid()
    )
    WITH CHECK (
        -- Mesma lógica para WITH CHECK
        EXISTS (
            SELECT 1 FROM public.profiles admin_profile
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
        OR
        id = auth.uid()
    );

-- 5. Criar política para service role (Edge Functions)
CREATE POLICY "service_role_full_access" ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Garantir que o usuário social@ekklesia.com seja admin
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Buscar usuário admin
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Garantir que tem role admin
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (admin_user_id, 'social@ekklesia.com', 'Administrador', 'admin')
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            updated_at = NOW();
        
        RAISE NOTICE '✅ Usuário social@ekklesia.com configurado como admin';
    ELSE
        RAISE NOTICE '❌ Usuário social@ekklesia.com não encontrado na auth.users';
    END IF;
END $$;

-- 7. Criar o usuário painel@ekklesia.com se não existir
DO $$
DECLARE
    painel_user_id UUID;
    auth_user_exists BOOLEAN := FALSE;
BEGIN
    -- Verificar se existe em auth.users
    SELECT id INTO painel_user_id
    FROM auth.users
    WHERE email = 'painel@ekklesia.com'
    LIMIT 1;
    
    IF painel_user_id IS NOT NULL THEN
        auth_user_exists := TRUE;
        RAISE NOTICE '✅ Usuário painel@ekklesia.com encontrado na auth.users';
    ELSE
        -- Gerar UUID para o novo usuário
        painel_user_id := gen_random_uuid();
        
        -- Inserir em auth.users
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
            painel_user_id,
            '00000000-0000-0000-0000-000000000000',
            'painel@ekklesia.com',
            crypt('Ekklesia2024!', gen_salt('bf')),
            now(), -- Confirmar email imediatamente
            now(),
            now(),
            '{"full_name": "Usuário Painel"}',
            false,
            'authenticated',
            'authenticated'
        );
        
        RAISE NOTICE '✅ Usuário painel@ekklesia.com criado na auth.users';
    END IF;
    
    -- Criar/atualizar perfil
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (painel_user_id, 'painel@ekklesia.com', 'Usuário Painel', 'panel')
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, 'Usuário Painel'),
        role = 'panel',
        updated_at = NOW();
    
    RAISE NOTICE '✅ Perfil painel@ekklesia.com criado/atualizado';
END $$;

-- 8. Verificar resultado final
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
    COUNT(CASE WHEN role = 'panel' THEN 1 END) as total_panel
FROM public.profiles;

-- 9. Listar políticas ativas
SELECT 
    'POLÍTICAS ATIVAS' as info,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;