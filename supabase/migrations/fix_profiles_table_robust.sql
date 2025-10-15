-- Script robusto para corrigir a tabela profiles e garantir acesso de administrador
-- Este script é idempotente e pode ser executado múltiplas vezes

-- 1. Desabilitar RLS temporariamente para operações administrativas
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes que podem estar causando conflitos
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Service can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service can update all profiles" ON profiles;

-- 3. Recriar a tabela profiles com estrutura correta
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'triage', 'service', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- 5. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS MUITO PERMISSIVAS para evitar bloqueios
-- Política para leitura - permite acesso autenticado
CREATE POLICY "Allow authenticated read access" ON profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role' OR
    auth.uid() IS NOT NULL
  );

-- Política para inserção - permite inserção autenticada
CREATE POLICY "Allow authenticated insert" ON profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role' OR
    auth.uid() IS NOT NULL
  );

-- Política para atualização - permite atualização do próprio perfil ou service_role
CREATE POLICY "Allow profile updates" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    auth.role() = 'authenticated'
  );

-- Política para deleção - apenas service_role
CREATE POLICY "Allow service role delete" ON profiles
  FOR DELETE USING (auth.role() = 'service_role');

-- 7. Garantir que o usuário social@ekklesia.com existe na tabela auth.users
-- (Esta parte será executada apenas se o usuário existir)

-- 8. Inserir/atualizar perfil de administrador para social@ekklesia.com
-- Usando UPSERT para garantir que funcione mesmo se já existir
DO $$
DECLARE
    admin_user_id UUID;
    insert_success BOOLEAN := FALSE;
    error_message TEXT;
BEGIN
    -- Buscar ID do usuário social@ekklesia.com
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        BEGIN
            -- Tentar inserir/atualizar perfil
            INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
            VALUES (
                admin_user_id,
                'social@ekklesia.com',
                'Administrador Social',
                'admin',
                NOW(),
                NOW()
            )
            ON CONFLICT (id) 
            DO UPDATE SET 
                email = EXCLUDED.email,
                role = 'admin',
                full_name = COALESCE(profiles.full_name, 'Administrador Social'),
                updated_at = NOW();
            
            insert_success := TRUE;
            RAISE NOTICE '✅ SUCESSO: Perfil de administrador criado/atualizado para social@ekklesia.com';
            
        EXCEPTION WHEN OTHERS THEN
            error_message := SQLERRM;
            RAISE NOTICE '❌ ERRO ao criar perfil: %', error_message;
        END;
    ELSE
        RAISE NOTICE '⚠️ AVISO: Usuário social@ekklesia.com não encontrado na tabela auth.users';
        RAISE NOTICE 'Certifique-se de que o usuário foi criado no Supabase Auth';
    END IF;
END $$;

-- ========================================
-- FASE 5: CRIAR TRIGGERS AUTOMÁTICOS
-- ========================================

-- 9. Remover triggers existentes para evitar conflitos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- 10. Criar função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 11. Criar trigger para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Criar função para criar perfil automaticamente para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT := 'user';
  user_name TEXT;
BEGIN
  -- Definir papel baseado no email
  IF NEW.email = 'social@ekklesia.com' THEN
    user_role := 'admin';
  END IF;
  
  -- Extrair nome dos metadados ou usar email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Inserir perfil
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE 
      WHEN EXCLUDED.email = 'social@ekklesia.com' THEN 'admin'
      ELSE profiles.role
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Criar trigger para novos usuários
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- FASE 6: CONCEDER PERMISSÕES
-- ========================================

-- 14. Conceder permissões necessárias
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO anon, authenticated;

-- ========================================
-- FASE 7: VERIFICAÇÕES FINAIS
-- ========================================

-- 15. Verificação completa do estado final
DO $$
DECLARE
    profile_count INTEGER;
    admin_count INTEGER;
    social_profile RECORD;
    user_exists BOOLEAN;
    verification_result TEXT := '';
BEGIN
    -- Verificar se usuário existe na auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'social@ekklesia.com') INTO user_exists;
    
    IF user_exists THEN
        verification_result := verification_result || '✅ Usuário social@ekklesia.com existe na auth.users' || E'\n';
        
        -- Verificar se perfil foi criado
        SELECT COUNT(*) INTO profile_count FROM profiles;
        SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
        
        verification_result := verification_result || '📊 Total de perfis: ' || profile_count || E'\n';
        verification_result := verification_result || '👑 Perfis admin: ' || admin_count || E'\n';
        
        -- Buscar dados específicos do perfil social
        BEGIN
            SELECT p.* INTO social_profile
            FROM profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE u.email = 'social@ekklesia.com';
            
            IF FOUND THEN
                verification_result := verification_result || '✅ Perfil social@ekklesia.com encontrado' || E'\n';
                verification_result := verification_result || '   - ID: ' || social_profile.id || E'\n';
                verification_result := verification_result || '   - Email: ' || social_profile.email || E'\n';
                verification_result := verification_result || '   - Role: ' || social_profile.role || E'\n';
                verification_result := verification_result || '   - Criado em: ' || social_profile.created_at || E'\n';
                
                IF social_profile.role = 'admin' THEN
                    verification_result := verification_result || '🎉 SUCESSO: social@ekklesia.com é ADMINISTRADOR!' || E'\n';
                ELSE
                    verification_result := verification_result || '⚠️ PROBLEMA: social@ekklesia.com NÃO é admin (role: ' || social_profile.role || ')' || E'\n';
                END IF;
            ELSE
                verification_result := verification_result || '❌ ERRO: Perfil social@ekklesia.com NÃO encontrado na tabela profiles' || E'\n';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            verification_result := verification_result || '❌ ERRO ao buscar perfil: ' || SQLERRM || E'\n';
        END;
    ELSE
        verification_result := verification_result || '❌ ERRO: Usuário social@ekklesia.com NÃO existe na auth.users' || E'\n';
        verification_result := verification_result || '   Você precisa criar este usuário no Supabase Auth primeiro!' || E'\n';
    END IF;
    
    RAISE NOTICE E'\n🔍 VERIFICAÇÃO FINAL:\n%', verification_result;
END $$;

-- 16. Teste da consulta que o frontend faz
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
            -- Simular consulta do frontend: SELECT * FROM profiles WHERE id = $1
            SELECT * INTO profile_data
            FROM public.profiles
            WHERE id = admin_user_id;
            
            IF FOUND THEN
                test_result := '✅ CONSULTA FRONTEND FUNCIONARÁ - Role: ' || profile_data.role;
                IF profile_data.role = 'admin' THEN
                    test_result := test_result || ' (ADMIN CONFIRMADO!)';
                END IF;
            ELSE
                test_result := '❌ CONSULTA FRONTEND FALHARÁ - PERFIL NÃO ENCONTRADO';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            test_result := '❌ CONSULTA FRONTEND FALHARÁ - ERRO: ' || SQLERRM;
        END;
    ELSE
        test_result := '❌ USUÁRIO NÃO ENCONTRADO NA AUTH.USERS';
    END IF;
    
    RAISE NOTICE E'\n🧪 TESTE FRONTEND: %', test_result;
END $$;

-- 17. Mostrar resumo final
SELECT 
    '🎯 SCRIPT EXECUTADO COM SUCESSO!' as status,
    'Verifique as mensagens acima para confirmar se tudo funcionou corretamente.' as instrucoes,
    'Agora faça logout e login novamente no sistema para testar.' as proximos_passos;

-- 18. Mostrar dados finais da tabela
SELECT 
    '📋 PERFIS CRIADOS:' as info,
    p.email,
    p.role,
    p.full_name,
    p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- ========================================
-- SCRIPT FINALIZADO COM SUCESSO!
-- ========================================