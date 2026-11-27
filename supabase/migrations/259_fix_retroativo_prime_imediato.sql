-- ============================================
-- MIGRATION 259: Fix retroativo - 2.000 pts imediatos para Prime
-- ============================================

-- RETROATIVO: Liberar 2.000 pts de Prime já ativados
DO $$
DECLARE
  v_prime_user RECORD;
  v_count INTEGER := 0;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
BEGIN
  RAISE NOTICE '=== LIBERANDO 2.000 PTS IMEDIATOS PARA PRIME JÁ ATIVADOS ===';

  FOR v_prime_user IN
    SELECT
      p.id,
      p.name,
      p.email,
      p.points,
      p.pontos_bloqueados,
      s.id as subscription_id
    FROM profiles p
    JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
    WHERE COALESCE(p.is_teste, false) = false
      -- Verificar se tem pontos bloqueados mas nenhum crédito imediato de boas-vindas
      AND COALESCE(p.pontos_bloqueados, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM point_transactions pt
        WHERE pt.user_id = p.id
          AND pt.type = 'credit'
          AND pt.reason ILIKE '%boas-vindas%prime%(disponível)%'
      )
    ORDER BY s.created_at ASC
  LOOP
    v_saldo_antes := COALESCE(v_prime_user.points, 0);
    v_saldo_depois := v_saldo_antes + 2000;

    -- Creditar 2.000 imediatos
    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (
      v_prime_user.id, 2000, 'credit',
      'Bônus de boas-vindas Prime (disponível) [retroativo]',
      v_saldo_antes, v_saldo_depois
    );

    UPDATE profiles SET
      points = v_saldo_depois,
      -- Reduzir o bloqueado (o 2000 agora está disponível)
      pontos_bloqueados = GREATEST(0, COALESCE(pontos_bloqueados, 0) - 2000)
    WHERE id = v_prime_user.id;

    -- Ajustar pending_points se existir
    UPDATE pending_points SET
      pontos = GREATEST(pontos - 2000, 0)
    WHERE user_id = v_prime_user.id
      AND motivo ILIKE '%boas-vindas%prime%'
      AND status = 'pendente';

    -- Remover se ficou zerado
    DELETE FROM pending_points
    WHERE user_id = v_prime_user.id
      AND pontos = 0
      AND status = 'pendente';

    v_count := v_count + 1;
    RAISE NOTICE 'Liberado 2.000 pts imediatos para: % (%)', v_prime_user.name, v_prime_user.email;
  END LOOP;

  RAISE NOTICE '✓ Retroativo: % usuários Prime receberam 2.000 pts imediatos', v_count;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 259: Retroativo de 2.000 pts imediatos para Prime concluído';
END $$;
