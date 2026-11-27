-- ============================================
-- MIGRAÇÃO 220: Entrada automática no servidor
-- Toda conta criada entra aprovada automaticamente
-- (até acabar vagas Free), não precisa mais de aprovação manual
-- ============================================

-- ============================================
-- 1. ATUALIZAR TRIGGER handle_new_user
-- Auto-aprova no servidor se houver vaga
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
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_status_acesso TEXT;
  v_origem_acesso TEXT;
BEGIN
  -- Extrair dados dos metadados
  v_referrer_id := (NEW.raw_user_meta_data->>'referred_by')::UUID;
  v_accepted_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::BOOLEAN, false);
  v_codigo_entrada := NEW.raw_user_meta_data->>'codigo_entrada';
  v_origem_cadastro := COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', 'site');

  IF v_accepted_terms THEN
    v_accepted_terms_at := NOW();
  ELSE
    v_accepted_terms_at := NULL;
  END IF;

  -- Determinar origem_acesso
  IF v_codigo_entrada IS NOT NULL AND v_codigo_entrada != '' THEN
    v_origem_acesso := 'link_lista';
  ELSIF v_referrer_id IS NOT NULL THEN
    v_origem_acesso := 'indicacao';
  ELSE
    v_origem_acesso := 'site';
  END IF;

  -- Buscar configuração de vagas Free
  SELECT COALESCE(get_config('vagas_free_total', '70')::INTEGER, 70) INTO v_vagas_total;

  -- Contar vagas ocupadas (aprovados Free, não-teste, não-fundador, sem Prime ativo)
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

  v_vagas_livres := v_vagas_total - v_vagas_ocupadas;

  -- Se há vaga, aprova direto; senão, lista de espera
  IF v_vagas_livres > 0 THEN
    v_status_acesso := 'aprovado';
  ELSE
    v_status_acesso := 'em_espera';
  END IF;

  -- Criar o perfil já com status definido
  INSERT INTO public.profiles (
    id,
    email,
    name,
    referred_by,
    accepted_terms,
    accepted_terms_at,
    status_acesso,
    origem_acesso,
    acesso_aprovado_em
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_referrer_id,
    v_accepted_terms,
    v_accepted_terms_at,
    v_status_acesso,
    v_origem_acesso,
    CASE WHEN v_status_acesso = 'aprovado' THEN NOW() ELSE NULL END
  );

  RETURN NEW;
END;
$$;

-- ============================================
-- 2. ATUALIZAR aprovar_por_link
-- Tratar status_acesso NULL como em_analise
-- ============================================
CREATE OR REPLACE FUNCTION aprovar_por_link(p_user_id UUID, p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_ativo BOOLEAN;
  v_link_codigo TEXT;
  v_link_expira TIMESTAMPTZ;
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_user_status TEXT;
BEGIN
  -- Verificar se usuário existe
  SELECT status_acesso INTO v_user_status
  FROM profiles
  WHERE id = p_user_id;

  -- Se profile não existe, retornar retry (trigger pode não ter executado ainda)
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil ainda não criado', 'action', 'retry');
  END IF;

  -- Tratar NULL como em_analise
  v_user_status := COALESCE(v_user_status, 'em_analise');

  IF v_user_status = 'aprovado' THEN
    RETURN jsonb_build_object('success', true, 'status', 'ja_aprovado');
  END IF;

  -- Buscar configurações do link
  SELECT
    get_config('link_lista_ativo', 'true')::BOOLEAN,
    get_config('link_lista_codigo', 'LISTA27'),
    get_config('link_lista_expira_em', '2030-01-01')::TIMESTAMPTZ,
    get_config('vagas_free_total', '70')::INTEGER
  INTO v_link_ativo, v_link_codigo, v_link_expira, v_vagas_total;

  -- Validar código (se fornecido)
  IF p_codigo IS NOT NULL AND p_codigo != '' THEN
    IF NOT v_link_ativo THEN
      RETURN jsonb_build_object('success', false, 'error', 'Link inativo', 'action', 'em_analise');
    END IF;

    IF UPPER(p_codigo) != UPPER(v_link_codigo) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Código inválido', 'action', 'em_analise');
    END IF;

    IF NOW() > v_link_expira THEN
      RETURN jsonb_build_object('success', false, 'error', 'Link expirado', 'action', 'em_analise');
    END IF;
  END IF;

  -- Lock na tabela para garantir atomicidade
  LOCK TABLE profiles IN SHARE ROW EXCLUSIVE MODE;

  -- Contar vagas Free ocupadas
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

  v_vagas_livres := v_vagas_total - v_vagas_ocupadas;

  -- Se não há vagas, colocar em espera
  IF v_vagas_livres <= 0 THEN
    UPDATE profiles
    SET
      status_acesso = 'em_espera',
      origem_acesso = COALESCE(origem_acesso, 'link_lista'),
      updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'em_espera',
      'message', 'As vagas desta abertura esgotaram. Você está na lista de espera.'
    );
  END IF;

  -- Aprovar automaticamente
  UPDATE profiles
  SET
    status_acesso = 'aprovado',
    origem_acesso = COALESCE(origem_acesso, 'link_lista'),
    acesso_aprovado_em = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'aprovado',
    'vagas_restantes', v_vagas_livres - 1
  );
END;
$$;

-- ============================================
-- 3. CORRIGIR USUÁRIOS EXISTENTES
-- Aprovar todos com NULL ou em_analise (até limite de vagas)
-- ============================================
DO $$
DECLARE
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_aprovados INTEGER := 0;
  v_em_espera INTEGER := 0;
  r RECORD;
BEGIN
  -- Primeiro, marcar NULL como em_analise
  UPDATE profiles
  SET status_acesso = 'em_analise'
  WHERE status_acesso IS NULL;

  -- Buscar configuração de vagas
  SELECT COALESCE(get_config('vagas_free_total', '70')::INTEGER, 70) INTO v_vagas_total;

  -- Contar vagas já ocupadas
  SELECT COUNT(*) INTO v_vagas_ocupadas
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND COALESCE(p.is_teste, false) = false
    AND COALESCE(p.is_fundador, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
    );

  v_vagas_livres := v_vagas_total - v_vagas_ocupadas;

  -- Aprovar usuários em_analise por ordem de cadastro
  FOR r IN
    SELECT id, name, email
    FROM profiles
    WHERE status_acesso = 'em_analise'
    ORDER BY created_at ASC
  LOOP
    IF v_vagas_livres > 0 THEN
      UPDATE profiles
      SET status_acesso = 'aprovado', acesso_aprovado_em = NOW(), updated_at = NOW()
      WHERE id = r.id;
      v_vagas_livres := v_vagas_livres - 1;
      v_aprovados := v_aprovados + 1;
      RAISE NOTICE 'Aprovado: % (%)', r.name, r.email;
    ELSE
      UPDATE profiles
      SET status_acesso = 'em_espera', updated_at = NOW()
      WHERE id = r.id;
      v_em_espera := v_em_espera + 1;
      RAISE NOTICE 'Em espera: % (%)', r.name, r.email;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Migração 220: % aprovados, % em espera', v_aprovados, v_em_espera;
END $$;

-- Log final
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 220: Entrada automática ativada';
  RAISE NOTICE '  - Trigger handle_new_user agora auto-aprova';
  RAISE NOTICE '  - aprovar_por_link trata NULL como em_analise';
END $$;
