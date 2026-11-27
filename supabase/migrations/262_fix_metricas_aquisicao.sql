-- ============================================
-- MIGRATION 262: Fix metricas_aquisicao
-- Corrige coluna primeira_viagem_em → primeira_emissao_em
-- ============================================

CREATE OR REPLACE FUNCTION metricas_aquisicao(
  p_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_por_origem JSONB;
  v_total INTEGER;
  v_indicacoes_cadastradas INTEGER;
  v_indicacoes_1a_emissao INTEGER;
  v_indicacoes_pontos_pagos INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  IF p_inicio IS NULL THEN p_inicio := '2024-01-01'::TIMESTAMPTZ; END IF;
  IF p_fim IS NULL THEN p_fim := NOW(); END IF;

  -- Cadastros por origem
  SELECT jsonb_object_agg(origem, qtd) INTO v_por_origem
  FROM (
    SELECT
      COALESCE(origem_acesso, 'site') as origem,
      COUNT(*) as qtd
    FROM profiles
    WHERE created_at BETWEEN p_inicio AND p_fim
      AND COALESCE(is_teste, false) = false
      AND role != 'admin'
    GROUP BY COALESCE(origem_acesso, 'site')
    ORDER BY qtd DESC
  ) sub;

  SELECT COUNT(*) INTO v_total
  FROM profiles
  WHERE created_at BETWEEN p_inicio AND p_fim
    AND COALESCE(is_teste, false) = false
    AND role != 'admin';

  -- Indicações cadastradas no período
  SELECT COUNT(*) INTO v_indicacoes_cadastradas
  FROM referrals
  WHERE created_at BETWEEN p_inicio AND p_fim;

  -- Indicações com 1ª emissão aprovada no período
  SELECT COUNT(*) INTO v_indicacoes_1a_emissao
  FROM referrals
  WHERE primeira_emissao_em BETWEEN p_inicio AND p_fim;

  -- Indicações com pontos creditados (cotação validada)
  SELECT COUNT(*) INTO v_indicacoes_pontos_pagos
  FROM referrals
  WHERE cotacao_pontos_creditados = true
    AND cotacao_validada_em BETWEEN p_inicio AND p_fim;

  RETURN jsonb_build_object(
    'success', true,
    'por_origem', COALESCE(v_por_origem, '{}'::JSONB),
    'total', v_total,
    'indicacoes_cadastradas', v_indicacoes_cadastradas,
    'indicacoes_1a_viagem', v_indicacoes_1a_emissao,
    'indicacoes_pontos_pagos', v_indicacoes_pontos_pagos
  );
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 262: metricas_aquisicao corrigida';
END $$;
