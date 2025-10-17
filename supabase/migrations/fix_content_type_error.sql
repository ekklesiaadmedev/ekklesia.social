-- CORREÇÃO DO ERRO "Content-Type not acceptable: text/plain"
-- Data: 2024-12-15
-- Investigar e corrigir problemas de Content-Type na API

-- 1. Verificar configurações do Supabase que podem afetar Content-Type
SELECT 
    'CONFIGURAÇÕES SUPABASE' as check_type,
    'Verificando se há configurações que podem causar erro de Content-Type' as info;

-- 2. Verificar se há triggers ou funções que podem estar interferindo nas requisições
SELECT 
    'TRIGGERS QUE PODEM AFETAR API' as check_type,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema IN ('auth', 'public')
ORDER BY trigger_name;

-- 3. Verificar se há políticas RLS muito restritivas que podem causar erros de API
SELECT 
    'POLÍTICAS RLS RESTRITIVAS' as check_type,
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE schemaname IN ('auth', 'public')
ORDER BY schemaname, tablename, policyname;

-- 4. Verificar se há extensões ou configurações que podem afetar headers HTTP
SELECT 
    'EXTENSÕES INSTALADAS' as check_type,
    extname,
    extversion
FROM pg_extension
ORDER BY extname;

-- 5. Criar função de teste para verificar se o problema é no banco ou na aplicação
CREATE OR REPLACE FUNCTION public.test_api_response()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN json_build_object(
        'status', 'success',
        'message', 'API funcionando corretamente',
        'timestamp', now(),
        'content_type', 'application/json'
    );
END;
$$;

-- 6. Verificar se há problemas com encoding ou charset
SELECT 
    'CONFIGURAÇÕES DE ENCODING' as check_type,
    name,
    setting
FROM pg_settings 
WHERE name IN ('server_encoding', 'client_encoding', 'lc_ctype', 'lc_collate')
ORDER BY name;

-- 7. Verificar logs de erro recentes (se disponíveis)
SELECT 
    'VERIFICAÇÃO DE LOGS' as check_type,
    'Verificar logs do Supabase para erros de Content-Type' as recomendacao;

-- 8. Testar função simples para verificar resposta da API
SELECT public.test_api_response() as test_result;