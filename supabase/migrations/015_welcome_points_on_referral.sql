-- ============================================
-- MEUP CLUB - 500 Pontos de Boas-Vindas por Indicação
-- Quando alguém se cadastra por link de indicação:
-- - INDICADO ganha 500 pontos automático
-- - INDICADOR ganha 500 pontos automático
-- Separado dos 3.000 que só caem na aprovação manual.
-- ============================================

-- Constantes (fácil de ajustar depois)
-- PONTOS_BOAS_VINDAS = 500
-- LIMITE_INDICACOES_AUTOMATICAS = 20 (anti-abuso)

-- ============================================
-- Atualizar a função do trigger para incluir os 500 pontos
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_name TEXT;
  v_welcome_points INTEGER := 500;  -- PONTOS_BOAS_VINDAS
  v_max_auto_referrals INTEGER := 20;  -- Limite anti-abuso
  v_current_auto_count INTEGER;
BEGIN
  -- Buscar o referred_by dos metadados do usuário Auth
  SELECT
    COALESCE(
      (auth.users.raw_user_meta_data->>'referred_by')::uuid,
      (SELECT id FROM public.profiles WHERE referral_code = UPPER(auth.users.raw_user_meta_data->>'referred_by'))
    )
  INTO v_referrer_id
  FROM auth.users
  WHERE auth.users.id = NEW.id;

  -- Se não tem indicador, não faz nada
  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ═══════════════════════════════════════════
  -- VALIDAÇÕES DE SEGURANÇA (FREIO ANTI-ABUSO)
  -- ═══════════════════════════════════════════

  -- 1. Não permitir auto-indicação
  IF v_referrer_id = NEW.id THEN
    RAISE WARNING '[MEUP] Auto-indicação bloqueada: %', NEW.id;
    RETURN NEW;
  END IF;

  -- 2. Verificar se o indicador existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_referrer_id) THEN
    RAISE WARNING '[MEUP] Indicador não encontrado: %', v_referrer_id;
    RETURN NEW;
  END IF;

  -- 3. Verificar se já existe indicação para este usuário (evitar duplicata)
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
    RAISE WARNING '[MEUP] Usuário já foi indicado: %', NEW.id;
    RETURN NEW;
  END IF;

  -- 4. LIMITE ANTI-ABUSO: contar quantas indicações automáticas o indicador já recebeu
  SELECT COUNT(*) INTO v_current_auto_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id
    AND welcome_points_given = true;

  -- ═══════════════════════════════════════════
  -- CRIAR A INDICAÇÃO PENDENTE
  -- ═══════════════════════════════════════════
  BEGIN
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      status,
      points_awarded,
      welcome_points_given,
      created_at,
      updated_at
    ) VALUES (
      v_referrer_id,
      NEW.id,
      'pending',
      0,
      true,  -- Marca que os pontos de boas-vindas foram processados
      NOW(),
      NOW()
    );

    -- Atualizar o referred_by no perfil do indicado
    NEW.referred_by := v_referrer_id;

    -- ═══════════════════════════════════════════
    -- CREDITAR 500 PONTOS AO INDICADO (novo usuário)
    -- ═══════════════════════════════════════════
    NEW.points := COALESCE(NEW.points, 0) + v_welcome_points;

    -- Registrar no histórico
    INSERT INTO public.point_transactions (
      user_id, amount, type, reason, created_at
    ) VALUES (
      NEW.id,
      v_welcome_points,
      'welcome_referral',
      'Boas-vindas: cadastro por indicação',
      NOW()
    );

    RAISE NOTICE '[MEUP] +500 pontos boas-vindas para indicado: %', NEW.id;

    -- ═══════════════════════════════════════════
    -- CREDITAR 500 PONTOS AO INDICADOR (se dentro do limite)
    -- ═══════════════════════════════════════════
    IF v_current_auto_count < v_max_auto_referrals THEN
      UPDATE public.profiles
      SET
        points = COALESCE(points, 0) + v_welcome_points,
        updated_at = NOW()
      WHERE id = v_referrer_id;

      -- Registrar no histórico do indicador
      INSERT INTO public.point_transactions (
        user_id, amount, type, reason, created_at
      ) VALUES (
        v_referrer_id,
        v_welcome_points,
        'welcome_referral',
        'Boas-vindas: indicação de novo membro',
        NOW()
      );

      RAISE NOTICE '[MEUP] +500 pontos boas-vindas para indicador: % (total auto: %)', v_referrer_id, v_current_auto_count + 1;
    ELSE
      RAISE NOTICE '[MEUP] Indicador % atingiu limite de % indicações automáticas', v_referrer_id, v_max_auto_referrals;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[MEUP] Erro ao processar indicação: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ============================================
-- Adicionar coluna para controle dos 500 pontos
-- (se já existe, ignora)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'referrals'
      AND column_name = 'welcome_points_given'
  ) THEN
    ALTER TABLE public.referrals
    ADD COLUMN welcome_points_given BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Marcar indicações existentes como já processadas
UPDATE public.referrals
SET welcome_points_given = true
WHERE welcome_points_given IS NULL OR welcome_points_given = false;

-- ============================================
-- Comentário explicativo
-- ============================================
COMMENT ON FUNCTION public.handle_new_user_referral IS
'Trigger que:
1. Cria indicação pendente (3.000 pontos só na aprovação manual)
2. Credita 500 pontos de boas-vindas ao INDICADO (automático)
3. Credita 500 pontos de boas-vindas ao INDICADOR (automático, limite 20)
Anti-abuso: sem auto-indicação, sem duplicatas, limite de 20 indicações automáticas por pessoa.';
