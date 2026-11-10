-- =============================================
-- MIGRAÇÃO 083: UNIFICAR TIPOS DE TRANSAÇÃO
--
-- Lista unificada de tipos permitidos:
-- - credit: crédito genérico (check-in, ajuste positivo)
-- - debit: débito genérico (ajuste negativo)
-- - referral: indicação aprovada (bônus pro indicador)
-- - welcome_referral: bônus de boas-vindas (indicado)
-- - task: missão/tarefa concluída
-- - redemption: resgate de experiência
-- - emissao: emissão de viagem aprovada
-- - birthday: bônus de aniversário
-- - estorno: reversão de transação anterior
-- =============================================

-- =============================================
-- 1. ATUALIZAR TRIGGER validate_transaction_input
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_transaction_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sanitizar reason
  IF NEW.reason IS NOT NULL THEN
    NEW.reason := LEFT(public.sanitize_text(NEW.reason), 500);
  END IF;

  -- Validar amount
  IF NEW.amount = 0 THEN
    RAISE EXCEPTION 'Valor da transação não pode ser zero';
  END IF;

  -- LISTA UNIFICADA DE TIPOS PERMITIDOS
  IF NEW.type NOT IN (
    'credit',           -- Crédito genérico (check-in, ajuste)
    'debit',            -- Débito genérico (ajuste)
    'referral',         -- Indicação aprovada
    'welcome_referral', -- Bônus boas-vindas (indicado)
    'task',             -- Missão concluída
    'redemption',       -- Resgate
    'emissao',          -- Emissão aprovada
    'birthday',         -- Aniversário
    'estorno'           -- Reversão
  ) THEN
    RAISE EXCEPTION 'Tipo de transação inválido: %', NEW.type;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- 2. ATUALIZAR CHECK CONSTRAINT
-- =============================================
ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'credit',
    'debit',
    'referral',
    'welcome_referral',
    'task',
    'redemption',
    'emissao',
    'birthday',
    'estorno'
  ));

-- =============================================
-- 3. MIGRAR TIPOS ANTIGOS (se existirem)
-- =============================================
UPDATE point_transactions SET type = 'referral' WHERE type = 'referral_aprovada';
UPDATE point_transactions SET type = 'emissao' WHERE type = 'emissao_aprovada';
UPDATE point_transactions SET type = 'credit' WHERE type = 'adjustment';

-- =============================================
-- 4. ATUALIZAR approve_referral PARA USAR 'referral'
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

  -- BUSCAR INDICAÇÃO
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
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
    'referral',  -- TIPO CORRETO
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
    'referrer_id', v_referral.referrer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao aprovar indicação: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 5. ATUALIZAR estornar_transacao PARA USAR 'estorno'
-- =============================================
CREATE OR REPLACE FUNCTION public.estornar_transacao(
  p_transaction_id UUID,
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
  v_transaction RECORD;
  v_new_balance INTEGER;
  v_estorno_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem estornar transações');
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  -- Buscar transação original COM LOCK
  SELECT * INTO v_transaction
  FROM public.point_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transação não encontrada');
  END IF;

  IF v_transaction.estornado THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta transação já foi estornada');
  END IF;

  -- Verificar saldo (estorno inverte o sinal)
  SELECT COALESCE(points, 0) INTO v_new_balance
  FROM profiles WHERE id = v_transaction.user_id;

  IF v_new_balance - v_transaction.amount < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente para estorno. Saldo atual: ' || v_new_balance
    );
  END IF;

  -- Criar transação de estorno (tipo 'estorno')
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after, estorno_de, estorno_motivo
  ) VALUES (
    v_transaction.user_id,
    -v_transaction.amount,
    'estorno',
    'Estorno: ' || p_motivo,
    v_new_balance,
    v_new_balance - v_transaction.amount,
    p_transaction_id,
    p_motivo
  ) RETURNING id INTO v_estorno_id;

  -- Atualizar saldo
  UPDATE profiles
  SET points = v_new_balance - v_transaction.amount, updated_at = NOW()
  WHERE id = v_transaction.user_id;

  -- Marcar transação original como estornada
  UPDATE point_transactions
  SET estornado = true, estornado_em = NOW()
  WHERE id = p_transaction_id;

  -- Audit log
  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id, 'admin', 'estornar_transacao', 'point_transaction', p_transaction_id::TEXT,
    jsonb_build_object('amount', v_transaction.amount, 'type', v_transaction.type),
    jsonb_build_object('estornado', true, 'estorno_id', v_estorno_id),
    jsonb_build_object('motivo', p_motivo)
  );

  RETURN jsonb_build_object(
    'success', true,
    'estorno_id', v_estorno_id,
    'amount_estornado', v_transaction.amount,
    'new_balance', v_new_balance - v_transaction.amount
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 6. ATUALIZAR aprovar_emissao PARA USAR 'emissao'
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
BEGIN
  -- Buscar emissão COM LOCK
  SELECT * INTO v_emissao FROM emissoes WHERE id = p_emissao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status <> 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão já foi processada');
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
    'emissao',  -- TIPO CORRETO
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
    'plano', v_plano
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 7. ATUALIZAR creditar_aniversario PARA USAR 'birthday'
-- (já usa 'birthday', apenas garantir consistência)
-- =============================================

-- =============================================
-- 8. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 083: Tipos de transação unificados';
  RAISE NOTICE '  Tipos permitidos: credit, debit, referral, welcome_referral, task, redemption, emissao, birthday, estorno';
END $$;
