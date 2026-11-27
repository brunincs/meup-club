-- ============================================
-- MIGRATION 237: Corrigir aprovar_emissao_seguro (crédito de pontos)
-- Problema: pontos não estavam sendo creditados
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
  v_plano TEXT;
  v_multiplicador NUMERIC;
  v_saldo_atual INTEGER;
  v_saldo_novo INTEGER;
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

  -- Default se não encontrou
  v_plano := COALESCE(v_plano, 'free');
  v_multiplicador := COALESCE(v_multiplicador, 0.5);

  -- Calcular pontos com multiplicador
  v_pontos := FLOOR(v_emissao.valor * v_multiplicador);

  -- Garantir pelo menos 1 ponto
  IF v_pontos < 1 THEN
    v_pontos := 1;
  END IF;

  -- ========================================
  -- CREDITAR PONTOS DIRETAMENTE
  -- ========================================

  -- Buscar saldo atual com lock
  SELECT COALESCE(points, 0) INTO v_saldo_atual
  FROM profiles
  WHERE id = v_emissao.user_id
  FOR UPDATE;

  -- Calcular novo saldo
  v_saldo_novo := v_saldo_atual + v_pontos;

  -- Inserir transação
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (
    v_emissao.user_id,
    v_pontos,
    'credit',
    'Emissão aprovada: R$ ' || v_emissao.valor::TEXT || ' (' || v_plano || ' ' || v_multiplicador || 'x)',
    v_saldo_atual,
    v_saldo_novo
  );

  -- Atualizar saldo do usuário
  UPDATE profiles
  SET
    points = v_saldo_novo,
    total_points_earned = COALESCE(total_points_earned, 0) + v_pontos,
    updated_at = NOW()
  WHERE id = v_emissao.user_id;

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
    -- Ignora erro de notificação
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_creditados', v_pontos,
    'valor', v_emissao.valor,
    'plano', v_plano,
    'multiplicador', v_multiplicador,
    'user_id', v_emissao.user_id,
    'saldo_antes', v_saldo_atual,
    'saldo_depois', v_saldo_novo
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.aprovar_emissao_seguro(UUID, UUID) TO authenticated;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 237: aprovar_emissao_seguro corrigida com crédito direto';
END $$;
