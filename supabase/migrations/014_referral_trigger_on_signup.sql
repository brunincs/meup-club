-- ============================================
-- MEUP CLUB - Trigger para criar indicação no cadastro
-- Quando um perfil é criado com referred_by nos metadados,
-- cria automaticamente o registro na tabela referrals.
-- Roda DENTRO do banco, sem depender de sessão do navegador.
-- ============================================

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Roda com permissões do dono (bypassa RLS)
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_code TEXT;
BEGIN
  -- Buscar o referred_by dos metadados do usuário Auth
  -- O signup salva em: user_metadata.referred_by (que é o ID do indicador)
  -- OU pode vir como código, então tentamos ambos

  -- Primeiro, tentar pegar o referrer_id diretamente dos metadados
  SELECT
    COALESCE(
      -- Tentar como UUID direto
      (auth.users.raw_user_meta_data->>'referred_by')::uuid,
      -- Se não for UUID, pode ser o código - buscar o ID
      (SELECT id FROM public.profiles WHERE referral_code = UPPER(auth.users.raw_user_meta_data->>'referred_by'))
    )
  INTO v_referrer_id
  FROM auth.users
  WHERE auth.users.id = NEW.id;

  -- Se não tem indicador, não faz nada
  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validações de segurança:

  -- 1. Não permitir auto-indicação
  IF v_referrer_id = NEW.id THEN
    RAISE WARNING 'Tentativa de auto-indicação bloqueada para usuário %', NEW.id;
    RETURN NEW;
  END IF;

  -- 2. Verificar se o indicador existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_referrer_id) THEN
    RAISE WARNING 'Indicador % não encontrado', v_referrer_id;
    RETURN NEW;
  END IF;

  -- 3. Verificar se já existe indicação para este usuário (evitar duplicata)
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
    RAISE WARNING 'Usuário % já foi indicado anteriormente', NEW.id;
    RETURN NEW;
  END IF;

  -- Tudo ok - criar a indicação pendente
  BEGIN
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      status,
      points_awarded,
      created_at,
      updated_at
    ) VALUES (
      v_referrer_id,
      NEW.id,
      'pending',
      0,
      NOW(),
      NOW()
    );

    -- Atualizar o referred_by no perfil do indicado
    NEW.referred_by := v_referrer_id;

    RAISE NOTICE 'Indicação criada: % indicou %', v_referrer_id, NEW.id;

  EXCEPTION WHEN OTHERS THEN
    -- Log do erro mas não falha o cadastro
    RAISE WARNING 'Erro ao criar indicação: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_new_user_referral ON public.profiles;

-- Criar trigger que dispara ANTES de inserir um novo perfil
-- BEFORE INSERT permite modificar o NEW.referred_by
CREATE TRIGGER trigger_new_user_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_referral();

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_new_user_referral IS
'Trigger que cria automaticamente uma indicação pendente quando um novo usuário se cadastra com código de indicação. Roda no banco, não depende de sessão do navegador.';
