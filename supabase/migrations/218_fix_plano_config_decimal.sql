-- ============================================
-- MIGRAÇÃO 218: Corrigir tipo da coluna valor em plano_config
-- A coluna era INTEGER (truncava 0.5 para 1)
-- Agora é NUMERIC(10,2) para suportar decimais
-- ============================================

-- Alterar tipo da coluna
ALTER TABLE plano_config ALTER COLUMN valor TYPE NUMERIC(10,2) USING valor::numeric;

-- Corrigir valores dos multiplicadores
UPDATE plano_config SET valor = 0.5 WHERE chave = 'pontos_por_real_free';
UPDATE plano_config SET valor = 1.5 WHERE chave = 'pontos_por_real_prime';

-- Log
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 218: plano_config.valor agora NUMERIC(10,2)';
  RAISE NOTICE '  - pontos_por_real_free = 0.5';
  RAISE NOTICE '  - pontos_por_real_prime = 1.5';
END $$;
