-- ============================================
-- MIGRAÇÃO 221: Bônus de lançamento Free e Prime
-- Free: +1.000 pts de boas-vindas ao ser aprovado
-- Prime: 2.000 + 3.000 (extra até 30/11/2026)
-- ============================================

-- ============================================
-- 1. CONFIGURAÇÕES DE BÔNUS
-- ============================================

-- Bônus Free
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_boas_vindas_free', 1000, 'Pontos de boas-vindas para Free aprovado')
ON CONFLICT (chave) DO UPDATE SET valor = 1000, descricao = EXCLUDED.descricao;

-- Bônus Prime base (reduzido de 5000 para 2000)
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_boas_vindas_prime', 2000, 'Pontos de boas-vindas base do Prime')
ON CONFLICT (chave) DO UPDATE SET valor = 2000, descricao = EXCLUDED.descricao;

-- Bônus extra de lançamento Prime
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_bonus_lancamento_prime', 3000, 'Pontos extras de lançamento Prime (até a data limite)')
ON CONFLICT (chave) DO UPDATE SET valor = 3000, descricao = EXCLUDED.descricao;

-- Data limite do bônus de lançamento (usar tabela config_texto para datas)
CREATE TABLE IF NOT EXISTS config_texto (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config_texto (chave, valor, descricao)
VALUES ('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00', 'Data limite para bônus de lançamento Prime')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao, updated_at = NOW();

-- ============================================
-- 2. FUNÇÃO get_config_texto
-- ============================================
CREATE OR REPLACE FUNCTION get_config_texto(p_chave TEXT, p_default TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT valor FROM config_texto WHERE chave = p_chave),
    p_default
  );
END;
$$;

-- ============================================
-- 3. FUNÇÃO creditar_boas_vindas_free (IDEMPOTENTE)
-- Credita os pontos de boas-vindas Free uma única vez
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
BEGIN
  -- Verificar se usuário existe e está aprovado
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
    AND type = 'boas_vindas_free'
  ) INTO v_ja_creditado;

  IF v_ja_creditado THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Já recebeu bônus');
  END IF;

  -- Buscar valor do config
  SELECT COALESCE(valor, 1000)::INTEGER INTO v_pontos
  FROM plano_config WHERE chave = 'pontos_boas_vindas_free';

  v_pontos := COALESCE(v_pontos, 1000);

  -- Creditar pontos
  INSERT INTO point_transactions (user_id, amount, type, reason, operation)
  VALUES (
    p_user_id,
    v_pontos,
    'boas_vindas_free',
    'Bônus de boas-vindas · lançamento Me,up Club',
    'credit'
  );

  -- Atualizar saldo
  UPDATE profiles
  SET points = COALESCE(points, 0) + v_pontos
  WHERE id = p_user_id;

  -- Criar notificação
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    p_user_id,
    'bonus',
    'Bônus de boas-vindas!',
    'Você ganhou ' || v_pontos || ' pts de boas-vindas no Me,up Club!',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'message', 'Bônus de boas-vindas creditado'
  );
END;
$$;

-- ============================================
-- 4. ATUALIZAR handle_new_user TRIGGER
-- Chama creditar_boas_vindas_free quando aprovar
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

  -- Contar vagas ocupadas
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
    id, email, name, referred_by, accepted_terms, accepted_terms_at,
    status_acesso, origem_acesso, acesso_aprovado_em
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_referrer_id, v_accepted_terms, v_accepted_terms_at,
    v_status_acesso, v_origem_acesso,
    CASE WHEN v_status_acesso = 'aprovado' THEN NOW() ELSE NULL END
  );

  -- Se aprovado, creditar bônus de boas-vindas Free
  IF v_status_acesso = 'aprovado' THEN
    PERFORM creditar_boas_vindas_free(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 5. ATUALIZAR aprovar_por_link
-- Creditar bônus ao aprovar
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
  v_bonus_result JSONB;
BEGIN
  -- Verificar se usuário existe
  SELECT status_acesso INTO v_user_status FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil ainda não criado', 'action', 'retry');
  END IF;

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

  -- Validar código
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

  LOCK TABLE profiles IN SHARE ROW EXCLUSIVE MODE;

  -- Contar vagas Free ocupadas
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

  IF v_vagas_livres <= 0 THEN
    UPDATE profiles SET
      status_acesso = 'em_espera',
      origem_acesso = COALESCE(origem_acesso, 'link_lista'),
      updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true, 'status', 'em_espera',
      'message', 'As vagas desta abertura esgotaram. Você está na lista de espera.'
    );
  END IF;

  -- Aprovar
  UPDATE profiles SET
    status_acesso = 'aprovado',
    origem_acesso = COALESCE(origem_acesso, 'link_lista'),
    acesso_aprovado_em = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Creditar bônus de boas-vindas Free
  SELECT creditar_boas_vindas_free(p_user_id) INTO v_bonus_result;

  RETURN jsonb_build_object(
    'success', true, 'status', 'aprovado',
    'vagas_restantes', v_vagas_livres - 1,
    'bonus', v_bonus_result
  );
END;
$$;

-- ============================================
-- 6. ATUALIZAR admin_confirmar_prime_anual
-- 2.000 + 3.000 (se antes do prazo) em transações separadas
-- ============================================
CREATE OR REPLACE FUNCTION admin_confirmar_prime_anual(p_subscription_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos_indicador INTEGER;
  v_pontos_indicado INTEGER;
  v_dias_pendente INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_indicado_nome TEXT;
  v_pontos_boas_vindas INTEGER;
  v_pontos_lancamento INTEGER := 0;
  v_data_limite TIMESTAMPTZ;
  v_boas_vindas_ja_dado BOOLEAN;
BEGIN
  -- Buscar assinatura
  SELECT s.*, p.name as user_name, s.boas_vindas_creditado INTO v_subscription
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.id = p_subscription_id;

  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não encontrada');
  END IF;

  IF v_subscription.ciclo != 'anual' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não é anual');
  END IF;

  -- Carência do Prime
  v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  -- Buscar valores de bônus
  v_pontos_boas_vindas := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_boas_vindas_prime'), 2000);

  -- Verificar se tem bônus de lançamento (até a data limite)
  v_data_limite := COALESCE(
    get_config_texto('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00')::TIMESTAMPTZ,
    '2026-11-30T23:59:59-03:00'::TIMESTAMPTZ
  );

  IF NOW() <= v_data_limite THEN
    v_pontos_lancamento := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_bonus_lancamento_prime'), 3000);
  END IF;

  -- IDEMPOTÊNCIA: Verificar se já creditou boas-vindas
  v_boas_vindas_ja_dado := COALESCE(v_subscription.boas_vindas_creditado, FALSE);

  IF NOT v_boas_vindas_ja_dado THEN
    -- 1. PONTOS DE BOAS-VINDAS BASE (2.000)
    PERFORM creditar_pontos_bloqueados(
      v_subscription.user_id,
      v_pontos_boas_vindas,
      'Bônus de boas-vindas Prime',
      v_liberar_em,
      NULL,
      p_subscription_id
    );

    -- 2. BÔNUS DE LANÇAMENTO (3.000 se antes do prazo)
    IF v_pontos_lancamento > 0 THEN
      PERFORM creditar_pontos_bloqueados(
        v_subscription.user_id,
        v_pontos_lancamento,
        'Bônus de lançamento · até 30/11',
        v_liberar_em,
        NULL,
        p_subscription_id
      );
    END IF;

    -- Marcar que boas-vindas foi creditado
    UPDATE subscriptions SET boas_vindas_creditado = TRUE WHERE id = p_subscription_id;
  END IF;

  -- BUSCAR REFERRAL para bônus de indicação
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = v_subscription.user_id
  AND r.prime_anual_pontos_creditados = FALSE
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', CASE WHEN v_boas_vindas_ja_dado
                      THEN 'Bônus já creditado anteriormente'
                      ELSE 'Bônus creditado (bloqueado ' || v_dias_pendente || ' dias)' END,
      'pontos_boas_vindas', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_boas_vindas END,
      'pontos_lancamento', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_lancamento END,
      'liberar_em', v_liberar_em,
      'ja_creditado', v_boas_vindas_ja_dado
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Se indicador é FREE, registrar ganho perdido
  IF v_indicador_plano = 'free' THEN
    v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicador_prime'), 3000);

    INSERT INTO missed_earnings (user_id, referral_id, referred_name, evento, valor_perdido, mensagem)
    VALUES (
      v_referral.referrer_id, v_referral.id, v_indicado_nome, 'prime_anual',
      v_pontos_indicador,
      v_indicado_nome || ' assinou o Prime Anual! No Prime, você teria ganho +' || v_pontos_indicador || ' pts.'
    );

    UPDATE referrals SET
      prime_anual_ativado = TRUE, prime_anual_ativado_em = NOW(), prime_anual_pontos_creditados = FALSE
    WHERE id = v_referral.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Bônus creditado. Indicador é Free.',
      'pontos_boas_vindas', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_boas_vindas END,
      'pontos_lancamento', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_lancamento END,
      'liberar_em', v_liberar_em,
      'indicador_plano', 'free'
    );
  END IF;

  -- Indicador é PRIME
  v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicador_prime'), 3000);
  v_pontos_indicado := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicado'), 1000);

  -- Creditar indicador (bloqueado)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referrer_id, v_pontos_indicador,
    'Indicação: ' || v_indicado_nome || ' virou Prime',
    v_liberar_em, v_referral.id, p_subscription_id
  );

  -- Creditar indicado extra (bloqueado)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referred_id, v_pontos_indicado,
    'Bônus: você assinou o Prime Anual',
    v_liberar_em, v_referral.id, p_subscription_id
  );

  -- Marcar referral
  UPDATE referrals SET
    prime_anual_ativado = TRUE, prime_anual_ativado_em = NOW(), prime_anual_pontos_creditados = FALSE
  WHERE id = v_referral.id;

  -- Notificar indicador
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_referral.referrer_id, 'referral_signup', 'Seu amigo virou Prime!',
    v_indicado_nome || ' assinou o Prime Anual. +' || v_pontos_indicador || ' pts (liberam em ' || v_dias_pendente || ' dias).',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pontos bloqueados por ' || v_dias_pendente || ' dias',
    'liberar_em', v_liberar_em,
    'pontos_boas_vindas', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_boas_vindas END,
    'pontos_lancamento', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_lancamento END,
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado
  );
END;
$$;

-- ============================================
-- 7. ATUALIZAR get_planos_config
-- Expor bônus de boas-vindas Free e Prime
-- ============================================
CREATE OR REPLACE FUNCTION get_planos_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_free_mult NUMERIC;
  v_prime_mult NUMERIC;
  v_free_indicacao INTEGER;
  v_prime_indicacao INTEGER;
  v_dias_bloqueio INTEGER;
  v_free_boas_vindas INTEGER;
  v_prime_boas_vindas INTEGER;
  v_prime_bonus_lancamento INTEGER;
  v_prime_bonus_ate TIMESTAMPTZ;
BEGIN
  -- Multiplicadores
  SELECT COALESCE(valor, 0.5) INTO v_free_mult FROM plano_config WHERE chave = 'pontos_por_real_free';
  SELECT COALESCE(valor, 1.5) INTO v_prime_mult FROM plano_config WHERE chave = 'pontos_por_real_prime';

  -- Indicação
  SELECT COALESCE(valor, 2000) INTO v_free_indicacao FROM plano_config WHERE chave = 'pontos_indicacao_free';
  SELECT COALESCE(valor, 5000) INTO v_prime_indicacao FROM plano_config WHERE chave = 'pontos_indicacao_prime';

  -- Bloqueio
  SELECT COALESCE(valor, 7) INTO v_dias_bloqueio FROM plano_config WHERE chave = 'carencia_bonus_prime_dias';

  -- Bônus boas-vindas
  SELECT COALESCE(valor, 1000) INTO v_free_boas_vindas FROM plano_config WHERE chave = 'pontos_boas_vindas_free';
  SELECT COALESCE(valor, 2000) INTO v_prime_boas_vindas FROM plano_config WHERE chave = 'pontos_boas_vindas_prime';
  SELECT COALESCE(valor, 3000) INTO v_prime_bonus_lancamento FROM plano_config WHERE chave = 'pontos_bonus_lancamento_prime';

  -- Data limite do bônus
  v_prime_bonus_ate := COALESCE(
    get_config_texto('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00')::TIMESTAMPTZ,
    '2026-11-30T23:59:59-03:00'::TIMESTAMPTZ
  );

  -- Fallbacks
  v_free_mult := COALESCE(v_free_mult, 0.5);
  v_prime_mult := COALESCE(v_prime_mult, 1.5);
  v_free_indicacao := COALESCE(v_free_indicacao, 2000);
  v_prime_indicacao := COALESCE(v_prime_indicacao, 5000);
  v_dias_bloqueio := COALESCE(v_dias_bloqueio, 7);
  v_free_boas_vindas := COALESCE(v_free_boas_vindas, 1000);
  v_prime_boas_vindas := COALESCE(v_prime_boas_vindas, 2000);
  v_prime_bonus_lancamento := COALESCE(v_prime_bonus_lancamento, 3000);

  RETURN jsonb_build_object(
    'free', jsonb_build_object(
      'nome', 'Free',
      'descricao', 'Acesso básico ao clube',
      'pontosCheckin', 10,
      'pontosIndicacao', v_free_indicacao,
      'multiplicadorViagem', v_free_mult,
      'fatorPontos', 150,
      'pontosBoasVindas', v_free_boas_vindas
    ),
    'prime', jsonb_build_object(
      'nome', 'Prime',
      'descricao', 'Benefícios exclusivos',
      'pontosCheckin', 30,
      'pontosIndicacao', v_prime_indicacao,
      'multiplicadorViagem', v_prime_mult,
      'fatorPontos', 130,
      'pontosAnualIndicador', 3000,
      'pontosAnualIndicado', 1000,
      'pontosBoasVindas', v_prime_boas_vindas,
      'bonusLancamento', v_prime_bonus_lancamento,
      'bonusLancamentoAte', v_prime_bonus_ate
    ),
    'config', jsonb_build_object(
      'diasBloqueio', v_dias_bloqueio
    )
  );
END;
$$;

-- ============================================
-- 8. RETROATIVO: Dar 1.000 pts aos Free aprovados
-- ============================================
DO $$
DECLARE
  v_free_user RECORD;
  v_count INTEGER := 0;
  v_result JSONB;
BEGIN
  FOR v_free_user IN
    SELECT p.id, p.name, p.email
    FROM profiles p
    WHERE p.status_acesso = 'aprovado'
      AND COALESCE(p.is_teste, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
      )
      AND NOT EXISTS (
        SELECT 1 FROM point_transactions pt
        WHERE pt.user_id = p.id AND pt.type = 'boas_vindas_free'
      )
    ORDER BY p.created_at ASC
  LOOP
    SELECT creditar_boas_vindas_free(v_free_user.id) INTO v_result;
    IF (v_result->>'success')::BOOLEAN AND NOT COALESCE((v_result->>'skipped')::BOOLEAN, false) THEN
      v_count := v_count + 1;
      RAISE NOTICE 'Creditado 1.000 pts para: % (%)', v_free_user.name, v_free_user.email;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Retroativo: % usuários Free receberam 1.000 pts de boas-vindas', v_count;
END $$;

-- ============================================
-- 9. VERIFICAR PRIME EXISTENTES
-- ============================================
DO $$
DECLARE
  v_prime_user RECORD;
BEGIN
  RAISE NOTICE '=== PRIME JÁ ATIVADOS ===';
  FOR v_prime_user IN
    SELECT
      p.name,
      p.email,
      s.created_at as ativado_em,
      COALESCE(
        (SELECT SUM(amount) FROM point_transactions
         WHERE user_id = p.id
         AND reason ILIKE '%boas-vindas%prime%'),
        0
      ) as pontos_boas_vindas
    FROM profiles p
    JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
    WHERE COALESCE(p.is_teste, false) = false
    ORDER BY s.created_at DESC
  LOOP
    RAISE NOTICE '% (%): % pts de boas-vindas',
      v_prime_user.name,
      v_prime_user.email,
      v_prime_user.pontos_boas_vindas;
  END LOOP;
END $$;

-- Log final
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 221: Bônus de lançamento configurados';
  RAISE NOTICE '  - Free: +1.000 pts de boas-vindas ao aprovar';
  RAISE NOTICE '  - Prime: 2.000 + 3.000 (até 30/11/2026)';
  RAISE NOTICE '  - get_planos_config expõe pontosBoasVindas e bonusLancamento';
END $$;
