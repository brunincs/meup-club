-- ============================================
-- MIGRAÇÃO 129: Corrigir colunas em creditar_pontos_central
-- PROBLEMA: Usava colunas inexistentes (points, description, direction)
-- CORRETO: amount, reason, balance_before, balance_after
-- ============================================

-- Dropar e recriar com colunas corretas
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.creditar_pontos_central(
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
  v_is_credit BOOLEAN;
BEGIN
  -- Determinar se é crédito ou débito baseado na categoria
  v_is_credit := p_category IN ('credit', 'bonus', 'referral', 'emissao', 'mission', 'checkin', 'aniversario');

  -- Buscar saldo atual
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM profiles WHERE id = p_user_id;

  -- Calcular novo saldo
  IF v_is_credit THEN
    v_balance_after := v_balance_before + p_amount;
  ELSE
    v_balance_after := v_balance_before - p_amount;
  END IF;

  -- Atualizar saldo do perfil
  IF v_is_credit THEN
    UPDATE profiles
    SET points = v_balance_after,
        total_points_earned = total_points_earned + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET points = v_balance_after,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Registrar transação com colunas corretas
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (p_user_id, p_amount, p_type, p_reason, v_balance_before, v_balance_after)
  RETURNING id INTO v_transaction_id;

  -- Criar notificação se solicitado
  IF p_notificacao_titulo IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, icon, read)
    VALUES (
      p_user_id,
      p_type,
      p_notificacao_titulo,
      COALESCE(p_notificacao_mensagem, p_reason),
      p_notificacao_icon,
      FALSE
    );
  END IF;

  -- Verificar e atualizar level
  PERFORM verificar_e_atualizar_level(p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_balance_after,
    'amount', p_amount,
    'is_credit', v_is_credit
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
