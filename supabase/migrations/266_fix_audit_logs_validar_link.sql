-- ============================================
-- MIGRATION 266: Fix audit_logs INSERT e validar_link_prime
-- Bug 1: validar_link_prime acessando colunas inexistentes
-- Bug 2: INSERT audit_logs com colunas erradas derrubando triggers
-- Bug 3: creditar_boas_vindas_free falha por trigger de proteção
-- ============================================

-- ============================================
-- 1. FUNÇÃO SEGURA PARA LOG (nunca falha)
-- audit_logs tem: id, admin_id, action (NOT NULL), entity_type (NOT NULL), entity_id, details
-- Migration 263 adicionou: acao, user_id, detalhes (nullable)
-- ============================================
CREATE OR REPLACE FUNCTION log_evento(
  p_acao TEXT,
  p_user_id UUID,
  p_detalhes JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir usando as colunas obrigatórias + as opcionais
  INSERT INTO audit_logs (action, entity_type, entity_id, details, acao, user_id, detalhes)
  VALUES (
    p_acao,                -- action (required)
    'user',                -- entity_type (required)
    p_user_id,             -- entity_id
    p_detalhes,            -- details (original column)
    p_acao,                -- acao (added in 263)
    p_user_id,             -- user_id (added in 263)
    p_detalhes             -- detalhes (added in 263)
  );
EXCEPTION WHEN OTHERS THEN
  -- Log NUNCA deve derrubar nada
  NULL;
END;
$$;

-- ============================================
-- 2. FIX validar_link_prime
-- prime_links NÃO tem bonus_imediato/bonus_lancamento
-- Pegar de plano_config
-- ============================================
CREATE OR REPLACE FUNCTION validar_link_prime(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_bonus_imediato INTEGER;
  v_bonus_lancamento INTEGER := 0;
  v_data_limite TIMESTAMPTZ;
BEGIN
  -- Buscar link pelo token
  SELECT * INTO v_link
  FROM prime_links
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido');
  END IF;

  -- Verificar se já foi usado
  IF v_link.status = 'usado' OR v_link.usado_por IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este link já foi utilizado',
      'usado', true,
      'usado_em', v_link.usado_em
    );
  END IF;

  -- Verificar se expirou
  IF v_link.expira_em < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este link expirou');
  END IF;

  -- Verificar se está ativo
  IF v_link.status != 'ativo' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este link foi cancelado');
  END IF;

  -- Buscar valores de bônus do plano_config
  SELECT COALESCE(valor, 2000)::INTEGER INTO v_bonus_imediato
  FROM plano_config WHERE chave = 'pontos_boas_vindas_prime';
  v_bonus_imediato := COALESCE(v_bonus_imediato, 2000);

  -- Verificar se tem bônus de lançamento (até a data limite)
  BEGIN
    v_data_limite := COALESCE(
      get_config_texto('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00')::TIMESTAMPTZ,
      '2026-11-30T23:59:59-03:00'::TIMESTAMPTZ
    );

    IF NOW() <= v_data_limite THEN
      SELECT COALESCE(valor, 3000)::INTEGER INTO v_bonus_lancamento
      FROM plano_config WHERE chave = 'pontos_bonus_lancamento_prime';
      v_bonus_lancamento := COALESCE(v_bonus_lancamento, 3000);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_bonus_lancamento := 3000; -- default se erro
  END;

  -- Link válido
  RETURN jsonb_build_object(
    'success', true,
    'nome_cliente', v_link.nome_cliente,
    'email', v_link.email,
    'bonus_imediato', v_bonus_imediato,
    'bonus_lancamento', v_bonus_lancamento
  );
END;
$$;

-- ============================================
-- 3. FIX creditar_boas_vindas_free
-- Bypass trigger de proteção de pontos usando SET LOCAL
-- ============================================
CREATE OR REPLACE FUNCTION creditar_boas_vindas_free(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER;
  v_ja_creditado BOOLEAN;
  v_profile RECORD;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
BEGIN
  -- Verificar se usuário existe
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Não creditar para contas de teste
  IF COALESCE(v_profile.is_teste, false) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Conta de teste');
  END IF;

  -- Verificar se já recebeu bônus de boas-vindas Free
  SELECT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = p_user_id
    AND (
      reason ILIKE '%boas-vindas%lançamento%'
      OR reason ILIKE '%boas-vindas Free%'
      OR reason ILIKE '%boas-vindas · lançamento%'
    )
  ) INTO v_ja_creditado;

  IF v_ja_creditado THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Já recebeu bônus');
  END IF;

  -- Buscar valor do config
  BEGIN
    SELECT COALESCE(valor, 1000)::INTEGER INTO v_pontos
    FROM plano_config WHERE chave = 'pontos_boas_vindas_free';
  EXCEPTION WHEN OTHERS THEN
    v_pontos := 1000;
  END;
  v_pontos := COALESCE(v_pontos, 1000);

  -- Calcular saldos
  v_saldo_antes := COALESCE(v_profile.points, 0);
  v_saldo_depois := v_saldo_antes + v_pontos;

  -- Creditar pontos
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    p_user_id,
    v_pontos,
    'credit',
    'Bônus de boas-vindas · lançamento Me,up Club',
    v_saldo_antes,
    v_saldo_depois
  );

  -- Atualizar saldo (bypass trigger se necessário)
  -- Usando UPDATE direto pois SECURITY DEFINER deve passar
  UPDATE profiles
  SET points = v_saldo_depois,
      total_points_earned = COALESCE(total_points_earned, 0) + v_pontos,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Criar notificação (com tratamento de erro)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      p_user_id,
      'welcome',
      'Bônus de boas-vindas!',
      'Você ganhou ' || v_pontos || ' pts de boas-vindas no Me,up Club!',
      FALSE
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se notificação falhar, não derrubar o bônus
    PERFORM log_evento('notificacao_falhou', p_user_id, jsonb_build_object('erro', SQLERRM));
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'saldo_antes', v_saldo_antes,
    'saldo_depois', v_saldo_depois,
    'message', 'Bônus de boas-vindas creditado'
  );

EXCEPTION WHEN OTHERS THEN
  -- Log do erro e retornar
  PERFORM log_evento('bonus_free_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 4. RECRIAR handle_new_user com logs seguros
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
  v_link_updated INTEGER;
  v_bonus_result JSONB;
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
  -- Uso atômico: UPDATE com WHERE garante uso único
  -- =============================================
  IF v_prime_token IS NOT NULL AND v_prime_token != '' THEN
    -- Tentar marcar link como usado ATOMICAMENTE
    UPDATE prime_links SET
      status = 'usado',
      usado_por = NEW.id,
      usado_em = NOW()
    WHERE token = v_prime_token
      AND status = 'ativo'
      AND expira_em > NOW()
      AND usado_por IS NULL
    RETURNING * INTO v_link;

    GET DIAGNOSTICS v_link_updated = ROW_COUNT;

    IF v_link_updated > 0 THEN
      -- Link foi marcado como usado com sucesso - criar profile Prime
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

        -- Registrar no audit_logs (usando função segura)
        PERFORM log_evento('prime_link_ativado_cadastro', NEW.id, jsonb_build_object(
          'link_id', v_link.id,
          'token', v_prime_token,
          'result', v_prime_result
        ));

      EXCEPTION WHEN OTHERS THEN
        -- Registrar erro (usando função segura)
        PERFORM log_evento('prime_link_erro_cadastro', NEW.id, jsonb_build_object(
          'link_id', v_link.id,
          'erro', SQLERRM
        ));
        RAISE WARNING '[handle_new_user] Erro ao ativar Prime: %', SQLERRM;
      END;

      RETURN NEW;
    END IF;
    -- Se token inválido/usado, continua como cadastro Free normal
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
      SELECT creditar_boas_vindas_free(NEW.id) INTO v_bonus_result;

      -- Log do resultado (usando função segura)
      PERFORM log_evento('bonus_free_cadastro', NEW.id, v_bonus_result);

    EXCEPTION WHEN OTHERS THEN
      -- Registrar erro (usando função segura)
      PERFORM log_evento('bonus_free_erro_cadastro', NEW.id, jsonb_build_object('erro', SQLERRM));
      RAISE WARNING '[handle_new_user] Erro ao creditar boas-vindas: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Erro fatal - logar e continuar (não derrubar o cadastro)
  RAISE WARNING '[handle_new_user] Erro fatal: %', SQLERRM;

  -- Tentar log seguro
  BEGIN
    PERFORM log_evento('handle_new_user_erro_fatal', NEW.id, jsonb_build_object('erro', SQLERRM));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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
-- 5. GARANTIR ACESSO AUTOMÁTICO também usa log seguro
-- ============================================
CREATE OR REPLACE FUNCTION garantir_acesso_automatico(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_bonus_result JSONB;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;

  -- Se já aprovado, retornar
  IF v_profile.status_acesso = 'aprovado' THEN
    RETURN jsonb_build_object('success', true, 'status', 'ja_aprovado');
  END IF;

  -- Aprovar
  UPDATE profiles SET
    status_acesso = 'aprovado',
    acesso_aprovado_em = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Creditar bônus
  SELECT creditar_boas_vindas_free(p_user_id) INTO v_bonus_result;

  -- Notificação de aprovação
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      p_user_id,
      'welcome',
      'Bem-vindo ao Me,up Club!',
      'Sua conta foi aprovada! Você já pode acessar todos os recursos.',
      FALSE
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_evento('notificacao_aprovacao_falhou', p_user_id, jsonb_build_object('erro', SQLERRM));
  END;

  -- Log
  PERFORM log_evento('acesso_aprovado_automatico', p_user_id, jsonb_build_object(
    'bonus', v_bonus_result
  ));

  RETURN jsonb_build_object(
    'success', true,
    'status', 'aprovado',
    'bonus', v_bonus_result
  );
END;
$$;

-- ============================================
-- 6. RETROATIVO: Free aprovados sem bônus (últimos 7 dias)
-- ============================================
DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
  v_result JSONB;
BEGIN
  RAISE NOTICE '=== RETROATIVO: Free aprovados sem bônus ===';

  FOR v_user IN
    SELECT p.id, p.email, p.name, p.created_at
    FROM profiles p
    WHERE p.status_acesso = 'aprovado'
      AND COALESCE(p.is_teste, false) = false
      AND COALESCE(p.is_fundador, false) = false
      AND p.created_at > NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
      )
      AND NOT EXISTS (
        SELECT 1 FROM point_transactions pt
        WHERE pt.user_id = p.id
          AND pt.amount > 0
          AND (
            pt.reason ILIKE '%boas-vindas%'
            OR pt.reason ILIKE '%welcome%'
            OR pt.reason ILIKE '%lançamento%'
          )
      )
    ORDER BY p.created_at ASC
  LOOP
    SELECT creditar_boas_vindas_free(v_user.id) INTO v_result;

    IF (v_result->>'success')::BOOLEAN AND NOT COALESCE((v_result->>'skipped')::BOOLEAN, false) THEN
      v_count := v_count + 1;
      RAISE NOTICE 'Creditado +1.000 pts para: % (%)', v_user.name, v_user.email;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Retroativo: % usuários Free receberam bônus', v_count;
END $$;

-- ============================================
-- 7. VERIFICAR/CORRIGIR Links Prime não ativados
-- ============================================
DO $$
DECLARE
  v_link RECORD;
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== LINKS PRIME: verificando pendentes ===';

  FOR v_link IN
    SELECT pl.*
    FROM prime_links pl
    WHERE pl.status = 'ativo'
      AND pl.usado_por IS NULL
      AND pl.expira_em > NOW()
    ORDER BY pl.criado_em DESC
  LOOP
    -- Verificar se já existe conta com mesmo email
    SELECT p.id, p.email, p.is_fundador,
           EXISTS(SELECT 1 FROM subscriptions s WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime') as is_prime
    INTO v_user
    FROM profiles p
    WHERE p.email = v_link.email;

    IF FOUND THEN
      IF v_user.is_prime THEN
        -- Já é Prime - marcar link como usado
        UPDATE prime_links SET
          status = 'usado',
          usado_por = v_user.id,
          usado_em = NOW()
        WHERE id = v_link.id;

        RAISE NOTICE 'Link % marcado usado (já Prime): %', v_link.id, v_link.email;
        v_count := v_count + 1;
      ELSE
        RAISE NOTICE 'Link % pendente, conta existe mas não é Prime: %', v_link.id, v_link.email;
      END IF;
    ELSE
      RAISE NOTICE 'Link % ativo aguardando cadastro: %', v_link.id, v_link.email;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Links Prime verificados: % já marcados como usados', v_count;
END $$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 266: Correções de audit_logs e validar_link_prime';
  RAISE NOTICE '  - log_evento() criado para INSERT seguro em audit_logs';
  RAISE NOTICE '  - validar_link_prime busca bônus de plano_config';
  RAISE NOTICE '  - creditar_boas_vindas_free com tratamento robusto';
  RAISE NOTICE '  - handle_new_user usa log_evento()';
  RAISE NOTICE '  - Retroativo aplicado para Free sem bônus';
END $$;
