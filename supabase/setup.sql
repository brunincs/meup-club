-- ============================================
-- MEUP CLUB - Setup do Supabase
-- Execute este SQL no painel do Supabase:
-- https://supabase.com/dashboard → SQL Editor
-- ============================================

-- 1. CRIAR TABELA DE PERFIS
-- Esta tabela armazena os dados dos usuários do clube
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  phone text,
  avatar_url text,
  points integer default 0,
  level_id integer default 1,
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  total_referrals integer default 0,
  status text default 'active' check (status in ('active', 'blocked', 'pending')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. HABILITAR RLS (Row Level Security)
-- Isso garante que cada usuário só veja seus próprios dados
alter table public.profiles enable row level security;

-- 3. POLÍTICAS DE SEGURANÇA (RLS)

-- Usuário pode ver seu próprio perfil
create policy "Usuários podem ver seu próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Usuário pode atualizar seu próprio perfil
create policy "Usuários podem atualizar seu próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Permitir inserir perfil durante cadastro
create policy "Permitir inserção durante cadastro"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 4. FUNÇÃO PARA GERAR CÓDIGO DE INDICAÇÃO ÚNICO
create or replace function generate_referral_code()
returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code text := 'MEUP';
  i integer;
begin
  for i in 1..4 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return code;
end;
$$ language plpgsql;

-- 5. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE APÓS CADASTRO
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

-- Remover trigger antigo se existir
drop trigger if exists on_auth_user_created on auth.users;

-- Criar trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. ÍNDICES PARA PERFORMANCE
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_referral_code_idx on public.profiles(referral_code);

-- ============================================
-- VERIFICAÇÃO: Execute isso para testar
-- ============================================
-- select * from public.profiles limit 5;
