-- ============================================
-- FIX COMPLETO: Sistema de Resgate
-- Problemas: FK para experiencias inexistente, coluna UUID vs TEXT
-- Solução: remover FK, usar TEXT, recriar funções
-- ============================================

-- ============================================
-- 1. VERIFICAR/CRIAR TABELA
-- ============================================

-- Se a tabela não existir, cria do zero
CREATE TABLE IF NOT EXISTS public.resgate_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  experiencia_id TEXT NOT NULL,
  experiencia_nome TEXT NOT NULL,
  pontos INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  admin_id UUID,
  admin_comentario TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. REMOVER CONSTRAINTS PROBLEMÁTICAS
-- ============================================

-- Remover FK para experiencias (pode não existir)
ALTER TABLE public.resgate_solicitacoes
DROP CONSTRAINT IF EXISTS resgate_solicitacoes_experiencia_id_fkey;

-- Remover FK antiga para profiles (vamos recriar corretamente)
ALTER TABLE public.resgate_solicitacoes
DROP CONSTRAINT IF EXISTS resgate_solicitacoes_user_id_fkey;

ALTER TABLE public.resgate_solicitacoes
DROP CONSTRAINT IF EXISTS resgate_solicitacoes_admin_id_fkey;

-- ============================================
-- 3. GARANTIR TIPO TEXT NA COLUNA
-- ============================================

-- Mudar experiencia_id para TEXT (caso ainda seja UUID)
DO $$
BEGIN
  -- Verifica se a coluna é UUID e converte para TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'resgate_solicitacoes'
    AND column_name = 'experiencia_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.resgate_solicitacoes
    ALTER COLUMN experiencia_id TYPE TEXT USING experiencia_id::TEXT;
  END IF;
END $$;

-- ============================================
-- 4. ADICIONAR FK PARA PROFILES (user_id)
-- ============================================

-- Adicionar FK para user_id -> profiles
ALTER TABLE public.resgate_solicitacoes
ADD CONSTRAINT resgate_solicitacoes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Adicionar FK para admin_id -> profiles (opcional, pode ser null)
ALTER TABLE public.resgate_solicitacoes
ADD CONSTRAINT resgate_solicitacoes_admin_id_fkey
FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================
-- 5. ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_resgate_solicitacoes_user_id
ON public.resgate_solicitacoes(user_id);

CREATE INDEX IF NOT EXISTS idx_resgate_solicitacoes_status
ON public.resgate_solicitacoes(status);

CREATE INDEX IF NOT EXISTS idx_resgate_solicitacoes_created_at
ON public.resgate_solicitacoes(created_at DESC);

-- Índice único para evitar duplicatas pendentes
DROP INDEX IF EXISTS idx_resgate_solicitacoes_unique_pendente;
CREATE UNIQUE INDEX idx_resgate_solicitacoes_unique_pendente
ON public.resgate_solicitacoes(user_id, experiencia_id)
WHERE status = 'pendente';

-- ============================================
-- 6. RLS (Row Level Security)
-- ============================================

ALTER TABLE public.resgate_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Users view own resgate requests" ON public.resgate_solicitacoes;
DROP POLICY IF EXISTS "Admins view all resgate requests" ON public.resgate_solicitacoes;
DROP POLICY IF EXISTS "Users insert own resgate requests" ON public.resgate_solicitacoes;
DROP POLICY IF EXISTS "Admins update resgate requests" ON public.resgate_solicitacoes;

-- Cliente vê suas próprias solicitações
CREATE POLICY "Users view own resgate requests"
ON public.resgate_solicitacoes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin vê TODAS as solicitações
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

-- Cliente pode inserir sua própria solicitação
CREATE POLICY "Users insert own resgate requests"
ON public.resgate_solicitacoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin pode atualizar qualquer solicitação
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
-- 7. FUNÇÃO: CLIENTE SOLICITA RESGATE
-- Aceita TEXT para experiencia_id (IDs hardcoded '1', '2', etc.)
-- ============================================

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

EXCEPTION WHEN OTHERS THEN
  -- Captura qualquer erro e retorna mensagem amigável
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao processar solicitação: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 8. FUNÇÃO: ADMIN APROVA RESGATE
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

  -- REGISTRAR no histórico (experience_id pode ser NULL se não for UUID válido)
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

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao aprovar: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 9. FUNÇÃO: ADMIN REJEITA RESGATE
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

  -- Atualizar status (NÃO debita)
  UPDATE public.resgate_solicitacoes
  SET
    status = 'rejeitado',
    admin_id = v_admin_id,
    admin_comentario = p_reason,
    processed_at = NOW()
  WHERE id = p_request_id;

  -- Notificar cliente
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

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao rejeitar: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 10. PERMISSÕES
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.resgate_solicitacoes TO authenticated;
GRANT UPDATE ON public.resgate_solicitacoes TO authenticated;

GRANT EXECUTE ON FUNCTION public.client_request_redemption TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_redemption TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_redemption TO authenticated;

-- ============================================
-- 11. COMENTÁRIO
-- ============================================

COMMENT ON TABLE public.resgate_solicitacoes IS
'Solicitações de resgate. experiencia_id é TEXT para aceitar IDs hardcoded (1, 2) ou UUIDs.
FK apenas para profiles (user_id, admin_id), não para experiencias.';
