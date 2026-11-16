-- ============================================
-- MIGRAÇÃO 183: Idempotência no bônus de boas-vindas Prime
-- Corrige a CAUSA do bônus duplicado (não mexe nos saldos)
-- ============================================

-- Adicionar coluna para rastrear se boas-vindas já foi dado
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS boas_vindas_creditado BOOLEAN DEFAULT FALSE;

-- Marcar assinaturas existentes que já receberam boas-vindas
UPDATE subscriptions s SET boas_vindas_creditado = TRUE
WHERE s.ciclo = 'anual'
AND s.status = 'active'
AND EXISTS (
  SELECT 1 FROM point_transactions pt
  WHERE pt.user_id = s.user_id
  AND pt.reason ILIKE '%boas-vindas%prime%'
);

-- Atualizar função com idempotência
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
  v_pontos_boas_vindas INTEGER := 2000;
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

  -- Usar carência do Prime (padrão 7 dias)
  v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  -- IDEMPOTÊNCIA: Verificar se já creditou boas-vindas para ESTA assinatura
  v_boas_vindas_ja_dado := COALESCE(v_subscription.boas_vindas_creditado, FALSE);

  IF NOT v_boas_vindas_ja_dado THEN
    -- PONTOS DE BOAS-VINDAS para o assinante (BLOQUEADOS)
    PERFORM creditar_pontos_bloqueados(
      v_subscription.user_id,
      v_pontos_boas_vindas,
      'Bônus de boas-vindas Prime Anual',
      v_liberar_em,
      NULL,
      p_subscription_id
    );

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
                      ELSE 'Bônus de boas-vindas creditado (bloqueado ' || v_dias_pendente || ' dias)' END,
      'pontos_boas_vindas', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_boas_vindas END,
      'liberar_em', v_liberar_em,
      'ja_creditado', v_boas_vindas_ja_dado
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Pontos do indicado (igual para todos)
  v_pontos_indicado := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicado'), 1000);

  -- Free ou Prime ganha pontos de indicação
  IF v_indicador_plano = 'free' THEN
    v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'indicacao_prime_bonus_free'), 2000);
  ELSE
    v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'indicacao_prime_bonus_prime'), 3000);
  END IF;

  -- Creditar indicador (bloqueado por 7 dias)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referrer_id,
    v_pontos_indicador,
    'Indicação: ' || v_indicado_nome || ' virou Prime',
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  -- Creditar indicado extra (bloqueado por 7 dias)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referred_id,
    v_pontos_indicado,
    'Bônus: você assinou o Prime Anual',
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  -- Marcar referral
  UPDATE referrals SET
    prime_anual_ativado = TRUE,
    prime_anual_ativado_em = NOW(),
    prime_anual_pontos_creditados = FALSE -- Ainda bloqueados
  WHERE id = v_referral.id;

  -- Notificar indicador
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_referral.referrer_id,
    'referral_signup',
    'Seu amigo virou Prime!',
    v_indicado_nome || ' assinou o Prime Anual. +' || v_pontos_indicador || ' pts (liberam em ' || v_dias_pendente || ' dias).',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pontos bloqueados por ' || v_dias_pendente || ' dias',
    'liberar_em', v_liberar_em,
    'pontos_boas_vindas', CASE WHEN v_boas_vindas_ja_dado THEN 0 ELSE v_pontos_boas_vindas END,
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado,
    'indicador_plano', v_indicador_plano,
    'boas_vindas_ja_creditado', v_boas_vindas_ja_dado
  );
END;
$$;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM subscriptions WHERE boas_vindas_creditado = TRUE;

  RAISE NOTICE '======================================';
  RAISE NOTICE 'Assinaturas marcadas com boas_vindas_creditado: %', v_count;
  RAISE NOTICE 'Próximas chamadas a admin_confirmar_prime_anual não darão duplicado.';
  RAISE NOTICE '======================================';
END $$;
