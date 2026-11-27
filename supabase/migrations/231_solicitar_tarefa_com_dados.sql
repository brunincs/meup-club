-- ============================================
-- MIGRATION 231: RPC solicitar_tarefa_com_dados
-- Permite enviar dados extras (ex: @ do Instagram) ao solicitar missão
-- ============================================

-- ============================================
-- 1. ADICIONAR COLUNA dados_extras SE NÃO EXISTIR
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarefa_solicitacoes' AND column_name = 'dados_extras'
  ) THEN
    ALTER TABLE tarefa_solicitacoes ADD COLUMN dados_extras JSONB DEFAULT NULL;
    COMMENT ON COLUMN tarefa_solicitacoes.dados_extras IS 'Dados extras da solicitação (ex: instagram_handle)';
  END IF;
END $$;

-- ============================================
-- 2. FUNÇÃO solicitar_tarefa_com_dados
-- ============================================

CREATE OR REPLACE FUNCTION public.solicitar_tarefa_com_dados(
  p_user_id UUID,
  p_tarefa_id UUID,
  p_dados_extras JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tarefa RECORD;
  v_solicitacao_existente RECORD;
  v_nova_solicitacao RECORD;
BEGIN
  -- Verificar se tarefa existe e está ativa
  SELECT * INTO v_tarefa
  FROM tarefas
  WHERE id = p_tarefa_id AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tarefa não encontrada ou inativa');
  END IF;

  -- Verificar se missão de Instagram exige @ do Instagram
  IF (v_tarefa.nome ILIKE '%instagram%' OR v_tarefa.nome ILIKE '%reels%' OR v_tarefa.link_url ILIKE '%instagram.com%') THEN
    IF p_dados_extras IS NULL OR p_dados_extras->>'instagram_handle' IS NULL OR TRIM(p_dados_extras->>'instagram_handle') = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Informe seu @ do Instagram');
    END IF;
  END IF;

  -- Verificar se já existe solicitação pendente
  SELECT * INTO v_solicitacao_existente
  FROM tarefa_solicitacoes
  WHERE user_id = p_user_id
    AND tarefa_id = p_tarefa_id
    AND status = 'pendente';

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Já existe solicitação pendente para esta missão',
      'solicitacao_id', v_solicitacao_existente.id
    );
  END IF;

  -- Criar nova solicitação
  INSERT INTO tarefa_solicitacoes (user_id, tarefa_id, status, dados_extras, created_at)
  VALUES (p_user_id, p_tarefa_id, 'pendente', p_dados_extras, NOW())
  RETURNING * INTO v_nova_solicitacao;

  RETURN jsonb_build_object(
    'success', true,
    'solicitacao_id', v_nova_solicitacao.id,
    'message', 'Solicitação enviada com sucesso'
  );
END;
$$;

-- Permitir que usuários autenticados chamem
GRANT EXECUTE ON FUNCTION public.solicitar_tarefa_com_dados(UUID, UUID, JSONB) TO authenticated;

-- ============================================
-- 3. NOTIFICAR POSTRGREST
-- ============================================
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 231: RPC solicitar_tarefa_com_dados criada';
END $$;
