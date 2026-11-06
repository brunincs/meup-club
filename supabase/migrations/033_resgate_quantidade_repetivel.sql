-- ============================================
-- RESGATE: QUANTIDADE + REPETÍVEL
-- 1. Adiciona coluna quantidade
-- 2. Remove índice que bloqueava duplicatas pendentes
-- 3. Atualiza funções para suportar quantidade
-- ============================================

-- ============================================
-- 1. ADICIONAR COLUNA QUANTIDADE
-- ============================================

ALTER TABLE public.resgate_solicitacoes
ADD COLUMN IF NOT EXISTS quantidade INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.resgate_solicitacoes.quantidade IS 'Quantidade de itens resgatados (ex: 3x Crédito R$100)';

-- ============================================
-- 2. REMOVER ÍNDICE ÚNICO (permite múltiplos pendentes)
-- ============================================

DROP INDEX IF EXISTS idx_resgate_solicitacoes_unique_pendente;

-- ============================================
-- 3. ATUALIZAR FUNÇÃO: CLIENTE SOLICITA RESGATE
-- Agora aceita p_quantity para quantidade múltipla
-- ============================================

-- Dropar função antiga (assinatura diferente)
DROP FUNCTION IF EXISTS public.client_request_redemption(TEXT, TEXT, INTEGER, INTEGER);

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
  v_user_class INTEGER;
  v_request_id UUID;
  v_total_cost INTEGER;
BEGIN
  -- Validar quantidade
  IF p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Quantidade mínima é 1');
  END IF;

  -- Calcular custo total
  v_total_cost := p_points_cost * p_quantity;

  -- Obter usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Buscar pontos atuais do usuário
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_current_points IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;

  -- Calcular classe baseada nos pontos
  IF v_current_points >= 4000 THEN
    v_user_class := 4;
  ELSIF v_current_points >= 1800 THEN
    v_user_class := 3;
  ELSIF v_current_points >= 600 THEN
    v_user_class := 2;
  ELSE
    v_user_class := 1;
  END IF;

  -- Verificar pontos suficientes (para o total)
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

  -- Criar solicitação pendente (NÃO debita ainda!)
  -- NOTA: Não verifica mais duplicatas - experiências são repetíveis
  INSERT INTO public.resgate_solicitacoes (
    user_id,
    experiencia_id,
    experiencia_nome,
    pontos,
    quantidade,
    status
  )
  VALUES (
    v_user_id,
    p_experience_id,
    p_experience_name,
    v_total_cost,  -- Pontos = custo total (unitário × quantidade)
    p_quantity,
    'pendente'
  )
  RETURNING id INTO v_request_id;

  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'quantity', p_quantity,
    'total_points', v_total_cost,
    'message', 'Solicitação enviada! Aguarde a aprovação.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao processar solicitação: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 4. ATUALIZAR FUNÇÃO: ADMIN APROVA RESGATE
-- Agora registra quantidade no histórico
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

  -- Validar saldo novamente (pontos já contém o total)
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

  -- Notificar cliente (com quantidade se > 1)
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
-- 5. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.client_request_redemption TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_redemption TO authenticated;
