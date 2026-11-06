-- ============================================
-- FIX: CONSTRAINT notifications_type_check
--
-- PROBLEMA: A aprovação de resgate usa 'redemption_approved'
-- mas o constraint só permite 'redemption'.
-- Também faltava 'redemption_rejected'.
--
-- SOLUÇÃO:
-- 1. Atualizar constraint para incluir novos tipos
-- 2. Desacoplar notificação do resgate (falha de notificação
--    não deve derrubar a operação principal)
-- ============================================

-- ============================================
-- 1. ATUALIZAR CONSTRAINT DE TIPOS
-- ============================================

-- Dropar constraint antigo
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recriar com todos os tipos válidos
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'points_earned',        -- Ganhou pontos (crédito, tarefa, missão, etc.)
  'level_up',             -- Subiu de classe
  'redemption',           -- Resgate criado (trigger antigo)
  'redemption_approved',  -- Resgate aprovado pelo admin
  'redemption_rejected',  -- Resgate rejeitado pelo admin
  'referral_signup',      -- Indicado se cadastrou
  'checkin',              -- Check-in diário (futuro)
  'mission_completed',    -- Missão automática concluída (futuro)
  'system'                -- Notificações do sistema
));

-- ============================================
-- 2. FUNÇÃO: ADMIN APROVA RESGATE (COM DESACOPLAMENTO)
-- A notificação é secundária - falha não derruba o resgate
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_approve_redemption(p_request_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_reason_text TEXT;
BEGIN
  -- Verificar se é admin
  v_admin_id := auth.uid();
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Apenas administradores podem aprovar resgates');
  END IF;

  -- Buscar a solicitação
  SELECT * INTO v_request
  FROM public.resgate_solicitacoes
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'pendente' THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação já foi processada');
  END IF;

  -- Buscar saldo atual do cliente
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_request.user_id;

  -- Validar saldo (pontos já contém o total = unitário × quantidade)
  IF v_current_points < v_request.pontos THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cliente não tem mais saldo suficiente (' || v_current_points || ' pontos, precisa de ' || v_request.pontos || ')'
    );
  END IF;

  -- Calcular novo saldo
  v_new_points := v_current_points - v_request.pontos;

  -- DEBITAR pontos
  UPDATE public.profiles
  SET points = v_new_points
  WHERE id = v_request.user_id;

  -- Montar texto do histórico com quantidade
  IF COALESCE(v_request.quantidade, 1) > 1 THEN
    v_reason_text := 'Resgate aprovado: ' || v_request.quantidade || '× ' || v_request.experiencia_nome;
  ELSE
    v_reason_text := 'Resgate aprovado: ' || v_request.experiencia_nome;
  END IF;

  -- REGISTRAR no histórico
  INSERT INTO public.point_transactions (
    user_id,
    admin_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason
  )
  VALUES (
    v_request.user_id,
    v_admin_id,
    -v_request.pontos,
    v_current_points,
    v_new_points,
    'redemption',
    v_reason_text
  );

  -- Atualizar status
  UPDATE public.resgate_solicitacoes
  SET
    status = 'aprovado',
    admin_id = v_admin_id,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- ============================================
  -- NOTIFICAÇÃO DESACOPLADA
  -- Falha aqui NÃO derruba a aprovação
  -- ============================================
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_request.user_id,
      'redemption_approved',
      'Resgate aprovado!',
      CASE
        WHEN COALESCE(v_request.quantidade, 1) > 1 THEN
          'Seu resgate de ' || v_request.quantidade || '× ' || v_request.experiencia_nome || ' foi aprovado.'
        ELSE
          'Seu resgate de ' || v_request.experiencia_nome || ' foi aprovado.'
      END,
      'gift',
      jsonb_build_object(
        'experience_name', v_request.experiencia_nome,
        'points', v_request.pontos,
        'quantity', COALESCE(v_request.quantidade, 1)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log silencioso - notificação é secundária
    RAISE NOTICE '[APPROVE] Falha ao criar notificação (não crítico): %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'points_debited', v_request.pontos,
    'new_balance', v_new_points,
    'quantity', COALESCE(v_request.quantidade, 1)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao aprovar: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 3. FUNÇÃO: ADMIN REJEITA RESGATE (COM DESACOPLAMENTO)
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_reject_redemption(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_request RECORD;
BEGIN
  -- Verificar se é admin
  v_admin_id := auth.uid();
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Apenas administradores podem rejeitar resgates');
  END IF;

  -- Buscar a solicitação
  SELECT * INTO v_request
  FROM public.resgate_solicitacoes
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF v_request.status != 'pendente' THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação já foi processada');
  END IF;

  -- Atualizar status (NÃO debita pontos)
  UPDATE public.resgate_solicitacoes
  SET
    status = 'rejeitado',
    admin_id = v_admin_id,
    admin_comentario = p_reason,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- ============================================
  -- NOTIFICAÇÃO DESACOPLADA
  -- ============================================
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_request.user_id,
      'redemption_rejected',
      'Resgate não aprovado',
      COALESCE(p_reason, 'Seu pedido de resgate de ' || v_request.experiencia_nome || ' não foi aprovado.'),
      'x-circle',
      jsonb_build_object('experience_name', v_request.experiencia_nome, 'reason', p_reason)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[REJECT] Falha ao criar notificação (não crítico): %', SQLERRM;
  END;

  RETURN json_build_object('success', true, 'message', 'Resgate rejeitado');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao rejeitar: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 4. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.admin_approve_redemption TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_redemption TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.admin_approve_redemption IS
'Admin aprova resgate. Debita pontos, registra histórico, notifica cliente.
A notificação é desacoplada - falha não derruba a aprovação.';

COMMENT ON FUNCTION public.admin_reject_redemption IS
'Admin rejeita resgate. Não debita pontos. Notificação desacoplada.';
