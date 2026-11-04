-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO 009: Corrigir RLS de profiles (recursão infinita)
--
-- PROBLEMA: As policies de admin fazem SELECT em profiles para verificar role,
-- mas esse SELECT também passa pela RLS, causando loop infinito.
--
-- SOLUÇÃO: Criar função SECURITY DEFINER que bypassa RLS para verificar role.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Criar função que verifica se usuário é admin (bypassa RLS)
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

-- 2. Criar função que retorna o role do usuário atual (bypassa RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 3. Remover TODAS as policies conflitantes de profiles
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

-- 4. Criar policies NOVAS que usam a função is_admin() (sem recursão)

-- SELECT: Usuário vê próprio perfil OU é admin (vê todos)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id  -- Próprio perfil
    OR is_admin()    -- Admin vê todos (função sem recursão)
  );

-- UPDATE: Usuário atualiza próprio perfil OU é admin
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR is_admin()
  )
  WITH CHECK (
    auth.uid() = id
    OR is_admin()
  );

-- INSERT: Só próprio usuário pode inserir (criação de conta)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- DELETE: Só admin pode deletar (e não a si mesmo)
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    is_admin() AND auth.uid() != id
  );

-- 5. Garantir que o campo role existe na tabela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role VARCHAR(20) DEFAULT 'user';
    ALTER TABLE profiles ADD CONSTRAINT check_role CHECK (role IN ('user', 'admin', 'super_admin'));
  END IF;
END $$;

-- 6. Garantir que o campo level_id existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'level_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN level_id INTEGER DEFAULT 1;
  END IF;
END $$;

-- 7. Atualizar level_id de todos os perfis baseado nos pontos
UPDATE profiles SET level_id =
  CASE
    WHEN points >= 8000 THEN 5  -- Meup Exclusive
    WHEN points >= 4000 THEN 4  -- Primeira Classe
    WHEN points >= 1800 THEN 3  -- Executiva
    WHEN points >= 600 THEN 2   -- Premium
    ELSE 1                       -- Econômica
  END;

-- 8. Dar permissão para usuários autenticados usarem as funções
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO: Listar policies ativas
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '✅ RLS de profiles corrigido!';
  RAISE NOTICE '✅ Função is_admin() criada (sem recursão)';
  RAISE NOTICE '✅ Função get_my_role() criada';
  RAISE NOTICE '✅ level_id atualizado baseado nos pontos';
END $$;
