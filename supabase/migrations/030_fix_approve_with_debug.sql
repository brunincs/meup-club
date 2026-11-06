-- ============================================
-- FIX: Função admin_approve_redemption com debug
-- Adiciona RAISE NOTICE para debug e garante retorno correto
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
  v_rows_affected INTEGER;
BEGIN
  -- 1. Verificar usuário logado
  v_admin_id := auth.uid();
  RAISE NOTICE '[APPROVE] admin_id from auth.uid(): %', v_admin_id;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE '[APPROVE] auth.uid() retornou NULL!';
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- 2. Verificar se é admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  RAISE NOTICE '[APPROVE] is_admin: %', v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Apenas administradores podem aprovar resgates');
  END IF;

  -- 3. Buscar a solicitação
  SELECT * INTO v_request
  FROM public.resgate_solicitacoes
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE NOTICE '[APPROVE] Solicitação não encontrada: %', p_request_id;
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  RAISE NOTICE '[APPROVE] Solicitação encontrada: id=%, status=%, pontos=%', v_request.id, v_request.status, v_request.pontos;

  -- 4. Verificar status
  IF v_request.status != 'pendente' THEN
    RAISE NOTICE '[APPROVE] Status não é pendente: %', v_request.status;
    RETURN json_build_object('success', false, 'error', 'Solicitação já foi processada (status: ' || v_request.status || ')');
  END IF;

  -- 5. Buscar saldo atual do cliente
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_request.user_id;

  RAISE NOTICE '[APPROVE] Saldo atual do cliente: %', v_current_points;

  -- 6. Validar saldo
  IF v_current_points < v_request.pontos THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cliente não tem saldo suficiente (' || v_current_points || ' pontos, precisa de ' || v_request.pontos || ')'
    );
  END IF;

  -- 7. Calcular novo saldo
  v_new_points := v_current_points - v_request.pontos;
  RAISE NOTICE '[APPROVE] Novo saldo calculado: % - % = %', v_current_points, v_request.pontos, v_new_points;

  -- 8. DEBITAR pontos
  UPDATE public.profiles
  SET points = v_new_points
  WHERE id = v_request.user_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RAISE NOTICE '[APPROVE] Linhas afetadas no UPDATE profiles: %', v_rows_affected;

  IF v_rows_affected = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Falha ao debitar pontos - nenhuma linha afetada');
  END IF;

  -- 9. REGISTRAR no histórico
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
    'Resgate aprovado: ' || v_request.experiencia_nome
  );

  RAISE NOTICE '[APPROVE] Transação inserida com sucesso';

  -- 10. Atualizar status da solicitação
  UPDATE public.resgate_solicitacoes
  SET
    status = 'aprovado',
    admin_id = v_admin_id,
    processed_at = NOW()
  WHERE id = p_request_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RAISE NOTICE '[APPROVE] Linhas afetadas no UPDATE resgate_solicitacoes: %', v_rows_affected;

  IF v_rows_affected = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Falha ao atualizar status - nenhuma linha afetada');
  END IF;

  -- 11. Criar notificação (opcional, em try-catch)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_request.user_id,
      'redemption_approved',
      'Resgate aprovado!',
      'Seu resgate de ' || v_request.experiencia_nome || ' foi aprovado.',
      'gift',
      jsonb_build_object('experience_name', v_request.experiencia_nome, 'points', v_request.pontos)
    );
    RAISE NOTICE '[APPROVE] Notificação criada com sucesso';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[APPROVE] Falha ao criar notificação (não crítico): %', SQLERRM;
  END;

  RAISE NOTICE '[APPROVE] SUCESSO COMPLETO! Pontos debitados: %, Novo saldo: %', v_request.pontos, v_new_points;

  RETURN json_build_object(
    'success', true,
    'points_debited', v_request.pontos,
    'new_balance', v_new_points,
    'message', 'Resgate aprovado com sucesso'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[APPROVE] EXCEÇÃO CAPTURADA: %', SQLERRM;
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao aprovar: ' || SQLERRM
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.admin_approve_redemption TO authenticated;

COMMENT ON FUNCTION public.admin_approve_redemption IS
'Admin aprova resgate. Valida saldo, debita pontos, registra transação, atualiza status, notifica cliente.';

-- ============================================
-- FIX: Função admin_reject_redemption também
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
  v_rows_affected INTEGER;
BEGIN
  -- 1. Verificar usuário logado
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- 2. Verificar se é admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Apenas administradores podem rejeitar resgates');
  END IF;

  -- 3. Buscar a solicitação
  SELECT * INTO v_request
  FROM public.resgate_solicitacoes
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  -- 4. Verificar status
  IF v_request.status != 'pendente' THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação já foi processada (status: ' || v_request.status || ')');
  END IF;

  -- 5. Atualizar status (NÃO debita pontos)
  UPDATE public.resgate_solicitacoes
  SET
    status = 'rejeitado',
    admin_id = v_admin_id,
    admin_comentario = p_reason,
    processed_at = NOW()
  WHERE id = p_request_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Falha ao atualizar status');
  END IF;

  -- 6. Criar notificação
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
    -- Notificação é opcional, não falha a operação
    NULL;
  END;

  RETURN json_build_object('success', true, 'message', 'Resgate rejeitado');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao rejeitar: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reject_redemption TO authenticated;
