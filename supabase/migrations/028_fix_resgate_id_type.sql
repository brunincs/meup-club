-- ============================================
-- FIX: ID da experiência no resgate
-- Problema: função esperava UUID, frontend passa '1', '2', etc.
-- Solução: aceitar TEXT para compatibilidade
-- ============================================

-- 1. Remover a constraint de foreign key (experiencias podem ser hardcoded)
ALTER TABLE public.resgate_solicitacoes
DROP CONSTRAINT IF EXISTS resgate_solicitacoes_experiencia_id_fkey;

-- 2. Mudar tipo da coluna para TEXT
ALTER TABLE public.resgate_solicitacoes
ALTER COLUMN experiencia_id TYPE TEXT;

-- 3. Recriar a função para aceitar TEXT
CREATE OR REPLACE FUNCTION public.client_request_redemption(
  p_experience_id TEXT,
  p_experience_name TEXT,
  p_points_cost INTEGER,
  p_min_class INTEGER DEFAULT 1
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
  v_pending_exists BOOLEAN;
  v_request_id UUID;
BEGIN
  -- Obter usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Buscar pontos atuais do usuário
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_user_id;

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

  -- Verificar pontos suficientes
  IF v_current_points < p_points_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Pontos insuficientes. Você tem ' || v_current_points || ' pontos.'
    );
  END IF;

  -- Verificar classe mínima
  IF v_user_class < p_min_class THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Sua classe não permite esse resgate. Classe mínima: ' || p_min_class
    );
  END IF;

  -- Verificar pedido pendente duplicado
  SELECT EXISTS (
    SELECT 1 FROM public.resgate_solicitacoes
    WHERE user_id = v_user_id
    AND experiencia_id = p_experience_id
    AND status = 'pendente'
  ) INTO v_pending_exists;

  IF v_pending_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você já tem um pedido pendente para esta experiência'
    );
  END IF;

  -- Criar solicitação pendente
  INSERT INTO public.resgate_solicitacoes (
    user_id,
    experiencia_id,
    experiencia_nome,
    pontos,
    status
  )
  VALUES (
    v_user_id,
    p_experience_id,
    p_experience_name,
    p_points_cost,
    'pendente'
  )
  RETURNING id INTO v_request_id;

  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Solicitação enviada! Aguarde a aprovação.'
  );
END;
$$;

-- 4. Atualizar função de aprovação para usar TEXT
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
  v_experience_uuid UUID;
BEGIN
  -- Verificar se é admin
  v_admin_id := auth.uid();
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT v_is_admin THEN
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

  -- Validar saldo novamente
  IF v_current_points < v_request.pontos THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cliente não tem mais saldo suficiente (' || v_current_points || ' pontos)'
    );
  END IF;

  -- Calcular novo saldo
  v_new_points := v_current_points - v_request.pontos;

  -- DEBITAR pontos
  UPDATE public.profiles
  SET points = v_new_points
  WHERE id = v_request.user_id;

  -- Tentar converter ID para UUID (se for UUID válido)
  BEGIN
    v_experience_uuid := v_request.experiencia_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_experience_uuid := NULL;
  END;

  -- REGISTRAR no histórico
  INSERT INTO public.point_transactions (
    user_id,
    admin_id,
    amount,
    balance_before,
    balance_after,
    type,
    reason,
    experience_id
  )
  VALUES (
    v_request.user_id,
    v_admin_id,
    -v_request.pontos,
    v_current_points,
    v_new_points,
    'redemption',
    'Resgate aprovado: ' || v_request.experiencia_nome,
    v_experience_uuid
  );

  -- Atualizar status
  UPDATE public.resgate_solicitacoes
  SET
    status = 'aprovado',
    admin_id = v_admin_id,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Notificar cliente
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    v_request.user_id,
    'redemption_approved',
    'Resgate aprovado!',
    'Seu resgate de ' || v_request.experiencia_nome || ' foi aprovado.',
    'gift',
    jsonb_build_object('experience_name', v_request.experiencia_nome, 'points', v_request.pontos)
  );

  RETURN json_build_object(
    'success', true,
    'points_debited', v_request.pontos,
    'new_balance', v_new_points
  );
END;
$$;

-- 5. Remover índice único antigo e recriar com TEXT
DROP INDEX IF EXISTS idx_resgate_solicitacoes_unique_pendente;
CREATE UNIQUE INDEX idx_resgate_solicitacoes_unique_pendente
ON public.resgate_solicitacoes(user_id, experiencia_id)
WHERE status = 'pendente';

COMMENT ON TABLE public.resgate_solicitacoes IS
'Solicitações de resgate. experiencia_id é TEXT para aceitar IDs hardcoded (1, 2) ou UUIDs.';
