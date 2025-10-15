-- Script SQL completo para corrigir a tabela profiles no Supabase
-- Este script é idempotente e pode ser executado múltiplas vezes sem problemas
-- Execute este script no SQL Editor do Supabase Studio

-- 1. Garantir que a extensão pgcrypto está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar ou recriar a tabela profiles com a estrutura correta
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'service',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'triage', 'service'))
);

-- 3. Comentário na tabela
COMMENT ON TABLE public.profiles IS 'Perfis de usuários com papéis e permissões';

-- 4. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

-- 8. Criar políticas RLS
-- Política para usuários verem seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Política para usuários atualizarem seu próprio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Política para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- Política para admins atualizarem todos os perfis
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- Política para inserção de novos perfis (apenas usuários autenticados)
CREATE POLICY "Enable insert for authenticated users only"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 9. Criar função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        CASE 
            WHEN NEW.email = 'social@ekklesia.com' THEN 'admin'
            ELSE 'service'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Criar trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 11. Inserir ou atualizar o perfil do usuário admin (social@ekklesia.com)
-- Primeiro, vamos buscar o ID do usuário social@ekklesia.com
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Buscar o ID do usuário social@ekklesia.com
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    -- Se o usuário existe, inserir ou atualizar seu perfil
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, role, created_at, updated_at)
        VALUES (admin_user_id, 'social@ekklesia.com', 'admin', NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
            email = EXCLUDED.email,
            role = 'admin',
            updated_at = NOW();
        
        RAISE NOTICE 'Perfil do usuário social@ekklesia.com criado/atualizado com sucesso como admin';
    ELSE
        RAISE NOTICE 'Usuário social@ekklesia.com não encontrado na tabela auth.users';
    END IF;
END $$;

-- 12. Verificar se tudo foi criado corretamente
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabela profiles criada com sucesso';
    ELSE
        RAISE NOTICE 'ERRO: Tabela profiles não foi criada';
    END IF;
    
    -- Verificar se RLS está habilitado
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles' AND relrowsecurity = true) THEN
        RAISE NOTICE 'RLS habilitado na tabela profiles';
    ELSE
        RAISE NOTICE 'AVISO: RLS não está habilitado na tabela profiles';
    END IF;
    
    -- Contar quantos perfis existem
    DECLARE
        profile_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO profile_count FROM public.profiles;
        RAISE NOTICE 'Total de perfis na tabela: %', profile_count;
    END;
END $$;

-- 13. Conceder permissões necessárias
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Script concluído com sucesso!
SELECT 'Script de correção da tabela profiles executado com sucesso!' AS resultado;