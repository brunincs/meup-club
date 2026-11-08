-- ============================================================================
-- 061: Motor do Sistema de Assinaturas
-- ============================================================================
-- Atualiza as funções de crédito para lerem o plano do usuário
-- e aplicarem os valores corretos da plano_config.
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: calculate_travel_points - Aplica multiplicador de viagem
-- ══════════════════════════════════════════════════════════════════════════════
-- IMPORTANTE: Multiplicador só se aplica a VIAGEM, não a indicação/aniversário/checkin

CREATE OR REPLACE FUNCTION public.calculate_travel_points(
  p_user_id UUID,
  p_base_points INTEGER
)
RETURNS TABLE (
  base_points INTEGER,
  multiplicador DECIMAL(3,2),
  final_points INTEGER,
  plano subscription_plano,
  ciclo subscription_ciclo
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_benefits RECORD;
BEGIN
  -- Buscar benefícios do usuário
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

  RETURN QUERY SELECT
    p_base_points as base_points,
    v_benefits.multiplicador_viagem as multiplicador,
    ROUND(p_base_points * v_benefits.multiplicador_viagem)::INTEGER as final_points,
    v_benefits.plano,
    v_benefits.ciclo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_travel_points(UUID, INTEGER) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- ATUALIZAR: perform_checkin - Lê pontos_checkin do plano
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.perform_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_last_checkin timestamp with time zone;
  v_pontos integer;
  v_balance_before integer;
  v_balance_after integer;
  v_benefits RECORD;
BEGIN
  -- Obter user_id do token JWT
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Buscar benefícios do plano do usuário
  SELECT * INTO v_benefits FROM public.get_user_benefits(v_user_id);

  -- Usar pontos de check-in do plano (Free: 10, Prime: 30)
  v_pontos := COALESCE(v_benefits.pontos_checkin, 10);

  -- Buscar último check-in da tabela checkins
  SELECT created_at INTO v_last_checkin
  FROM public.checkins
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Verificar se pode fazer check-in (24h desde o último)
  IF v_last_checkin IS NOT NULL AND
     v_last_checkin > (now() - interval '24 hours') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já fez check-in hoje',
      'proximo_checkin', (v_last_checkin + interval '24 hours')
    );
  END IF;

  -- Obter saldo atual com lock
  SELECT points INTO v_balance_before
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  v_balance_after := COALESCE(v_balance_before, 0) + v_pontos;

  -- Atualizar perfil (pontos)
  UPDATE public.profiles
  SET points = v_balance_after,
      updated_at = now()
  WHERE id = v_user_id;

  -- Registrar check-in
  INSERT INTO public.checkins (user_id)
  VALUES (v_user_id);

  -- Registrar transação
  INSERT INTO public.point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (v_user_id, v_pontos, 'task', 'Check-in Diário', v_balance_before, v_balance_after);

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'points',
    'Check-in realizado!',
    'Você ganhou ' || v_pontos || ' pontos pelo check-in diário!',
    jsonb_build_object('points', v_pontos, 'type', 'checkin', 'plano', v_benefits.plano)
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'balance_after', v_balance_after,
    'proximo_checkin', (now() + interval '24 hours'),
    'plano', v_benefits.plano
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- ATUALIZAR: approve_referral - Lê pontos_indicacao do plano do INDICADOR
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.approve_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_referral RECORD;
  v_points INTEGER;
  v_current_points INTEGER;
  v_new_balance INTEGER;
  v_benefits RECORD;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE ADMIN
  -- =============================================
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem aprovar indicações');
  END IF;
  -- =============================================

  -- Buscar a indicação
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- =============================================
  -- BUSCAR PONTOS DO PLANO DO INDICADOR (não do indicado!)
  -- =============================================
  SELECT * INTO v_benefits FROM public.get_user_benefits(v_referral.referrer_id);

  -- Usar pontos de indicação do plano (Free: 3000, Prime: 5000)
  v_points := COALESCE(v_benefits.pontos_indicacao, 3000);

  -- Buscar saldo atual do indicador (para balance_before/after)
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_referral.referrer_id;

  v_new_balance := v_current_points + v_points;

  -- Atualizar indicação para aprovada
  UPDATE public.referrals SET
    status = 'approved',
    points_awarded = v_points,
    processed_by = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Creditar pontos ao indicador
  UPDATE public.profiles SET
    points = v_new_balance,
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  -- Registrar no histórico de transações (com balance)
  INSERT INTO public.point_transactions (
    user_id,
    admin_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason,
    reference_id
  ) VALUES (
    v_referral.referrer_id,
    v_admin_id,
    v_points,
    v_current_points,
    v_new_balance,
    'referral',
    'Indicação aprovada (' || v_benefits.plano || ')',
    p_referral_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'new_balance', v_new_balance,
    'referrer_id', v_referral.referrer_id,
    'plano_indicador', v_benefits.plano
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao aprovar indicação: ' || SQLERRM
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: credit_travel_points - Para créditos de viagem (com multiplicador)
-- ══════════════════════════════════════════════════════════════════════════════
-- Esta função será chamada pelo admin ao creditar pontos de viagem
-- Aplica multiplicador automaticamente se o usuário for Prime Anual

CREATE OR REPLACE FUNCTION public.credit_travel_points(
  p_user_id UUID,
  p_base_points INTEGER,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_benefits RECORD;
  v_final_points INTEGER;
  v_current_points INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem creditar pontos');
  END IF;

  -- Buscar benefícios e calcular multiplicador
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

  -- Aplicar multiplicador (1.0 ou 1.5 se Prime Anual)
  v_final_points := ROUND(p_base_points * v_benefits.multiplicador_viagem)::INTEGER;

  -- Buscar saldo atual
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  v_new_balance := v_current_points + v_final_points;

  -- Atualizar pontos
  UPDATE public.profiles
  SET points = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (
    user_id,
    admin_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason
  ) VALUES (
    p_user_id,
    v_admin_id,
    v_final_points,
    v_current_points,
    v_new_balance,
    'credit',
    p_reason || CASE
      WHEN v_benefits.multiplicador_viagem > 1.0 THEN
        ' (Prime ' || v_benefits.multiplicador_viagem || 'x)'
      ELSE ''
    END
  );

  -- Notificar usuário
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'points',
    'Pontos creditados!',
    'Você ganhou ' || v_final_points || ' pontos: ' || p_reason,
    jsonb_build_object(
      'points', v_final_points,
      'base_points', p_base_points,
      'multiplicador', v_benefits.multiplicador_viagem,
      'plano', v_benefits.plano
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'base_points', p_base_points,
    'multiplicador', v_benefits.multiplicador_viagem,
    'final_points', v_final_points,
    'balance_after', v_new_balance,
    'plano', v_benefits.plano,
    'ciclo', v_benefits.ciclo
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao creditar pontos: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_travel_points(UUID, INTEGER, TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: should_auto_credit - Verifica se crédito deve ser automático
-- ══════════════════════════════════════════════════════════════════════════════
-- Prime = auto, Free = manual (pedido + aprovação)

CREATE OR REPLACE FUNCTION public.should_auto_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_benefits RECORD;
BEGIN
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);
  RETURN v_benefits.lancamento_modo = 'auto';
END;
$$;

GRANT EXECUTE ON FUNCTION public.should_auto_credit(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION public.calculate_travel_points IS
'Calcula pontos de viagem com multiplicador baseado no plano do usuário.
Prime Anual: 1.5x | Outros: 1.0x';

COMMENT ON FUNCTION public.credit_travel_points IS
'Credita pontos de viagem aplicando multiplicador automaticamente.
Somente admin. Registra transação e notifica usuário.';

COMMENT ON FUNCTION public.should_auto_credit IS
'Verifica se créditos devem ser automáticos (Prime) ou manuais (Free).';
