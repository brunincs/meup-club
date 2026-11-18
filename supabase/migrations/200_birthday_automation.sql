-- =============================================
-- MIGRAÇÃO 200: CAMPOS PARA AUTOMAÇÃO DE ANIVERSÁRIO
--
-- Adiciona campos para controle de edição de data de nascimento
-- e proteção anti-fraude (impedir mudança constante para ganhar bônus)
-- =============================================

-- =============================================
-- 1. ADICIONAR CAMPO birth_date_set_at EM PROFILES
-- Registra quando o usuário definiu/alterou a data de nascimento
-- =============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date_set_at TIMESTAMPTZ DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.birth_date_set_at IS 'Data/hora em que o usuário definiu a data de nascimento (controle anti-fraude)';

-- =============================================
-- 2. CRIAR FUNÇÃO can_edit_birth_date()
-- Verifica se o usuário pode editar sua data de nascimento
-- Regra: pode editar apenas 1x (quando birth_date_set_at IS NULL)
-- =============================================
CREATE OR REPLACE FUNCTION public.can_edit_birth_date(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_birth_date_set_at TIMESTAMPTZ;
  v_birth_date DATE;
  v_can_edit BOOLEAN;
BEGIN
  -- Buscar dados do usuário
  SELECT birth_date_set_at, birth_date
  INTO v_birth_date_set_at, v_birth_date
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_edit', false,
      'reason', 'Usuário não encontrado'
    );
  END IF;

  -- Pode editar se nunca definiu (birth_date_set_at IS NULL)
  v_can_edit := v_birth_date_set_at IS NULL;

  IF v_can_edit THEN
    RETURN jsonb_build_object(
      'can_edit', true,
      'reason', 'Data de nascimento ainda não foi definida'
    );
  ELSE
    RETURN jsonb_build_object(
      'can_edit', false,
      'reason', 'Data de nascimento já foi definida em ' || to_char(v_birth_date_set_at, 'DD/MM/YYYY'),
      'set_at', v_birth_date_set_at,
      'current_value', v_birth_date
    );
  END IF;
END;
$$;

-- =============================================
-- 3. CRIAR TRIGGER protect_birth_date
-- Impede alteração da data de nascimento após primeira definição
-- =============================================
CREATE OR REPLACE FUNCTION public.protect_birth_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_caller_id UUID;
BEGIN
  -- Verificar se é admin
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  -- Se é admin, permite qualquer alteração
  IF COALESCE(v_is_admin, false) THEN
    -- Se admin está definindo birth_date e ainda não havia sido definido
    IF NEW.birth_date IS NOT NULL AND OLD.birth_date IS NULL AND OLD.birth_date_set_at IS NULL THEN
      NEW.birth_date_set_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- Se birth_date está sendo alterado
  IF NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
    -- Se já foi definido anteriormente (birth_date_set_at não é NULL)
    IF OLD.birth_date_set_at IS NOT NULL THEN
      RAISE EXCEPTION 'Não é permitido alterar a data de nascimento após a primeira definição. Entre em contato com o suporte.';
    END IF;

    -- Se está definindo pela primeira vez
    IF NEW.birth_date IS NOT NULL THEN
      -- Validar que a data é razoável (idade entre 13 e 120 anos)
      IF NEW.birth_date > CURRENT_DATE - INTERVAL '13 years' THEN
        RAISE EXCEPTION 'Data de nascimento inválida. Idade mínima: 13 anos.';
      END IF;

      IF NEW.birth_date < CURRENT_DATE - INTERVAL '120 years' THEN
        RAISE EXCEPTION 'Data de nascimento inválida. Verifique a data informada.';
      END IF;

      -- Registrar o momento da definição
      NEW.birth_date_set_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS tr_protect_birth_date ON public.profiles;

-- Criar trigger BEFORE UPDATE
CREATE TRIGGER tr_protect_birth_date
BEFORE UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.birth_date IS DISTINCT FROM OLD.birth_date)
EXECUTE FUNCTION protect_birth_date();

-- =============================================
-- 4. PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.can_edit_birth_date(UUID) TO authenticated;

-- =============================================
-- 5. ATUALIZAR birth_date_set_at PARA USUÁRIOS QUE JÁ TÊM birth_date
-- (define como a data de criação do perfil para não permitir alteração)
-- =============================================
UPDATE public.profiles
SET birth_date_set_at = COALESCE(updated_at, created_at)
WHERE birth_date IS NOT NULL
  AND birth_date_set_at IS NULL;

-- =============================================
-- 6. NOTIFICAR POSTGREST
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 7. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 200: Campos para automação de aniversário';
  RAISE NOTICE '  - Coluna birth_date_set_at adicionada';
  RAISE NOTICE '  - Função can_edit_birth_date() criada';
  RAISE NOTICE '  - Trigger protect_birth_date criado';
  RAISE NOTICE '  - Usuários existentes com birth_date marcados';
END $$;
