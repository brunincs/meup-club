-- ============================================
-- MIGRATION 264: Fix métricas - enum e tabela
-- Corrige:
-- 1. status_acesso = 'pendente' → 'em_espera'
-- 2. FROM voos → FROM emissoes
-- ============================================

-- ============================================
-- 1. FIX metricas_visao_geral - 'em_espera' not 'pendente'
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
  -- Verificar se é admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  -- Total aprovados (não teste)
  SELECT COUNT(*) INTO v_total_aprovados
  FROM profiles
  WHERE status_acesso = 'aprovado'
    AND COALESCE(is_teste, false) = false;

  -- Free aprovados (não Prime, não Fundador)
  SELECT COUNT(*) INTO v_free
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND COALESCE(p.is_teste, false) = false
    AND COALESCE(p.is_fundador, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = p.id
        AND s.status = 'active'
        AND s.plano = 'prime'
    );

  -- Prime ativos
  SELECT COUNT(*) INTO v_prime
  FROM subscriptions
  WHERE status = 'active' AND plano = 'prime';

  -- Vagas Free (70 total)
  v_vagas_free := 70 - v_free;

  -- Vagas Fundador (30 total)
  SELECT 30 - COUNT(*) INTO v_vagas_fundador
  FROM profiles
  WHERE is_fundador = true
    AND fundador_numero IS NOT NULL
    AND COALESCE(is_teste, false) = false;

  -- Na lista de espera (em_espera, não pendente)
  SELECT COUNT(*) INTO v_na_lista
  FROM profiles
  WHERE status_acesso = 'em_espera'
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
-- 2. FIX metricas_engajamento - emissoes not voos
-- ============================================
CREATE OR REPLACE FUNCTION metricas_engajamento(p_inicio TIMESTAMPTZ DEFAULT NULL, p_fim TIMESTAMPTZ DEFAULT NULL)
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
BEGIN
  -- Verificar se é admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  IF p_inicio IS NULL THEN p_inicio := '2024-01-01'::TIMESTAMPTZ; END IF;
  IF p_fim IS NULL THEN p_fim := NOW(); END IF;

  -- Emissões (tabela correta: emissoes)
  SELECT COUNT(*) INTO v_emissoes_enviadas
  FROM emissoes
  WHERE created_at BETWEEN p_inicio AND p_fim;

  SELECT COUNT(*) INTO v_emissoes_aprovadas
  FROM emissoes
  WHERE status = 'aprovado'
    AND updated_at BETWEEN p_inicio AND p_fim;

  -- Resgates por status
  SELECT COALESCE(jsonb_object_agg(status, qtd), '{}'::JSONB) INTO v_resgates_por_status
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

  RETURN jsonb_build_object(
    'success', true,
    'emissoes_enviadas', COALESCE(v_emissoes_enviadas, 0),
    'emissoes_aprovadas', COALESCE(v_emissoes_aprovadas, 0),
    'resgates_por_status', v_resgates_por_status,
    'missoes_concluidas', COALESCE(v_missoes_concluidas, 0)
  );
END;
$$;

-- ============================================
-- 3. FIX handle_new_user fallback - 'em_analise' not 'pendente'
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_accepted_terms BOOLEAN;
  v_accepted_terms_at TIMESTAMPTZ;
  v_codigo_entrada TEXT;
  v_origem_cadastro TEXT;
  v_prime_token TEXT;
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_status_acesso TEXT;
  v_origem_acesso TEXT;
  v_link RECORD;
  v_prime_result JSONB;
BEGIN
  -- Extrair dados dos metadados
  v_referrer_id := (NEW.raw_user_meta_data->>'referred_by')::UUID;
  v_accepted_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::BOOLEAN, false);
  v_codigo_entrada := NEW.raw_user_meta_data->>'codigo_entrada';
  v_origem_cadastro := COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', 'site');
  v_prime_token := NEW.raw_user_meta_data->>'prime_token';

  IF v_accepted_terms THEN
    v_accepted_terms_at := NOW();
  ELSE
    v_accepted_terms_at := NULL;
  END IF;

  -- =============================================
  -- CAMINHO 1: PRIME LINK (token válido)
  -- =============================================
  IF v_prime_token IS NOT NULL AND v_prime_token != '' THEN
    -- Verificar se o link é válido
    SELECT * INTO v_link
    FROM prime_links
    WHERE token = v_prime_token
      AND status = 'ativo'
      AND expira_em > NOW()
    FOR UPDATE;

    IF FOUND THEN
      -- Criar profile como aprovado (Prime vai ser ativado)
      INSERT INTO public.profiles (
        id, email, name, referred_by, accepted_terms, accepted_terms_at,
        status_acesso, origem_acesso, acesso_aprovado_em, points, total_points_earned
      )
      VALUES (
        NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        v_referrer_id, v_accepted_terms, v_accepted_terms_at,
        'aprovado', 'link_pagamento', NOW(), 0, 0
      );

      -- Ativar Prime via função existente (Fundador, bônus, etc)
      BEGIN
        SELECT ativar_prime_anual_completo(NEW.id, 'link_pagamento', v_link.id::TEXT) INTO v_prime_result;

        -- Marcar link como usado
        UPDATE prime_links SET
          status = 'usado',
          usado_por = NEW.id,
          usado_em = NOW()
        WHERE id = v_link.id;

        -- Registrar no audit_logs
        INSERT INTO audit_logs (acao, user_id, detalhes)
        VALUES ('prime_link_ativado_cadastro', NEW.id, jsonb_build_object(
          'link_id', v_link.id,
          'token', v_prime_token,
          'result', v_prime_result
        ))
        ON CONFLICT DO NOTHING;

      EXCEPTION WHEN OTHERS THEN
        -- Registrar erro mas não derrubar o cadastro
        INSERT INTO audit_logs (acao, user_id, detalhes)
        VALUES ('prime_link_erro_cadastro', NEW.id, jsonb_build_object(
          'link_id', v_link.id,
          'erro', SQLERRM
        ))
        ON CONFLICT DO NOTHING;
        RAISE WARNING '[handle_new_user] Erro ao ativar Prime: %', SQLERRM;
      END;

      RETURN NEW;
    END IF;
    -- Se token inválido, continua como cadastro normal
  END IF;

  -- =============================================
  -- CAMINHO 2: CADASTRO FREE NORMAL
  -- =============================================

  -- Determinar origem_acesso
  IF v_codigo_entrada IS NOT NULL AND v_codigo_entrada != '' THEN
    v_origem_acesso := 'link_lista';
  ELSIF v_origem_cadastro = 'vsl' THEN
    v_origem_acesso := 'vsl';
  ELSIF v_origem_cadastro = 'link_prime' THEN
    -- Token inválido mas veio de link_prime
    v_origem_acesso := 'site';
  ELSIF v_referrer_id IS NOT NULL THEN
    v_origem_acesso := 'indicacao';
  ELSE
    v_origem_acesso := 'site';
  END IF;

  -- Buscar configuração de vagas Free (default 70)
  BEGIN
    SELECT COALESCE(get_config('vagas_free_total', '70')::INTEGER, 70) INTO v_vagas_total;
  EXCEPTION WHEN OTHERS THEN
    v_vagas_total := 70;
  END;

  -- Contar vagas ocupadas (Free aprovados, não-fundador, não-Prime)
  SELECT COUNT(*) INTO v_vagas_ocupadas
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND COALESCE(p.is_teste, false) = false
    AND COALESCE(p.is_fundador, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = p.id
        AND s.status = 'active'
        AND s.plano = 'prime'
    );

  v_vagas_livres := v_vagas_total - COALESCE(v_vagas_ocupadas, 0);

  -- Se há vaga, aprova direto; senão, lista de espera
  IF v_vagas_livres > 0 THEN
    v_status_acesso := 'aprovado';
  ELSE
    v_status_acesso := 'em_espera';
  END IF;

  -- Criar o perfil
  INSERT INTO public.profiles (
    id, email, name, referred_by, accepted_terms, accepted_terms_at,
    status_acesso, origem_acesso, acesso_aprovado_em, points, total_points_earned
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_referrer_id, v_accepted_terms, v_accepted_terms_at,
    v_status_acesso, v_origem_acesso,
    CASE WHEN v_status_acesso = 'aprovado' THEN NOW() ELSE NULL END,
    0, 0
  );

  -- Se aprovado, creditar bônus de boas-vindas Free (1.000 pts)
  IF v_status_acesso = 'aprovado' THEN
    BEGIN
      PERFORM creditar_boas_vindas_free(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      -- Registrar erro mas não derrubar o cadastro
      INSERT INTO audit_logs (acao, user_id, detalhes)
      VALUES ('bonus_free_erro', NEW.id, jsonb_build_object('erro', SQLERRM))
      ON CONFLICT DO NOTHING;
      RAISE WARNING '[handle_new_user] Erro ao creditar boas-vindas: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Erro fatal - logar e continuar (não derrubar o cadastro)
  RAISE WARNING '[handle_new_user] Erro fatal: %', SQLERRM;
  -- Tentar criar profile mínimo (em_analise é válido no enum)
  BEGIN
    INSERT INTO public.profiles (id, email, name, status_acesso, origem_acesso, points)
    VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), 'em_analise', 'site', 0)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 264: Fix métricas';
  RAISE NOTICE '  - metricas_visao_geral: em_espera (not pendente)';
  RAISE NOTICE '  - metricas_engajamento: emissoes (not voos)';
  RAISE NOTICE '  - handle_new_user fallback: em_analise (not pendente)';
END $$;
