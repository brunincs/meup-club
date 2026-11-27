-- ============================================
-- MIGRATION 270: Fundador sem sorteio (597) e dados do cadastro no perfil
-- 1. Remover número da sorte do fluxo Fundador
-- 2. Preço de renovação: 597 (não 497)
-- 3. Notificação simples: "Bem-vindo ao Prime! 👑"
-- 4. Salvar phone e CPF do cadastro no perfil
-- 5. Remover CPF dos metadados após salvar
-- ============================================

-- ============================================
-- 1. ATUALIZAR handle_new_user para salvar phone e CPF
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
  v_phone TEXT;
  v_cpf TEXT;
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
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_cpf := NEW.raw_user_meta_data->>'cpf';

  IF v_accepted_terms THEN
    v_accepted_terms_at := NOW();
  ELSE
    v_accepted_terms_at := NULL;
  END IF;

  -- =============================================
  -- CAMINHO 1: PRIME LINK (token válido)
  -- =============================================
  IF v_prime_token IS NOT NULL AND v_prime_token != '' THEN
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
      -- Criar profile Prime com phone (CPF será criptografado pelo trigger)
      INSERT INTO public.profiles (
        id, email, name, phone, cpf,
        referred_by, accepted_terms, accepted_terms_at,
        status_acesso, origem_acesso, acesso_aprovado_em, points, total_points_earned
      )
      VALUES (
        NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        v_phone, v_cpf,
        v_referrer_id, v_accepted_terms, v_accepted_terms_at,
        'aprovado', 'link_pagamento', NOW(), 0, 0
      );

      -- Remover CPF dos metadados (segurança)
      IF v_cpf IS NOT NULL THEN
        BEGIN
          UPDATE auth.users SET
            raw_user_meta_data = raw_user_meta_data - 'cpf'
          WHERE id = NEW.id;
        EXCEPTION WHEN OTHERS THEN
          NULL; -- Não falhar se não conseguir remover
        END;
      END IF;

      -- Ativar Prime
      BEGIN
        SELECT ativar_prime_anual_completo(NEW.id, 'link_pagamento', v_link.id::TEXT) INTO v_prime_result;
        PERFORM log_evento('prime_link_ativado_cadastro', NEW.id, jsonb_build_object(
          'link_id', v_link.id,
          'result', v_prime_result
        ));
      EXCEPTION WHEN OTHERS THEN
        PERFORM log_evento('prime_link_erro_cadastro', NEW.id, jsonb_build_object(
          'link_id', v_link.id,
          'erro', SQLERRM
        ));
      END;

      RETURN NEW;
    END IF;
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
    v_origem_acesso := 'site';
  ELSIF v_referrer_id IS NOT NULL THEN
    v_origem_acesso := 'indicacao';
  ELSE
    v_origem_acesso := 'site';
  END IF;

  -- Buscar configuração de vagas Free
  BEGIN
    SELECT COALESCE(get_config('vagas_free_total', '70')::INTEGER, 70) INTO v_vagas_total;
  EXCEPTION WHEN OTHERS THEN
    v_vagas_total := 70;
  END;

  -- Contar vagas ocupadas
  SELECT COUNT(*) INTO v_vagas_ocupadas
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND COALESCE(p.is_teste, false) = false
    AND COALESCE(p.is_fundador, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
    );

  v_vagas_livres := v_vagas_total - COALESCE(v_vagas_ocupadas, 0);

  IF v_vagas_livres > 0 THEN
    v_status_acesso := 'aprovado';
  ELSE
    v_status_acesso := 'em_espera';
  END IF;

  -- Criar o perfil com phone e CPF
  INSERT INTO public.profiles (
    id, email, name, phone, cpf,
    referred_by, accepted_terms, accepted_terms_at,
    status_acesso, origem_acesso, acesso_aprovado_em, points, total_points_earned
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_phone, v_cpf,
    v_referrer_id, v_accepted_terms, v_accepted_terms_at,
    v_status_acesso, v_origem_acesso,
    CASE WHEN v_status_acesso = 'aprovado' THEN NOW() ELSE NULL END,
    0, 0
  );

  -- Remover CPF dos metadados (segurança)
  IF v_cpf IS NOT NULL THEN
    BEGIN
      UPDATE auth.users SET
        raw_user_meta_data = raw_user_meta_data - 'cpf'
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Se aprovado, creditar bônus
  IF v_status_acesso = 'aprovado' THEN
    BEGIN
      SELECT creditar_boas_vindas_free(NEW.id) INTO v_bonus_result;
      PERFORM log_evento('bonus_free_cadastro', NEW.id, v_bonus_result);
    EXCEPTION WHEN OTHERS THEN
      PERFORM log_evento('bonus_free_erro_cadastro', NEW.id, jsonb_build_object('erro', SQLERRM));
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[handle_new_user] Erro fatal: %', SQLERRM;
  BEGIN
    PERFORM log_evento('handle_new_user_erro_fatal', NEW.id, jsonb_build_object('erro', SQLERRM));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
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
-- 2. ATUALIZAR ativar_prime_anual_completo
-- - Preço renovação: 597 (não 497)
-- - Sem número da sorte
-- - Notificação simples
-- ============================================
CREATE OR REPLACE FUNCTION ativar_prime_anual_completo(
  p_user_id UUID,
  p_origem TEXT DEFAULT 'manual',
  p_origem_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_sub_id UUID;
  v_vagas RECORD;
  v_vaga_numero INTEGER;
  v_pontos_imediato INTEGER := 2000;
  v_pontos_lancamento INTEGER := 0;
  v_dias_pendente INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_data_limite TIMESTAMPTZ;
  v_is_fundador BOOLEAN := FALSE;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
  v_boas_vindas_ja_dado BOOLEAN;
  v_profile RECORD;
BEGIN
  -- 1. Buscar perfil atual
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- 2. Aprovar acesso se necessário
  IF COALESCE(v_profile.status_acesso::TEXT, 'em_analise') != 'aprovado' THEN
    UPDATE profiles SET
      status_acesso = 'aprovado',
      acesso_aprovado_em = COALESCE(acesso_aprovado_em, NOW()),
      origem_acesso = COALESCE(origem_acesso, p_origem),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- 3. Criar subscription
  SELECT _criar_subscription_prime(p_user_id, 'anual', p_origem, p_origem_ref, NULL, NULL) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  v_sub_id := (v_result->>'subscription_id')::UUID;

  -- 4. Verificar/registrar Fundador (SEM número da sorte)
  BEGIN
    SELECT * INTO v_vagas FROM get_fundadores_count();

    IF v_vagas.vagas_disponiveis > 0 THEN
      IF NOT EXISTS(SELECT 1 FROM fundadores WHERE user_id = p_user_id) THEN
        IF NOT COALESCE(v_profile.is_fundador, FALSE) THEN
          BEGIN
            v_vaga_numero := nextval('fundadores_vaga_seq');

            IF v_vaga_numero <= v_vagas.vagas_total THEN
              -- Inserir fundador SEM numero_sorte
              INSERT INTO fundadores (user_id, subscription_id, vaga_numero)
              VALUES (p_user_id, v_sub_id, v_vaga_numero)
              ON CONFLICT (user_id) DO NOTHING;

              -- Preço de renovação: R$ 597 (não 497)
              UPDATE subscriptions SET preco_renovacao = 597.00 WHERE id = v_sub_id;

              UPDATE profiles SET
                is_fundador = TRUE,
                fundador_numero = v_vaga_numero,
                updated_at = NOW()
              WHERE id = p_user_id;

              v_is_fundador := TRUE;
              -- NÃO criar notificação de Fundador aqui - será simplificada abaixo
            END IF;
          EXCEPTION WHEN OTHERS THEN
            PERFORM log_evento('fundador_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
          END;
        ELSE
          v_is_fundador := TRUE;
          v_vaga_numero := v_profile.fundador_numero;
        END IF;
      ELSE
        v_is_fundador := TRUE;
        SELECT vaga_numero INTO v_vaga_numero FROM fundadores WHERE user_id = p_user_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_evento('fundador_check_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
  END;

  -- 5. BÔNUS
  SELECT boas_vindas_creditado INTO v_boas_vindas_ja_dado
  FROM subscriptions WHERE id = v_sub_id;

  v_boas_vindas_ja_dado := COALESCE(v_boas_vindas_ja_dado, FALSE);

  IF NOT v_boas_vindas_ja_dado THEN
    BEGIN
      v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
    EXCEPTION WHEN OTHERS THEN
      v_dias_pendente := 7;
    END;
    v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

    BEGIN
      v_data_limite := COALESCE(
        get_config_texto('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00')::TIMESTAMPTZ,
        '2026-11-30T23:59:59-03:00'::TIMESTAMPTZ
      );
      IF NOW() <= v_data_limite THEN
        v_pontos_lancamento := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_bonus_lancamento_prime'), 3000);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_pontos_lancamento := 3000;
    END;

    SELECT COALESCE(points, 0) INTO v_saldo_antes FROM profiles WHERE id = p_user_id FOR UPDATE;

    PERFORM set_config('app.internal_credit', 'true', true);

    v_saldo_depois := v_saldo_antes + v_pontos_imediato;

    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (
      p_user_id, v_pontos_imediato, 'credit',
      'Bônus de boas-vindas Prime (disponível)',
      v_saldo_antes, v_saldo_depois
    );

    UPDATE profiles SET
      points = v_saldo_depois,
      total_points_earned = COALESCE(total_points_earned, 0) + v_pontos_imediato
    WHERE id = p_user_id;

    PERFORM set_config('app.internal_credit', 'false', true);

    IF v_pontos_lancamento > 0 THEN
      BEGIN
        PERFORM creditar_pontos_bloqueados(
          p_user_id,
          v_pontos_lancamento,
          'Bônus de lançamento · até 30/11 (libera em 7 dias)',
          v_liberar_em,
          NULL,
          v_sub_id
        );
      EXCEPTION WHEN OTHERS THEN
        PERFORM log_evento('bonus_lancamento_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
      END;
    END IF;

    UPDATE subscriptions SET boas_vindas_creditado = TRUE WHERE id = v_sub_id;

    -- NOTIFICAÇÃO SIMPLES (sem número, vaga, sorteio ou preço)
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, read)
      VALUES (
        p_user_id,
        'subscription',
        'Bem-vindo ao Prime! 👑',
        'Seus ' || v_pontos_imediato || ' pts de boas-vindas já estão disponíveis.' ||
        CASE WHEN v_pontos_lancamento > 0
          THEN ' Os ' || v_pontos_lancamento || ' pts de lançamento liberam em ' || TO_CHAR(v_liberar_em, 'DD/MM') || '.'
          ELSE ''
        END,
        FALSE
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- 6. Processar bônus de indicação
  BEGIN
    PERFORM admin_confirmar_prime_anual(v_sub_id);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_evento('indicacao_prime_erro', p_user_id, jsonb_build_object('erro', SQLERRM));
  END;

  PERFORM log_evento('prime_ativado_completo', p_user_id, jsonb_build_object(
    'subscription_id', v_sub_id,
    'is_fundador', v_is_fundador,
    'pontos_imediato', v_pontos_imediato,
    'pontos_lancamento', v_pontos_lancamento
  ));

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plano', 'prime',
    'ciclo', 'anual',
    'is_fundador', v_is_fundador,
    'fundador_numero', v_vaga_numero,
    'pontos_imediato', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_imediato END,
    'pontos_lancamento', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_lancamento END,
    'liberar_em', v_liberar_em
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  PERFORM log_evento('prime_ativacao_erro_fatal', p_user_id, jsonb_build_object('erro', SQLERRM));
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 3. CORRIGIR subscriptions com 497 → 597
-- ============================================
UPDATE subscriptions
SET preco_renovacao = 597.00
WHERE preco_renovacao = 497.00;

-- ============================================
-- 4. APAGAR notificações antigas com "número da sorte"
-- ============================================
DELETE FROM notifications
WHERE title ILIKE '%Fundador%'
  AND (
    message ILIKE '%sorte%'
    OR message ILIKE '%497%'
    OR message ILIKE '%vaga #%'
  );

-- ============================================
-- 5. RETROATIVO: Preencher phone/cpf de metadados
-- ============================================
DO $$
DECLARE
  v_user RECORD;
  v_phone TEXT;
  v_cpf TEXT;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN
    SELECT u.id, u.raw_user_meta_data, p.phone as profile_phone, p.cpf as profile_cpf
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE (p.phone IS NULL OR p.phone = '')
      AND u.raw_user_meta_data->>'phone' IS NOT NULL
  LOOP
    v_phone := v_user.raw_user_meta_data->>'phone';

    UPDATE profiles SET phone = v_phone WHERE id = v_user.id AND (phone IS NULL OR phone = '');
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '✓ Retroativo: % perfis atualizados com phone dos metadados', v_count;
END $$;

-- Preencher CPF dos metadados (criptografando)
DO $$
DECLARE
  v_user RECORD;
  v_cpf TEXT;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN
    SELECT u.id, u.raw_user_meta_data, p.cpf as profile_cpf, p.cpf_encrypted
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE p.cpf_encrypted IS NULL
      AND u.raw_user_meta_data->>'cpf' IS NOT NULL
  LOOP
    v_cpf := v_user.raw_user_meta_data->>'cpf';

    -- Atualizar profile (trigger auto_encrypt_cpf vai criptografar)
    UPDATE profiles SET cpf = v_cpf WHERE id = v_user.id;

    -- Remover CPF dos metadados
    BEGIN
      UPDATE auth.users SET
        raw_user_meta_data = raw_user_meta_data - 'cpf'
      WHERE id = v_user.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '✓ Retroativo: % perfis atualizados com CPF criptografado dos metadados', v_count;
END $$;

-- ============================================
-- 6. VERIFICAR/LIMPAR funções com "sorte"/"497"
-- ============================================
DO $$
DECLARE
  v_func RECORD;
BEGIN
  RAISE NOTICE '=== Funções com sorte/sorteio/497 ===';
  FOR v_func IN
    SELECT proname
    FROM pg_proc
    WHERE prosrc ILIKE ANY (ARRAY['%numero_sorte%', '%sorteio%', '%preco_renovacao = 497%'])
      AND proname NOT IN ('ativar_prime_anual_completo') -- Já corrigida acima
  LOOP
    RAISE NOTICE 'Função com termo antigo: %', v_func.proname;
  END LOOP;
END $$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 270: Fundador sem sorteio (597) e dados do cadastro';
  RAISE NOTICE '  - Preço renovação Fundador: R$ 597';
  RAISE NOTICE '  - Notificação Prime simples (sem número/vaga/sorte)';
  RAISE NOTICE '  - phone e CPF do cadastro salvos no perfil';
  RAISE NOTICE '  - CPF removido dos metadados após salvar';
END $$;
