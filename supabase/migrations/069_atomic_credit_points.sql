-- ============================================================================
-- 069: ATOMIC CREDIT POINTS - PREVENT RACE CONDITIONS
-- ============================================================================
-- BUG: admin_credit_points() could create duplicate transactions with same
--      balance_before/after when two requests hit simultaneously
-- FIX: Use SELECT ... FOR UPDATE to lock the user row during transaction
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
  v_final_reason TEXT;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE ADMIN
  -- =============================================
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

  -- =============================================
  -- VALIDAÇÕES
  -- =============================================
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não informado');
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade não pode ser zero');
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  -- =============================================
  -- LOCK ATÔMICO: Buscar dados do usuário COM LOCK
  -- FOR UPDATE garante que nenhuma outra transação
  -- pode ler/modificar esta linha até o COMMIT
  -- =============================================
  SELECT name, COALESCE(points, 0)
  INTO v_user_name, v_current_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;  -- <<< LOCK CRÍTICO

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- =============================================
  -- BUSCAR BENEFÍCIOS DO PLANO
  -- =============================================
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

  -- Valores padrão (será sobrescrito abaixo)
  v_final_amount := p_amount;
  v_final_reason := p_reason;

  -- =============================================
  -- MECANISMO 1: VIAGEM (COM MULTIPLICADOR)
  -- =============================================
  IF p_type = 'credit' THEN
    IF p_amount > 0 AND v_benefits.multiplicador_viagem > 1.0 THEN
      v_final_amount := ROUND(p_amount * v_benefits.multiplicador_viagem)::INTEGER;
      v_final_reason := p_reason || ' · Prime ' ||
        CASE v_benefits.ciclo WHEN 'anual' THEN 'Anual' ELSE 'Mensal' END ||
        ' ' || v_benefits.multiplicador_viagem || 'x = ' || v_final_amount || ' pts';
    ELSE
      v_final_amount := p_amount;
    END IF;

  -- =============================================
  -- MECANISMO 2: INDICAÇÃO (VALOR FIXO)
  -- =============================================
  ELSIF p_type = 'referral' THEN
    v_final_amount := p_amount * v_benefits.pontos_indicacao;
    IF v_benefits.plano = 'prime' THEN
      v_final_reason := p_reason || ' · Prime (' || v_benefits.pontos_indicacao || ' pts/ind)';
    ELSE
      v_final_reason := p_reason;
    END IF;

  -- =============================================
  -- MECANISMO 2: ANIVERSÁRIO (VALOR FIXO)
  -- =============================================
  ELSIF p_type = 'birthday' THEN
    v_final_amount := v_benefits.pontos_aniversario;
    IF v_final_amount = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Plano Free não tem bônus de aniversário'
      );
    END IF;
    v_final_reason := 'Bônus de Aniversário · Prime';

  -- =============================================
  -- MECANISMO 2: CHECK-IN/TAREFA (VALOR FIXO)
  -- =============================================
  ELSIF p_type = 'task' THEN
    IF p_amount = 1 THEN
      v_final_amount := v_benefits.pontos_checkin;
    ELSE
      v_final_amount := p_amount;
    END IF;

  -- =============================================
  -- DÉBITO OU AJUSTE MANUAL
  -- =============================================
  ELSE
    v_final_amount := p_amount;
  END IF;

  -- =============================================
  -- CALCULAR NOVO SALDO
  -- =============================================
  v_new_balance := v_current_points + v_final_amount;

  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente para débito');
  END IF;

  -- =============================================
  -- OPERAÇÃO ATÔMICA: UPDATE + INSERT
  -- Ambos dentro da mesma transação com lock
  -- =============================================
  UPDATE public.profiles
  SET points = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.point_transactions (
    user_id, admin_id, amount, balance_before, balance_after, type, reason
  ) VALUES (
    p_user_id, v_admin_id, v_final_amount, v_current_points, v_new_balance,
    p_type, v_final_reason
  )
  RETURNING id INTO v_transaction_id;

  -- =============================================
  -- NOTIFICAÇÃO (não crítica, em bloco separado)
  -- =============================================
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      'points',
      CASE p_type
        WHEN 'referral' THEN 'Indicação creditada!'
        WHEN 'birthday' THEN 'Feliz Aniversário! 🎂'
        WHEN 'credit' THEN 'Pontos de viagem!'
        ELSE 'Pontos creditados!'
      END,
      'Você ganhou ' || v_final_amount || ' pontos',
      CASE p_type
        WHEN 'referral' THEN '👥'
        WHEN 'birthday' THEN '🎂'
        WHEN 'credit' THEN '✈️'
        ELSE '⭐'
      END,
      jsonb_build_object('points', v_final_amount, 'plano', v_benefits.plano)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'user_name', v_user_name,
    'type', p_type,
    'base_amount', p_amount,
    'final_amount', v_final_amount,
    'balance_before', v_current_points,
    'balance_after', v_new_balance,
    'reason', v_final_reason,
    'plano', v_benefits.plano,
    'ciclo', v_benefits.ciclo
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao processar transação: ' || SQLERRM
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.admin_credit_points(UUID, INTEGER, TEXT, TEXT) TO authenticated;
