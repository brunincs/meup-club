-- ============================================
-- MEUP CLUB - Schema do Banco de Dados
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. TABELA PROFILES
-- Armazena os dados do perfil de cada usuário
-- O id é o mesmo do auth.users (vinculado)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  points integer default 0,
  class text default 'Econômica',
  referral_code text unique,
  total_referrals integer default 0,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. HABILITAR RLS (Row Level Security)
-- Cada usuário só pode ver/editar o PRÓPRIO perfil
alter table public.profiles enable row level security;

-- 3. POLÍTICAS DE SEGURANÇA (RLS Policies)

-- Usuários podem ver apenas seu próprio perfil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Permitir inserção durante o cadastro (via trigger)
create policy "Enable insert for authenticated users only"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 4. FUNÇÃO PARA GERAR CÓDIGO DE INDICAÇÃO
-- Gera um código único tipo "MEUP7X3K"
create or replace function generate_referral_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'MEUP';
  i integer;
begin
  for i in 1..4 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- 5. FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- Quando alguém se cadastra, cria o perfil automaticamente
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    generate_referral_code()
  );
  return new;
end;
$$ language plpgsql security definer;

-- 6. TRIGGER: Dispara quando um novo usuário é criado
-- Conecta a função acima ao evento de cadastro
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. ÍNDICES PARA PERFORMANCE
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_referral_code_idx on public.profiles (referral_code);
