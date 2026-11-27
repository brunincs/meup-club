-- ============================================
-- MIGRATION 269: Fix proteção de level_id
-- O level_id é calculado automaticamente por trigger
-- Não faz sentido bloquear já que o usuário não controla
-- ============================================

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_caller_id UUID;
  v_internal_call BOOLEAN;
BEGIN
  -- Verificar se é chamada interna (via set_config)
  v_internal_call := COALESCE(current_setting('app.internal_credit', true), 'false') = 'true';

  -- Se é chamada interna confiável, permite tudo
  IF v_internal_call THEN
    RETURN NEW;
  END IF;

  -- Obter ID do chamador
  v_caller_id := auth.uid();

  -- Verificar se chamador é admin ou super_admin
  IF v_caller_id IS NOT NULL THEN
    SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  -- Se É admin, permite tudo
  IF COALESCE(v_is_admin, false) THEN
    RETURN NEW;
  END IF;

  -- Se NÃO é admin, bloquear alterações em campos sensíveis
  -- BLOQUEAR alteração de role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Não é permitido alterar o campo role. Apenas administradores podem fazer isso.';
  END IF;

  -- BLOQUEAR alteração de points (exceto se vier de trigger de level)
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    RAISE EXCEPTION 'Não é permitido alterar pontos diretamente. Use as funções de crédito/débito.';
  END IF;

  -- level_id: NÃO BLOQUEAR mais
  -- É calculado automaticamente por outro trigger (trg_update_level_id)
  -- Não faz sentido bloquear pois o usuário não tem controle

  -- BLOQUEAR alteração de total_referrals (calculado automaticamente)
  IF NEW.total_referrals IS DISTINCT FROM OLD.total_referrals THEN
    RAISE EXCEPTION 'Não é permitido alterar total_referrals diretamente.';
  END IF;

  -- BLOQUEAR alteração de referral_code (gerado uma vez)
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Não é permitido alterar o código de indicação.';
  END IF;

  -- Passou nas validações, permite o UPDATE
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. Corrigir o usuário Prime que não recebeu bônus de lançamento
-- ============================================
DO $$
DECLARE
  v_user RECORD;
  v_result JSONB;
  v_dias INTEGER;
  v_liberar_em TIMESTAMPTZ;
BEGIN
  -- Carência
  v_dias := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
  v_liberar_em := NOW() + (v_dias || ' days')::INTERVAL;

  -- Buscar Primes sem bônus de lançamento
  FOR v_user IN
    SELECT
      p.id,
      p.name,
      p.email,
      s.id as sub_id
    FROM profiles p
    JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
    WHERE COALESCE(p.is_teste, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM pending_points pp
        WHERE pp.user_id = p.id
          AND pp.motivo ILIKE '%lançamento%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM point_transactions pt
        WHERE pt.user_id = p.id
          AND pt.reason ILIKE '%lançamento%bloqueado%'
      )
  LOOP
    RAISE NOTICE 'Creditando bônus de lançamento para: % (%)', v_user.name, v_user.email;

    -- Setar bypass
    PERFORM set_config('app.internal_credit', 'true', true);

    BEGIN
      SELECT creditar_pontos_bloqueados(
        v_user.id,
        3000,
        'Bônus de lançamento · até 30/11 (libera em 7 dias)',
        v_liberar_em,
        NULL,
        v_user.sub_id
      ) INTO v_result;

      IF (v_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '✓ Bônus creditado: %', v_result;
      ELSE
        RAISE NOTICE '✗ Erro: %', v_result->>'error';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '✗ Exceção: %', SQLERRM;
    END;

    -- Limpar bypass
    PERFORM set_config('app.internal_credit', 'false', true);
  END LOOP;
END $$;

-- ============================================
-- FIM
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 269: Proteção de level_id removida (calculado automaticamente)';
END $$;
