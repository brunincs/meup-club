-- ============================================
-- MIGRATION 265: Fix trigger to call handle_new_user
-- O trigger estava chamando handle_new_auth_user (antigo)
-- em vez de handle_new_user (com lógica de Prime e Free)
-- ============================================

-- ============================================
-- 1. REMOVER TRIGGER ANTIGO
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- 2. CRIAR TRIGGER NOVO chamando handle_new_user
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 3. ATUALIZAR handle_new_user com lógica atômica
-- para link Prime de uso único
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
    -- Se outro processo já usou, não vai atualizar nenhuma linha
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
-- 4. ATUALIZAR ativar_prime_por_token (uso único)
-- ============================================
CREATE OR REPLACE FUNCTION ativar_prime_por_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_link RECORD;
  v_result JSONB;
  v_link_updated INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Já é Prime?
  IF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = v_user_id AND status = 'active' AND plano = 'prime') THEN
    -- Marcar link como usado mesmo assim (impedir reuso)
    UPDATE prime_links SET
      status = 'usado',
      usado_por = v_user_id,
      usado_em = NOW()
    WHERE token = p_token
      AND status = 'ativo'
      AND usado_por IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Já é Prime', 'already_prime', true);
  END IF;

  -- Tentar marcar link como usado ATOMICAMENTE
  UPDATE prime_links SET
    status = 'usado',
    usado_por = v_user_id,
    usado_em = NOW()
  WHERE token = p_token
    AND status = 'ativo'
    AND expira_em > NOW()
    AND usado_por IS NULL
  RETURNING * INTO v_link;

  GET DIAGNOSTICS v_link_updated = ROW_COUNT;

  IF v_link_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido, expirado ou já utilizado');
  END IF;

  -- Ativar Prime
  SELECT ativar_prime_anual_completo(v_user_id, 'link_pagamento', v_link.id::TEXT) INTO v_result;

  RETURN v_result || jsonb_build_object('link_usado', true);
END;
$$;

-- ============================================
-- 5. ATUALIZAR validar_link_prime para retornar status de uso
-- ============================================
CREATE OR REPLACE FUNCTION validar_link_prime(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
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

  -- Link válido
  RETURN jsonb_build_object(
    'success', true,
    'nome_cliente', v_link.nome_cliente,
    'email', v_link.email,
    'bonus_imediato', COALESCE(v_link.bonus_imediato, 2000),
    'bonus_lancamento', COALESCE(v_link.bonus_lancamento, 3000)
  );
END;
$$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 265: Fix trigger handle_new_user';
  RAISE NOTICE '  - Trigger agora chama handle_new_user (não handle_new_auth_user)';
  RAISE NOTICE '  - Link Prime com uso atômico (UPDATE WHERE usado_por IS NULL)';
  RAISE NOTICE '  - validar_link_prime retorna erro se já usado';
END $$;
