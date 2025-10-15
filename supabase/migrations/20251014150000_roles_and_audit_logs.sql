-- Expandir papéis e criar tabela de auditoria (audit_logs)
create extension if not exists pgcrypto;

-- Atualizar constraint de papéis para incluir triagem e serviço
alter table public.profiles
  alter column role drop default;

-- O tipo da coluna já é text; evitar ALTER TYPE devido às políticas dependentes

-- Ajustar CHECK para novos papéis
do $$
begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'profiles' and c.conname = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin','triage','service'));

alter table public.profiles
  alter column role set default 'service';

-- Tabela de auditoria
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz default now()
);

comment on table public.audit_logs is 'Registros de auditoria de ações dos usuários';

-- Função para registrar auditoria
create or replace function public.log_change()
returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.audit_logs(actor_id, actor_email, action, entity, entity_id, details)
    values (auth.uid(), null, lower(tg_op), tg_table_name, (old.id)::text, row_to_json(old)::jsonb);
    return old;
  else
    insert into public.audit_logs(actor_id, actor_email, action, entity, entity_id, details)
    values (auth.uid(), null, lower(tg_op), tg_table_name, (new.id)::text, row_to_json(new)::jsonb);
    return new;
  end if;
end;
$$ language plpgsql security definer;

-- Triggers de auditoria para tabelas principais
drop trigger if exists audit_services on public.services;
create trigger audit_services after insert or update or delete on public.services
for each row execute function public.log_change();

drop trigger if exists audit_tickets on public.tickets;
create trigger audit_tickets after insert or update or delete on public.tickets
for each row execute function public.log_change();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
for each row execute function public.log_change();

-- Log de criação de usuário (sign_up)
create or replace function public.log_auth_user_created()
returns trigger as $$
begin
  insert into public.audit_logs(actor_id, actor_email, action, entity, entity_id, details)
  values (new.id, new.email, 'sign_up', 'auth.users', (new.id)::text, row_to_json(new)::jsonb);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists audit_auth_user_created on auth.users;
create trigger audit_auth_user_created after insert on auth.users
for each row execute function public.log_auth_user_created();

-- Habilitar RLS e políticas para audit_logs (apenas admins leem)
alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
on public.audit_logs
for select
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Permitir inserção via funções (triggers) de segurança
drop policy if exists "Allow inserts via definer functions" on public.audit_logs;
create policy "Allow inserts via definer functions"
on public.audit_logs
for insert
with check (true);

-- Fim da migration