-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Adicionar campos de passaporte ao perfil
-- Criado em: 2024
-- Descrição: Campos editáveis para o "Meu Passaporte" do cliente
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. CAMPOS BÁSICOS
-- ══════════════════════════════════════════════════════════════════════════════

-- Telefone
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- URL do avatar
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Cidade e estado
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state VARCHAR(2);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. CAMPOS SENSÍVEIS (opcionais)
-- ══════════════════════════════════════════════════════════════════════════════

-- Data de nascimento
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

-- CPF - OPCIONAL e SENSÍVEL
-- Armazenamos completo mas só exibimos mascarado no frontend
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. PREFERÊNCIAS DE VIAGEM
-- ══════════════════════════════════════════════════════════════════════════════

-- Destinos dos sonhos (texto livre ou tags separadas por vírgula)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dream_destinations TEXT;

-- Tipo de viagem preferido (negócios, lazer, aventura, etc.)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_preferences TEXT;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RLS - Garantir que cada cliente só edita seus dados
-- (já existe, mas vamos reforçar)
-- ══════════════════════════════════════════════════════════════════════════════

-- Verificar se RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: usuário vê próprio perfil OU admin vê todos
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Policy para UPDATE: usuário só edita próprio perfil
-- (admin usa RPC separada para editar outros)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Remover policies antigas que possam conflitar
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. ÍNDICE para CPF (buscas de admin)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS profiles_cpf_idx ON profiles (cpf);

-- ══════════════════════════════════════════════════════════════════════════════
-- Mensagem de conclusão
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE 'Campos de passaporte adicionados ao profiles!';
  RAISE NOTICE 'Novos campos: phone, avatar_url, city, state, birth_date, cpf, dream_destinations, travel_preferences';
END $$;
