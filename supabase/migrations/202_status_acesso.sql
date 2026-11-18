-- =============================================
-- MIGRAÇÃO 202: STATUS DE ACESSO
--
-- Novo modelo de entrada por aprovação:
-- - Qualquer pessoa cria conta, mas fica "em_analise"
-- - Admin aprova/recusa/espera
-- - Sistema verifica status para liberar acesso
-- =============================================

-- =============================================
-- 1. CRIAR TIPO ENUM PARA STATUS DE ACESSO
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_acesso_type') THEN
    CREATE TYPE status_acesso_type AS ENUM ('em_analise', 'aprovado', 'recusado', 'em_espera');
  END IF;
END $$;

-- =============================================
-- 2. ADICIONAR COLUNAS EM PROFILES
-- =============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status_acesso status_acesso_type DEFAULT 'em_analise';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS solicitacao_acesso_em TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS acesso_aprovado_em TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS acesso_aprovado_por UUID DEFAULT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS motivo_recusa TEXT DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.status_acesso IS 'Status de acesso: em_analise (aguardando), aprovado, recusado, em_espera';
COMMENT ON COLUMN public.profiles.solicitacao_acesso_em IS 'Data/hora da criação da conta (solicitação de acesso)';
COMMENT ON COLUMN public.profiles.acesso_aprovado_em IS 'Data/hora da aprovação (se aprovado)';
COMMENT ON COLUMN public.profiles.acesso_aprovado_por IS 'ID do admin que aprovou/recusou';
COMMENT ON COLUMN public.profiles.motivo_recusa IS 'Motivo da recusa (se recusado)';

-- =============================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_status_acesso ON public.profiles(status_acesso);
CREATE INDEX IF NOT EXISTS idx_profiles_solicitacao_acesso ON public.profiles(solicitacao_acesso_em) WHERE status_acesso = 'em_analise';

-- =============================================
-- 4. MIGRAR USUÁRIOS EXISTENTES PARA 'aprovado'
-- Todos os usuários que já existem estão implicitamente aprovados
-- =============================================
UPDATE public.profiles
SET
  status_acesso = 'aprovado',
  solicitacao_acesso_em = COALESCE(created_at, NOW()),
  acesso_aprovado_em = COALESCE(created_at, NOW())
WHERE status_acesso IS NULL OR status_acesso = 'em_analise';

-- Garantir que novos registros tenham solicitacao_acesso_em preenchido
CREATE OR REPLACE FUNCTION public.set_solicitacao_acesso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se é INSERT e solicitacao_acesso_em não foi definido
  IF NEW.solicitacao_acesso_em IS NULL THEN
    NEW.solicitacao_acesso_em := NOW();
  END IF;

  -- Se status_acesso não foi definido, usar 'em_analise'
  IF NEW.status_acesso IS NULL THEN
    NEW.status_acesso := 'em_analise';
  END IF;

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS tr_set_solicitacao_acesso ON public.profiles;

-- Criar trigger BEFORE INSERT
CREATE TRIGGER tr_set_solicitacao_acesso
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION set_solicitacao_acesso();

-- =============================================
-- 5. FUNÇÃO HELPER: Verificar se acesso está liberado
-- =============================================
CREATE OR REPLACE FUNCTION public.acesso_liberado(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status status_acesso_type;
BEGIN
  SELECT status_acesso INTO v_status
  FROM profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_status, 'em_analise') = 'aprovado';
END;
$$;

-- =============================================
-- 6. FUNÇÃO: Obter status de acesso detalhado
-- =============================================
CREATE OR REPLACE FUNCTION public.get_status_acesso(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_antes_abertura BOOLEAN;
  v_data_abertura DATE := '2026-11-27'; -- Data de início das aprovações
BEGIN
  SELECT
    status_acesso,
    solicitacao_acesso_em,
    acesso_aprovado_em,
    motivo_recusa,
    name
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  v_antes_abertura := CURRENT_DATE < v_data_abertura;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_profile.status_acesso,
    'solicitacao_em', v_profile.solicitacao_acesso_em,
    'aprovado_em', v_profile.acesso_aprovado_em,
    'motivo_recusa', v_profile.motivo_recusa,
    'antes_abertura', v_antes_abertura,
    'data_abertura', v_data_abertura,
    'mensagem', CASE
      WHEN v_profile.status_acesso = 'aprovado' THEN 'Acesso liberado'
      WHEN v_profile.status_acesso = 'recusado' THEN COALESCE(v_profile.motivo_recusa, 'Acesso não aprovado')
      WHEN v_antes_abertura THEN 'Sua conta está reservada. As aprovações começam em 27/11.'
      ELSE 'Sua solicitação está em análise. Respondemos em até 24h úteis.'
    END
  );
END;
$$;

-- =============================================
-- 7. PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.acesso_liberado(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_status_acesso(UUID) TO authenticated;

-- =============================================
-- 8. NOTIFICAR POSTGREST
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 9. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 202: Status de Acesso';
  RAISE NOTICE '  - Tipo status_acesso_type criado';
  RAISE NOTICE '  - Colunas status_acesso, solicitacao_acesso_em, etc adicionadas';
  RAISE NOTICE '  - Usuários existentes migrados para aprovado';
  RAISE NOTICE '  - Funções acesso_liberado() e get_status_acesso() criadas';
END $$;
