-- ============================================
-- MIGRATION 250: Fix indicação - notificação duplicada + missões duplicadas
-- ============================================

-- ============================================
-- PARTE 1: NOTIFICAÇÃO DUPLICADA
-- ============================================

-- 1.1 Dropar trigger que dispara em referrals (causa duplicata)
DROP TRIGGER IF EXISTS trigger_notify_referral_signup ON public.referrals;
DROP FUNCTION IF EXISTS public.notify_referral_signup();

-- 1.2 Atualizar handle_new_user_referral_after com texto novo e proteção duplicata
CREATE OR REPLACE FUNCTION public.handle_new_user_referral_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_name TEXT;
  v_primeiro_nome TEXT;
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

  -- Pegar o nome do indicado
  v_referred_name := COALESCE(NEW.name, 'Alguém');
  v_primeiro_nome := SPLIT_PART(v_referred_name, ' ', 1);

  -- Criar a indicação (status pending, SEM pontos)
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
      FALSE,
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar referral: %', SQLERRM;
  END;

  -- Notificar o indicador (PROTEÇÃO CONTRA DUPLICATA)
  BEGIN
    -- Só inserir se não existir notificação recente para este par
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_referrer_id
        AND type IN ('info', 'referral_signup', 'referral')
        AND metadata->>'referred_id' = NEW.id::TEXT
        AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
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
        'Nova indicação!',
        v_primeiro_nome || ' se cadastrou com seu link. Você ganha seus pontos quando a 1ª viagem dele(a) for aprovada.',
        'sparkles',
        jsonb_build_object('referred_id', NEW.id, 'referred_name', v_primeiro_nome)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Notificação é secundária
  END;

  -- ============================================
  -- COMPLETAR MISSÃO "Primeira indicação" (100 pts)
  -- ============================================
  BEGIN
    -- Verificar se é a primeira indicação deste usuário
    IF NOT EXISTS (
      SELECT 1 FROM public.referrals
      WHERE referrer_id = v_referrer_id
        AND referred_id != NEW.id
    ) THEN
      -- Se ainda não completou a missão
      IF NOT EXISTS (
        SELECT 1 FROM public.missoes_automaticas_concluidas
        WHERE user_id = v_referrer_id
          AND missao_tipo = 'primeira_indicacao'
      ) THEN
        -- Completar missão
        PERFORM completar_missao_automatica(
          v_referrer_id,
          'primeira_indicacao',
          100,
          'Missão: Primeira indicação'
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao completar missão primeira_indicacao: %', SQLERRM;
  END;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[REFERRAL AFTER] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 1.3 Limpar notificações duplicadas (manter a mais recente de cada par)
DO $$
DECLARE
  v_pair RECORD;
  v_deleted INTEGER := 0;
BEGIN
  -- Para cada par indicador+indicado que tem mais de uma notificação
  FOR v_pair IN
    SELECT user_id, metadata->>'referred_id' as referred_id, COUNT(*) as cnt
    FROM notifications
    WHERE type IN ('info', 'referral_signup', 'referral')
      AND metadata->>'referred_id' IS NOT NULL
      AND (
        title ILIKE '%entrou pelo seu convite%'
        OR title ILIKE '%nova indicação%'
        OR message ILIKE '%se cadastrou usando%'
      )
    GROUP BY user_id, metadata->>'referred_id'
    HAVING COUNT(*) > 1
  LOOP
    -- Deletar todas exceto a mais recente
    DELETE FROM notifications
    WHERE id IN (
      SELECT id FROM notifications
      WHERE user_id = v_pair.user_id
        AND type IN ('info', 'referral_signup', 'referral')
        AND metadata->>'referred_id' = v_pair.referred_id
        AND (
          title ILIKE '%entrou pelo seu convite%'
          OR title ILIKE '%nova indicação%'
          OR message ILIKE '%se cadastrou usando%'
        )
      ORDER BY created_at DESC
      OFFSET 1
    );

    v_deleted := v_deleted + (v_pair.cnt - 1);
  END LOOP;

  IF v_deleted > 0 THEN
    RAISE NOTICE '✓ % notificações duplicadas removidas', v_deleted;
  END IF;
END $$;

-- 1.4 Atualizar texto das notificações antigas
UPDATE notifications
SET
  title = 'Nova indicação!',
  icon = 'sparkles'
WHERE type IN ('info', 'referral_signup', 'referral')
  AND (
    title ILIKE '%entrou pelo seu convite%'
    OR title = 'Alguem entrou pelo seu convite!'
  );

-- ============================================
-- PARTE 2: MISSÕES DUPLICADAS
-- ============================================

-- 2.1 Desativar "Primeira venda" (manter histórico)
UPDATE tarefas
SET ativa = FALSE
WHERE nome ILIKE '%primeira venda%';

-- 2.2 Ajustar descrição de "Primeira indicação"
UPDATE tarefas
SET descricao = 'Um amigo se cadastrou com seu link de indicação'
WHERE nome ILIKE '%primeira indicação%'
  AND tipo = 'unica';

-- 2.3 Completar "Primeira indicação" para quem já tem indicado mas não recebeu
DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN
    -- Usuários que indicaram alguém mas não têm a missão concluída
    SELECT DISTINCT r.referrer_id as user_id
    FROM referrals r
    WHERE NOT EXISTS (
      SELECT 1 FROM missoes_automaticas_concluidas mac
      WHERE mac.user_id = r.referrer_id
        AND mac.missao_tipo = 'primeira_indicacao'
    )
  LOOP
    -- Verificar se já recebeu pontos dessa missão antes
    IF NOT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE user_id = v_user.user_id
        AND reason ILIKE '%primeira indicação%'
    ) THEN
      -- Registrar missão como concluída (sem creditar pontos retroativamente)
      INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos, created_at)
      VALUES (v_user.user_id, 'primeira_indicacao', 0, NOW())
      ON CONFLICT DO NOTHING;

      v_count := v_count + 1;
    ELSE
      -- Já recebeu pontos, só registrar a conclusão
      INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos, created_at)
      VALUES (v_user.user_id, 'primeira_indicacao', 100, NOW())
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE '✓ % missões "Primeira indicação" registradas', v_count;
  END IF;
END $$;

-- 2.4 Ajustar descrição de outras missões de indicação
UPDATE tarefas
SET descricao = 'Tenha 5 amigos cadastrados com seu link'
WHERE nome ILIKE '%5 indicações%';

UPDATE tarefas
SET descricao = 'Tenha 10 amigos cadastrados com seu link'
WHERE nome ILIKE '%10 indicações%';

-- ============================================
-- GARANTIR PERMISSÕES
-- ============================================
GRANT EXECUTE ON FUNCTION public.handle_new_user_referral_after() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_referral_after() TO service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 250 concluída:';
  RAISE NOTICE '  - Trigger trigger_notify_referral_signup removido';
  RAISE NOTICE '  - handle_new_user_referral_after atualizada com texto novo';
  RAISE NOTICE '  - Notificações duplicadas limpas';
  RAISE NOTICE '  - "Primeira venda" desativada';
  RAISE NOTICE '  - "Primeira indicação" ajustada';
END $$;
