-- Corrigir criação automática de perfil e políticas para permitir inserção por admins

-- Atualizar função de criação automática de perfil ao criar usuário em auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null), 'service')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Políticas RLS para permitir inserção de profiles por admins
alter table public.profiles enable row level security;

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
on public.profiles
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Opcional: reforçar que usuários podem atualizar apenas seus campos não sensíveis (já existe)
-- Mantemos políticas existentes de SELECT/UPDATE conforme migrations anteriores

-- Fim