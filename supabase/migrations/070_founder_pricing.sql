-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 070: Founder Pricing
-- ══════════════════════════════════════════════════════════════════════════════
-- Adiciona preços âncora (cheios) e flag de oferta de fundador
-- Permite alternar entre preço cheio e oferta via banco, sem deploy
-- ══════════════════════════════════════════════════════════════════════════════

-- Adicionar colunas de preço âncora (preço cheio, antes do desconto)
ALTER TABLE plano_config
ADD COLUMN IF NOT EXISTS preco_mensal_cheio DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS preco_anual_cheio DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS oferta_fundador_ativa BOOLEAN DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN plano_config.preco_mensal_cheio IS 'Preço mensal cheio (âncora) - exibido riscado quando oferta ativa';
COMMENT ON COLUMN plano_config.preco_anual_cheio IS 'Preço anual cheio (âncora) - exibido riscado quando oferta ativa';
COMMENT ON COLUMN plano_config.oferta_fundador_ativa IS 'Quando true, mostra preço de fundador (desconto). False = preço cheio.';

-- Configurar preços de fundador para o plano Prime
-- Preço cheio (âncora): 997/ano, 99.90/mês
-- Preço de oferta (atual): 497/ano, 49.90/mês
-- Desconto: 50%
UPDATE plano_config
SET
  preco_mensal_cheio = 99.90,
  preco_anual_cheio = 997.00,
  oferta_fundador_ativa = true
WHERE plano = 'prime';

-- Verificar resultado
SELECT
  plano,
  preco_mensal,
  preco_mensal_cheio,
  preco_anual,
  preco_anual_cheio,
  oferta_fundador_ativa
FROM plano_config;
