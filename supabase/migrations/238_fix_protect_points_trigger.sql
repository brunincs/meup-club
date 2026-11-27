-- ============================================
-- MIGRATION 238: Corrigir trigger protect_sensitive_fields
-- Problema: bloqueava alteração de points mesmo de funções internas
-- ============================================

-- Recriar função de proteção com bypass para chamadas internas
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

  -- BLOQUEAR alteração de points
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    RAISE EXCEPTION 'Não é permitido alterar pontos diretamente. Use as funções de crédito/débito.';
  END IF;

  -- BLOQUEAR alteração de level_id (calculado automaticamente)
  IF NEW.level_id IS DISTINCT FROM OLD.level_id THEN
    RAISE EXCEPTION 'Não é permitido alterar level_id diretamente.';
  END IF;

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

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS tr_protect_sensitive_fields ON public.profiles;
CREATE TRIGGER tr_protect_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- ============================================
-- ATUALIZAR aprovar_emissao_seguro para setar flag
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
  -- SETAR FLAG PARA BYPASS DO TRIGGER
  -- ========================================
  PERFORM set_config('app.internal_credit', 'true', true);

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

  -- Atualizar saldo do usuário (flag permite bypass do trigger)
  UPDATE profiles
  SET
    points = v_saldo_novo,
    total_points_earned = COALESCE(total_points_earned, 0) + v_pontos,
    updated_at = NOW()
  WHERE id = v_emissao.user_id;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

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
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.aprovar_emissao_seguro(UUID, UUID) TO authenticated;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 238: Trigger e aprovar_emissao corrigidos com bypass interno';
END $$;
