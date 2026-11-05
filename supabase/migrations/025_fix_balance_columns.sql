-- ============================================
-- CORREÇÃO: BALANCE_BEFORE E BALANCE_AFTER
-- As funções precisam fornecer esses valores
-- ============================================

-- ============================================
-- 1. CORRIGIR FUNÇÃO fazer_checkin
-- ============================================

CREATE OR REPLACE FUNCTION public.fazer_checkin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ultimo_checkin TIMESTAMPTZ;
  v_pode_fazer BOOLEAN;
  v_pontos INTEGER := 50;
  v_proximo_checkin TIMESTAMPTZ;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Buscar último check-in do usuário
  SELECT created_at INTO v_ultimo_checkin
  FROM public.checkins
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Verificar se pode fazer (nunca fez OU faz mais de 24h)
  IF v_ultimo_checkin IS NULL THEN
    v_pode_fazer := true;
  ELSE
    v_pode_fazer := (NOW() - v_ultimo_checkin) >= INTERVAL '24 hours';
    v_proximo_checkin := v_ultimo_checkin + INTERVAL '24 hours';
  END IF;

  IF NOT v_pode_fazer THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ja_fez_hoje',
      'proximo_checkin', v_proximo_checkin,
      'horas_restantes', EXTRACT(EPOCH FROM (v_proximo_checkin - NOW())) / 3600
    );
  END IF;

  -- Buscar saldo atual ANTES de creditar
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calcular saldo DEPOIS
  v_balance_after := v_balance_before + v_pontos;

  -- Registrar check-in
  INSERT INTO public.checkins (user_id, pontos)
  VALUES (p_user_id, v_pontos);

  -- Creditar pontos
  UPDATE public.profiles
  SET points = v_balance_after
  WHERE id = p_user_id;

  -- Registrar transação COM balance_before e balance_after
  INSERT INTO public.point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (p_user_id, v_pontos, 'task', 'Check-in diario', v_balance_before, v_balance_after);

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    p_user_id,
    'points_earned',
    'Check-in realizado!',
    'Voce ganhou ' || v_pontos || ' pontos pelo check-in diario!',
    'sparkles',
    jsonb_build_object('amount', v_pontos, 'type', 'checkin')
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'proximo_checkin', NOW() + INTERVAL '24 hours'
  );
END;
$$;

-- ============================================
-- 2. CORRIGIR FUNÇÃO creditar_missao_automatica
-- ============================================

CREATE OR REPLACE FUNCTION public.creditar_missao_automatica(
  p_user_id UUID,
  p_missao_tipo TEXT,
  p_pontos INTEGER,
  p_descricao TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Tentar inserir (falhará se já existe devido ao UNIQUE)
  INSERT INTO public.missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, p_missao_tipo, p_pontos)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  -- Se não inseriu (já existia), retorna false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Buscar saldo atual ANTES de creditar
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calcular saldo DEPOIS
  v_balance_after := v_balance_before + p_pontos;

  -- Creditar pontos
  UPDATE public.profiles
  SET points = v_balance_after
  WHERE id = p_user_id;

  -- Registrar transação COM balance_before e balance_after
  INSERT INTO public.point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (p_user_id, p_pontos, 'task', p_descricao, v_balance_before, v_balance_after);

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    p_user_id,
    'points_earned',
    'Missao concluida!',
    'Voce ganhou ' || p_pontos || ' pontos: ' || p_descricao,
    'target',
    jsonb_build_object('amount', p_pontos, 'missao', p_missao_tipo)
  );

  RETURN true;
END;
$$;

-- ============================================
-- COMENTÁRIOS ATUALIZADOS
-- ============================================

COMMENT ON FUNCTION public.fazer_checkin IS
'Faz check-in diario. Retorna erro se ja fez nas ultimas 24h.
PONTOS: 50. Inclui balance_before e balance_after na transação.';

COMMENT ON FUNCTION public.creditar_missao_automatica IS
'Credita pontos de missao automatica UMA VEZ SO por usuario.
Usa tabela missoes_automaticas_concluidas para evitar duplicatas.
Inclui balance_before e balance_after na transação.';
