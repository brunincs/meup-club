-- ============================================
-- MIGRATION 247: Fix solicitar_tarefa_com_dados
-- Corrigir 'ativo' para 'ativa' (nome correto da coluna)
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
  -- Verificar se tarefa existe e está ativa (coluna correta: ativa)
  SELECT * INTO v_tarefa
  FROM tarefas
  WHERE id = p_tarefa_id AND ativa = true;

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

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.solicitar_tarefa_com_dados(UUID, UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 247: Fix solicitar_tarefa_com_dados (ativa)';
END $$;
