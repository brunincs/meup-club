-- ============================================
-- SISTEMA DE APROVAÇÃO DE RESGATES
-- Cliente solicita → Admin aprova → Só então debita
-- ============================================

-- ============================================
-- 1. TABELA DE SOLICITAÇÕES DE RESGATE
-- ============================================

CREATE TABLE IF NOT EXISTS public.resgate_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  experiencia_id UUID NOT NULL REFERENCES public.experiencias(id) ON DELETE CASCADE,
  experiencia_nome TEXT NOT NULL,
  pontos INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_comentario TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_resgate_solicitacoes_user_id ON public.resgate_solicitacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_resgate_solicitacoes_status ON public.resgate_solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_resgate_solicitacoes_created_at ON public.resgate_solicitacoes(created_at DESC);

-- Evitar duplicatas: só um pedido pendente por experiência por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_resgate_solicitacoes_unique_pendente
ON public.resgate_solicitacoes(user_id, experiencia_id)
WHERE status = 'pendente';

-- ============================================
-- 2. RLS - SEGURANÇA
-- ============================================

ALTER TABLE public.resgate_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Cliente vê apenas suas próprias solicitações
CREATE POLICY "Users view own resgate requests"
ON public.resgate_solicitacoes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin vê todas as solicitações
CREATE POLICY "Admins view all resgate requests"
ON public.resgate_solicitacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Cliente pode inserir (solicitar) sua própria solicitação
CREATE POLICY "Users insert own resgate requests"
ON public.resgate_solicitacoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin pode atualizar qualquer solicitação (aprovar/rejeitar)
CREATE POLICY "Admins update resgate requests"
ON public.resgate_solicitacoes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- 3. FUNÇÃO: CLIENTE SOLICITA RESGATE
-- Valida pontos e classe, cria solicitação pendente
-- NÃO debita ainda!
-- ============================================

CREATE OR REPLACE FUNCTION public.client_request_redemption(
  p_experience_id UUID,
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

  -- Buscar pontos atuais e classe do usuário
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = v_user_id;

  -- Calcular classe baseada nos pontos (simplificado)
  -- Classe 1: 0-599, Classe 2: 600-1799, Classe 3: 1800-3999, Classe 4: 4000+
  IF v_current_points >= 4000 THEN
    v_user_class := 4;
  ELSIF v_current_points >= 1800 THEN
    v_user_class := 3;
  ELSIF v_current_points >= 600 THEN
    v_user_class := 2;
  ELSE
    v_user_class := 1;
  END IF;

  -- Verificar se tem pontos suficientes
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

  -- Verificar se já existe pedido pendente para esta experiência
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

  -- Criar solicitação pendente (NÃO debita ainda!)
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

-- ============================================
-- 4. FUNÇÃO: ADMIN APROVA RESGATE
-- Valida saldo novamente, debita, registra histórico
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

  -- Validar saldo novamente (pode ter mudado)
  IF v_current_points < v_request.pontos THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cliente não tem mais saldo suficiente (' || v_current_points || ' pontos)'
    );
  END IF;

  -- Calcular novo saldo
  v_new_points := v_current_points - v_request.pontos;

  -- DEBITAR pontos do cliente
  UPDATE public.profiles
  SET points = v_new_points
  WHERE id = v_request.user_id;

  -- REGISTRAR no histórico de transações
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
    v_request.experiencia_id
  );

  -- Atualizar status da solicitação
  UPDATE public.resgate_solicitacoes
  SET
    status = 'aprovado',
    admin_id = v_admin_id,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Criar notificação para o cliente
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    v_request.user_id,
    'redemption_approved',
    'Resgate aprovado!',
    'Seu resgate de ' || v_request.experiencia_nome || ' foi aprovado. Entraremos em contato.',
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

-- ============================================
-- 5. FUNÇÃO: ADMIN REJEITA RESGATE
-- Não debita, apenas marca como rejeitado
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

  IF NOT v_is_admin THEN
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

  -- Atualizar status da solicitação (NÃO debita)
  UPDATE public.resgate_solicitacoes
  SET
    status = 'rejeitado',
    admin_id = v_admin_id,
    admin_comentario = p_reason,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Criar notificação para o cliente
  INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    v_request.user_id,
    'redemption_rejected',
    'Resgate não aprovado',
    COALESCE(p_reason, 'Seu pedido de resgate de ' || v_request.experiencia_nome || ' não foi aprovado.'),
    'x-circle',
    jsonb_build_object('experience_name', v_request.experiencia_nome, 'reason', p_reason)
  );

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================
-- 6. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.client_request_redemption TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_redemption TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_redemption TO authenticated;

-- ============================================
-- 7. COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.resgate_solicitacoes IS
'Solicitações de resgate de experiências. Status: pendente → aprovado/rejeitado.
Pontos só são debitados na APROVAÇÃO, não no pedido.';

COMMENT ON FUNCTION public.client_request_redemption IS
'Cliente solicita resgate. Valida pontos/classe, cria pendente. NÃO debita.';

COMMENT ON FUNCTION public.admin_approve_redemption IS
'Admin aprova resgate. Valida saldo, debita, registra transação, notifica cliente.';

COMMENT ON FUNCTION public.admin_reject_redemption IS
'Admin rejeita resgate. NÃO debita. Notifica cliente.';
