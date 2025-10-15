# Teste de Emails para Validação

## Emails que devem ser ACEITOS:
1. painel@ekklesia.com ✅ (o email que estava falhando)
2. admin@example.com ✅
3. user.name@domain.co.uk ✅
4. test+tag@gmail.com ✅
5. user123@subdomain.example.org ✅
6. simple@test.io ✅
7. user-name@domain-name.com ✅
8. test.email.with+symbol@example.com ✅

## Emails que devem ser REJEITADOS:
1. invalid-email (sem @)
2. @domain.com (sem parte local)
3. user@.com (domínio inválido)
4. user@domain (sem TLD)
5. user..double@domain.com (pontos duplos)
6. user@domain..com (pontos duplos no domínio)

## Cenários de Teste:
1. Criar usuário com email válido
2. Criar usuário com email inválido
3. Editar usuário existente (papel e senha)
4. Testar diferentes papéis (admin, triage, service, panel)
5. Testar senhas de diferentes tamanhos
6. Testar campos obrigatórios vazios
7. Testar múltiplos cliques no botão de criação
8. Testar cancelamento de edição