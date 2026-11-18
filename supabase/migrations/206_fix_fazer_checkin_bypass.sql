-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 206: Corrigir fazer_checkin para usar creditar_pontos_interno
-- ══════════════════════════════════════════════════════════════════════════════
-- O problema: fazer_checkin faz UPDATE direto em profiles.points
-- Mas o trigger protect_sensitive_profile_fields bloqueia isso
-- Solução: usar creditar_pontos_interno() que seta a flag app.internal_credit
-- ══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS fazer_checkin();

CREATE OR REPLACE FUNCTION fazer_checkin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_plano TEXT;
  v_pontos INTEGER;
  v_hoje DATE;
  v_ja_fez_hoje BOOLEAN;
  v_ultimo_checkin DATE;
  v_streak INTEGER;
  v_credit_result JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar plano do usuário
  SELECT COALESCE(
    (SELECT s.plano::TEXT FROM subscriptions s WHERE s.user_id = v_user_id AND s.status = 'active'),
    'free'
  ) INTO v_plano;

  -- Buscar pontos da plano_config baseado no plano
  IF v_plano = 'prime' THEN
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_checkin_prime';
    v_pontos := COALESCE(v_pontos, 30);
  ELSE
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_checkin_free';
    v_pontos := COALESCE(v_pontos, 10);
  END IF;

  -- Data de HOJE no fuso America/Sao_Paulo
  v_hoje := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Verificar se já fez check-in HOJE (por data, não timestamp)
  SELECT
    EXISTS (
      SELECT 1 FROM checkins
      WHERE user_id = v_user_id
        AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_hoje
    ),
    (
      SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE
      FROM checkins
      WHERE user_id = v_user_id
      ORDER BY created_at DESC
      LIMIT 1
    )
  INTO v_ja_fez_hoje, v_ultimo_checkin;

  IF v_ja_fez_hoje THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_in',
      'message', 'Você já fez check-in hoje. Volte amanhã!'
    );
  END IF;

  -- Calcular streak (apenas informativo, SEM bônus de pontos)
  IF v_ultimo_checkin IS NULL THEN
    v_streak := 1;
  ELSIF v_ultimo_checkin = v_hoje - 1 THEN
    SELECT COALESCE(
      (SELECT streak FROM checkins WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 1), 0
    ) + 1 INTO v_streak;
  ELSE
    v_streak := 1;
  END IF;

  -- ════════════════════════════════════════════════════════════════════════════
  -- CORREÇÃO: Usar creditar_pontos_interno() em vez de UPDATE direto
  -- Isso seta a flag app.internal_credit que permite bypass do trigger
  -- ════════════════════════════════════════════════════════════════════════════
  v_credit_result := public.creditar_pontos_interno(
    v_user_id,
    v_pontos,
    'task',
    'Check-in diário'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'credit_failed',
      'message', COALESCE(v_credit_result->>'error', 'Erro ao creditar pontos')
    );
  END IF;

  -- Registrar check-in
  INSERT INTO checkins (user_id, pontos, streak)
  VALUES (v_user_id, v_pontos, v_streak);

  -- Notificação (sem mencionar streak)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_user_id,
      'checkin',
      'Check-in feito!',
      'Você ganhou +' || v_pontos || ' pontos!',
      'calendar'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'plano', v_plano,
    'streak', v_streak,
    'balance_after', (v_credit_result->>'balance_after')::integer
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.fazer_checkin TO authenticated;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

-- Log
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 206: fazer_checkin corrigido para usar creditar_pontos_interno';
END $$;
