-- ============================================
-- RESGATE: MODELO DE RESERVA DE PONTOS
--
-- ANTES: Pontos só eram debitados na APROVAÇÃO
-- PROBLEMA: Cliente podia solicitar múltiplos resgates
--           com os mesmos pontos (gastando 2x o que tinha)
--
-- AGORA (modelo de reserva):
-- - SOLICITAR: debita pontos NA HORA (reserva)
-- - APROVAR: só marca como aprovado (sem débito duplo)
-- - REJEITAR: ESTORNA os pontos de volta
-- ============================================

-- ============================================
-- 1. CORRIGIR TRIGGER DE AUDITORIA QUEBRADO
-- ============================================

DROP TRIGGER IF EXISTS tr_audit_redemption_change ON public.resgate_solicitacoes;
DROP FUNCTION IF EXISTS public.audit_redemption_change();

-- ============================================
-- 2. FUNÇÃO: CLIENTE SOLICITA RESGATE
--    Agora DEBITA pontos na solicitação
-- ============================================

CREATE OR REPLACE FUNCTION public.client_request_redemption(
  p_experience_id TEXT,
  p_experience_name TEXT,
  p_points_cost INTEGER,
  p_min_class INTEGER DEFAULT 1,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_user_class INTEGER;
  v_request_id UUID;
  v_total_cost INTEGER;
  v_reason_text TEXT;
BEGIN
  -- Validar quantidade
  IF p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Quantidade mínima é 1');
  END IF;

  -- Calcular custo total
  v_total_cost := p_points_cost * p_quantity;

  -- Obter usuário logado (NUNCA aceitar parâmetro)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- LOCK: Buscar pontos COM LOCK para evitar race condition
  -- Dois resgates simultâneos não passam juntos
  -- ═══════════════════════════════════════════════════════════════
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_points IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;

  -- Calcular classe baseada nos pontos (usando get_level_from_points se existir)
  IF v_current_points >= 8000 THEN
    v_user_class := 5;
  ELSIF v_current_points >= 4000 THEN
    v_user_class := 4;
  ELSIF v_current_points >= 1800 THEN
    v_user_class := 3;
  ELSIF v_current_points >= 600 THEN
    v_user_class := 2;
  ELSE
    v_user_class := 1;
  END IF;

  -- Verificar pontos suficientes
  IF v_current_points < v_total_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Pontos insuficientes. Você tem ' || v_current_points || ' pontos, precisa de ' || v_total_cost || '.'
    );
  END IF;

  -- Verificar classe mínima
  IF v_user_class < p_min_class THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Sua classe não permite esse resgate. Classe mínima: ' || p_min_class
    );
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- DÉBITO IMEDIATO: Reservar os pontos AGORA
  -- ═══════════════════════════════════════════════════════════════
  v_new_points := v_current_points - v_total_cost;

  UPDATE public.profiles
  SET points = v_new_points, updated_at = NOW()
  WHERE id = v_user_id;

  -- Montar texto para histórico
  IF p_quantity > 1 THEN
    v_reason_text := 'Resgate solicitado: ' || p_quantity || '× ' || p_experience_name;
  ELSE
    v_reason_text := 'Resgate solicitado: ' || p_experience_name;
  END IF;

  -- Registrar transação (débito)
  INSERT INTO public.point_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason
  ) VALUES (
    v_user_id,
    -v_total_cost,
    v_current_points,
    v_new_points,
    'redemption',
    v_reason_text
  );

  -- Criar solicitação pendente
  INSERT INTO public.resgate_solicitacoes (
    user_id,
    experiencia_id,
    experiencia_nome,
    pontos,
    quantidade,
    status
  ) VALUES (
    v_user_id,
    p_experience_id,
    p_experience_name,
    v_total_cost,
    p_quantity,
    'pendente'
  )
  RETURNING id INTO v_request_id;

  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'quantity', p_quantity,
    'total_points', v_total_cost,
    'balance_after', v_new_points,
    'message', 'Solicitação enviada! Pontos reservados. Aguarde a aprovação.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao processar solicitação: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 3. FUNÇÃO: ADMIN APROVA RESGATE
--    NÃO debita mais (já foi debitado na solicitação)
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

  -- ═══════════════════════════════════════════════════════════════
  -- NÃO DEBITAR: Pontos já foram debitados na solicitação!
  -- Apenas marcar como aprovado
  -- ═══════════════════════════════════════════════════════════════

  UPDATE public.resgate_solicitacoes
  SET
    status = 'aprovado',
    admin_id = v_admin_id,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Notificar cliente
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
    RAISE NOTICE '[APPROVE] Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'quantity', COALESCE(v_request.quantidade, 1),
    'message', 'Resgate aprovado! Pontos já haviam sido reservados na solicitação.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao aprovar: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 4. FUNÇÃO: ADMIN REJEITA RESGATE
--    Agora ESTORNA os pontos de volta
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_reject_redemption(p_request_id UUID, p_reason TEXT DEFAULT NULL)
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

  -- ═══════════════════════════════════════════════════════════════
  -- ESTORNO: Devolver os pontos que foram reservados
  -- ═══════════════════════════════════════════════════════════════

  -- Buscar saldo atual
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_request.user_id
  FOR UPDATE;

  -- Calcular novo saldo (estorno)
  v_new_points := v_current_points + v_request.pontos;

  -- Creditar pontos de volta
  UPDATE public.profiles
  SET points = v_new_points, updated_at = NOW()
  WHERE id = v_request.user_id;

  -- Montar texto para histórico
  IF COALESCE(v_request.quantidade, 1) > 1 THEN
    v_reason_text := 'Resgate rejeitado (estorno): ' || v_request.quantidade || '× ' || v_request.experiencia_nome;
  ELSE
    v_reason_text := 'Resgate rejeitado (estorno): ' || v_request.experiencia_nome;
  END IF;

  -- Registrar transação (estorno = crédito)
  INSERT INTO public.point_transactions (
    user_id,
    admin_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason
  ) VALUES (
    v_request.user_id,
    v_admin_id,
    v_request.pontos,  -- Positivo = estorno
    v_current_points,
    v_new_points,
    'credit',
    v_reason_text
  );

  -- Atualizar status
  UPDATE public.resgate_solicitacoes
  SET
    status = 'rejeitado',
    admin_id = v_admin_id,
    admin_comentario = p_reason,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Notificar cliente
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_request.user_id,
      'redemption_rejected',
      'Resgate não aprovado',
      COALESCE(p_reason, 'Seu pedido de resgate de ' || v_request.experiencia_nome || ' não foi aprovado. Seus pontos foram estornados.'),
      'x-circle',
      jsonb_build_object(
        'experience_name', v_request.experiencia_nome,
        'points_refunded', v_request.pontos,
        'reason', p_reason
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[REJECT] Falha ao criar notificação: %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'points_refunded', v_request.pontos,
    'new_balance', v_new_points,
    'message', 'Resgate rejeitado. Pontos estornados.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao rejeitar: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 5. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.client_request_redemption(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_redemption(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_redemption(UUID, TEXT) TO authenticated;

-- ============================================
-- 6. COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.client_request_redemption IS
'Solicita resgate de experiência (MODELO DE RESERVA).
Pontos são DEBITADOS NA HORA (reservados).
- Lock na linha do perfil evita race condition
- Saldo cai imediatamente
- Transação registrada como "Resgate solicitado"
Se rejeitado, pontos são estornados.';

COMMENT ON FUNCTION public.admin_approve_redemption IS
'Aprova resgate pendente.
NÃO debita pontos (já foram reservados na solicitação).
Apenas marca como aprovado e notifica cliente.';

COMMENT ON FUNCTION public.admin_reject_redemption IS
'Rejeita resgate pendente e ESTORNA os pontos.
Pontos voltam ao saldo do cliente.
Transação registrada como "Resgate rejeitado (estorno)".';
