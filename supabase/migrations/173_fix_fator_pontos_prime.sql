-- ============================================
-- Fix fator_pontos_prime: 130 → 125
-- Prime: 125 pts = R$1 → R$100 = 12.500 pts
-- ============================================

-- Atualizar o fator de conversão Prime
UPDATE plano_config
SET valor = 125,
    descricao = 'Fator de conversão reais→pontos para Prime (R$100 × 125 = 12.500 pts)'
WHERE chave = 'fator_pontos_prime';

-- Verificar resultado
DO $$
DECLARE
  v_valor INTEGER;
BEGIN
  SELECT valor INTO v_valor FROM plano_config WHERE chave = 'fator_pontos_prime';
  RAISE NOTICE 'fator_pontos_prime atualizado para: %', v_valor;
END $$;
