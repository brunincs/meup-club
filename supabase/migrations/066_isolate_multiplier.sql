-- ============================================================================
-- 066: ISOLA O MULTIPLICADOR - SÓ VIAGEM, NUNCA OUTROS TIPOS
-- ============================================================================
-- BUG: multiplicador de viagem (1.5x) estava vazando para indicação
-- EVIDÊNCIA: Pedro Prime recebeu 4.500 pts (3000 × 1.5) ao invés de 5.000 fixo
--
-- DOIS MECANISMOS DISTINTOS (NUNCA MISTURAR):
--
-- MECANISMO 1 - MULTIPLICADOR (SÓ VIAGEM):
--   pontos = valor_base × multiplicador_do_plano
--   multiplicador > 1 APENAS se plano=prime E ciclo=anual (1.5x)
--   Aplica-se EXCLUSIVAMENTE a type='credit' (viagem)
--
-- MECANISMO 2 - VALOR FIXO (INDICAÇÃO, ANIVERSÁRIO, CHECK-IN):
--   pontos = valor_da_plano_config × quantidade
--   SEM multiplicador, NUNCA
--   Free: indicação=3000, aniversário=0, checkin=10
--   Prime: indicação=5000, aniversário=5000, checkin=30
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: admin_credit_points - MULTIPLICADOR ISOLADO A VIAGEM
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

  -- Buscar dados do usuário
  SELECT name, COALESCE(points, 0) INTO v_user_name, v_current_points
  FROM public.profiles
  WHERE id = p_user_id;

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
  -- p_type = 'credit' → aplica multiplicador se Prime Anual
  -- =============================================
  IF p_type = 'credit' THEN
    IF p_amount > 0 AND v_benefits.multiplicador_viagem > 1.0 THEN
      -- ÚNICO lugar onde multiplicador é aplicado
      v_final_amount := ROUND(p_amount * v_benefits.multiplicador_viagem)::INTEGER;
      v_final_reason := p_reason || ' · Prime ' ||
        CASE v_benefits.ciclo WHEN 'anual' THEN 'Anual' ELSE 'Mensal' END ||
        ' ' || v_benefits.multiplicador_viagem || 'x = ' || v_final_amount || ' pts';
    ELSE
      v_final_amount := p_amount;
    END IF;

  -- =============================================
  -- MECANISMO 2: INDICAÇÃO (VALOR FIXO, SEM MULTIPLICADOR)
  -- p_type = 'referral' → p_amount = número de indicações
  -- Multiplica pelo valor FIXO do plano (Free: 3000, Prime: 5000)
  -- =============================================
  ELSIF p_type = 'referral' THEN
    -- NUNCA aplica multiplicador aqui
    v_final_amount := p_amount * v_benefits.pontos_indicacao;
    IF v_benefits.plano = 'prime' THEN
      v_final_reason := p_reason || ' · Prime (' || v_benefits.pontos_indicacao || ' pts/ind)';
    ELSE
      v_final_reason := p_reason;
    END IF;

  -- =============================================
  -- MECANISMO 2: ANIVERSÁRIO (VALOR FIXO, SEM MULTIPLICADOR)
  -- p_type = 'birthday' → valor fixo do plano
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
  -- MECANISMO 2: CHECK-IN/TAREFA (VALOR FIXO, SEM MULTIPLICADOR)
  -- p_type = 'task' → valor do plano se p_amount=1
  -- =============================================
  ELSIF p_type = 'task' THEN
    IF p_amount = 1 THEN
      v_final_amount := v_benefits.pontos_checkin;
    ELSE
      v_final_amount := p_amount;
    END IF;

  -- =============================================
  -- DÉBITO OU AJUSTE MANUAL (PASSA DIRETO)
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
    p_type, v_final_reason
  )
  RETURNING id INTO v_transaction_id;

  -- =============================================
  -- NOTIFICAÇÃO (acessório)
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

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: get_credit_preview - Preview TAMBÉM isolado
-- ══════════════════════════════════════════════════════════════════════════════

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
  v_unit_value INTEGER;
BEGIN
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

  -- Defaults
  v_multiplier := 1.0;
  v_unit_value := p_base_amount;
  v_final_amount := p_base_amount;

  -- MECANISMO 1: VIAGEM (COM MULTIPLICADOR)
  IF p_type = 'credit' THEN
    IF p_base_amount > 0 AND v_benefits.multiplicador_viagem > 1.0 THEN
      v_multiplier := v_benefits.multiplicador_viagem;
      v_final_amount := ROUND(p_base_amount * v_multiplier)::INTEGER;
    END IF;

  -- MECANISMO 2: INDICAÇÃO (VALOR FIXO)
  ELSIF p_type = 'referral' THEN
    v_unit_value := v_benefits.pontos_indicacao;
    v_final_amount := p_base_amount * v_benefits.pontos_indicacao;
    -- Multiplier fica 1.0, NUNCA muda

  -- MECANISMO 2: ANIVERSÁRIO (VALOR FIXO)
  ELSIF p_type = 'birthday' THEN
    v_unit_value := v_benefits.pontos_aniversario;
    v_final_amount := v_benefits.pontos_aniversario;

  -- MECANISMO 2: CHECK-IN (VALOR FIXO)
  ELSIF p_type = 'task' THEN
    v_unit_value := v_benefits.pontos_checkin;
    v_final_amount := v_benefits.pontos_checkin;
  END IF;

  RETURN jsonb_build_object(
    'plano', v_benefits.plano,
    'ciclo', v_benefits.ciclo,
    'is_prime', v_benefits.is_prime,
    'type', p_type,
    'base_amount', p_base_amount,
    'unit_value', v_unit_value,
    'multiplier', v_multiplier,
    'final_amount', v_final_amount,
    'has_bonus', (v_benefits.plano = 'prime'),
    'pontos_indicacao', v_benefits.pontos_indicacao,
    'pontos_checkin', v_benefits.pontos_checkin,
    'pontos_aniversario', v_benefits.pontos_aniversario
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_credit_preview(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_points(UUID, INTEGER, TEXT, TEXT) TO authenticated;
