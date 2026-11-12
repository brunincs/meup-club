-- ============================================
-- MIGRAÇÃO 120: Notificações de pontos e ajustes de exibição
-- ============================================
-- 1. Atualizar funções de crédito para criar notificações
-- 2. Adicionar função para buscar pontos bloqueados detalhados
-- ============================================

-- 1. FUNÇÃO: Creditar pontos bloqueados COM NOTIFICAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_bloqueados(
  p_user_id UUID,
  p_pontos INTEGER,
  p_motivo TEXT,
  p_liberar_em TIMESTAMPTZ,
  p_referral_id UUID DEFAULT NULL,
  p_subscription_id UUID DEFAULT NULL,
  p_notificacao_titulo TEXT DEFAULT NULL,
  p_notificacao_mensagem TEXT DEFAULT NULL,
  p_notificacao_icon TEXT DEFAULT 'gift'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_blocked_before INTEGER;
  v_blocked_after INTEGER;
  v_transaction_id UUID;
  v_pending_id UUID;
  v_liberar_str TEXT;
BEGIN
  -- Setar flag de chamada interna
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Buscar saldos atuais
  SELECT COALESCE(points, 0), COALESCE(pontos_bloqueados, 0)
  INTO v_balance_before, v_blocked_before
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_balance_before IS NULL THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  v_balance_after := v_balance_before + p_pontos;
  v_blocked_after := v_blocked_before + p_pontos;
  v_liberar_str := TO_CHAR(p_liberar_em, 'DD/MM');

  -- Atualizar perfil (pontos e pontos_bloqueados)
  UPDATE profiles SET
    points = v_balance_after,
    pontos_bloqueados = v_blocked_after,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Criar transação
  INSERT INTO point_transactions (
    user_id, amount, balance_before, balance_after, type, reason
  ) VALUES (
    p_user_id, p_pontos, v_balance_before, v_balance_after, 'credit', p_motivo || ' (bloqueado até ' || v_liberar_str || ')'
  )
  RETURNING id INTO v_transaction_id;

  -- Criar registro de pontos pendentes
  INSERT INTO pending_points (
    user_id, pontos, motivo, liberar_em, referral_id, subscription_id, status, creditado_no_saldo
  ) VALUES (
    p_user_id, p_pontos, p_motivo, p_liberar_em, p_referral_id, p_subscription_id, 'pendente', TRUE
  )
  RETURNING id INTO v_pending_id;

  -- Criar notificação (se fornecida, sem falhar)
  BEGIN
    IF p_notificacao_titulo IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (p_user_id, 'points', p_notificacao_titulo, p_notificacao_mensagem, p_notificacao_icon);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignora erro de notificação
    NULL;
  END;

  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'pending_id', v_pending_id,
    'balance_after', v_balance_after,
    'blocked', v_blocked_after
  );
END;
$$;

-- 2. FUNÇÃO: Creditar pontos central COM NOTIFICAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_central(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_category TEXT DEFAULT 'credit',
  p_notificacao_titulo TEXT DEFAULT NULL,
  p_notificacao_mensagem TEXT DEFAULT NULL,
  p_notificacao_icon TEXT DEFAULT 'star'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Validações básicas
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id é obrigatório');
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount deve ser diferente de zero');
  END IF;

  -- Setar flag de chamada interna
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Buscar saldo atual COM LOCK
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance_before IS NULL THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Calcular novo saldo
  v_balance_after := v_balance_before + p_amount;

  IF v_balance_after < 0 THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente. Saldo atual: ' || v_balance_before
    );
  END IF;

  -- UPDATE ATÔMICO
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after
  ) VALUES (
    p_user_id, p_amount, p_type, p_reason, v_balance_before, v_balance_after
  )
  RETURNING id INTO v_transaction_id;

  -- Criar notificação (se fornecida, sem falhar)
  BEGIN
    IF p_notificacao_titulo IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (p_user_id, 'points', p_notificacao_titulo, p_notificacao_mensagem, p_notificacao_icon);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. ATUALIZAR aprovar_emissao COM NOTIFICAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_emissao(p_emissao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissao RECORD;
  v_plano_info RECORD;
  v_plano TEXT;
  v_ciclo TEXT;
  v_multiplicador NUMERIC(3,2);
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
  v_admin_id UUID;
  v_referral_result JSONB;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT * INTO v_emissao FROM emissoes WHERE id = p_emissao_id;

  IF v_emissao.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status = 'aprovada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão já aprovada');
  END IF;

  -- Usar plano_efetivo() para obter plano e ciclo
  SELECT * INTO v_plano_info FROM plano_efetivo(v_emissao.user_id);

  v_plano := COALESCE(v_plano_info.plano, 'free');
  v_ciclo := COALESCE(v_plano_info.ciclo, 'mensal');

  -- Calcular multiplicador: Prime Anual = 1.5x
  IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
    v_multiplicador := 1.5;
  ELSE
    v_multiplicador := 1.0;
  END IF;

  v_pontos_base := v_emissao.valor;
  v_pontos_final := ROUND(v_pontos_base * v_multiplicador);

  -- Creditar pontos da emissão COM NOTIFICAÇÃO
  PERFORM creditar_pontos_central(
    v_emissao.user_id,
    v_pontos_final,
    'travel',
    'Emissão aprovada: R$ ' || v_emissao.valor || CASE WHEN v_multiplicador > 1 THEN ' (Prime Anual 1.5x)' ELSE '' END,
    'credit',
    'Sua viagem foi aprovada! ✈️',
    '+' || v_pontos_final || ' pts creditados',
    'plane'
  );

  -- Atualizar emissão COM campos de rastreio
  UPDATE emissoes SET
    status = 'aprovada',
    pontos_creditados = v_pontos_final,
    plano_na_aprovacao = v_plano,
    ciclo_na_aprovacao = v_ciclo,
    multiplicador_aplicado = v_multiplicador,
    admin_id = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_emissao_id;

  -- Creditar pontos de indicação ao indicador na primeira emissão
  SELECT creditar_pontos_primeira_emissao(p_emissao_id, v_emissao.user_id) INTO v_referral_result;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_base', v_pontos_base,
    'plano', v_plano,
    'ciclo', v_ciclo,
    'multiplicador', v_multiplicador,
    'pontos_final', v_pontos_final,
    'referral_bonus', v_referral_result
  );
END;
$$;

-- 4. ATUALIZAR creditar_pontos_primeira_emissao COM NOTIFICAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_primeira_emissao(
  p_emissao_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos INTEGER;
  v_indicado_nome TEXT;
BEGIN
  -- LOCK para idempotência
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = p_user_id
  FOR UPDATE;

  -- Não tem indicação
  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Sem indicação ativa');
  END IF;

  -- IDEMPOTÊNCIA: já foi creditado
  IF v_referral.primeira_emissao_creditada THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Pontos já creditados anteriormente',
      'pontos', 0
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Pontos baseados no plano do indicador
  IF v_indicador_plano = 'prime' THEN
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_prime'), 5000);
  ELSE
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_free'), 3000);
  END IF;

  -- Creditar indicador COM NOTIFICAÇÃO
  PERFORM creditar_pontos_central(
    v_referral.referrer_id,
    v_pontos,
    'referral',
    'Indicação: primeira viagem de ' || v_indicado_nome,
    'referral',
    v_indicado_nome || ' fez a 1ª viagem! 🎉',
    '+' || v_pontos || ' pts para você',
    'users'
  );

  -- Marcar como creditado
  UPDATE referrals SET
    primeira_emissao_id = p_emissao_id,
    primeira_emissao_creditada = TRUE,
    primeira_emissao_em = NOW()
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'plano_indicador', v_indicador_plano
  );
END;
$$;

-- 5. ATUALIZAR admin_confirmar_prime_anual COM NOTIFICAÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION admin_confirmar_prime_anual(
  p_subscription_id UUID
)
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
  v_liberar_str TEXT;
  v_indicado_nome TEXT;
  v_pontos_boas_vindas INTEGER := 2000;
BEGIN
  -- Buscar assinatura
  SELECT s.*, p.name as user_name INTO v_subscription
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.id = p_subscription_id;

  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não encontrada');
  END IF;

  IF v_subscription.ciclo != 'anual' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não é anual');
  END IF;

  v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_dias_pendente'), 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;
  v_liberar_str := TO_CHAR(v_liberar_em, 'DD/MM');

  -- PONTOS DE BOAS-VINDAS para o assinante (BLOQUEADOS) COM NOTIFICAÇÃO
  PERFORM creditar_pontos_bloqueados(
    v_subscription.user_id,
    v_pontos_boas_vindas,
    'Bônus de boas-vindas Prime Anual',
    v_liberar_em,
    NULL,
    p_subscription_id,
    '🎉 Bem-vindo ao Prime!',
    '+' || v_pontos_boas_vindas || ' pts de boas-vindas · liberam em ' || v_liberar_str,
    'crown'
  );

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
      'message', 'Bônus de boas-vindas creditado (sem indicação ativa)',
      'pontos_boas_vindas', v_pontos_boas_vindas,
      'liberar_em', v_liberar_em
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
      v_referral.referrer_id,
      v_referral.id,
      v_indicado_nome,
      'prime_anual',
      v_pontos_indicador,
      v_indicado_nome || ' assinou o Prime Anual! No Prime, você teria ganho +' || v_pontos_indicador || ' pts.'
    );

    UPDATE referrals SET
      prime_anual_ativado = TRUE,
      prime_anual_ativado_em = NOW(),
      prime_anual_pontos_creditados = FALSE
    WHERE id = v_referral.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Bônus de boas-vindas creditado. Indicador é Free - bônus de indicação não creditado.',
      'pontos_boas_vindas', v_pontos_boas_vindas,
      'liberar_em', v_liberar_em,
      'indicador_plano', 'free'
    );
  END IF;

  -- Indicador é PRIME - criar pontos bloqueados
  v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicador_prime'), 3000);
  v_pontos_indicado := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicado'), 1000);

  -- Creditar indicador (bloqueado) COM NOTIFICAÇÃO
  PERFORM creditar_pontos_bloqueados(
    v_referral.referrer_id,
    v_pontos_indicador,
    'Bônus Prime Anual: ' || v_indicado_nome,
    v_liberar_em,
    v_referral.id,
    p_subscription_id,
    v_indicado_nome || ' virou Prime! 🎉',
    '+' || v_pontos_indicador || ' pts para você · liberam em ' || v_liberar_str,
    'crown'
  );

  -- Creditar indicado extra (bloqueado) COM NOTIFICAÇÃO
  PERFORM creditar_pontos_bloqueados(
    v_referral.referred_id,
    v_pontos_indicado,
    'Bônus: você assinou o Prime Anual',
    v_liberar_em,
    v_referral.id,
    p_subscription_id,
    '+' || v_pontos_indicado || ' pts por entrar indicado',
    'Bônus extra por ser indicado · liberam em ' || v_liberar_str,
    'gift'
  );

  -- Marcar referral
  UPDATE referrals SET
    prime_anual_ativado = TRUE,
    prime_anual_ativado_em = NOW(),
    prime_anual_pontos_creditados = FALSE
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pontos bloqueados por ' || v_dias_pendente || ' dias',
    'liberar_em', v_liberar_em,
    'pontos_boas_vindas', v_pontos_boas_vindas,
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado
  );
END;
$$;

-- 6. ATUALIZAR liberar_pontos_pendentes COM NOTIFICAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION liberar_pontos_pendentes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
  v_count INTEGER := 0;
  v_total_liberado INTEGER := 0;
  v_user_totals RECORD;
BEGIN
  -- Agrupar por usuário para enviar uma única notificação
  FOR v_user_totals IN
    SELECT user_id, SUM(pontos) as total_pontos
    FROM pending_points
    WHERE status = 'pendente'
    AND liberar_em <= NOW()
    GROUP BY user_id
  LOOP
    -- Desbloquear os pontos
    PERFORM set_config('app.internal_credit', 'true', true);

    UPDATE profiles SET
      pontos_bloqueados = GREATEST(0, pontos_bloqueados - v_user_totals.total_pontos),
      updated_at = NOW()
    WHERE id = v_user_totals.user_id;

    PERFORM set_config('app.internal_credit', 'false', true);

    -- Enviar notificação única por usuário
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (
        v_user_totals.user_id,
        'points',
        '🔓 ' || v_user_totals.total_pontos || ' pts liberados!',
        'Seus pontos foram liberados. Já pode usar nas experiências!',
        'unlock'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  -- Marcar todos como liberados
  UPDATE pending_points SET
    status = 'liberado',
    liberado_em = NOW()
  WHERE status = 'pendente'
  AND liberar_em <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- 7. ATUALIZAR approve_referral COM NOTIFICAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION approve_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_referral RECORD;
  v_plano TEXT;
  v_pontos INTEGER;
  v_result JSONB;
  v_referred_name TEXT;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- LOCK para evitar race conditions
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.id = p_referral_id
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  v_referred_name := v_referral.referred_name;

  IF v_referral.status = 'approved' THEN
    RETURN jsonb_build_object(
      'success', true,
      'points_awarded', v_referral.points_awarded,
      'referrer_id', v_referral.referrer_id,
      'message', 'Pontos já creditados anteriormente'
    );
  END IF;

  IF v_referral.status = 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi rejeitada. Use "Reabrir" primeiro.');
  END IF;

  -- Buscar plano do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free') INTO v_plano;

  -- Buscar pontos do plano
  IF v_plano = 'prime' THEN
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_indicacao_prime';
    v_pontos := COALESCE(v_pontos, 5000);
  ELSE
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_indicacao_free';
    v_pontos := COALESCE(v_pontos, 3000);
  END IF;

  -- Creditar pontos COM NOTIFICAÇÃO
  SELECT creditar_pontos_central(
    v_referral.referrer_id,
    v_pontos,
    'referral',
    'Indicação aprovada: ' || v_referred_name,
    'referral',
    'Indicação aprovada! 🎉',
    v_referred_name || ' · +' || v_pontos || ' pts para você',
    'users'
  ) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', v_result->>'error');
  END IF;

  -- Atualizar indicação
  UPDATE referrals SET
    status = 'approved',
    points_awarded = v_pontos,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Atualizar contador no profile do indicador
  UPDATE profiles SET
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_pontos,
    'referrer_id', v_referral.referrer_id,
    'new_balance', (v_result->>'balance_after')::INTEGER
  );
END;
$$;

-- 8. FUNÇÃO: Buscar pontos bloqueados detalhados
-- ============================================

CREATE OR REPLACE FUNCTION get_blocked_points_details(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_bloqueado INTEGER,
  proxima_liberacao TIMESTAMPTZ,
  proxima_liberacao_str TEXT,
  detalhes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    COALESCE(SUM(pp.pontos)::INTEGER, 0) as total_bloqueado,
    MIN(pp.liberar_em) as proxima_liberacao,
    TO_CHAR(MIN(pp.liberar_em), 'DD/MM') as proxima_liberacao_str,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'pontos', pp.pontos,
          'motivo', pp.motivo,
          'liberar_em', pp.liberar_em,
          'liberar_str', TO_CHAR(pp.liberar_em, 'DD/MM')
        ) ORDER BY pp.liberar_em
      ) FILTER (WHERE pp.id IS NOT NULL),
      '[]'::JSONB
    ) as detalhes
  FROM pending_points pp
  WHERE pp.user_id = v_user_id
  AND pp.status = 'pendente'
  AND pp.creditado_no_saldo = TRUE;
END;
$$;

-- 9. CONCLUÍDO
-- ============================================
-- Migração 120 aplicada com sucesso.
