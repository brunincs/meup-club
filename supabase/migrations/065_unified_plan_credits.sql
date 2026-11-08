-- ============================================================================
-- 065: Unifica TODOS os créditos para lerem o plano do usuário
-- ============================================================================
-- BUG: admin_credit_points() ignorava plano para indicação
-- BUG: frontend usava PONTOS_POR_INDICACAO hardcoded (3000)
-- FIX: Backend lê plano_config para TODOS os tipos de crédito
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: get_credit_preview - Retorna valores corretos para QUALQUER tipo
-- ══════════════════════════════════════════════════════════════════════════════
-- Agora retorna valores do plano para: viagem, indicacao, checkin, aniversario

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
  v_unit_value INTEGER;  -- Valor por unidade (por indicação, por checkin, etc)
BEGIN
  -- Buscar benefícios do usuário
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

  v_multiplier := 1.0;
  v_unit_value := p_base_amount;

  -- Calcular valor final baseado no tipo
  CASE p_type
    WHEN 'credit' THEN
      -- Viagem: aplica multiplicador (1.5x para Prime Anual)
      IF p_base_amount > 0 AND v_benefits.multiplicador_viagem > 1.0 THEN
        v_multiplier := v_benefits.multiplicador_viagem;
      END IF;
      v_final_amount := ROUND(p_base_amount * v_multiplier)::INTEGER;

    WHEN 'referral' THEN
      -- Indicação: p_base_amount = número de indicações
      -- Multiplica pelo valor do plano (Free: 3000, Prime: 5000)
      v_unit_value := v_benefits.pontos_indicacao;
      v_final_amount := p_base_amount * v_benefits.pontos_indicacao;

    WHEN 'task' THEN
      -- Check-in e tarefas: valor do plano
      v_unit_value := v_benefits.pontos_checkin;
      v_final_amount := v_benefits.pontos_checkin;

    WHEN 'birthday' THEN
      -- Aniversário: valor do plano (Free: 0, Prime: 5000)
      v_unit_value := v_benefits.pontos_aniversario;
      v_final_amount := v_benefits.pontos_aniversario;

    ELSE
      -- Ajuste manual ou outro: passa direto
      v_final_amount := p_base_amount;
  END CASE;

  RETURN jsonb_build_object(
    'plano', v_benefits.plano,
    'ciclo', v_benefits.ciclo,
    'is_prime', v_benefits.is_prime,
    'base_amount', p_base_amount,
    'unit_value', v_unit_value,
    'multiplier', v_multiplier,
    'final_amount', v_final_amount,
    'has_bonus', (v_benefits.plano = 'prime'),
    -- Valores específicos do plano para referência
    'pontos_indicacao', v_benefits.pontos_indicacao,
    'pontos_checkin', v_benefits.pontos_checkin,
    'pontos_aniversario', v_benefits.pontos_aniversario
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: admin_credit_points - Agora lê plano para TODOS os tipos
-- ══════════════════════════════════════════════════════════════════════════════

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
  v_unit_value INTEGER;
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

  -- Buscar dados do usuário
  SELECT name, COALESCE(points, 0) INTO v_user_name, v_current_points
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- =============================================
  -- BUSCAR BENEFÍCIOS DO PLANO DO USUÁRIO
  -- =============================================
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

  v_multiplier := 1.0;
  v_final_amount := p_amount;
  v_final_reason := p_reason;
  v_unit_value := p_amount;

  -- =============================================
  -- CALCULAR VALOR FINAL BASEADO NO TIPO
  -- =============================================
  CASE p_type
    WHEN 'credit' THEN
      -- VIAGEM: aplica multiplicador (1.5x para Prime Anual)
      IF p_amount > 0 AND v_benefits.multiplicador_viagem > 1.0 THEN
        v_multiplier := v_benefits.multiplicador_viagem;
        v_final_amount := ROUND(p_amount * v_multiplier)::INTEGER;
        v_final_reason := p_reason || ' · Prime ' ||
          CASE v_benefits.ciclo WHEN 'anual' THEN 'Anual' ELSE 'Mensal' END ||
          ' ' || v_multiplier || 'x = ' || v_final_amount || ' pts';
      END IF;

    WHEN 'referral' THEN
      -- INDICAÇÃO: p_amount = número de indicações
      -- Multiplica pelo valor do plano (Free: 3000, Prime: 5000)
      v_unit_value := v_benefits.pontos_indicacao;
      v_final_amount := p_amount * v_benefits.pontos_indicacao;
      v_final_reason := p_reason ||
        CASE WHEN v_benefits.plano = 'prime'
          THEN ' · Prime (' || v_benefits.pontos_indicacao || ' pts/ind)'
          ELSE ''
        END;

    WHEN 'birthday' THEN
      -- ANIVERSÁRIO: valor fixo do plano (Free: 0, Prime: 5000)
      v_unit_value := v_benefits.pontos_aniversario;
      v_final_amount := v_benefits.pontos_aniversario;
      IF v_final_amount = 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Plano Free não tem bônus de aniversário'
        );
      END IF;
      v_final_reason := 'Bônus de Aniversário · Prime';

    WHEN 'task' THEN
      -- CHECK-IN/TAREFAS: usa valor do plano se não especificado
      -- (normalmente o checkin é via perform_checkin, mas admin pode ajustar)
      IF p_amount = 1 THEN
        -- Se passou 1, usa o valor do plano
        v_unit_value := v_benefits.pontos_checkin;
        v_final_amount := v_benefits.pontos_checkin;
      END IF;
      -- Se passou outro valor, usa direto (ajuste manual)

    ELSE
      -- Ajuste manual ou debit: passa direto
      v_final_amount := p_amount;
  END CASE;

  -- =============================================
  -- CALCULAR NOVO SALDO
  -- =============================================
  v_new_balance := v_current_points + v_final_amount;

  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente para débito');
  END IF;

  -- =============================================
  -- ATUALIZAR PONTOS
  -- =============================================
  UPDATE public.profiles
  SET points = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  -- =============================================
  -- REGISTRAR TRANSAÇÃO
  -- =============================================
  INSERT INTO public.point_transactions (
    user_id, admin_id, amount, balance_before, balance_after, type, reason
  ) VALUES (
    p_user_id, v_admin_id, v_final_amount, v_current_points, v_new_balance,
    COALESCE(p_type, 'credit'), v_final_reason
  )
  RETURNING id INTO v_transaction_id;

  -- =============================================
  -- NOTIFICAÇÃO (acessório, não falha a transação)
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
      jsonb_build_object(
        'points', v_final_amount,
        'base_amount', p_amount,
        'unit_value', v_unit_value,
        'plano', v_benefits.plano
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'user_name', v_user_name,
    'base_amount', p_amount,
    'unit_value', v_unit_value,
    'multiplier', v_multiplier,
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
    'error', 'Erro ao processar transação'
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- GRANT
-- ══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.get_credit_preview(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_points(UUID, INTEGER, TEXT, TEXT) TO authenticated;
