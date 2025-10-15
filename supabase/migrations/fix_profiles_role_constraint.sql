-- Corrigir constraint da tabela profiles para incluir role 'panel'
-- O erro indica que o role 'panel' não está permitido na constraint atual

-- Primeiro, remover a constraint existente
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adicionar nova constraint que inclui 'panel'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'triage'::text, 'service'::text, 'user'::text, 'panel'::text]));

-- Comentário explicativo
COMMENT ON CONSTRAINT profiles_role_check ON profiles IS 'Permite roles: admin, triage, service, user, panel';