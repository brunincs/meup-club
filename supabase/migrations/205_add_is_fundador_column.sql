-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 205: Adicionar coluna is_fundador na tabela profiles
-- ══════════════════════════════════════════════════════════════════════════════
-- Corrige erro: column p.is_fundador does not exist
-- A coluna é usada em várias queries mas nunca foi criada
-- ══════════════════════════════════════════════════════════════════════════════

-- Adicionar coluna is_fundador
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_fundador BOOLEAN DEFAULT false;

-- Adicionar coluna fundador_numero (número sequencial do fundador)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fundador_numero INTEGER;

-- Adicionar coluna fundador_numero_sorte (número para sorteio)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fundador_numero_sorte INTEGER;

-- Comentários para documentação
COMMENT ON COLUMN profiles.is_fundador IS 'Indica se o usuário é um fundador do Modelo Exclusivo 2026';
COMMENT ON COLUMN profiles.fundador_numero IS 'Número sequencial do fundador (1-30)';
COMMENT ON COLUMN profiles.fundador_numero_sorte IS 'Número da sorte para sorteio de 200k pontos';

-- Criar índice para consultas de fundadores
CREATE INDEX IF NOT EXISTS idx_profiles_is_fundador ON profiles(is_fundador) WHERE is_fundador = true;

-- Atualizar is_fundador para usuários que já têm fundador_numero
UPDATE profiles
SET is_fundador = true
WHERE fundador_numero IS NOT NULL AND is_fundador IS NOT TRUE;

-- Verificar resultado
SELECT
  COUNT(*) as total_fundadores,
  COUNT(fundador_numero) as com_numero
FROM profiles
WHERE is_fundador = true OR fundador_numero IS NOT NULL;
