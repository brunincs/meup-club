-- ============================================
-- MIGRATION 263: Cadastro Free e Prime automático
-- Free: 1.000 pts na hora
-- Prime link: ativa automaticamente no cadastro
-- ============================================

-- ============================================
-- 1. RECRIAR handle_new_user
-- Suporta prime_token nos metadados
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
  -- Tentar criar profile mínimo
  BEGIN
    INSERT INTO public.profiles (id, email, name, status_acesso, origem_acesso, points)
    VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), 'pendente', 'site', 0)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. CRIAR TABELA audit_logs (se não existe)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao TEXT NOT NULL,
  user_id UUID,
  detalhes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas se não existem (tabela pode já existir com outros campos)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'acao') THEN
    ALTER TABLE audit_logs ADD COLUMN acao TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
    ALTER TABLE audit_logs ADD COLUMN user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'detalhes') THEN
    ALTER TABLE audit_logs ADD COLUMN detalhes JSONB;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_acao ON audit_logs(acao);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- ============================================
-- 3. FUNÇÃO para ativar Prime de conta existente
-- (rede de segurança no dashboard)
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Já é Prime?
  IF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = v_user_id AND status = 'active' AND plano = 'prime') THEN
    RETURN jsonb_build_object('success', true, 'message', 'Já é Prime', 'already_prime', true);
  END IF;

  -- Buscar link válido
  SELECT * INTO v_link
  FROM prime_links
  WHERE token = p_token
    AND status = 'ativo'
    AND expira_em > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido ou expirado');
  END IF;

  -- Ativar Prime
  SELECT ativar_prime_anual_completo(v_user_id, 'link_pagamento', v_link.id::TEXT) INTO v_result;

  IF NOT COALESCE((v_result->>'success')::BOOLEAN, FALSE) THEN
    RETURN v_result;
  END IF;

  -- Marcar link como usado
  UPDATE prime_links SET
    status = 'usado',
    usado_por = v_user_id,
    usado_em = NOW()
  WHERE id = v_link.id;

  RETURN v_result || jsonb_build_object('link_usado', true);
END;
$$;

GRANT EXECUTE ON FUNCTION ativar_prime_por_token(TEXT) TO authenticated;

-- ============================================
-- 4. RETROATIVO: Free sem bônus
-- ============================================
DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== VERIFICANDO FREE SEM BÔNUS ===';

  FOR v_user IN
    SELECT p.id, p.email, p.created_at, p.points
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
  LOOP
    -- Usar função de crédito (respeita triggers)
    BEGIN
      PERFORM creditar_boas_vindas_free(v_user.id);
      v_count := v_count + 1;
      RAISE NOTICE 'Creditado 1.000 pts para: %', v_user.email;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao creditar %: %', v_user.email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✓ Retroativo Free: % usuários receberam 1.000 pts', v_count;
END $$;

-- ============================================
-- 5. RETROATIVO: Link Prime não ativado
-- ============================================
DO $$
DECLARE
  v_link RECORD;
  v_user RECORD;
  v_result JSONB;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== VERIFICANDO LINKS PRIME NÃO ATIVADOS ===';

  -- Buscar links ativos cujo cliente já se cadastrou (por email ou telefone)
  FOR v_link IN
    SELECT pl.*
    FROM prime_links pl
    WHERE pl.status = 'ativo'
      AND pl.expira_em > NOW()
  LOOP
    -- Tentar encontrar usuário pelo email do link
    SELECT p.* INTO v_user
    FROM profiles p
    WHERE LOWER(p.email) = LOWER(v_link.email)
      AND COALESCE(p.is_teste, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
      )
    LIMIT 1;

    IF FOUND THEN
      -- Ativar Prime
      BEGIN
        SELECT ativar_prime_anual_completo(v_user.id, 'link_pagamento', v_link.id::TEXT) INTO v_result;

        IF COALESCE((v_result->>'success')::BOOLEAN, FALSE) THEN
          UPDATE prime_links SET
            status = 'usado',
            usado_por = v_user.id,
            usado_em = NOW()
          WHERE id = v_link.id;

          v_count := v_count + 1;
          RAISE NOTICE 'Prime ativado para: % (link de %)', v_user.email, v_link.nome_cliente;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Erro ao ativar Prime para %: %', v_user.email, SQLERRM;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Retroativo Prime: % usuários ativados', v_count;
END $$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 263: Cadastro Free/Prime automático';
  RAISE NOTICE '  - handle_new_user suporta prime_token';
  RAISE NOTICE '  - Origem vsl mapeada corretamente';
  RAISE NOTICE '  - audit_logs para erros';
  RAISE NOTICE '  - Retroativo aplicado';
END $$;
