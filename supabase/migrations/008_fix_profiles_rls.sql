-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Corrigir RLS de profiles (remover conflito)
-- Problema: duas policies de SELECT conflitando
-- ══════════════════════════════════════════════════════════════════════════════

-- Remover TODAS as policies de SELECT conflitantes
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Criar UMA ÚNICA policy de SELECT que funciona para todos os casos
-- Usuário vê próprio perfil OU é admin (usando role da própria row)
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (
    auth.uid() = id  -- Próprio perfil
    OR (
      -- Admin pode ver todos - verifica role do usuário autenticado
      -- usando a row do próprio usuário, não subquery
      EXISTS (
        SELECT 1 FROM profiles admin_check
        WHERE admin_check.id = auth.uid()
        AND admin_check.role IN ('admin', 'super_admin')
      )
    )
  );

-- Garantir que UPDATE ainda funciona
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Garantir que INSERT funciona para criação de conta
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Atualizar level_id baseado nos pontos (corrigir dados existentes)
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE profiles SET level_id =
  CASE
    WHEN points >= 8000 THEN 5  -- Meup Exclusive
    WHEN points >= 4000 THEN 4  -- Primeira Classe
    WHEN points >= 1800 THEN 3  -- Executiva
    WHEN points >= 600 THEN 2   -- Premium
    ELSE 1                       -- Econômica
  END;

-- ══════════════════════════════════════════════════════════════════════════════
-- Criar trigger para atualizar level_id automaticamente
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_level_on_points_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level_id := CASE
    WHEN NEW.points >= 8000 THEN 5
    WHEN NEW.points >= 4000 THEN 4
    WHEN NEW.points >= 1800 THEN 3
    WHEN NEW.points >= 600 THEN 2
    ELSE 1
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_level ON profiles;
CREATE TRIGGER trigger_update_level
  BEFORE UPDATE OF points ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_level_on_points_change();

DO $$
BEGIN
  RAISE NOTICE 'RLS de profiles corrigido!';
  RAISE NOTICE 'level_id atualizado baseado nos pontos!';
  RAISE NOTICE 'Trigger criado para atualizar level_id automaticamente!';
END $$;
