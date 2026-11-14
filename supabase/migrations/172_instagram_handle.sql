-- ============================================
-- MIGRAÇÃO 172: Campo Instagram Handle
-- Para missão "Seguir no Instagram"
-- ============================================

-- =============================================
-- PARTE 1: Adicionar coluna instagram_handle ao profiles
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'instagram_handle'
  ) THEN
    ALTER TABLE profiles ADD COLUMN instagram_handle TEXT;
  END IF;
END $$;

-- =============================================
-- PARTE 2: Adicionar coluna dados_extras às solicitações de tarefa
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tarefa_solicitacoes' AND column_name = 'dados_extras'
  ) THEN
    ALTER TABLE tarefa_solicitacoes ADD COLUMN dados_extras JSONB DEFAULT '{}';
  END IF;
END $$;

-- =============================================
-- PARTE 3: Função para solicitar tarefa com dados extras
-- =============================================

CREATE OR REPLACE FUNCTION public.solicitar_tarefa_com_dados(
  p_user_id UUID,
  p_tarefa_id UUID,
  p_dados_extras JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitacao_id UUID;
  v_instagram_handle TEXT;
BEGIN
  -- Verificar se já existe solicitação pendente
  IF EXISTS (
    SELECT 1 FROM tarefa_solicitacoes
    WHERE user_id = p_user_id
      AND tarefa_id = p_tarefa_id
      AND status = 'pendente'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_pending',
      'message', 'Já existe uma solicitação pendente para esta tarefa'
    );
  END IF;

  -- Criar solicitação
  INSERT INTO tarefa_solicitacoes (user_id, tarefa_id, status, dados_extras)
  VALUES (p_user_id, p_tarefa_id, 'pendente', p_dados_extras)
  RETURNING id INTO v_solicitacao_id;

  -- Se tiver instagram_handle nos dados extras, salvar no perfil
  v_instagram_handle := p_dados_extras ->> 'instagram_handle';
  IF v_instagram_handle IS NOT NULL AND v_instagram_handle != '' THEN
    UPDATE profiles
    SET instagram_handle = v_instagram_handle, updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'solicitacao_id', v_solicitacao_id
  );
END;
$$;

-- =============================================
-- PARTE 4: Permissões
-- =============================================

GRANT EXECUTE ON FUNCTION public.solicitar_tarefa_com_dados(UUID, UUID, JSONB) TO authenticated;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON COLUMN profiles.instagram_handle IS 'Arroba do Instagram do usuário (ex: @meup.viagens)';
COMMENT ON COLUMN tarefa_solicitacoes.dados_extras IS 'Dados extras da solicitação (ex: instagram_handle para missão Instagram)';
COMMENT ON FUNCTION public.solicitar_tarefa_com_dados IS 'Solicita tarefa com dados extras (ex: instagram_handle). Salva o @ no perfil também.';
