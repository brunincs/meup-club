-- ============================================
-- MIGRATION 261: Métricas Admin v2
-- 30 Fundadores, origens novas, funil VSL
-- ============================================

-- ============================================
-- 1. TABELA vsl_eventos (tracking anônimo)
-- ============================================
CREATE TABLE IF NOT EXISTS vsl_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento TEXT NOT NULL CHECK (evento IN ('play', 'progress_30s', 'progress_60s', 'complete', 'click_free', 'click_prime')),
  sessao_id TEXT NOT NULL,
  origem_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vsl_eventos_evento ON vsl_eventos(evento);
CREATE INDEX IF NOT EXISTS idx_vsl_eventos_sessao ON vsl_eventos(sessao_id);
CREATE INDEX IF NOT EXISTS idx_vsl_eventos_created ON vsl_eventos(created_at);

-- RLS: permitir insert anônimo apenas para eventos específicos
ALTER TABLE vsl_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon pode inserir eventos VSL" ON vsl_eventos;
CREATE POLICY "Anon pode inserir eventos VSL" ON vsl_eventos
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin pode ler eventos VSL" ON vsl_eventos;
CREATE POLICY "Admin pode ler eventos VSL" ON vsl_eventos
  FOR SELECT USING (is_admin());

-- ============================================
-- 2. RPC registrar_evento_vsl (público)
-- ============================================
CREATE OR REPLACE FUNCTION registrar_evento_vsl(
  p_evento TEXT,
  p_sessao_id TEXT,
  p_origem_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_evento NOT IN ('play', 'progress_30s', 'progress_60s', 'complete', 'click_free', 'click_prime') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento inválido');
  END IF;

  INSERT INTO vsl_eventos (evento, sessao_id, origem_url)
  VALUES (p_evento, p_sessao_id, p_origem_url);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_evento_vsl(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION registrar_evento_vsl(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================
-- 3. metricas_visao_geral (admin)
-- ============================================
CREATE OR REPLACE FUNCTION metricas_visao_geral()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_aprovados INTEGER;
  v_free INTEGER;
  v_prime INTEGER;
  v_vagas_free INTEGER;
  v_vagas_fundador INTEGER;
  v_na_lista INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  -- Total aprovados (excluindo teste)
  SELECT COUNT(*) INTO v_total_aprovados
  FROM profiles
  WHERE status_acesso = 'aprovado'
    AND COALESCE(is_teste, false) = false
    AND role != 'admin';

  -- Prime ativos
  SELECT COUNT(*) INTO v_prime
  FROM profiles p
  JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
  WHERE COALESCE(p.is_teste, false) = false
    AND p.role != 'admin';

  v_free := v_total_aprovados - v_prime;

  -- Vagas Free (70 total)
  v_vagas_free := 70 - v_free;

  -- Vagas Fundador (30 total)
  SELECT 30 - COUNT(*) INTO v_vagas_fundador
  FROM profiles
  WHERE is_fundador = true
    AND fundador_numero IS NOT NULL
    AND COALESCE(is_teste, false) = false;

  -- Na lista de espera
  SELECT COUNT(*) INTO v_na_lista
  FROM profiles
  WHERE status_acesso = 'pendente'
    AND COALESCE(is_teste, false) = false;

  RETURN jsonb_build_object(
    'success', true,
    'total_aprovados', v_total_aprovados,
    'free', v_free,
    'prime', v_prime,
    'vagas_free', GREATEST(0, v_vagas_free),
    'vagas_free_total', 70,
    'vagas_fundador', GREATEST(0, v_vagas_fundador),
    'vagas_fundador_total', 30,
    'na_lista', v_na_lista
  );
END;
$$;

-- ============================================
-- 4. metricas_prime_fundador (admin)
-- ============================================
CREATE OR REPLACE FUNCTION metricas_prime_fundador(
  p_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fundadores INTEGER;
  v_vagas_restantes INTEGER;
  v_receita NUMERIC;
  v_links_gerados INTEGER;
  v_links_usados INTEGER;
  v_links_ativos INTEGER;
  v_links_expirados INTEGER;
  v_conversoes_free_prime INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  -- Período padrão: desde o início
  IF p_inicio IS NULL THEN
    p_inicio := '2024-01-01'::TIMESTAMPTZ;
  END IF;
  IF p_fim IS NULL THEN
    p_fim := NOW();
  END IF;

  -- Fundadores (30 vagas)
  SELECT COUNT(*) INTO v_fundadores
  FROM profiles
  WHERE is_fundador = true
    AND fundador_numero IS NOT NULL
    AND COALESCE(is_teste, false) = false;

  v_vagas_restantes := 30 - v_fundadores;

  -- Receita: soma de prime_links usados + estimativa R$597 por fundador sem link
  SELECT COALESCE(SUM(valor_pago), 0) INTO v_receita
  FROM prime_links
  WHERE status = 'usado'
    AND usado_em BETWEEN p_inicio AND p_fim;

  -- Se não tem links, estimar pelos fundadores
  IF v_receita = 0 AND v_fundadores > 0 THEN
    v_receita := v_fundadores * 597;
  END IF;

  -- Links Prime stats
  SELECT COUNT(*) INTO v_links_gerados
  FROM prime_links
  WHERE criado_em BETWEEN p_inicio AND p_fim;

  SELECT COUNT(*) INTO v_links_usados
  FROM prime_links
  WHERE status = 'usado'
    AND usado_em BETWEEN p_inicio AND p_fim;

  SELECT COUNT(*) INTO v_links_ativos
  FROM prime_links
  WHERE status = 'ativo'
    AND expira_em > NOW();

  SELECT COUNT(*) INTO v_links_expirados
  FROM prime_links
  WHERE status IN ('expirado', 'cancelado')
    OR (status = 'ativo' AND expira_em <= NOW());

  -- Conversão Free → Prime no período
  SELECT COUNT(*) INTO v_conversoes_free_prime
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.plano = 'prime'
    AND s.status = 'active'
    AND s.created_at BETWEEN p_inicio AND p_fim
    AND COALESCE(p.is_teste, false) = false;

  RETURN jsonb_build_object(
    'success', true,
    'fundadores', v_fundadores,
    'vagas_restantes', GREATEST(0, v_vagas_restantes),
    'receita', v_receita,
    'links_gerados', v_links_gerados,
    'links_usados', v_links_usados,
    'links_ativos_sem_uso', v_links_ativos,
    'links_expirados', v_links_expirados,
    'conversoes_free_prime', v_conversoes_free_prime
  );
END;
$$;

-- ============================================
-- 5. metricas_aquisicao (admin)
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
  v_indicacoes_1a_viagem INTEGER;
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

  -- Indicações
  SELECT COUNT(*) INTO v_indicacoes_cadastradas
  FROM referrals
  WHERE created_at BETWEEN p_inicio AND p_fim;

  SELECT COUNT(*) INTO v_indicacoes_1a_viagem
  FROM referrals
  WHERE primeira_viagem_em BETWEEN p_inicio AND p_fim;

  SELECT COUNT(*) INTO v_indicacoes_pontos_pagos
  FROM referrals
  WHERE cotacao_pontos_creditados = true
    AND cotacao_validada_em BETWEEN p_inicio AND p_fim;

  RETURN jsonb_build_object(
    'success', true,
    'por_origem', COALESCE(v_por_origem, '{}'::JSONB),
    'total', v_total,
    'indicacoes_cadastradas', v_indicacoes_cadastradas,
    'indicacoes_1a_viagem', v_indicacoes_1a_viagem,
    'indicacoes_pontos_pagos', v_indicacoes_pontos_pagos
  );
END;
$$;

-- ============================================
-- 6. metricas_vsl (admin)
-- ============================================
CREATE OR REPLACE FUNCTION metricas_vsl(
  p_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_play INTEGER;
  v_30s INTEGER;
  v_60s INTEGER;
  v_complete INTEGER;
  v_click_free INTEGER;
  v_click_prime INTEGER;
  v_cadastros_vsl INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  IF p_inicio IS NULL THEN p_inicio := '2024-01-01'::TIMESTAMPTZ; END IF;
  IF p_fim IS NULL THEN p_fim := NOW(); END IF;

  -- Contagem por evento (sessões únicas)
  SELECT COUNT(DISTINCT sessao_id) INTO v_play
  FROM vsl_eventos WHERE evento = 'play' AND created_at BETWEEN p_inicio AND p_fim;

  SELECT COUNT(DISTINCT sessao_id) INTO v_30s
  FROM vsl_eventos WHERE evento = 'progress_30s' AND created_at BETWEEN p_inicio AND p_fim;

  SELECT COUNT(DISTINCT sessao_id) INTO v_60s
  FROM vsl_eventos WHERE evento = 'progress_60s' AND created_at BETWEEN p_inicio AND p_fim;

  SELECT COUNT(DISTINCT sessao_id) INTO v_complete
  FROM vsl_eventos WHERE evento = 'complete' AND created_at BETWEEN p_inicio AND p_fim;

  SELECT COUNT(DISTINCT sessao_id) INTO v_click_free
  FROM vsl_eventos WHERE evento = 'click_free' AND created_at BETWEEN p_inicio AND p_fim;

  SELECT COUNT(DISTINCT sessao_id) INTO v_click_prime
  FROM vsl_eventos WHERE evento = 'click_prime' AND created_at BETWEEN p_inicio AND p_fim;

  -- Cadastros com origem=vsl
  SELECT COUNT(*) INTO v_cadastros_vsl
  FROM profiles
  WHERE origem_acesso = 'vsl'
    AND created_at BETWEEN p_inicio AND p_fim
    AND COALESCE(is_teste, false) = false;

  RETURN jsonb_build_object(
    'success', true,
    'play', v_play,
    'progress_30s', v_30s,
    'progress_60s', v_60s,
    'complete', v_complete,
    'click_free', v_click_free,
    'click_prime', v_click_prime,
    'cadastros_vsl', v_cadastros_vsl
  );
END;
$$;

-- ============================================
-- 7. metricas_pontos (admin)
-- ============================================
CREATE OR REPLACE FUNCTION metricas_pontos(
  p_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_por_tipo JSONB;
  v_emitidos INTEGER;
  v_resgatados INTEGER;
  v_bloqueados INTEGER;
  v_saldo_total INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  IF p_inicio IS NULL THEN p_inicio := '2024-01-01'::TIMESTAMPTZ; END IF;
  IF p_fim IS NULL THEN p_fim := NOW(); END IF;

  -- Emitidos por tipo no período
  SELECT jsonb_object_agg(tipo, qtd) INTO v_por_tipo
  FROM (
    SELECT
      CASE
        WHEN reason ILIKE '%viagem%' OR reason ILIKE '%emiss%' THEN 'viagens'
        WHEN reason ILIKE '%boas-vindas%' OR reason ILIKE '%welcome%' THEN 'boas_vindas'
        WHEN reason ILIKE '%miss%' OR reason ILIKE '%tarefa%' THEN 'missoes'
        WHEN reason ILIKE '%indica%' OR reason ILIKE '%referral%' THEN 'indicacao'
        WHEN reason ILIKE '%check%' THEN 'checkin'
        ELSE 'outros'
      END as tipo,
      SUM(amount) as qtd
    FROM point_transactions
    WHERE amount > 0
      AND created_at BETWEEN p_inicio AND p_fim
    GROUP BY 1
  ) sub;

  -- Total emitidos
  SELECT COALESCE(SUM(amount), 0) INTO v_emitidos
  FROM point_transactions
  WHERE amount > 0
    AND created_at BETWEEN p_inicio AND p_fim;

  -- Total resgatados
  SELECT COALESCE(ABS(SUM(amount)), 0) INTO v_resgatados
  FROM point_transactions
  WHERE amount < 0
    AND created_at BETWEEN p_inicio AND p_fim;

  -- Bloqueados em carência (pending_points + pontos_bloqueados)
  SELECT COALESCE(SUM(pontos), 0) INTO v_bloqueados
  FROM pending_points
  WHERE status = 'pendente';

  -- Saldo total em circulação
  SELECT COALESCE(SUM(points), 0) INTO v_saldo_total
  FROM profiles
  WHERE COALESCE(is_teste, false) = false
    AND role != 'admin';

  RETURN jsonb_build_object(
    'success', true,
    'por_tipo', COALESCE(v_por_tipo, '{}'::JSONB),
    'emitidos', v_emitidos,
    'resgatados', v_resgatados,
    'bloqueados', v_bloqueados,
    'saldo_total', v_saldo_total
  );
END;
$$;

-- ============================================
-- 8. metricas_engajamento (admin)
-- ============================================
CREATE OR REPLACE FUNCTION metricas_engajamento(
  p_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissoes_enviadas INTEGER;
  v_emissoes_aprovadas INTEGER;
  v_resgates_por_status JSONB;
  v_missoes_concluidas INTEGER;
  v_missao_reels INTEGER;
  v_checkins_total INTEGER;
  v_dias INTEGER;
  v_checkins_dia NUMERIC;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  IF p_inicio IS NULL THEN p_inicio := '2024-01-01'::TIMESTAMPTZ; END IF;
  IF p_fim IS NULL THEN p_fim := NOW(); END IF;

  -- Emissões
  SELECT COUNT(*) INTO v_emissoes_enviadas
  FROM voos
  WHERE created_at BETWEEN p_inicio AND p_fim;

  SELECT COUNT(*) INTO v_emissoes_aprovadas
  FROM voos
  WHERE status = 'aprovado'
    AND updated_at BETWEEN p_inicio AND p_fim;

  -- Resgates por status
  SELECT jsonb_object_agg(status, qtd) INTO v_resgates_por_status
  FROM (
    SELECT status, COUNT(*) as qtd
    FROM resgate_solicitacoes
    WHERE created_at BETWEEN p_inicio AND p_fim
    GROUP BY status
  ) sub;

  -- Missões concluídas
  SELECT COUNT(*) INTO v_missoes_concluidas
  FROM tarefa_solicitacoes
  WHERE status = 'aprovada'
    AND updated_at BETWEEN p_inicio AND p_fim;

  -- Missão do Reels "Estou dentro"
  SELECT COUNT(*) INTO v_missao_reels
  FROM tarefa_solicitacoes ts
  JOIN tarefas t ON t.id = ts.tarefa_id
  WHERE ts.status = 'aprovada'
    AND (t.titulo ILIKE '%reels%' OR t.titulo ILIKE '%estou dentro%')
    AND ts.updated_at BETWEEN p_inicio AND p_fim;

  -- Check-ins por dia
  SELECT COUNT(*) INTO v_checkins_total
  FROM checkins
  WHERE created_at BETWEEN p_inicio AND p_fim;

  v_dias := GREATEST(1, EXTRACT(DAY FROM (p_fim - p_inicio)));
  v_checkins_dia := ROUND(v_checkins_total::NUMERIC / v_dias, 1);

  RETURN jsonb_build_object(
    'success', true,
    'emissoes_enviadas', v_emissoes_enviadas,
    'emissoes_aprovadas', v_emissoes_aprovadas,
    'resgates_por_status', COALESCE(v_resgates_por_status, '{}'::JSONB),
    'missoes_concluidas', v_missoes_concluidas,
    'missao_reels', v_missao_reels,
    'checkins_total', v_checkins_total,
    'checkins_dia', v_checkins_dia
  );
END;
$$;

-- ============================================
-- 9. metricas_receita_periodo (admin)
-- ============================================
CREATE OR REPLACE FUNCTION metricas_receita_periodo(
  p_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receita_links NUMERIC;
  v_primes_periodo INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  IF p_inicio IS NULL THEN p_inicio := '2024-01-01'::TIMESTAMPTZ; END IF;
  IF p_fim IS NULL THEN p_fim := NOW(); END IF;

  -- Receita de links Prime usados
  SELECT COALESCE(SUM(valor_pago), 0) INTO v_receita_links
  FROM prime_links
  WHERE status = 'usado'
    AND usado_em BETWEEN p_inicio AND p_fim;

  -- Primes ativados no período (para estimar se não tem link)
  SELECT COUNT(*) INTO v_primes_periodo
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.plano = 'prime'
    AND s.status = 'active'
    AND s.created_at BETWEEN p_inicio AND p_fim
    AND COALESCE(p.is_teste, false) = false;

  -- Se não tem receita de links, estimar
  IF v_receita_links = 0 AND v_primes_periodo > 0 THEN
    v_receita_links := v_primes_periodo * 597;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'receita', v_receita_links,
    'primes_periodo', v_primes_periodo
  );
END;
$$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 261: Métricas Admin v2';
  RAISE NOTICE '  - Tabela vsl_eventos para funil';
  RAISE NOTICE '  - metricas_visao_geral, metricas_prime_fundador';
  RAISE NOTICE '  - metricas_aquisicao, metricas_vsl';
  RAISE NOTICE '  - metricas_pontos, metricas_engajamento';
END $$;
