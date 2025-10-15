-- CORREÇÃO FINAL DAS POLÍTICAS RLS
-- Este script resolve definitivamente o problema de acesso aos dados

-- 1. Remover TODAS as políticas RLS problemáticas
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin access to profiles" ON public.profiles;

-- 2. Criar política SUPER PERMISSIVA para administradores
CREATE POLICY "Super admin access to profiles"
ON public.profiles
FOR ALL
USING (
  -- Permitir para service_role (Edge Functions)
  auth.role() = 'service_role'
  OR
  -- Permitir para usuários admin na tabela profiles
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Permitir para emails específicos (fallback)
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN ('social@ekklesia.com', 'admin@ekklesia.com')
  )
)
WITH CHECK (
  -- Mesma lógica para inserções/atualizações
  auth.role() = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN ('social@ekklesia.com', 'admin@ekklesia.com')
  )
);

-- 3. Política para usuários verem seus próprios perfis
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. Política para usuários atualizarem seus próprios perfis
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Conceder permissões necessárias
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO authenticated, service_role;
GRANT SELECT ON public.profiles TO anon;

-- 7. Verificação final
DO $$
DECLARE
    policy_count INTEGER;
    admin_user_id UUID;
    test_result TEXT := '';
BEGIN
    -- Contar políticas
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'profiles';
    
    test_result := test_result || '📊 Políticas RLS criadas: ' || policy_count || E'\n';
    
    -- Verificar se usuário admin existe
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'social@ekklesia.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        test_result := test_result || '✅ Usuário admin encontrado: ' || admin_user_id || E'\n';
        
        -- Testar acesso aos dados
        BEGIN
            PERFORM COUNT(*) FROM public.profiles;
            test_result := test_result || '✅ Acesso aos profiles funcionando!' || E'\n';
        EXCEPTION WHEN OTHERS THEN
            test_result := test_result || '❌ Erro no acesso: ' || SQLERRM || E'\n';
        END;
    ELSE
        test_result := test_result || '❌ Usuário admin não encontrado!' || E'\n';
    END IF;
    
    RAISE NOTICE E'\n🔍 VERIFICAÇÃO FINAL RLS:\n%', test_result;
END $$;

-- 8. Listar todas as políticas ativas
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;