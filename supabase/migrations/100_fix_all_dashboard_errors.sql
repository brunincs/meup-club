-- ============================================
-- MIGRAÇÃO 100: Corrigir todos os erros do dashboard
-- ============================================

-- ============================================
-- 1. REMOVER FUNÇÕES DUPLICADAS
-- ============================================

-- Drop todas as versões de get_referral_steps e criar uma única limpa
DROP FUNCTION IF EXISTS get_referral_steps();
DROP FUNCTION IF EXISTS get_referral_steps(UUID);

-- ============================================
-- 2. CRIAR get_referral_steps DEFINITIVA
-- Usa auth.uid() para buscar indicações do usuário logado
-- ============================================

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
    COALESCE(p.name, 'Amigo')::TEXT as referred_name,
    COALESCE(p.email, '')::TEXT as referred_email,
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
-- 3. FUNÇÕES get_missed_earnings
-- ============================================

DROP FUNCTION IF EXISTS get_missed_earnings();
DROP FUNCTION IF EXISTS get_total_missed_earnings();
DROP FUNCTION IF EXISTS mark_missed_earnings_viewed();

CREATE OR REPLACE FUNCTION get_missed_earnings()
RETURNS TABLE (
  id UUID,
  mensagem TEXT,
  pontos_perdidos INTEGER,
  visualizado BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retorna tabela vazia por enquanto (será implementado quando necessário)
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION get_total_missed_earnings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION mark_missed_earnings_viewed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Noop por enquanto
END;
$$;

-- ============================================
-- 4. ATUALIZAR get_planos_config para retornar estrutura correta
-- ============================================

DROP FUNCTION IF EXISTS get_planos_config();

CREATE OR REPLACE FUNCTION get_planos_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config JSONB := '{}';
  v_rec RECORD;
BEGIN
  -- Buscar todas as configurações
  FOR v_rec IN SELECT chave, valor, valor_texto FROM plano_config LOOP
    v_config := v_config || jsonb_build_object(v_rec.chave, COALESCE(v_rec.valor_texto, v_rec.valor::TEXT));
  END LOOP;

  -- Retornar estrutura esperada pelo frontend
  RETURN jsonb_build_object(
    'free', jsonb_build_object(
      'nome', 'Free',
      'descricao', 'Acesso básico ao clube',
      'pontosCheckin', 10,
      'pontosIndicacao', COALESCE((v_config->>'indicacao_compra_free')::INTEGER, 3000),
      'multiplicadorViagem', 1.0,
      'fatorPontos', COALESCE((v_config->>'fator_pontos_free')::INTEGER, 150)
    ),
    'prime', jsonb_build_object(
      'nome', 'Prime',
      'descricao', 'Benefícios exclusivos',
      'pontosCheckin', 30,
      'pontosIndicacao', COALESCE((v_config->>'indicacao_compra_prime')::INTEGER, 5000),
      'multiplicadorViagem', 1.5,
      'fatorPontos', COALESCE((v_config->>'fator_pontos_prime')::INTEGER, 130),
      'pontosAnualIndicador', COALESCE((v_config->>'indicacao_anual_indicador')::INTEGER, 3000),
      'pontosAnualIndicado', COALESCE((v_config->>'indicacao_anual_indicado')::INTEGER, 1000)
    ),
    'config', jsonb_build_object(
      'diasBloqueio', COALESCE((v_config->>'dias_bloqueio')::INTEGER, 7),
      'fundadorVagasTotal', COALESCE((v_config->>'fundador_vagas_total')::INTEGER, 100),
      'fundadorPremioPontos', COALESCE((v_config->>'fundador_premio_pontos')::INTEGER, 500000)
    )
  );
END;
$$;

-- ============================================
-- 5. GARANTIR QUE COLUNAS DE REFERRAL EXISTEM
-- ============================================

DO $$
BEGIN
  -- Adicionar colunas se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'primeira_emissao_aprovada') THEN
    ALTER TABLE referrals ADD COLUMN primeira_emissao_aprovada BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'pontos_emissao') THEN
    ALTER TABLE referrals ADD COLUMN pontos_emissao INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'prime_anual_confirmado') THEN
    ALTER TABLE referrals ADD COLUMN prime_anual_confirmado BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'pontos_prime_anual') THEN
    ALTER TABLE referrals ADD COLUMN pontos_prime_anual INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 6. RECALCULAR PONTOS DE EXPERIÊNCIAS
-- Fórmula: valor_reais × 150 (fator Free)
-- ============================================

UPDATE experiencias
SET pontos = ROUND(COALESCE(valor_reais, 0) * 150)
WHERE valor_reais IS NOT NULL AND valor_reais > 0;
