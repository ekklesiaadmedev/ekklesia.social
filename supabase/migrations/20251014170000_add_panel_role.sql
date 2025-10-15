-- Adicionar novo papel 'panel' ao CHECK de profiles.role
-- Idempotente: remove constraint existente e recria incluindo 'panel'

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
  check (role in ('admin','triage','service','panel','user'));

-- Mantém defaults e políticas existentes; admin pode atribuir papel 'panel' via UI