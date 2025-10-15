-- Ajuste de políticas RLS para reconhecer admin por allowlist (e-mail)
-- Isto evita "travamento" quando o perfil está com role=service por padrão

-- Constante de allowlist (pode ser expandida conforme necessidade)
-- Usamos comparação com auth.users.email em minúsculas

-- 1) SERVICES: garantir que apenas admin (ou allowlisted) possam inserir/atualizar/deletar
alter table if exists public.services enable row level security;

drop policy if exists "Authenticated users can manage services" on public.services;
drop policy if exists "Only admins can insert services" on public.services;
drop policy if exists "Only admins can update services" on public.services;
drop policy if exists "Only admins can delete services" on public.services;

create policy "Only admins can insert services"
on public.services
for insert
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = any (array['social@ekklesia.com']))
);

create policy "Only admins can update services"
on public.services
for update
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = any (array['social@ekklesia.com']))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = any (array['social@ekklesia.com']))
);

create policy "Only admins can delete services"
on public.services
for delete
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = any (array['social@ekklesia.com']))
);

-- 2) PROFILES: permitir que admin (ou allowlisted) insira/atualize perfis
alter table if exists public.profiles enable row level security;

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
on public.profiles
for insert
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = any (array['social@ekklesia.com']))
);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles
for update
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = any (array['social@ekklesia.com']))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = any (array['social@ekklesia.com']))
);

-- 3) AUDIT_LOGS: permitir leitura por admin (ou allowlisted)
alter table if exists public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
on public.audit_logs
for select
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = any (array['social@ekklesia.com']))
);

-- Fim: com isso, o e-mail allowlisted tem acesso administrativo mesmo antes do perfil ser corrigido