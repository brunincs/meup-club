-- ============================================
-- MIGRAÇÃO 128: Remover duplicatas de creditar_pontos_central
-- PROBLEMA: Múltiplas versões da função (public. e sem prefixo)
-- ============================================

-- Dropar todas as versões existentes
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS creditar_pontos_central(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Recriar versão única e definitiva
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
  v_new_balance INTEGER;
  v_direction TEXT;
  v_transaction_id UUID;
BEGIN
  -- Determinar direção baseado na categoria
  v_direction := CASE
    WHEN p_category IN ('credit', 'bonus', 'referral', 'emissao', 'mission', 'checkin', 'aniversario') THEN 'credit'
    WHEN p_category IN ('debit', 'redemption', 'estorno') THEN 'debit'
    ELSE p_category
  END;

  -- Atualizar saldo
  IF v_direction = 'credit' THEN
    UPDATE profiles
    SET points = points + p_amount,
        total_points_earned = total_points_earned + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING points INTO v_new_balance;
  ELSE
    UPDATE profiles
    SET points = points - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING points INTO v_new_balance;
  END IF;

  -- Registrar transação
  INSERT INTO point_transactions (user_id, points, type, description, direction)
  VALUES (p_user_id, p_amount, p_type, p_reason, v_direction)
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
    'new_balance', v_new_balance,
    'amount', p_amount,
    'direction', v_direction
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
