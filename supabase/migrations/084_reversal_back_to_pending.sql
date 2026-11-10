-- =============================================
-- MIGRAÇÃO 084: REVERSÃO VOLTA PARA PENDENTE
--
-- COMPORTAMENTO NOVO:
-- - Indicações/Emissões: reverter → estorna pontos + volta pra PENDENTE
-- - Campo "revertida_anteriormente" com motivo para selo visual
-- - Re-aprovação permitida (credita novamente pelo plano atual)
-- - Resgates: mantém status "revertido" (não volta pra pendente)
-- =============================================

-- =============================================
-- 1. ADICIONAR COLUNAS DE HISTÓRICO DE REVERSÃO
-- =============================================

-- Referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS revertida_anteriormente BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revertida_motivo TEXT,
  ADD COLUMN IF NOT EXISTS revertida_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revertida_por UUID REFERENCES profiles(id);

-- Emissoes
ALTER TABLE public.emissoes
  ADD COLUMN IF NOT EXISTS revertida_anteriormente BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revertida_motivo TEXT,
  ADD COLUMN IF NOT EXISTS revertida_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revertida_por UUID REFERENCES profiles(id);

-- =============================================
-- 2. MIGRAR DADOS EXISTENTES (status=reverted → pending)
-- =============================================
UPDATE public.referrals
SET status = 'pending',
    revertida_anteriormente = TRUE,
    revertida_motivo = 'Migração: reversão anterior',
    revertida_em = updated_at
WHERE status = 'reverted';

UPDATE public.emissoes
SET status = 'pendente',
    revertida_anteriormente = TRUE,
    revertida_motivo = 'Migração: reversão anterior',
    revertida_em = updated_at
WHERE status = 'revertida';

-- =============================================
-- 3. ATUALIZAR reverter_aprovacao_indicacao
-- Status volta para PENDENTE (não 'reverted')
-- =============================================
CREATE OR REPLACE FUNCTION public.reverter_aprovacao_indicacao(
  p_referral_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_referral RECORD;
  v_transaction RECORD;
  v_estorno_result JSONB;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem reverter aprovações');
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  -- Buscar indicação
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas indicações aprovadas podem ser revertidas');
  END IF;

  -- Buscar transação de crédito relacionada (NÃO estornada)
  SELECT * INTO v_transaction
  FROM public.point_transactions
  WHERE user_id = v_referral.referrer_id
    AND type IN ('referral', 'referral_aprovada')
    AND reason LIKE '%Indicação%'
    AND created_at >= v_referral.processed_at - INTERVAL '1 minute'
    AND created_at <= v_referral.processed_at + INTERVAL '1 minute'
    AND estornado = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Estornar a transação
    v_estorno_result := public.estornar_transacao(v_transaction.id, p_motivo);

    IF NOT (v_estorno_result->>'success')::boolean THEN
      RETURN v_estorno_result;
    END IF;
  END IF;

  -- =============================================
  -- NOVO: Volta para PENDENTE com flag de reversão
  -- =============================================
  UPDATE public.referrals
  SET status = 'pending',  -- VOLTA PARA PENDENTE
      revertida_anteriormente = TRUE,
      revertida_motivo = p_motivo,
      revertida_em = NOW(),
      revertida_por = v_admin_id,
      processed_by = NULL,
      processed_at = NULL,
      points_awarded = NULL,
      updated_at = NOW()
  WHERE id = p_referral_id;

  -- Decrementar contador de indicações
  UPDATE public.profiles
  SET total_referrals = GREATEST(0, COALESCE(total_referrals, 0) - 1),
      updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  -- Audit log
  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id, 'admin', 'reverter_indicacao', 'referral', p_referral_id::TEXT,
    jsonb_build_object('status', 'approved', 'points_awarded', v_referral.points_awarded),
    jsonb_build_object('status', 'pending', 'revertida_anteriormente', true),
    jsonb_build_object('motivo', p_motivo, 'estorno_result', v_estorno_result)
  );

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', p_referral_id,
    'new_status', 'pending',
    'points_estornados', v_referral.points_awarded,
    'estorno_result', v_estorno_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 4. ATUALIZAR reverter_aprovacao_emissao
-- Status volta para PENDENTE
-- =============================================
CREATE OR REPLACE FUNCTION public.reverter_aprovacao_emissao(
  p_emissao_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_emissao RECORD;
  v_transaction RECORD;
  v_estorno_result JSONB;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem reverter aprovações');
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  SELECT * INTO v_emissao FROM public.emissoes WHERE id = p_emissao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status != 'aprovada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas emissões aprovadas podem ser revertidas');
  END IF;

  -- Buscar transação relacionada
  SELECT * INTO v_transaction
  FROM public.point_transactions
  WHERE user_id = v_emissao.user_id
    AND type IN ('credit', 'emissao_aprovada', 'emissao')
    AND (reason LIKE '%Emissão aprovada%' OR reason LIKE '%Viagem aprovada%')
    AND created_at >= v_emissao.processed_at - INTERVAL '1 minute'
    AND created_at <= v_emissao.processed_at + INTERVAL '1 minute'
    AND estornado = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_estorno_result := public.estornar_transacao(v_transaction.id, p_motivo);
    IF NOT (v_estorno_result->>'success')::boolean THEN
      RETURN v_estorno_result;
    END IF;
  END IF;

  -- =============================================
  -- NOVO: Volta para PENDENTE com flag de reversão
  -- =============================================
  UPDATE public.emissoes
  SET status = 'pendente',  -- VOLTA PARA PENDENTE
      revertida_anteriormente = TRUE,
      revertida_motivo = p_motivo,
      revertida_em = NOW(),
      revertida_por = v_admin_id,
      admin_id = NULL,
      processed_at = NULL,
      pontos_creditados = NULL,
      updated_at = NOW()
  WHERE id = p_emissao_id;

  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id, 'admin', 'reverter_emissao', 'emissao', p_emissao_id::TEXT,
    jsonb_build_object('status', 'aprovada', 'pontos_creditados', v_emissao.pontos_creditados),
    jsonb_build_object('status', 'pendente', 'revertida_anteriormente', true),
    jsonb_build_object('motivo', p_motivo)
  );

  RETURN jsonb_build_object(
    'success', true,
    'emissao_id', p_emissao_id,
    'new_status', 'pendente',
    'points_estornados', v_emissao.pontos_creditados
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 5. ATUALIZAR approve_referral PARA RE-APROVAÇÃO
-- Permite re-aprovar indicação que foi revertida
-- Busca transação não-estornada para evitar duplo crédito
-- =============================================
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
  v_referrer_plano TEXT := 'free';
  v_points INTEGER;
  v_credit_result JSONB;
  v_existing_credit RECORD;
BEGIN
  -- VERIFICAÇÃO DE ADMIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem aprovar indicações');
  END IF;

  -- BUSCAR INDICAÇÃO COM LOCK
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  -- Só permitir aprovar se status = pending
  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada (status: ' || v_referral.status || ')');
  END IF;

  -- =============================================
  -- TRAVA ANTI-DUPLO-CRÉDITO:
  -- Verifica se já existe crédito NÃO-ESTORNADO para esta indicação
  -- Se a transação anterior foi estornada, permite novo crédito
  -- =============================================
  SELECT * INTO v_existing_credit
  FROM public.point_transactions
  WHERE user_id = v_referral.referrer_id
    AND type IN ('referral', 'referral_aprovada')
    AND reason LIKE '%' || COALESCE((SELECT name FROM profiles WHERE id = v_referral.referred_id), '') || '%'
    AND estornado = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Já existe crédito ativo para esta indicação. Se foi erro, estorne primeiro.'
    );
  END IF;

  -- BUSCAR PLANO ATUAL DO INDICADOR
  v_referrer_plano := plano_efetivo(v_referral.referrer_id);

  -- BUSCAR PONTOS DO PLANO NA CONFIG
  SELECT pc.pontos_indicacao INTO v_points
  FROM plano_config pc
  WHERE pc.plano::TEXT = v_referrer_plano;

  IF v_points IS NULL THEN
    v_points := CASE WHEN v_referrer_plano = 'prime' THEN 5000 ELSE 3000 END;
  END IF;

  -- CREDITAR PONTOS (tipo 'referral')
  v_credit_result := creditar_pontos_central(
    v_referral.referrer_id,
    v_points,
    'referral',
    'Indicação aprovada: ' || COALESCE((SELECT name FROM profiles WHERE id = v_referral.referred_id), 'usuário'),
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_credit_result->>'error'
    );
  END IF;

  -- ATUALIZAR INDICAÇÃO
  UPDATE public.referrals SET
    status = 'approved',
    points_awarded = v_points,
    processed_by = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Incrementar contador de indicações do indicador
  UPDATE public.profiles SET
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  -- VERIFICAR MISSÕES DE INDICAÇÃO
  PERFORM verificar_missoes_indicacao(v_referral.referrer_id);

  -- NOTIFICAÇÃO
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_referral.referrer_id,
      'referral_approved',
      'Indicação aprovada!',
      'Você ganhou ' || v_points::TEXT || ' pontos pela sua indicação!',
      'users'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'referrer_plano', v_referrer_plano,
    'new_balance', (v_credit_result->>'balance_after')::integer,
    'referrer_id', v_referral.referrer_id,
    're_aprovacao', v_referral.revertida_anteriormente
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao aprovar indicação: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 6. ATUALIZAR aprovar_emissao PARA RE-APROVAÇÃO
-- =============================================
CREATE OR REPLACE FUNCTION public.aprovar_emissao(
  p_emissao_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissao RECORD;
  v_pontos INTEGER;
  v_plano TEXT;
  v_ciclo TEXT;
  v_multiplicador NUMERIC;
  v_credit_result JSONB;
  v_existing_credit RECORD;
BEGIN
  -- Buscar emissão COM LOCK
  SELECT * INTO v_emissao FROM emissoes WHERE id = p_emissao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status <> 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão já foi processada');
  END IF;

  -- =============================================
  -- TRAVA ANTI-DUPLO-CRÉDITO
  -- =============================================
  SELECT * INTO v_existing_credit
  FROM public.point_transactions
  WHERE user_id = v_emissao.user_id
    AND type IN ('emissao', 'emissao_aprovada', 'credit')
    AND (reason LIKE '%R$ ' || v_emissao.valor::TEXT || '%' OR reason LIKE '%' || v_emissao.valor::INTEGER::TEXT || '%')
    AND estornado = FALSE
    AND created_at > v_emissao.created_at - INTERVAL '1 day'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Já existe crédito ativo para esta emissão. Se foi erro, estorne primeiro.'
    );
  END IF;

  -- Buscar plano do usuário
  v_plano := plano_efetivo(v_emissao.user_id);

  -- Buscar ciclo da assinatura (para multiplicador)
  SELECT s.ciclo::TEXT INTO v_ciclo
  FROM subscriptions s
  WHERE s.user_id = v_emissao.user_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Buscar multiplicador do plano
  SELECT
    CASE
      WHEN pc.multiplicador_viagem_so_anual AND v_ciclo <> 'anual' THEN 1.0
      ELSE pc.multiplicador_viagem
    END INTO v_multiplicador
  FROM plano_config pc
  WHERE pc.plano::TEXT = v_plano;

  v_multiplicador := COALESCE(v_multiplicador, 1.0);

  -- Calcular pontos (R$1 = 1 ponto base)
  v_pontos := FLOOR(v_emissao.valor * v_multiplicador);

  -- Creditar pontos (tipo 'emissao')
  v_credit_result := creditar_pontos_central(
    v_emissao.user_id,
    v_pontos,
    'emissao',
    'Viagem aprovada: R$ ' || v_emissao.valor::TEXT,
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN v_credit_result;
  END IF;

  -- Atualizar emissão
  UPDATE emissoes SET
    status = 'aprovada',
    pontos_creditados = v_pontos,
    multiplicador_aplicado = v_multiplicador,
    admin_id = p_admin_id,
    processed_at = NOW()
  WHERE id = p_emissao_id;

  -- Notificação
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_emissao.user_id,
      'points_earned',
      'Viagem aprovada!',
      'Você ganhou ' || v_pontos || ' pontos pela sua viagem!',
      'plane'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'multiplicador', v_multiplicador,
    'plano', v_plano,
    're_aprovacao', v_emissao.revertida_anteriormente
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 7. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 084: Reversão volta para Pendente';
  RAISE NOTICE '  - Indicações/Emissões revertidas voltam para pendente';
  RAISE NOTICE '  - Campo revertida_anteriormente para selo visual';
  RAISE NOTICE '  - Re-aprovação permitida (pelo plano atual)';
  RAISE NOTICE '  - Trava anti-duplo-crédito considera estornos';
  RAISE NOTICE '  - Resgates mantêm status revertido';
END $$;
