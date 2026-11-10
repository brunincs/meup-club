-- =============================================
-- MIGRAÇÃO 081: SISTEMA DE REVERSÃO ADMIN
--
-- PRINCÍPIO: Estorno NUNCA apaga transação.
-- Estorno = lançamento negativo com motivo.
-- O original fica no extrato marcado "estornado".
-- Extrato = saldo.
--
-- A) REABRIR REJEIÇÕES (não mexe em saldo)
-- B) ESTORNAR APROVAÇÕES (lançamento negativo)
-- =============================================

-- =============================================
-- 1. ADICIONAR COLUNAS DE ESTORNO EM point_transactions
-- =============================================
ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS estornado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS estornado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estorno_de UUID REFERENCES point_transactions(id),
  ADD COLUMN IF NOT EXISTS estorno_motivo TEXT;

-- Índice para buscar transações estornadas
CREATE INDEX IF NOT EXISTS idx_point_transactions_estornado
  ON point_transactions(estornado) WHERE estornado = TRUE;

-- =============================================
-- 2. ATUALIZAR CONSTRAINT DE TIPO
-- Adicionar 'estorno' como tipo válido
-- =============================================
ALTER TABLE public.point_transactions DROP CONSTRAINT IF EXISTS point_transactions_type_check;
ALTER TABLE public.point_transactions ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN ('credit', 'debit', 'redemption', 'referral', 'task', 'welcome_referral', 'estorno', 'referral_aprovada', 'emissao_aprovada'));

-- =============================================
-- 3. CRIAR creditar_pontos_central (wrapper)
-- Função central que recebe tipo customizado
-- =============================================
CREATE OR REPLACE FUNCTION public.creditar_pontos_central(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_category TEXT DEFAULT 'credit'
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

  -- UPDATE ATÔMICO (SECURITY DEFINER bypassa o trigger de proteção)
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after
  ) VALUES (
    p_user_id, p_amount, p_type, p_reason, v_balance_before, v_balance_after
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

-- =============================================
-- 4. ESTORNAR TRANSAÇÃO
-- Cria lançamento negativo, marca original como estornado
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
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_estorno_id UUID;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE ADMIN
  -- =============================================
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem estornar');
  END IF;

  -- =============================================
  -- VALIDAR MOTIVO
  -- =============================================
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  -- =============================================
  -- BUSCAR TRANSAÇÃO ORIGINAL COM LOCK
  -- =============================================
  SELECT * INTO v_transaction
  FROM public.point_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transação não encontrada');
  END IF;

  -- =============================================
  -- VERIFICAR SE JÁ FOI ESTORNADA
  -- =============================================
  IF v_transaction.estornado = TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta transação já foi estornada');
  END IF;

  -- Não permitir estornar estornos
  IF v_transaction.type = 'estorno' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível estornar um estorno');
  END IF;

  -- Só estornar créditos (amount > 0)
  IF v_transaction.amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas créditos podem ser estornados');
  END IF;

  -- =============================================
  -- VERIFICAR SALDO SUFICIENTE
  -- =============================================
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = v_transaction.user_id
  FOR UPDATE;

  v_balance_after := v_balance_before - v_transaction.amount;

  IF v_balance_after < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cliente já usou parte desses pontos — saldo atual: ' || v_balance_before
    );
  END IF;

  -- =============================================
  -- CRIAR LANÇAMENTO DE ESTORNO (negativo)
  -- =============================================
  INSERT INTO public.point_transactions (
    user_id, admin_id, amount, type, reason, balance_before, balance_after, estorno_de
  ) VALUES (
    v_transaction.user_id,
    v_admin_id,
    -v_transaction.amount,
    'estorno',
    'Estorno: ' || COALESCE(v_transaction.reason, 'Transação') || ' — ' || p_motivo,
    v_balance_before,
    v_balance_after,
    p_transaction_id
  )
  RETURNING id INTO v_estorno_id;

  -- =============================================
  -- ATUALIZAR SALDO DO USUÁRIO
  -- =============================================
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_transaction.user_id;

  -- =============================================
  -- MARCAR TRANSAÇÃO ORIGINAL COMO ESTORNADA
  -- =============================================
  UPDATE public.point_transactions
  SET estornado = TRUE, estornado_em = NOW(), estorno_motivo = p_motivo
  WHERE id = p_transaction_id;

  -- =============================================
  -- AUDIT LOG
  -- =============================================
  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id,
    'admin',
    'estorno_transacao',
    'point_transaction',
    p_transaction_id::TEXT,
    jsonb_build_object('amount', v_transaction.amount, 'reason', v_transaction.reason),
    jsonb_build_object('estornado', true, 'motivo', p_motivo),
    jsonb_build_object('user_id', v_transaction.user_id, 'balance_before', v_balance_before, 'balance_after', v_balance_after)
  );

  -- =============================================
  -- NOTIFICAÇÃO (não-fatal)
  -- =============================================
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon)
    VALUES (
      v_transaction.user_id,
      'points_earned',
      'Ajuste de pontos',
      'Houve um ajuste de ' || (-v_transaction.amount) || ' pontos no seu saldo.',
      'alert-circle'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação de estorno falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'estorno_id', v_estorno_id,
    'transaction_id', p_transaction_id,
    'amount_estornado', v_transaction.amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'user_id', v_transaction.user_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 5. REABRIR INDICAÇÃO REJEITADA
-- =============================================
CREATE OR REPLACE FUNCTION public.reabrir_indicacao(
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
BEGIN
  -- Verificação de admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem reabrir indicações');
  END IF;

  -- Validar motivo
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  -- Buscar indicação
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE id = p_referral_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status != 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas indicações rejeitadas podem ser reabertas');
  END IF;

  -- Reabrir (voltar para pendente)
  UPDATE public.referrals
  SET status = 'pending',
      processed_by = NULL,
      processed_at = NULL,
      updated_at = NOW()
  WHERE id = p_referral_id;

  -- Audit log
  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id, 'admin', 'reabrir_indicacao', 'referral', p_referral_id::TEXT,
    jsonb_build_object('status', 'rejected'),
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('motivo', p_motivo)
  );

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', p_referral_id,
    'new_status', 'pending'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 6. REABRIR EMISSÃO RECUSADA
-- =============================================
CREATE OR REPLACE FUNCTION public.reabrir_emissao(
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
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem reabrir emissões');
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  SELECT * INTO v_emissao FROM public.emissoes WHERE id = p_emissao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status != 'recusada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas emissões recusadas podem ser reabertas');
  END IF;

  UPDATE public.emissoes
  SET status = 'pendente',
      motivo_recusa = NULL,
      admin_id = NULL,
      processed_at = NULL,
      updated_at = NOW()
  WHERE id = p_emissao_id;

  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id, 'admin', 'reabrir_emissao', 'emissao', p_emissao_id::TEXT,
    jsonb_build_object('status', 'recusada'),
    jsonb_build_object('status', 'pendente'),
    jsonb_build_object('motivo', p_motivo)
  );

  RETURN jsonb_build_object('success', true, 'emissao_id', p_emissao_id, 'new_status', 'pendente');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 7. REABRIR RESGATE REJEITADO
-- =============================================
CREATE OR REPLACE FUNCTION public.reabrir_resgate(
  p_resgate_id UUID,
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
  v_resgate RECORD;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem reabrir resgates');
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motivo é obrigatório');
  END IF;

  SELECT * INTO v_resgate FROM public.resgate_solicitacoes WHERE id = p_resgate_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resgate não encontrado');
  END IF;

  IF v_resgate.status != 'rejeitado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas resgates rejeitados podem ser reabertos');
  END IF;

  UPDATE public.resgate_solicitacoes
  SET status = 'pendente',
      admin_comentario = NULL,
      admin_id = NULL,
      processed_at = NULL
  WHERE id = p_resgate_id;

  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id, 'admin', 'reabrir_resgate', 'resgate_solicitacao', p_resgate_id::TEXT,
    jsonb_build_object('status', 'rejeitado'),
    jsonb_build_object('status', 'pendente'),
    jsonb_build_object('motivo', p_motivo)
  );

  RETURN jsonb_build_object('success', true, 'resgate_id', p_resgate_id, 'new_status', 'pendente');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 8. REVERTER APROVAÇÃO DE INDICAÇÃO
-- Estorna os pontos e muda status para "revertida"
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

  -- Buscar transação de crédito relacionada
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

  -- Atualizar status da indicação
  UPDATE public.referrals
  SET status = 'reverted',
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
    jsonb_build_object('status', 'reverted'),
    jsonb_build_object('motivo', p_motivo, 'estorno_result', v_estorno_result)
  );

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', p_referral_id,
    'new_status', 'reverted',
    'points_estornados', v_referral.points_awarded,
    'estorno_result', v_estorno_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 9. REVERTER APROVAÇÃO DE EMISSÃO
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
    AND type IN ('credit', 'emissao_aprovada')
    AND reason LIKE '%Emissão aprovada%'
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

  UPDATE public.emissoes
  SET status = 'revertida',
      updated_at = NOW()
  WHERE id = p_emissao_id;

  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id, 'admin', 'reverter_emissao', 'emissao', p_emissao_id::TEXT,
    jsonb_build_object('status', 'aprovada', 'pontos_creditados', v_emissao.pontos_creditados),
    jsonb_build_object('status', 'revertida'),
    jsonb_build_object('motivo', p_motivo)
  );

  RETURN jsonb_build_object(
    'success', true,
    'emissao_id', p_emissao_id,
    'new_status', 'revertida',
    'points_estornados', v_emissao.pontos_creditados
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 10. REVERTER APROVAÇÃO DE RESGATE
-- DEVOLVE os pontos ao cliente (crédito)
-- =============================================
CREATE OR REPLACE FUNCTION public.reverter_aprovacao_resgate(
  p_resgate_id UUID,
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
  v_resgate RECORD;
  v_credit_result JSONB;
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

  SELECT * INTO v_resgate FROM public.resgate_solicitacoes WHERE id = p_resgate_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resgate não encontrado');
  END IF;

  IF v_resgate.status != 'aprovado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas resgates aprovados podem ser revertidos');
  END IF;

  -- Para resgate aprovado: DEVOLVER os pontos (crédito)
  v_credit_result := public.creditar_pontos_central(
    v_resgate.user_id,
    v_resgate.pontos,
    'credit',
    'Devolução de pontos: Resgate revertido — ' || p_motivo,
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN v_credit_result;
  END IF;

  UPDATE public.resgate_solicitacoes
  SET status = 'revertido'
  WHERE id = p_resgate_id;

  INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    v_admin_id, 'admin', 'reverter_resgate', 'resgate_solicitacao', p_resgate_id::TEXT,
    jsonb_build_object('status', 'aprovado', 'pontos', v_resgate.pontos),
    jsonb_build_object('status', 'revertido'),
    jsonb_build_object('motivo', p_motivo, 'points_devolvidos', v_resgate.pontos)
  );

  -- Notificação
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon)
    VALUES (
      v_resgate.user_id,
      'points_earned',
      'Pontos devolvidos',
      'Você recebeu ' || v_resgate.pontos || ' pontos de volta (resgate revertido).',
      'refresh-cw'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'resgate_id', p_resgate_id,
    'new_status', 'revertido',
    'points_devolvidos', v_resgate.pontos,
    'balance_after', (v_credit_result->>'balance_after')::integer
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 11. ATUALIZAR CONSTRAINT DE STATUS
-- Adicionar 'reverted' e 'revertida' aos status válidos
-- =============================================

-- Referrals
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'reverted'));

-- Emissoes
ALTER TABLE public.emissoes DROP CONSTRAINT IF EXISTS emissoes_status_check;
ALTER TABLE public.emissoes ADD CONSTRAINT emissoes_status_check
  CHECK (status IN ('pendente', 'aprovada', 'recusada', 'revertida'));

-- Resgate_solicitacoes - atualizar constraint de status (se existir)
DO $$
BEGIN
  -- Tentar remover a constraint antiga
  ALTER TABLE public.resgate_solicitacoes DROP CONSTRAINT IF EXISTS resgate_solicitacoes_status_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Nota: Esta constraint só será aplicada se a tabela usar check constraint
-- Se não existir, não tem problema pois o status é TEXT livre

-- =============================================
-- 12. PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.creditar_pontos_central TO authenticated;
GRANT EXECUTE ON FUNCTION public.estornar_transacao TO authenticated;
GRANT EXECUTE ON FUNCTION public.reabrir_indicacao TO authenticated;
GRANT EXECUTE ON FUNCTION public.reabrir_emissao TO authenticated;
GRANT EXECUTE ON FUNCTION public.reabrir_resgate TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverter_aprovacao_indicacao TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverter_aprovacao_emissao TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverter_aprovacao_resgate TO authenticated;

-- =============================================
-- 13. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 081: Sistema de Reversão Admin';
  RAISE NOTICE '  - Colunas de estorno em point_transactions';
  RAISE NOTICE '  - Função creditar_pontos_central';
  RAISE NOTICE '  - Função estornar_transacao';
  RAISE NOTICE '  - Funções reabrir_* (indicação, emissão, resgate)';
  RAISE NOTICE '  - Funções reverter_aprovacao_* (indicação, emissão, resgate)';
  RAISE NOTICE '  - Status reverted/revertida adicionados';
END $$;
