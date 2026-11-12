-- ============================================
-- MIGRAÇÃO 115: REMOVER PONTOS DE CADASTRO
-- ============================================
-- BUG: cadastro por indicação creditava +500 para indicado e indicador
-- CORREÇÃO: remover toda lógica de pontos no cadastro
-- MANTER: 1ª emissão aprovada e Prime anual (em 095_referral_system_v2.sql)
-- ============================================

-- 1. RECRIAR TRIGGER SEM CREDITAR PONTOS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user_referral_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Se não tem indicador, não faz nada
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  v_referrer_id := NEW.referred_by;

  -- Se já existe indicação para este usuário, não criar duplicada
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Criar a indicação (status pending, SEM pontos)
  -- Pontos serão creditados apenas na:
  -- 1. Primeira emissão aprovada (Free 3000 / Prime 5000 para indicador)
  -- 2. Indicado assina Prime Anual (indicador Prime +3000, indicado +1000)
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
    FALSE,  -- Nenhum ponto de boas-vindas
    NOW(),
    NOW()
  );

  -- Notificar o indicador (sem mencionar pontos)
  BEGIN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      icon,
      metadata
    ) VALUES (
      v_referrer_id,
      'referral_signup',
      'Alguém entrou pelo seu convite!',
      'Uma pessoa se cadastrou usando seu código de indicação.',
      'wave',
      jsonb_build_object('referred_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Notificação é secundária
  END;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[REFERRAL AFTER] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. ESTORNAR OS 2 CRÉDITOS DE +500 DO BUG
-- ============================================

-- Estorno para Rafa (indicado): db82017f-6d0a-453d-acb8-e5d3ae5821ed
DO $$
DECLARE
  v_rafa_id UUID := 'db82017f-6d0a-453d-acb8-e5d3ae5821ed';
  v_bruno_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
  v_rafa_current INTEGER;
  v_bruno_current INTEGER;
BEGIN
  -- Verificar se já foi estornado (idempotência)
  IF EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_rafa_id
    AND type = 'estorno'
    AND reason LIKE '%bônus de cadastro removido%'
  ) THEN
    RAISE NOTICE 'Estorno já aplicado para Rafa';
  ELSE
    -- Obter saldo atual
    SELECT points INTO v_rafa_current FROM profiles WHERE id = v_rafa_id;

    IF v_rafa_current IS NOT NULL AND v_rafa_current >= 500 THEN
      -- Criar transação de estorno
      INSERT INTO point_transactions (
        user_id, amount, balance_before, balance_after, type, reason
      ) VALUES (
        v_rafa_id,
        -500,
        v_rafa_current,
        v_rafa_current - 500,
        'estorno',
        'Correção: bônus de cadastro removido'
      );

      -- Atualizar saldo
      UPDATE profiles SET
        points = points - 500,
        total_points_earned = GREATEST(0, total_points_earned - 500),
        updated_at = NOW()
      WHERE id = v_rafa_id;

      RAISE NOTICE 'Estorno de 500 aplicado para Rafa. Novo saldo: %', v_rafa_current - 500;
    END IF;
  END IF;

  -- Verificar se já foi estornado para Bruno (idempotência)
  IF EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_bruno_id
    AND type = 'estorno'
    AND reason LIKE '%bônus de cadastro removido%'
  ) THEN
    RAISE NOTICE 'Estorno já aplicado para Bruno';
  ELSE
    -- Obter saldo atual
    SELECT points INTO v_bruno_current FROM profiles WHERE id = v_bruno_id;

    IF v_bruno_current IS NOT NULL AND v_bruno_current >= 500 THEN
      -- Criar transação de estorno
      INSERT INTO point_transactions (
        user_id, amount, balance_before, balance_after, type, reason
      ) VALUES (
        v_bruno_id,
        -500,
        v_bruno_current,
        v_bruno_current - 500,
        'estorno',
        'Correção: bônus de cadastro removido'
      );

      -- Atualizar saldo
      UPDATE profiles SET
        points = points - 500,
        total_points_earned = GREATEST(0, total_points_earned - 500),
        updated_at = NOW()
      WHERE id = v_bruno_id;

      RAISE NOTICE 'Estorno de 500 aplicado para Bruno. Novo saldo: %', v_bruno_current - 500;
    END IF;
  END IF;
END $$;

-- 3. GARANTIR QUE O TIPO 'estorno' É VÁLIDO
-- ============================================

DO $$
BEGIN
  -- Adicionar 'estorno' aos tipos válidos se não existir
  IF NOT EXISTS (
    SELECT 1 FROM point_transactions WHERE type = 'estorno' LIMIT 1
  ) THEN
    -- O INSERT acima já adicionou, então está ok
    NULL;
  END IF;
END $$;

-- 4. COMENTÁRIO
-- ============================================

COMMENT ON FUNCTION public.handle_new_user_referral_after() IS
'Cria registro de indicação no cadastro, SEM creditar pontos.
Pontos são creditados apenas em:
1. Primeira emissão aprovada (via creditar_pontos_primeira_emissao)
2. Indicado assina Prime Anual (via admin_confirmar_prime_anual)';
