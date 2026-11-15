-- ============================================
-- MIGRAÇÃO 174: Corrigir valor_reais e fator Prime
-- Problema: "Crédito de viagem R$100" mostra 7.500 pts (deveria ser 12.500)
-- Causa: valor_reais incorreto ou não definido
-- ============================================

-- ============================================
-- 1. GARANTIR fator_pontos_prime = 125 na config
-- ============================================
INSERT INTO plano_config (chave, valor, descricao)
VALUES (
  'fator_pontos_prime',
  125,
  'Fator de conversão reais→pontos para Prime (R$100 × 125 = 12.500 pts)'
)
ON CONFLICT (chave) DO UPDATE SET
  valor = 125,
  descricao = 'Fator de conversão reais→pontos para Prime (R$100 × 125 = 12.500 pts)';

-- Garantir fator_pontos_free = 150
INSERT INTO plano_config (chave, valor, descricao)
VALUES (
  'fator_pontos_free',
  150,
  'Fator de conversão reais→pontos para Free (R$100 × 150 = 15.000 pts)'
)
ON CONFLICT (chave) DO UPDATE SET
  valor = 150,
  descricao = 'Fator de conversão reais→pontos para Free (R$100 × 150 = 15.000 pts)';

-- ============================================
-- 2. CORRIGIR valor_reais de TODAS experiências de crédito
-- Usando ILIKE para matching mais flexível (ignora espaços, case, etc.)
-- ============================================

-- Créditos de viagem
UPDATE experiencias SET valor_reais = 100
WHERE nome ILIKE '%Crédito%viagem%100%' OR nome ILIKE '%Credito%viagem%100%';

UPDATE experiencias SET valor_reais = 150
WHERE nome ILIKE '%Crédito%viagem%150%' OR nome ILIKE '%Credito%viagem%150%';

UPDATE experiencias SET valor_reais = 250
WHERE nome ILIKE '%Crédito%viagem%250%' OR nome ILIKE '%Credito%viagem%250%';

-- Vouchers Uber
UPDATE experiencias SET valor_reais = 100
WHERE nome ILIKE '%Voucher%Uber%100%';

UPDATE experiencias SET valor_reais = 150
WHERE nome ILIKE '%Voucher%Uber%150%';

UPDATE experiencias SET valor_reais = 250
WHERE nome ILIKE '%Voucher%Uber%250%';

-- Outras experiências com valores conhecidos
UPDATE experiencias SET valor_reais = 50 WHERE nome ILIKE '%Escolha de assento%' AND valor_reais IS DISTINCT FROM 50;
UPDATE experiencias SET valor_reais = 100 WHERE nome ILIKE '%Bagagem%23kg%' AND valor_reais IS DISTINCT FROM 100;
UPDATE experiencias SET valor_reais = 150 WHERE nome ILIKE '%Sala VIP%' OR nome ILIKE '%Lounge%' AND valor_reais IS DISTINCT FROM 150;
UPDATE experiencias SET valor_reais = 80 WHERE nome ILIKE '%Kit viagem%' AND valor_reais IS DISTINCT FROM 80;
UPDATE experiencias SET valor_reais = 100 WHERE nome ILIKE '%Seguro viagem%' AND valor_reais IS DISTINCT FROM 100;
UPDATE experiencias SET valor_reais = 120 WHERE nome ILIKE '%Roteiro%cidade%' AND valor_reais IS DISTINCT FROM 120;
UPDATE experiencias SET valor_reais = 200 WHERE nome ILIKE '%Transfer VIP%' AND valor_reais IS DISTINCT FROM 200;
UPDATE experiencias SET valor_reais = 300 WHERE nome ILIKE '%Consultoria%roteiro%premium%' AND valor_reais IS DISTINCT FROM 300;
UPDATE experiencias SET valor_reais = 150 WHERE nome ILIKE '%Upgrade%voo%' AND valor_reais IS DISTINCT FROM 150;
UPDATE experiencias SET valor_reais = 100 WHERE nome ILIKE '%Pernoite%extra%' AND valor_reais IS DISTINCT FROM 100;
UPDATE experiencias SET valor_reais = 80 WHERE nome ILIKE '%Jantar%exclusivo%' AND valor_reais IS DISTINCT FROM 80;
UPDATE experiencias SET valor_reais = 100 WHERE nome ILIKE '%Stopover%exclusivo%' AND valor_reais IS DISTINCT FROM 100;
UPDATE experiencias SET valor_reais = 300 WHERE nome ILIKE '%Passeio%balão%' AND valor_reais IS DISTINCT FROM 300;
UPDATE experiencias SET valor_reais = 350 WHERE nome ILIKE '%Nadar%golfinho%' AND valor_reais IS DISTINCT FROM 350;

-- ============================================
-- 3. RECRIAR RPC COM DEFAULT 125 (não 130)
-- ============================================
DROP FUNCTION IF EXISTS get_experiencias_com_precos(UUID);
DROP FUNCTION IF EXISTS get_experiencias_com_precos();

CREATE OR REPLACE FUNCTION get_experiencias_com_precos(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  valor_reais DECIMAL,
  pontos_free INTEGER,
  pontos_prime INTEGER,
  pontos_usuario INTEGER,
  classe_minima INTEGER,
  selo TEXT,
  imagem_url TEXT,
  tipo_entrega TEXT,
  subtipo_entrega TEXT,
  ordem INTEGER,
  ativa BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_plano TEXT;
  v_fator_free INTEGER;
  v_fator_prime INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Buscar plano do usuário
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(
      (SELECT s.plano::TEXT FROM subscriptions s WHERE s.user_id = v_user_id AND s.status = 'active'),
      'free'
    ) INTO v_plano;
  ELSE
    v_plano := 'free';
  END IF;

  -- Buscar fatores da config
  SELECT valor INTO v_fator_free FROM plano_config WHERE chave = 'fator_pontos_free';
  SELECT valor INTO v_fator_prime FROM plano_config WHERE chave = 'fator_pontos_prime';

  -- Defaults corretos: Free=150, Prime=125
  v_fator_free := COALESCE(v_fator_free, 150);
  v_fator_prime := COALESCE(v_fator_prime, 125); -- FIX: era 130

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.descricao,
    e.valor_reais,
    ROUND(COALESCE(e.valor_reais, 0) * v_fator_free)::INTEGER as pontos_free,
    ROUND(COALESCE(e.valor_reais, 0) * v_fator_prime)::INTEGER as pontos_prime,
    CASE WHEN v_plano = 'prime'
      THEN ROUND(COALESCE(e.valor_reais, 0) * v_fator_prime)::INTEGER
      ELSE ROUND(COALESCE(e.valor_reais, 0) * v_fator_free)::INTEGER
    END as pontos_usuario,
    COALESCE(e.classe_minima, 1) as classe_minima,
    e.selo,
    e.imagem_url,
    e.tipo_entrega,
    e.subtipo_entrega,
    COALESCE(e.ordem, 999) as ordem,
    COALESCE(e.ativa, true) as ativa
  FROM experiencias e
  WHERE e.ativa = TRUE
  ORDER BY e.ordem ASC, e.nome ASC;
END;
$$;

-- ============================================
-- 4. VERIFICAR RESULTADOS
-- ============================================
DO $$
DECLARE
  v_fator_free INTEGER;
  v_fator_prime INTEGER;
  v_exp RECORD;
BEGIN
  SELECT valor INTO v_fator_free FROM plano_config WHERE chave = 'fator_pontos_free';
  SELECT valor INTO v_fator_prime FROM plano_config WHERE chave = 'fator_pontos_prime';

  RAISE NOTICE '=== FATORES DE CONVERSÃO ===';
  RAISE NOTICE 'Free: % pts/R$', v_fator_free;
  RAISE NOTICE 'Prime: % pts/R$', v_fator_prime;

  RAISE NOTICE '';
  RAISE NOTICE '=== EXPERIÊNCIAS DE CRÉDITO (R$100) ===';
  FOR v_exp IN
    SELECT nome, valor_reais,
           valor_reais * v_fator_free as pts_free,
           valor_reais * v_fator_prime as pts_prime
    FROM experiencias
    WHERE nome ILIKE '%100%' AND (nome ILIKE '%crédito%' OR nome ILIKE '%credito%')
  LOOP
    RAISE NOTICE '% | R$% | Free=% pts | Prime=% pts',
      v_exp.nome, v_exp.valor_reais, v_exp.pts_free, v_exp.pts_prime;
  END LOOP;
END $$;
