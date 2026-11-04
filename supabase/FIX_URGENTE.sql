-- ══════════════════════════════════════════════════════════════════════════════
-- 🚨 CORREÇÃO URGENTE: RLS + Admin + Saldo
--
-- Execute este script no Supabase SQL Editor:
-- https://supabase.com/dashboard → Seu projeto → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════
-- PARTE 1: CORRIGIR RLS (RECURSÃO INFINITA)
-- ═══════════════════════════════════════

-- 1.1 Criar função que verifica admin SEM RECURSÃO
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$;

-- 1.2 Criar função que retorna role do usuário atual
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 1.3 Remover TODAS as policies conflitantes
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem atualizar todos os perfis" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

-- 1.4 Criar policies NOVAS (sem recursão)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE
  TO authenticated
  USING (is_admin() AND auth.uid() != id);

-- 1.5 Dar permissão para usar as funções
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role TO authenticated;

-- ═══════════════════════════════════════
-- PARTE 2: GARANTIR ESTRUTURA DA TABELA
-- ═══════════════════════════════════════

-- 2.1 Adicionar coluna role se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role VARCHAR(20) DEFAULT 'user';
  END IF;
END $$;

-- 2.2 Adicionar coluna level_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'level_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN level_id INTEGER DEFAULT 1;
  END IF;
END $$;

-- ═══════════════════════════════════════
-- PARTE 3: DEFINIR BRUNO COMO ADMIN
-- ═══════════════════════════════════════

UPDATE profiles
SET role = 'admin'
WHERE email = 'brunocesarperal@gmail.com';

-- ═══════════════════════════════════════
-- PARTE 4: ATUALIZAR LEVEL_ID BASEADO NOS PONTOS
-- ═══════════════════════════════════════

UPDATE profiles SET level_id =
  CASE
    WHEN points >= 8000 THEN 5  -- Meup Exclusive
    WHEN points >= 4000 THEN 4  -- Primeira Classe
    WHEN points >= 1800 THEN 3  -- Executiva
    WHEN points >= 600 THEN 2   -- Premium
    ELSE 1                       -- Econômica
  END;

-- ═══════════════════════════════════════
-- PARTE 5: VERIFICAR RESULTADO
-- ═══════════════════════════════════════

-- Ver perfil do Bruno
SELECT
  id,
  name,
  email,
  points,
  level_id,
  role,
  created_at
FROM profiles
WHERE email = 'brunocesarperal@gmail.com';

-- ═══════════════════════════════════════
-- PARTE 6: SE PRECISAR AJUSTAR O SALDO MANUALMENTE
-- (descomente e altere o valor se necessário)
-- ═══════════════════════════════════════

-- UPDATE profiles
-- SET points = 18000
-- WHERE email = 'brunocesarperal@gmail.com';

-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ FIM DO SCRIPT
-- Após executar, o Bruno deve:
-- 1. Conseguir acessar /admin
-- 2. Ver o saldo correto no dashboard
-- ══════════════════════════════════════════════════════════════════════════════
