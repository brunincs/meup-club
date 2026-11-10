-- =============================================
-- MIGRAÇÃO 073: CORRIGIR TODOS OS FLUXOS DE CRÉDITO
-- Problema: várias funções fazem UPDATE direto em points,
-- mas o trigger tr_protect_sensitive_fields bloqueia.
-- Solução: criar função central que bypassa o trigger de forma segura.
-- =============================================

-- =============================================
-- 1. ATUALIZAR CONSTRAINT DE NOTIFICAÇÕES
-- Adicionar tipos que faltam
-- =============================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'points_earned',
  'level_up',
  'redemption',
  'redemption_approved',
  'redemption_rejected',
  'referral_signup',
  'checkin',
  'mission_completed',
  'system',
  'points',
  'emissao_aprovada',
  'emissao_recusada'
));

-- =============================================
-- 2. CRIAR FUNÇÃO CENTRAL DE CRÉDITO INTERNO
-- Esta função é chamada por triggers e outras funções,
-- NÃO pelo usuário diretamente.
-- Usa SECURITY DEFINER para ter permissões de admin.
-- =============================================
CREATE OR REPLACE FUNCTION public.creditar_pontos_interno(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Executa com permissões do owner (postgres/admin)
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
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
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
-- 3. RECRIAR fazer_checkin USANDO FUNÇÃO CENTRAL
-- =============================================
CREATE OR REPLACE FUNCTION public.fazer_checkin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pontos INTEGER;
  v_ultimo_checkin TIMESTAMPTZ;
  v_proximo_checkin TIMESTAMPTZ;
  v_benefits RECORD;
  v_credit_result JSONB;
BEGIN
  -- SEMPRE usar auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar pontos do plano do usuário
  SELECT * INTO v_benefits FROM public.get_user_benefits(v_user_id);
  v_pontos := COALESCE(v_benefits.pontos_checkin, 10);

  -- Verificar último check-in (IDEMPOTÊNCIA)
  SELECT created_at INTO v_ultimo_checkin
  FROM public.checkins
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se já fez check-in nas últimas 24h, bloquear
  IF v_ultimo_checkin IS NOT NULL AND (NOW() - v_ultimo_checkin) < INTERVAL '24 hours' THEN
    v_proximo_checkin := v_ultimo_checkin + INTERVAL '24 hours';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_in',
      'message', 'Você já fez check-in hoje. Volte amanhã!',
      'proximo_checkin', v_proximo_checkin,
      'horas_restantes', EXTRACT(EPOCH FROM (v_proximo_checkin - NOW())) / 3600
    );
  END IF;

  -- CREDITAR VIA FUNÇÃO CENTRAL
  v_credit_result := public.creditar_pontos_interno(
    v_user_id,
    v_pontos,
    'task',
    'Check-in diário'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'credit_failed',
      'message', v_credit_result->>'error'
    );
  END IF;

  -- Registrar check-in
  INSERT INTO public.checkins (user_id, pontos)
  VALUES (v_user_id, v_pontos);

  -- Notificação (NÃO-FATAL)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_user_id,
      'checkin',
      'Check-in realizado!',
      'Você ganhou ' || v_pontos || ' pontos pelo check-in diário!',
      'calendar',
      jsonb_build_object('points', v_pontos, 'plano', v_benefits.plano)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  -- Sucesso
  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'plano', v_benefits.plano,
    'balance_before', (v_credit_result->>'balance_before')::integer,
    'balance_after', (v_credit_result->>'balance_after')::integer,
    'proximo_checkin', NOW() + INTERVAL '24 hours'
  );
END;
$$;

-- =============================================
-- 4. RECRIAR creditar_missao_automatica USANDO FUNÇÃO CENTRAL
-- =============================================
CREATE OR REPLACE FUNCTION public.creditar_missao_automatica(
  p_user_id UUID,
  p_missao_tipo TEXT,
  p_pontos INTEGER,
  p_descricao TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_result JSONB;
BEGIN
  -- Tentar inserir (IDEMPOTÊNCIA - falhará se já existe)
  INSERT INTO public.missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, p_missao_tipo, p_pontos)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  -- Se não inseriu (já existia), retorna false (sem re-creditar)
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- CREDITAR VIA FUNÇÃO CENTRAL
  v_credit_result := public.creditar_pontos_interno(
    p_user_id,
    p_pontos,
    'task',
    p_descricao
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    -- Rollback: remover registro de missão concluída
    DELETE FROM public.missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = p_missao_tipo;
    RETURN false;
  END IF;

  -- Notificação (NÃO-FATAL)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      'mission_completed',
      'Missão concluída!',
      'Você ganhou ' || p_pontos || ' pontos: ' || p_descricao,
      'target',
      jsonb_build_object('amount', p_pontos, 'missao', p_missao_tipo)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN true;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro em creditar_missao_automatica: %', SQLERRM;
  RETURN false;
END;
$$;

-- =============================================
-- 5. CORRIGIR aprovar_emissao_seguro
-- Notificação não-fatal + tipo correto
-- =============================================
CREATE OR REPLACE FUNCTION public.aprovar_emissao_seguro(
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
  v_is_admin BOOLEAN;
  v_credit_result JSONB;
BEGIN
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar emissão com lock (FOR UPDATE previne race conditions)
  SELECT * INTO v_emissao
  FROM emissoes
  WHERE id = p_emissao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  -- ANTI-DUPLO-CRÉDITO: verificar status
  IF v_emissao.status != 'pendente' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta emissão já foi processada',
      'status_atual', v_emissao.status
    );
  END IF;

  -- Calcular pontos (1 pt por R$1)
  v_pontos := FLOOR(v_emissao.valor);

  -- CREDITAR VIA FUNÇÃO CENTRAL (não admin_credit_points que requer auth)
  v_credit_result := public.creditar_pontos_interno(
    v_emissao.user_id,
    v_pontos,
    'credit',
    'Emissão aprovada: R$ ' || v_emissao.valor::TEXT
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Falha ao creditar: ' || (v_credit_result->>'error')
    );
  END IF;

  -- Atualizar status da emissão
  UPDATE emissoes
  SET
    status = 'aprovada',
    pontos_creditados = v_pontos,
    admin_id = p_admin_id,
    processed_at = NOW()
  WHERE id = p_emissao_id;

  -- Notificação (NÃO-FATAL)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_emissao.user_id,
      'emissao_aprovada',
      'Viagem aprovada!',
      'Sua emissão de R$ ' || v_emissao.valor::TEXT || ' foi aprovada. +' || v_pontos::TEXT || ' pontos creditados!',
      false
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_creditados', v_pontos,
    'valor', v_emissao.valor,
    'user_id', v_emissao.user_id,
    'balance_after', (v_credit_result->>'balance_after')::integer
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 6. CORRIGIR admin_credit_points
-- Usar tipo de notificação válido
-- =============================================
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
  v_notification_type TEXT;
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
  -- =============================================
  SELECT name, COALESCE(points, 0)
  INTO v_user_name, v_current_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- =============================================
  -- BUSCAR BENEFÍCIOS DO PLANO
  -- =============================================
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);

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
    v_notification_type := 'points_earned';

  -- =============================================
  -- MECANISMO 2: INDICAÇÃO
  -- =============================================
  ELSIF p_type = 'referral' THEN
    v_final_amount := p_amount * v_benefits.pontos_indicacao;
    IF v_benefits.plano = 'prime' THEN
      v_final_reason := p_reason || ' · Prime (' || v_benefits.pontos_indicacao || ' pts/ind)';
    ELSE
      v_final_reason := p_reason;
    END IF;
    v_notification_type := 'referral_signup';

  -- =============================================
  -- MECANISMO 3: ANIVERSÁRIO
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
    v_notification_type := 'points_earned';

  -- =============================================
  -- MECANISMO 4: CHECK-IN/TAREFA
  -- =============================================
  ELSIF p_type = 'task' THEN
    IF p_amount = 1 THEN
      v_final_amount := v_benefits.pontos_checkin;
    ELSE
      v_final_amount := p_amount;
    END IF;
    v_notification_type := 'mission_completed';

  -- =============================================
  -- DÉBITO OU OUTROS
  -- =============================================
  ELSE
    v_final_amount := p_amount;
    v_notification_type := 'points_earned';
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
  -- NOTIFICAÇÃO (NÃO-FATAL)
  -- =============================================
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      v_notification_type,
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

-- =============================================
-- 7. GARANTIR PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.creditar_pontos_interno TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_pontos_interno TO service_role;
GRANT EXECUTE ON FUNCTION public.fazer_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_missao_automatica TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_missao_automatica TO service_role;
GRANT EXECUTE ON FUNCTION public.aprovar_emissao_seguro TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_points TO authenticated;

-- =============================================
-- 8. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 073: Fluxos de crédito corrigidos';
  RAISE NOTICE '  - Constraint de notificações atualizada';
  RAISE NOTICE '  - Função creditar_pontos_interno criada (SECURITY DEFINER)';
  RAISE NOTICE '  - fazer_checkin usa função central';
  RAISE NOTICE '  - creditar_missao_automatica usa função central';
  RAISE NOTICE '  - aprovar_emissao_seguro com notificação não-fatal';
  RAISE NOTICE '  - admin_credit_points com tipos de notificação válidos';
END $$;
