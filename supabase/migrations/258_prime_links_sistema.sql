-- ============================================
-- MIGRATION 258: Sistema de Links Prime Individuais
-- Link único pós-pagamento para ativar Prime
-- Bônus: 2.000 imediato + 3.000 bloqueado 7 dias
-- ============================================

-- ============================================
-- 1. TABELA prime_links
-- ============================================
CREATE TABLE IF NOT EXISTS prime_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  nome_cliente TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  valor_pago NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL, -- pix, cartao, parcelado
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  usado_por UUID REFERENCES auth.users(id),
  usado_em TIMESTAMPTZ,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'usado', 'cancelado', 'expirado'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prime_links_token ON prime_links(token);
CREATE INDEX IF NOT EXISTS idx_prime_links_status ON prime_links(status);

-- RLS
ALTER TABLE prime_links ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode ler/escrever
DROP POLICY IF EXISTS "Admin pode tudo em prime_links" ON prime_links;
CREATE POLICY "Admin pode tudo em prime_links" ON prime_links
  FOR ALL
  USING (is_admin());

-- ============================================
-- 2. FUNÇÃO gerar_token_seguro
-- ============================================
CREATE OR REPLACE FUNCTION gerar_token_seguro(p_length INTEGER DEFAULT 32)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..p_length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================
-- 3. RPC admin_gerar_link_prime
-- ============================================
CREATE OR REPLACE FUNCTION admin_gerar_link_prime(
  p_nome TEXT,
  p_telefone TEXT,
  p_email TEXT DEFAULT NULL,
  p_valor NUMERIC DEFAULT 597,
  p_forma TEXT DEFAULT 'pix'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_token TEXT;
  v_link_id UUID;
  v_vagas_restantes INTEGER;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admin pode gerar links');
  END IF;

  -- Verificar vagas de fundador
  SELECT vagas_disponiveis INTO v_vagas_restantes
  FROM (
    SELECT
      30 - COUNT(*) as vagas_disponiveis
    FROM profiles
    WHERE is_fundador = true
      AND fundador_numero IS NOT NULL
  ) sub;

  IF v_vagas_restantes <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vagas de fundador esgotadas');
  END IF;

  -- Gerar token único
  LOOP
    v_token := gerar_token_seguro(32);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM prime_links WHERE token = v_token);
  END LOOP;

  -- Criar link
  INSERT INTO prime_links (token, nome_cliente, telefone, email, valor_pago, forma_pagamento, criado_por)
  VALUES (v_token, p_nome, p_telefone, p_email, p_valor, p_forma, v_admin_id)
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object(
    'success', true,
    'link_id', v_link_id,
    'token', v_token,
    'vagas_restantes', v_vagas_restantes - 1
  );
END;
$$;

-- ============================================
-- 4. RPC validar_link_prime (público, para preview)
-- ============================================
CREATE OR REPLACE FUNCTION validar_link_prime(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_bonus_lancamento INTEGER := 0;
  v_data_limite TIMESTAMPTZ;
BEGIN
  -- Buscar link
  SELECT * INTO v_link FROM prime_links WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido', 'code', 'INVALID');
  END IF;

  IF v_link.status = 'usado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este link já foi utilizado', 'code', 'USED');
  END IF;

  IF v_link.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este link foi cancelado', 'code', 'CANCELLED');
  END IF;

  IF v_link.status = 'expirado' OR v_link.expira_em < NOW() THEN
    -- Marcar como expirado
    UPDATE prime_links SET status = 'expirado' WHERE id = v_link.id AND status = 'ativo';
    RETURN jsonb_build_object('success', false, 'error', 'Este link expirou', 'code', 'EXPIRED');
  END IF;

  -- Verificar bônus de lançamento
  v_data_limite := COALESCE(
    get_config_texto('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00')::TIMESTAMPTZ,
    '2026-11-30T23:59:59-03:00'::TIMESTAMPTZ
  );

  IF NOW() <= v_data_limite THEN
    v_bonus_lancamento := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_bonus_lancamento_prime'), 3000);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'nome_cliente', v_link.nome_cliente,
    'bonus_imediato', 2000,
    'bonus_lancamento', v_bonus_lancamento,
    'bonus_lancamento_bloqueado_dias', 7
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validar_link_prime(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validar_link_prime(TEXT) TO authenticated;

-- ============================================
-- 5. RPC resgatar_link_prime (ativa Prime)
-- ============================================
CREATE OR REPLACE FUNCTION resgatar_link_prime(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_link RECORD;
  v_profile RECORD;
  v_subscription_id UUID;
  v_fundador_numero INTEGER;
  v_pontos_imediato INTEGER := 2000;
  v_pontos_lancamento INTEGER := 0;
  v_data_limite TIMESTAMPTZ;
  v_liberar_em TIMESTAMPTZ;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
BEGIN
  -- Verificar usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Faça login primeiro', 'code', 'NOT_LOGGED');
  END IF;

  -- Buscar link com lock
  SELECT * INTO v_link FROM prime_links WHERE token = p_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido', 'code', 'INVALID');
  END IF;

  -- Verificar se já foi usado pelo mesmo usuário (idempotência)
  IF v_link.status = 'usado' AND v_link.usado_por = v_user_id THEN
    RETURN jsonb_build_object('success', true, 'message', 'Você já ativou este link', 'already_used', true);
  END IF;

  IF v_link.status = 'usado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este link já foi utilizado', 'code', 'USED');
  END IF;

  IF v_link.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este link foi cancelado', 'code', 'CANCELLED');
  END IF;

  IF v_link.status = 'expirado' OR v_link.expira_em < NOW() THEN
    UPDATE prime_links SET status = 'expirado' WHERE id = v_link.id AND status = 'ativo';
    RETURN jsonb_build_object('success', false, 'error', 'Este link expirou', 'code', 'EXPIRED');
  END IF;

  -- Buscar perfil
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;

  -- Verificar se já é Prime
  IF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = v_user_id AND status = 'active' AND plano = 'prime') THEN
    -- Marcar link como usado mesmo assim
    UPDATE prime_links SET status = 'usado', usado_por = v_user_id, usado_em = NOW() WHERE id = v_link.id;
    RETURN jsonb_build_object('success', true, 'message', 'Você já é Prime!', 'already_prime', true);
  END IF;

  -- Ocupar vaga de fundador
  SELECT COALESCE(MAX(fundador_numero), 0) + 1 INTO v_fundador_numero
  FROM profiles WHERE is_fundador = true AND fundador_numero IS NOT NULL;

  IF v_fundador_numero > 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vagas de fundador esgotadas', 'code', 'NO_SLOTS');
  END IF;

  -- Aprovar acesso se necessário
  UPDATE profiles SET
    status_acesso = 'aprovado',
    acesso_aprovado_em = COALESCE(acesso_aprovado_em, NOW()),
    is_fundador = true,
    fundador_numero = v_fundador_numero,
    origem_acesso = COALESCE(origem_acesso, 'link_pagamento'),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Criar assinatura Prime
  INSERT INTO subscriptions (
    user_id, plano, ciclo, status, origem, boas_vindas_creditado,
    starts_at, ends_at, created_at
  ) VALUES (
    v_user_id, 'prime', 'anual', 'active', 'link_pagamento', true,
    NOW(), NOW() + INTERVAL '1 year', NOW()
  )
  RETURNING id INTO v_subscription_id;

  -- Verificar bônus de lançamento
  v_data_limite := COALESCE(
    get_config_texto('bonus_lancamento_prime_ate', '2026-11-30T23:59:59-03:00')::TIMESTAMPTZ,
    '2026-11-30T23:59:59-03:00'::TIMESTAMPTZ
  );

  IF NOW() <= v_data_limite THEN
    v_pontos_lancamento := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_bonus_lancamento_prime'), 3000);
  END IF;

  v_liberar_em := NOW() + INTERVAL '7 days';

  -- Saldo antes
  v_saldo_antes := COALESCE(v_profile.points, 0);

  -- 1. BÔNUS IMEDIATO (2.000 pts - disponível na hora)
  v_saldo_depois := v_saldo_antes + v_pontos_imediato;

  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_user_id, v_pontos_imediato, 'credit',
    'Bônus de boas-vindas Prime (disponível)',
    v_saldo_antes, v_saldo_depois
  );

  UPDATE profiles SET points = v_saldo_depois WHERE id = v_user_id;

  -- 2. BÔNUS DE LANÇAMENTO (3.000 pts - bloqueado 7 dias)
  IF v_pontos_lancamento > 0 THEN
    PERFORM creditar_pontos_bloqueados(
      v_user_id,
      v_pontos_lancamento,
      'Bônus de lançamento · até 30/11 (libera em 7 dias)',
      v_liberar_em,
      NULL,
      v_subscription_id
    );
  END IF;

  -- Marcar link como usado
  UPDATE prime_links SET
    status = 'usado',
    usado_por = v_user_id,
    usado_em = NOW()
  WHERE id = v_link.id;

  -- Criar notificação
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_user_id,
    'subscription',
    'Bem-vindo ao Prime! 👑',
    '+' || v_pontos_imediato || ' pts já disponíveis.' ||
    CASE WHEN v_pontos_lancamento > 0
      THEN ' +' || v_pontos_lancamento || ' pts de lançamento liberam em ' || TO_CHAR(v_liberar_em, 'DD/MM') || '.'
      ELSE ''
    END,
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Prime ativado com sucesso!',
    'fundador_numero', v_fundador_numero,
    'pontos_imediato', v_pontos_imediato,
    'pontos_lancamento', v_pontos_lancamento,
    'liberar_em', v_liberar_em,
    'subscription_id', v_subscription_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION resgatar_link_prime(TEXT) TO authenticated;

-- ============================================
-- 6. RPC admin_listar_links_prime
-- ============================================
CREATE OR REPLACE FUNCTION admin_listar_links_prime()
RETURNS TABLE (
  id UUID,
  token TEXT,
  nome_cliente TEXT,
  telefone TEXT,
  email TEXT,
  valor_pago NUMERIC,
  forma_pagamento TEXT,
  criado_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  status TEXT,
  usado_por_nome TEXT,
  usado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas admin';
  END IF;

  RETURN QUERY
  SELECT
    pl.id,
    pl.token,
    pl.nome_cliente,
    pl.telefone,
    pl.email,
    pl.valor_pago,
    pl.forma_pagamento,
    pl.criado_em,
    pl.expira_em,
    CASE
      WHEN pl.status = 'ativo' AND pl.expira_em < NOW() THEN 'expirado'
      ELSE pl.status
    END as status,
    p.name as usado_por_nome,
    pl.usado_em
  FROM prime_links pl
  LEFT JOIN profiles p ON p.id = pl.usado_por
  ORDER BY pl.criado_em DESC;
END;
$$;

-- ============================================
-- 7. RPC admin_cancelar_link_prime
-- ============================================
CREATE OR REPLACE FUNCTION admin_cancelar_link_prime(p_link_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admin');
  END IF;

  UPDATE prime_links SET status = 'cancelado' WHERE id = p_link_id AND status = 'ativo';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link não encontrado ou já usado/cancelado');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- 8. ATUALIZAR ativar_prime existente
-- Mudar para 2.000 imediato + 3.000 bloqueado
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
  v_pontos_imediato INTEGER := 2000;
  v_pontos_lancamento INTEGER := 0;
  v_data_limite TIMESTAMPTZ;
  v_boas_vindas_ja_dado BOOLEAN;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
BEGIN
  -- Buscar assinatura
  SELECT s.*, p.name as user_name, p.points as user_points, s.boas_vindas_creditado INTO v_subscription
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.id = p_subscription_id;

  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não encontrada');
  END IF;

  IF v_subscription.ciclo != 'anual' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não é anual');
  END IF;

  -- Carência do bônus de lançamento
  v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

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
    v_saldo_antes := COALESCE(v_subscription.user_points, 0);

    -- 1. BÔNUS IMEDIATO (2.000 pts - disponível NA HORA)
    v_saldo_depois := v_saldo_antes + v_pontos_imediato;

    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (
      v_subscription.user_id, v_pontos_imediato, 'credit',
      'Bônus de boas-vindas Prime (disponível)',
      v_saldo_antes, v_saldo_depois
    );

    UPDATE profiles SET points = v_saldo_depois WHERE id = v_subscription.user_id;

    -- 2. BÔNUS DE LANÇAMENTO (3.000 se antes do prazo - bloqueado 7 dias)
    IF v_pontos_lancamento > 0 THEN
      PERFORM creditar_pontos_bloqueados(
        v_subscription.user_id,
        v_pontos_lancamento,
        'Bônus de lançamento · até 30/11 (libera em 7 dias)',
        v_liberar_em,
        NULL,
        p_subscription_id
      );
    END IF;

    -- Marcar que boas-vindas foi creditado
    UPDATE subscriptions SET boas_vindas_creditado = TRUE WHERE id = p_subscription_id;

    -- Notificação
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_subscription.user_id,
      'subscription',
      'Bem-vindo ao Prime! 👑',
      '+' || v_pontos_imediato || ' pts já disponíveis.' ||
      CASE WHEN v_pontos_lancamento > 0
        THEN ' +' || v_pontos_lancamento || ' pts de lançamento liberam em ' || TO_CHAR(v_liberar_em, 'DD/MM') || '.'
        ELSE ''
      END,
      FALSE
    );
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
                      ELSE 'Bônus creditado: ' || v_pontos_imediato || ' imediato + ' || v_pontos_lancamento || ' em ' || v_dias_pendente || ' dias' END,
      'pontos_imediato', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_imediato END,
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
      'pontos_imediato', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_imediato END,
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
    'message', 'Bônus creditado',
    'liberar_em', v_liberar_em,
    'pontos_imediato', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_imediato END,
    'pontos_lancamento', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_lancamento END,
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado
  );
END;
$$;

-- ============================================
-- 9. Adicionar 'vsl' ao CHECK de origem_cadastro
-- ============================================
DO $$
BEGIN
  -- Verificar se o check existe e atualizá-lo
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_origem_acesso_check;

  ALTER TABLE profiles ADD CONSTRAINT profiles_origem_acesso_check
    CHECK (origem_acesso IS NULL OR origem_acesso IN ('site', 'indicacao', 'link_lista', 'convite', 'link_pagamento', 'vsl', 'admin'));

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Check constraint já existe ou não pode ser alterado';
END $$;

-- RETROATIVO: Ver migration 259

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 258: Sistema de Links Prime criado';
  RAISE NOTICE '  - Tabela prime_links';
  RAISE NOTICE '  - RPC admin_gerar_link_prime, validar_link_prime, resgatar_link_prime';
  RAISE NOTICE '  - Bônus Prime: 2.000 imediato + 3.000 bloqueado 7 dias';
END $$;
