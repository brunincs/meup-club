-- ============================================
-- MIGRAÇÃO 171: Check-in por DIA DE CALENDÁRIO
-- Reset à meia-noite em America/Sao_Paulo
-- ============================================

-- =============================================
-- PARTE 1: Função fazer_checkin (reset por dia)
-- =============================================

DROP FUNCTION IF EXISTS public.fazer_checkin();

CREATE OR REPLACE FUNCTION public.fazer_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pontos INTEGER;
  v_hoje DATE;
  v_ja_fez_hoje BOOLEAN;
  v_ultimo_checkin DATE;
  v_streak INTEGER;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- SEMPRE usar auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar pontos da config
  SELECT COALESCE((value #>> '{}')::integer, 50) INTO v_pontos
  FROM public.config
  WHERE key = 'PONTOS_CHECKIN';

  IF v_pontos IS NULL THEN
    v_pontos := 50;
  END IF;

  -- Data de HOJE no fuso America/Sao_Paulo
  v_hoje := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Verificar se já fez check-in HOJE (por data, não timestamp)
  SELECT
    EXISTS (
      SELECT 1 FROM public.checkins
      WHERE user_id = v_user_id
        AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_hoje
    ),
    (
      SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE
      FROM public.checkins
      WHERE user_id = v_user_id
      ORDER BY created_at DESC
      LIMIT 1
    )
  INTO v_ja_fez_hoje, v_ultimo_checkin;

  -- Se já fez check-in HOJE, bloquear
  IF v_ja_fez_hoje THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_in',
      'message', 'Você já fez check-in hoje. Volte amanhã!'
    );
  END IF;

  -- Calcular streak (dias consecutivos)
  IF v_ultimo_checkin IS NULL THEN
    v_streak := 1;
  ELSIF v_ultimo_checkin = v_hoje - 1 THEN
    -- Ontem = continua streak
    SELECT COALESCE(
      (SELECT streak FROM public.checkins
       WHERE user_id = v_user_id
       ORDER BY created_at DESC LIMIT 1), 0
    ) + 1 INTO v_streak;
  ELSE
    -- Quebrou streak
    v_streak := 1;
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- ATOMICIDADE: Tudo abaixo é uma transação única
  -- ═══════════════════════════════════════════════════════════

  -- PASSO 1: Buscar saldo atual
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_balance_before IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'profile_not_found',
      'message', 'Perfil não encontrado'
    );
  END IF;

  v_balance_after := v_balance_before + v_pontos;

  -- PASSO 2: CREDITAR pontos
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- PASSO 3: Registrar transação
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after
  ) VALUES (
    v_user_id, v_pontos, 'task', 'Check-in diário', v_balance_before, v_balance_after
  );

  -- PASSO 4: Registrar check-in com streak
  INSERT INTO public.checkins (user_id, pontos, streak)
  VALUES (v_user_id, v_pontos, v_streak);

  -- PASSO 5: Notificação
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon)
    VALUES (
      v_user_id,
      'checkin',
      'Check-in realizado!',
      'Você ganhou ' || v_pontos || ' pontos pelo check-in diário!' ||
        CASE WHEN v_streak > 1 THEN ' (Sequência: ' || v_streak || ' dias)' ELSE '' END,
      'calendar'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Sucesso
  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'streak', v_streak,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );

END;
$$;

-- =============================================
-- PARTE 2: Função pode_fazer_checkin (por dia)
-- =============================================

DROP FUNCTION IF EXISTS public.pode_fazer_checkin();

CREATE OR REPLACE FUNCTION public.pode_fazer_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_hoje DATE;
  v_ja_fez_hoje BOOLEAN;
  v_ultimo_checkin TIMESTAMPTZ;
  v_streak INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('pode_fazer', false, 'error', 'Não autenticado');
  END IF;

  -- Data de HOJE no fuso America/Sao_Paulo
  v_hoje := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Verificar se já fez check-in HOJE e buscar último
  SELECT
    EXISTS (
      SELECT 1 FROM public.checkins
      WHERE user_id = v_user_id
        AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_hoje
    ),
    (SELECT created_at FROM public.checkins WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 1),
    COALESCE((SELECT streak FROM public.checkins WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 1), 0)
  INTO v_ja_fez_hoje, v_ultimo_checkin, v_streak;

  RETURN jsonb_build_object(
    'pode_fazer', NOT v_ja_fez_hoje,
    'ultimo_checkin', v_ultimo_checkin,
    'streak', v_streak
  );
END;
$$;

-- =============================================
-- PARTE 3: Adicionar coluna streak se não existir
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checkins' AND column_name = 'streak'
  ) THEN
    ALTER TABLE checkins ADD COLUMN streak INTEGER DEFAULT 1;
  END IF;
END $$;

-- =============================================
-- PARTE 4: Índice para busca por data
-- =============================================

-- Índice simples no user_id e created_at (a conversão de timezone é feita na query)
CREATE INDEX IF NOT EXISTS idx_checkins_user_created ON checkins (user_id, created_at DESC);

-- =============================================
-- PARTE 5: Permissões
-- =============================================

GRANT EXECUTE ON FUNCTION public.fazer_checkin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_fazer_checkin() TO authenticated;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION public.fazer_checkin IS
'Check-in diário que reseta à meia-noite em America/Sao_Paulo.
- Usa data (não timestamp de 24h)
- Unique por user_id + data
- Calcula streak de dias consecutivos';

COMMENT ON FUNCTION public.pode_fazer_checkin IS
'Verifica se usuário pode fazer check-in hoje (data em America/Sao_Paulo).
Retorna streak atual.';
