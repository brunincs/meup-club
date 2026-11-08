-- ============================================================================
-- 064: Corrige multiplicador de viagem no admin_credit_points
-- ============================================================================
-- BUG: admin_credit_points NÃO aplicava multiplicador Prime
-- FIX: Unificar num só caminho - todo crédito tipo 'credit' (viagem) aplica mult
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_credit_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_type TEXT DEFAULT 'credit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_user_name TEXT;
  v_current_points INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_benefits RECORD;
  v_final_amount INTEGER;
  v_multiplier DECIMAL(3,2);
  v_final_reason TEXT;
BEGIN
  -- Verificar autenticação
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Verificar se é admin
  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem creditar pontos');
  END IF;

  -- Validar parâmetros
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não informado');
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade não pode ser zero');
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  -- Buscar dados do usuário
  SELECT name, COALESCE(points, 0) INTO v_user_name, v_current_points
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- =============================================
  -- APLICAR MULTIPLICADOR PARA VIAGEM (type = 'credit')
  -- =============================================
  -- Multiplicador SÓ se aplica a viagem (credit), NUNCA a:
  -- - referral (indicação)
  -- - task (check-in, missões)
  -- - debit
  -- - redemption
  -- =============================================

  v_multiplier := 1.0;
  v_final_amount := p_amount;
  v_final_reason := p_reason;

  IF p_type = 'credit' AND p_amount > 0 THEN
    -- Buscar benefícios do plano do usuário
    SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

    -- Aplicar multiplicador se Prime Anual (1.5x)
    IF v_benefits.multiplicador_viagem > 1.0 THEN
      v_multiplier := v_benefits.multiplicador_viagem;
      v_final_amount := ROUND(p_amount * v_multiplier)::INTEGER;

      -- Registrar cálculo no motivo para auditoria
      v_final_reason := p_reason || ' · Prime ' ||
        CASE v_benefits.ciclo WHEN 'anual' THEN 'Anual' ELSE 'Mensal' END ||
        ' ' || v_multiplier || 'x = ' || v_final_amount || ' pts';
    END IF;
  END IF;

  -- Calcular novo saldo
  v_new_balance := v_current_points + v_final_amount;

  -- Não permitir saldo negativo
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente para débito');
  END IF;

  -- Atualizar pontos
  UPDATE public.profiles
  SET points = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação com valor FINAL (já multiplicado)
  INSERT INTO public.point_transactions (
    user_id, admin_id, amount, balance_before, balance_after, type, reason
  ) VALUES (
    p_user_id, v_admin_id, v_final_amount, v_current_points, v_new_balance,
    COALESCE(p_type, 'credit'), v_final_reason
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'user_name', v_user_name,
    'base_amount', p_amount,
    'multiplier', v_multiplier,
    'final_amount', v_final_amount,
    'balance_before', v_current_points,
    'balance_after', v_new_balance,
    'reason', v_final_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao processar transação'
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: get_credit_preview - Preview para o admin antes de confirmar
-- ══════════════════════════════════════════════════════════════════════════════
-- Usada pelo frontend para mostrar o valor correto no modal

CREATE OR REPLACE FUNCTION public.get_credit_preview(
  p_user_id UUID,
  p_base_amount INTEGER,
  p_type TEXT DEFAULT 'credit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_benefits RECORD;
  v_multiplier DECIMAL(3,2);
  v_final_amount INTEGER;
BEGIN
  -- Buscar benefícios do usuário
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

  v_multiplier := 1.0;
  v_final_amount := p_base_amount;

  -- Aplicar multiplicador SÓ para viagem (credit) e valor positivo
  IF p_type = 'credit' AND p_base_amount > 0 AND v_benefits.multiplicador_viagem > 1.0 THEN
    v_multiplier := v_benefits.multiplicador_viagem;
    v_final_amount := ROUND(p_base_amount * v_multiplier)::INTEGER;
  END IF;

  RETURN jsonb_build_object(
    'plano', v_benefits.plano,
    'ciclo', v_benefits.ciclo,
    'is_prime', v_benefits.is_prime,
    'base_amount', p_base_amount,
    'multiplier', v_multiplier,
    'final_amount', v_final_amount,
    'has_bonus', v_multiplier > 1.0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_credit_preview(UUID, INTEGER, TEXT) TO authenticated;
