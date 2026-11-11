-- ============================================
-- MIGRAÇÃO 109: Correção completa do sistema de aprovação de indicações
-- ============================================

-- 1. ESTENDER creditar_pontos_central COM reference_id OPCIONAL
-- ============================================
CREATE OR REPLACE FUNCTION public.creditar_pontos_central(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL
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
BEGIN
  -- Validações básicas
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id é obrigatório');
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount deve ser diferente de zero');
  END IF;

  -- Buscar saldo atual COM LOCK
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance_before IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Calcular novo saldo
  v_balance_after := v_balance_before + p_amount;

  IF v_balance_after < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente. Saldo atual: ' || v_balance_before
    );
  END IF;

  -- UPDATE ATÔMICO
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação COM reference_id
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after, reference_id, is_active
  ) VALUES (
    p_user_id, p_amount, p_type, p_reason, v_balance_before, v_balance_after, 
    p_reference_id::TEXT, TRUE
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. FUNÇÃO APPROVE_REFERRAL CORRIGIDA
-- ============================================
CREATE OR REPLACE FUNCTION approve_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_referrer_plano TEXT := 'free';
  v_points INTEGER;
  v_result JSONB;
  v_referred_name TEXT;
BEGIN
  -- Buscar referral
  SELECT r.*, p.name as referrer_name
  INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referrer_id
  WHERE r.id = p_referral_id;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- Buscar nome do indicado
  SELECT name INTO v_referred_name FROM profiles WHERE id = v_referral.referred_id;

  -- Verificar se já existe crédito ativo para esta indicação
  IF EXISTS (
    SELECT 1 FROM point_transactions 
    WHERE reference_id = p_referral_id::TEXT
    AND type = 'referral'
    AND is_active = TRUE
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Já existe crédito ativo para esta indicação.'
    );
  END IF;

  -- BUSCAR PLANO ATUAL DO INDICADOR
  v_referrer_plano := COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free');

  -- BUSCAR PONTOS DO CONFIG (chave/valor)
  IF v_referrer_plano = 'prime' THEN
    SELECT valor INTO v_points FROM plano_config WHERE chave = 'emissao_indicador_prime';
    v_points := COALESCE(v_points, 5000);
  ELSE
    SELECT valor INTO v_points FROM plano_config WHERE chave = 'emissao_indicador_free';
    v_points := COALESCE(v_points, 3000);
  END IF;

  -- Creditar pontos ao indicador
  SELECT creditar_pontos_central(
    v_referral.referrer_id,
    v_points,
    'referral',
    'Indicação aprovada: ' || COALESCE(v_referred_name, 'cliente'),
    p_referral_id
  ) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  -- Atualizar status da indicação
  UPDATE referrals SET 
    status = 'approved',
    approved_at = NOW(),
    pontos_creditados = v_points,
    plano_no_credito = v_referrer_plano
  WHERE id = p_referral_id;

  -- Criar notificação para indicador
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_referral.referrer_id,
    'referral_signup',
    'Indicação aprovada! 🎉',
    'Você ganhou +' || v_points || ' pontos pela indicação de ' || COALESCE(v_referred_name, 'um amigo') || '!',
    jsonb_build_object('pontos', v_points, 'indicado', v_referred_name, 'plano', v_referrer_plano)
  );

  -- Verificar missão primeira indicação
  IF NOT EXISTS (
    SELECT 1 FROM user_missions um
    JOIN missions m ON m.id = um.mission_id
    WHERE um.user_id = v_referral.referrer_id
    AND m.slug = 'primeira-indicacao'
    AND um.completed = TRUE
  ) THEN
    PERFORM complete_mission(v_referral.referrer_id, 'primeira-indicacao');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'plano', v_referrer_plano,
    'referrer_name', v_referral.referrer_name
  );
END;
$$;

-- 3. GARANTIR QUE is_active EXISTE EM point_transactions
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'point_transactions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;
