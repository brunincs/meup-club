-- ============================================
-- MIGRATION 230: Fix bônus de boas-vindas Free (1.000 pts)
-- Problema: type='welcome' não está no CHECK constraint das notifications
-- ============================================

-- ============================================
-- 1. ADICIONAR 'welcome' AO CHECK CONSTRAINT
-- ============================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'success', 'warning', 'error', 'reward', 'level_up', 'sale', 'access', 'referral', 'subscription', 'welcome'));

-- ============================================
-- 2. GARANTIR CONFIG CORRETA
-- ============================================

INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_boas_vindas_free', 1000, 'Pontos de boas-vindas para Free aprovado')
ON CONFLICT (chave) DO UPDATE SET valor = 1000;

-- ============================================
-- 3. RECRIAR creditar_boas_vindas_free COM EXCEPTION HANDLER
-- ============================================

CREATE OR REPLACE FUNCTION creditar_boas_vindas_free(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER;
  v_ja_creditado BOOLEAN;
  v_profile RECORD;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
BEGIN
  -- Verificar se usuário existe
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Não creditar para contas de teste
  IF COALESCE(v_profile.is_teste, false) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Conta de teste');
  END IF;

  -- Verificar se já recebeu bônus de boas-vindas Free (pela reason específica)
  SELECT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = p_user_id
    AND (reason ILIKE '%boas-vindas%lançamento%' OR reason ILIKE '%boas-vindas%free%')
  ) INTO v_ja_creditado;

  IF v_ja_creditado THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Já recebeu bônus');
  END IF;

  -- Buscar valor do config (SEMPRE 1000 para Free)
  SELECT COALESCE(valor, 1000)::INTEGER INTO v_pontos
  FROM plano_config WHERE chave = 'pontos_boas_vindas_free';

  v_pontos := COALESCE(v_pontos, 1000);

  -- Calcular saldos
  v_saldo_antes := COALESCE(v_profile.points, 0);
  v_saldo_depois := v_saldo_antes + v_pontos;

  -- Creditar pontos
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    p_user_id,
    v_pontos,
    'credit',
    'Bônus de boas-vindas Free · lançamento Me,up Club',
    v_saldo_antes,
    v_saldo_depois
  );

  -- Atualizar saldo
  UPDATE profiles
  SET points = v_saldo_depois
  WHERE id = p_user_id;

  -- Criar notificação (com exception handler para não falhar)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, is_read)
    VALUES (
      p_user_id,
      'welcome',
      'Bônus de boas-vindas!',
      'Você ganhou ' || v_pontos || ' pts de boas-vindas no Me,up Club!',
      FALSE
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignora erro de notificação
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'message', 'Bônus de boas-vindas creditado'
  );
END;
$$;

-- ============================================
-- 4. AJUSTAR USUÁRIOS QUE RECEBERAM VALOR ERRADO
-- Para cada Free aprovado com boas-vindas != 1000, lançar diferença
-- ============================================

DO $$
DECLARE
  v_user RECORD;
  v_bonus_atual INTEGER;
  v_diferenca INTEGER;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
  v_ajustados INTEGER := 0;
BEGIN
  -- Buscar usuários Free aprovados
  FOR v_user IN
    SELECT p.id, p.email, p.name, p.points
    FROM profiles p
    WHERE p.status_acesso = 'aprovado'
      AND COALESCE(p.is_teste, false) = false
      AND COALESCE(p.is_fundador, false) = false
      -- Não é Prime
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id
          AND s.status = 'active'
          AND s.plano = 'prime'
      )
  LOOP
    -- Verificar quanto de boas-vindas recebeu
    SELECT COALESCE(SUM(amount), 0) INTO v_bonus_atual
    FROM point_transactions
    WHERE user_id = v_user.id
      AND (reason ILIKE '%boas-vindas%' OR reason ILIKE '%bonus%boas%');

    -- Se recebeu menos de 1000, ajustar
    IF v_bonus_atual > 0 AND v_bonus_atual < 1000 THEN
      v_diferenca := 1000 - v_bonus_atual;
      v_saldo_antes := COALESCE(v_user.points, 0);
      v_saldo_depois := v_saldo_antes + v_diferenca;

      -- Creditar a diferença
      INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
      VALUES (
        v_user.id,
        v_diferenca,
        'credit',
        'Ajuste bônus de boas-vindas Free (complemento)',
        v_saldo_antes,
        v_saldo_depois
      );

      -- Atualizar saldo
      UPDATE profiles SET points = v_saldo_depois WHERE id = v_user.id;

      v_ajustados := v_ajustados + 1;
      RAISE NOTICE 'Ajustado: % (%) - +% pts (tinha %, agora 1000)',
        v_user.name, v_user.email, v_diferenca, v_bonus_atual;
    END IF;

    -- Se não recebeu nenhum bônus, creditar 1000
    IF v_bonus_atual = 0 THEN
      v_saldo_antes := COALESCE(v_user.points, 0);
      v_saldo_depois := v_saldo_antes + 1000;

      INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
      VALUES (
        v_user.id,
        1000,
        'credit',
        'Bônus de boas-vindas Free · lançamento Me,up Club',
        v_saldo_antes,
        v_saldo_depois
      );

      UPDATE profiles SET points = v_saldo_depois WHERE id = v_user.id;

      v_ajustados := v_ajustados + 1;
      RAISE NOTICE 'Creditado: % (%) - +1000 pts (não tinha bônus)',
        v_user.name, v_user.email;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Total de usuários ajustados: %', v_ajustados;
END $$;

-- ============================================
-- 5. PERMISSÕES
-- ============================================
GRANT EXECUTE ON FUNCTION creditar_boas_vindas_free(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 230: Bônus Free 1.000 corrigido';
END $$;
