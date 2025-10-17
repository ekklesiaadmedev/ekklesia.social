-- VERIFICAÇÃO SIMPLES DE ROLES DOS USUÁRIOS
-- Verificar roles dos usuários para diagnosticar problema de acesso ao painel

SELECT 
    'USUÁRIOS E ROLES' as info,
    au.email,
    p.role,
    p.full_name,
    CASE 
        WHEN p.role = 'admin' THEN 'DEVE TER ACESSO TOTAL ✅'
        WHEN p.role = 'panel' THEN 'DEVE TER ACESSO AO PAINEL ✅'
        WHEN p.role = 'user' THEN 'ACESSO LIMITADO ⚠️'
        WHEN p.role IS NULL THEN 'SEM ROLE - PROBLEMA ❌'
        ELSE 'ROLE DESCONHECIDO ❓'
    END as status_acesso
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email IN ('painel@ekklesia.com', 'social@ekklesia.com')
ORDER BY au.email;