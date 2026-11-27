-- ============================================
-- MIGRATION 233: Adicionar tipos de notificação de emissão
-- Problema: 'emissao_aprovada' e 'emissao_recusada' foram removidos
-- ============================================

-- ============================================
-- 1. ATUALIZAR CHECK CONSTRAINT COM TIPOS DE EMISSÃO
-- ============================================

-- Remover constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Atualizar tipos inválidos antes de criar constraint
UPDATE notifications
SET type = 'info'
WHERE type IS NULL
   OR type NOT IN (
     'info', 'success', 'warning', 'error', 'reward', 'level_up', 'sale',
     'access', 'referral', 'subscription', 'welcome',
     'emissao_aprovada', 'emissao_recusada', 'tarefa_aprovada', 'tarefa_rejeitada',
     'referral_signup', 'checkin', 'mission', 'delivery'
   );

-- Criar nova constraint com todos os tipos necessários
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'info', 'success', 'warning', 'error', 'reward', 'level_up', 'sale',
    'access', 'referral', 'subscription', 'welcome',
    'emissao_aprovada', 'emissao_recusada', 'tarefa_aprovada', 'tarefa_rejeitada',
    'referral_signup', 'checkin', 'mission', 'delivery'
  ));

-- ============================================
-- 2. RECRIAR aprovar_emissao_seguro (CORRIGIDO)
-- ============================================

CREATE OR REPLACE FUNCTION public.aprovar_emissao_seguro(
  p_emissao_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissao RECORD;
  v_pontos INTEGER;
  v_is_admin BOOLEAN;
  v_credit_result JSONB;
  v_plano TEXT;
  v_multiplicador NUMERIC;
BEGIN
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar emissão com lock (FOR UPDATE previne race conditions)
  SELECT * INTO v_emissao
  FROM emissoes
  WHERE id = p_emissao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  -- ANTI-DUPLO-CRÉDITO: verificar status
  IF v_emissao.status != 'pendente' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta emissão já foi processada',
      'status_atual', v_emissao.status
    );
  END IF;

  -- Buscar plano do usuário para aplicar multiplicador correto
  SELECT
    COALESCE(s.plano, 'free'),
    CASE
      WHEN s.plano = 'prime' AND s.ciclo = 'anual' THEN 1.5
      WHEN s.plano = 'prime' THEN 1.0
      ELSE 0.5  -- Free = 0.5 pt por R$1
    END
  INTO v_plano, v_multiplicador
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
  WHERE p.id = v_emissao.user_id;

  -- Calcular pontos com multiplicador
  v_pontos := FLOOR(v_emissao.valor * COALESCE(v_multiplicador, 0.5));

  -- CREDITAR VIA FUNÇÃO CENTRAL
  BEGIN
    v_credit_result := public.creditar_pontos_interno(
      v_emissao.user_id,
      v_pontos,
      'credit',
      'Emissão aprovada: R$ ' || v_emissao.valor::TEXT || ' (' || v_plano || ')'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se a função não existir, tentar método direto
    v_credit_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  -- Se creditar_pontos_interno falhou, tentar método direto
  IF v_credit_result IS NULL OR NOT COALESCE((v_credit_result->>'success')::boolean, false) THEN
    -- Crédito direto
    DECLARE
      v_saldo_atual INTEGER;
      v_saldo_novo INTEGER;
    BEGIN
      SELECT COALESCE(points, 0) INTO v_saldo_atual FROM profiles WHERE id = v_emissao.user_id;
      v_saldo_novo := v_saldo_atual + v_pontos;

      INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
      VALUES (v_emissao.user_id, v_pontos, 'credit', 'Emissão aprovada: R$ ' || v_emissao.valor::TEXT, v_saldo_atual, v_saldo_novo);

      UPDATE profiles
      SET points = v_saldo_novo,
          total_points_earned = COALESCE(total_points_earned, 0) + v_pontos,
          updated_at = NOW()
      WHERE id = v_emissao.user_id;

      v_credit_result := jsonb_build_object('success', true, 'balance_after', v_saldo_novo);
    END;
  END IF;

  -- Atualizar status da emissão
  UPDATE emissoes
  SET
    status = 'aprovada',
    pontos_creditados = v_pontos,
    multiplicador_aplicado = v_multiplicador,
    plano_na_aprovacao = v_plano,
    admin_id = p_admin_id,
    processed_at = NOW()
  WHERE id = p_emissao_id;

  -- Notificação (NÃO-FATAL)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_emissao.user_id,
      'emissao_aprovada',
      'Viagem aprovada!',
      'Sua emissão de R$ ' || v_emissao.valor::TEXT || ' foi aprovada. +' || v_pontos::TEXT || ' pontos creditados!',
      false
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_creditados', v_pontos,
    'valor', v_emissao.valor,
    'plano', v_plano,
    'multiplicador', v_multiplicador,
    'user_id', v_emissao.user_id,
    'balance_after', COALESCE((v_credit_result->>'balance_after')::integer, 0)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 3. GARANTIR PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.aprovar_emissao_seguro(UUID, UUID) TO authenticated;

-- ============================================
-- 4. NOTIFICAR POSTGREST
-- ============================================

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 233: Tipos de notificação de emissão restaurados';
  RAISE NOTICE '  - emissao_aprovada, emissao_recusada adicionados';
  RAISE NOTICE '  - aprovar_emissao_seguro corrigida';
END $$;
