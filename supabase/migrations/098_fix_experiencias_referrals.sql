-- ============================================
-- MIGRAÇÃO 098: Corrigir valor_reais e get_referral_steps
-- ============================================

-- ============================================
-- 1. CORRIGIR valor_reais DAS EXPERIÊNCIAS
-- Valores reais conforme definido pelo cliente
-- ============================================

UPDATE experiencias SET valor_reais = 100 WHERE nome = 'Crédito de viagem R$ 100';
UPDATE experiencias SET valor_reais = 150 WHERE nome = 'Crédito de viagem R$ 150';
UPDATE experiencias SET valor_reais = 250 WHERE nome = 'Crédito de viagem R$ 250';
UPDATE experiencias SET valor_reais = 100 WHERE nome = 'Voucher Uber R$ 100';
UPDATE experiencias SET valor_reais = 150 WHERE nome = 'Voucher Uber R$ 150';
UPDATE experiencias SET valor_reais = 250 WHERE nome = 'Voucher Uber R$ 250';
UPDATE experiencias SET valor_reais = 50 WHERE nome = 'Escolha de assento';
UPDATE experiencias SET valor_reais = 100 WHERE nome = 'Bagagem 23kg extra';
UPDATE experiencias SET valor_reais = 150 WHERE nome = 'Sala VIP (Lounge)';
UPDATE experiencias SET valor_reais = 80 WHERE nome = 'Kit viagem';
UPDATE experiencias SET valor_reais = 100 WHERE nome = 'Seguro viagem';
UPDATE experiencias SET valor_reais = 120 WHERE nome = 'Roteiro pronto da cidade';
UPDATE experiencias SET valor_reais = 200 WHERE nome ILIKE '%Transfer VIP%';
UPDATE experiencias SET valor_reais = 300 WHERE nome = 'Consultoria de roteiro premium';
UPDATE experiencias SET valor_reais = 150 WHERE nome = 'Upgrade de voo';
UPDATE experiencias SET valor_reais = 100 WHERE nome = 'Pernoite extra';
UPDATE experiencias SET valor_reais = 80 WHERE nome = 'Jantar exclusivo';
UPDATE experiencias SET valor_reais = 100 WHERE nome = 'Stopover exclusivo';
UPDATE experiencias SET valor_reais = 300 WHERE nome = 'Passeio de balão';
UPDATE experiencias SET valor_reais = 350 WHERE nome = 'Nadar com golfinhos';

-- ============================================
-- 2. CORRIGIR get_referral_steps - Versão simplificada e funcional
-- ============================================

DROP FUNCTION IF EXISTS get_referral_steps();

CREATE OR REPLACE FUNCTION get_referral_steps()
RETURNS TABLE (
  referral_id UUID,
  referred_id UUID,
  referred_name TEXT,
  referred_email TEXT,
  cadastrou BOOLEAN,
  primeira_emissao BOOLEAN,
  emissao_pontos INTEGER,
  prime_anual BOOLEAN,
  prime_anual_pontos INTEGER,
  prime_anual_pendente BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id as referral_id,
    r.referred_id,
    p.name as referred_name,
    p.email as referred_email,
    TRUE as cadastrou,
    -- Primeira emissão aprovada
    COALESCE(r.primeira_emissao_aprovada, FALSE) OR EXISTS(
      SELECT 1 FROM emissoes e
      WHERE e.user_id = r.referred_id
      AND e.status = 'approved'
      LIMIT 1
    ) as primeira_emissao,
    -- Pontos ganhos na emissão
    COALESCE(r.pontos_emissao, 0)::INTEGER as emissao_pontos,
    -- Prime Anual
    COALESCE(r.prime_anual_confirmado, FALSE) OR EXISTS(
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = r.referred_id
      AND s.plano = 'prime'
      AND s.ciclo = 'anual'
      AND s.status = 'active'
    ) as prime_anual,
    -- Pontos do Prime Anual
    COALESCE(r.pontos_prime_anual, 0)::INTEGER as prime_anual_pontos,
    -- Pendente (7 dias)
    EXISTS(
      SELECT 1 FROM pending_points pp
      WHERE pp.user_id = v_user_id
      AND pp.status = 'pendente'
      AND pp.motivo ILIKE '%' || p.name || '%'
    ) as prime_anual_pendente
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referrer_id = v_user_id
  ORDER BY r.created_at DESC;
END;
$$;

-- ============================================
-- 3. ADICIONAR COLUNAS DE CONTROLE EM REFERRALS (se não existirem)
-- ============================================

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS primeira_emissao_aprovada BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS primeira_emissao_em TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS pontos_emissao INTEGER DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS prime_anual_confirmado BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS prime_anual_em TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS pontos_prime_anual INTEGER DEFAULT 0;

-- ============================================
-- 4. ATUALIZAR EXPERIÊNCIAS PARA USAR get_experiencias_com_precos
-- Garantir que a função retorna os campos corretos
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

  -- Buscar fatores
  SELECT valor INTO v_fator_free FROM plano_config WHERE chave = 'fator_pontos_free';
  SELECT valor INTO v_fator_prime FROM plano_config WHERE chave = 'fator_pontos_prime';
  v_fator_free := COALESCE(v_fator_free, 150);
  v_fator_prime := COALESCE(v_fator_prime, 130);

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
