-- =============================================
-- MIGRAÇÃO 074: CORRIGIR BYPASS DO TRIGGER DE PROTEÇÃO
-- O problema: SECURITY DEFINER não muda auth.uid(), então o trigger
-- ainda vê o usuário comum e bloqueia a alteração de pontos.
-- Solução: usar uma flag de sessão para indicar chamada interna confiável.
-- =============================================

-- =============================================
-- 1. ATUALIZAR O TRIGGER PARA VERIFICAR FLAG DE SESSÃO
-- =============================================
CREATE OR REPLACE FUNCTION protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_is_trigger BOOLEAN := false;
  v_is_internal BOOLEAN := false;
  v_caller_id UUID;
BEGIN
  -- Verificar se é chamada interna confiável (via creditar_pontos_interno)
  v_is_internal := COALESCE(current_setting('app.internal_credit', true), 'false') = 'true';

  -- Se é chamada interna confiável, permite a alteração
  IF v_is_internal THEN
    RETURN NEW;
  END IF;

  -- Obter ID do chamador
  v_caller_id := auth.uid();

  -- Verificar se é contexto de trigger (auth.uid() IS NULL)
  IF v_caller_id IS NULL THEN
    v_is_trigger := true;
  ELSE
    -- Verificar se chamador é admin
    SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  -- Se NÃO é admin E NÃO é trigger, bloquear alterações em campos sensíveis
  IF NOT COALESCE(v_is_admin, false) AND NOT v_is_trigger THEN

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

  END IF;

  -- Segurança adicional: mesmo em contexto de trigger, NUNCA permitir alterar role
  -- (exceto se é admin autenticado)
  IF v_is_trigger AND NOT COALESCE(v_is_admin, false) THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Não é permitido alterar o campo role via trigger.';
    END IF;
  END IF;

  -- Passou nas validações, permite o UPDATE
  RETURN NEW;
END;
$$;

-- =============================================
-- 2. RECRIAR FUNÇÃO CENTRAL DE CRÉDITO COM FLAG DE SESSÃO
-- =============================================
CREATE OR REPLACE FUNCTION public.creditar_pontos_interno(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Validações básicas
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id é obrigatório');
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount deve ser diferente de zero');
  END IF;

  -- SETAR FLAG DE CHAMADA INTERNA (permite bypass do trigger)
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Buscar saldo atual COM LOCK
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance_before IS NULL THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Calcular novo saldo
  v_balance_after := v_balance_before + p_amount;

  IF v_balance_after < 0 THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  -- UPDATE ATÔMICO (a flag app.internal_credit permite bypass do trigger)
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after
  ) VALUES (
    p_user_id, p_amount, p_type, p_reason, v_balance_before, v_balance_after
  )
  RETURNING id INTO v_transaction_id;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.internal_credit', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- 3. CORRIGIR increment_referrals (USA UPDATE DIRETO)
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_referrals(referrer_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_result JSONB;
BEGIN
  -- Setar flag para permitir alteração
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Incrementar total_referrals
  UPDATE public.profiles
  SET total_referrals = COALESCE(total_referrals, 0) + 1
  WHERE id = referrer_uuid;

  -- Limpar flag
  PERFORM set_config('app.internal_credit', 'false', true);

  -- Creditar pontos de indicação via função central
  v_credit_result := public.creditar_pontos_interno(
    referrer_uuid,
    50, -- pontos por indicação (pode variar por plano)
    'referral',
    'Bônus por indicação de novo membro'
  );

  -- Log se falhou (não bloqueia)
  IF NOT (v_credit_result->>'success')::boolean THEN
    RAISE NOTICE 'Falha ao creditar pontos de indicação: %', v_credit_result->>'error';
  END IF;
END;
$$;

-- =============================================
-- 4. CORRIGIR registrar_compartilhamento
-- =============================================
DROP FUNCTION IF EXISTS public.registrar_compartilhamento(UUID);
CREATE OR REPLACE FUNCTION public.registrar_compartilhamento(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ja_compartilhou BOOLEAN;
  v_credit_result JSONB;
BEGIN
  -- Verificar se já compartilhou (IDEMPOTÊNCIA)
  SELECT EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = 'compartilhar_rede'
  ) INTO v_ja_compartilhou;

  IF v_ja_compartilhou THEN
    RETURN jsonb_build_object(
      'success', true,
      'creditou', false,
      'message', 'Missão já concluída anteriormente'
    );
  END IF;

  -- Registrar conclusão (ANTES de creditar, para idempotência)
  INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, 'compartilhar_rede', 15)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'creditou', false,
      'message', 'Missão já concluída'
    );
  END IF;

  -- Creditar via função central
  v_credit_result := public.creditar_pontos_interno(
    p_user_id,
    15,
    'task',
    'Missão: Compartilhar nas redes sociais'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    -- Rollback do registro
    DELETE FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = 'compartilhar_rede';

    RETURN jsonb_build_object(
      'success', false,
      'creditou', false,
      'error', v_credit_result->>'error'
    );
  END IF;

  -- Notificação (NÃO-FATAL)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'mission_completed',
      'Missão concluída!',
      'Você ganhou 15 pontos por compartilhar nas redes!',
      'share'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'creditou', true,
    'pontos', 15,
    'balance_after', (v_credit_result->>'balance_after')::integer
  );
END;
$$;

-- =============================================
-- 5. CORRIGIR registrar_visita_experiencias
-- =============================================
DROP FUNCTION IF EXISTS public.registrar_visita_experiencias(UUID);
CREATE OR REPLACE FUNCTION public.registrar_visita_experiencias(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ja_visitou BOOLEAN;
  v_credit_result JSONB;
BEGIN
  -- Verificar se já visitou (IDEMPOTÊNCIA)
  SELECT EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = 'visitar_experiencias'
  ) INTO v_ja_visitou;

  IF v_ja_visitou THEN
    RETURN jsonb_build_object(
      'success', true,
      'creditou', false,
      'pontos', 0
    );
  END IF;

  -- Registrar conclusão
  INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, 'visitar_experiencias', 10)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'pontos', 0);
  END IF;

  -- Creditar via função central
  v_credit_result := public.creditar_pontos_interno(
    p_user_id,
    10,
    'task',
    'Missão: Visitar experiências'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    DELETE FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = 'visitar_experiencias';

    RETURN jsonb_build_object('success', false, 'creditou', false, 'error', v_credit_result->>'error');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'creditou', true,
    'pontos', 10,
    'balance_after', (v_credit_result->>'balance_after')::integer
  );
END;
$$;

-- =============================================
-- 6. CRIAR/CORRIGIR creditar_aniversario
-- =============================================
CREATE OR REPLACE FUNCTION public.creditar_aniversario(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano_atual INTEGER := EXTRACT(YEAR FROM NOW());
  v_ja_creditado BOOLEAN;
  v_pontos INTEGER;
  v_benefits RECORD;
  v_credit_result JSONB;
BEGIN
  -- Verificar se já creditou este ano (IDEMPOTÊNCIA)
  SELECT EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id
    AND missao_tipo = 'aniversario_' || v_ano_atual::TEXT
  ) INTO v_ja_creditado;

  IF v_ja_creditado THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'message', 'Bônus já creditado este ano');
  END IF;

  -- Buscar benefícios do plano
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);
  v_pontos := COALESCE(v_benefits.pontos_aniversario, 0);

  IF v_pontos = 0 THEN
    RETURN jsonb_build_object('success', false, 'creditou', false, 'message', 'Plano não tem bônus de aniversário');
  END IF;

  -- Registrar para idempotência
  INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, 'aniversario_' || v_ano_atual::TEXT, v_pontos)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'message', 'Já creditado');
  END IF;

  -- Creditar via função central
  v_credit_result := public.creditar_pontos_interno(
    p_user_id,
    v_pontos,
    'birthday',
    'Bônus de Aniversário ' || v_ano_atual::TEXT
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    DELETE FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = 'aniversario_' || v_ano_atual::TEXT;

    RETURN jsonb_build_object('success', false, 'error', v_credit_result->>'error');
  END IF;

  -- Notificação
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (p_user_id, 'points_earned', 'Feliz Aniversário! 🎂', 'Você ganhou ' || v_pontos || ' pontos de bônus!', 'cake');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'creditou', true, 'pontos', v_pontos);
END;
$$;

-- =============================================
-- 7. CORRIGIR TRIGGER DE COMPLETAR PERFIL
-- Verificar se existe e corrigir
-- =============================================

-- Primeiro, vamos verificar se há um trigger para completar perfil
-- e criar uma função que credita corretamente

CREATE OR REPLACE FUNCTION public.verificar_perfil_completo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil_completo BOOLEAN;
  v_ja_creditado BOOLEAN;
  v_credit_result JSONB;
BEGIN
  -- Verificar se perfil está completo (nome, email, telefone preenchidos)
  v_perfil_completo := (
    NEW.name IS NOT NULL AND trim(NEW.name) != '' AND
    NEW.email IS NOT NULL AND trim(NEW.email) != '' AND
    NEW.phone IS NOT NULL AND trim(NEW.phone) != ''
  );

  -- Se não está completo ou já estava completo antes, não fazer nada
  IF NOT v_perfil_completo THEN
    RETURN NEW;
  END IF;

  -- Verificar se já creditou (IDEMPOTÊNCIA)
  SELECT EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = NEW.id AND missao_tipo = 'completar_perfil'
  ) INTO v_ja_creditado;

  IF v_ja_creditado THEN
    RETURN NEW;
  END IF;

  -- Registrar conclusão da missão
  INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (NEW.id, 'completar_perfil', 25)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  -- Se não inseriu (já existia), não creditar
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Creditar via função central
  v_credit_result := public.creditar_pontos_interno(
    NEW.id,
    25,
    'task',
    'Missão: Completar perfil'
  );

  -- Log se falhou (não bloqueia o UPDATE do perfil)
  IF NOT (v_credit_result->>'success')::boolean THEN
    -- Remover registro se falhou
    DELETE FROM missoes_automaticas_concluidas
    WHERE user_id = NEW.id AND missao_tipo = 'completar_perfil';
    RAISE NOTICE 'Falha ao creditar missão completar_perfil: %', v_credit_result->>'error';
  ELSE
    -- Notificação
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (NEW.id, 'mission_completed', 'Perfil completo!', 'Você ganhou 25 pontos!', 'user-check');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS tr_verificar_perfil_completo ON public.profiles;

-- Criar trigger AFTER UPDATE (não BEFORE, para não conflitar com protect_sensitive_fields)
CREATE TRIGGER tr_verificar_perfil_completo
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.phone IS DISTINCT FROM NEW.phone OR OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION verificar_perfil_completo();

-- =============================================
-- 8. GARANTIR PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.creditar_pontos_interno TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_pontos_interno TO service_role;
GRANT EXECUTE ON FUNCTION public.fazer_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_missao_automatica TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_missao_automatica TO service_role;
GRANT EXECUTE ON FUNCTION public.aprovar_emissao_seguro TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_referrals TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_referrals TO service_role;
GRANT EXECUTE ON FUNCTION public.registrar_compartilhamento TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_visita_experiencias TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_aniversario TO authenticated;

-- =============================================
-- 9. RECARREGAR SCHEMA DO POSTGREST
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 10. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 074: Bypass do trigger corrigido';
  RAISE NOTICE '  - Trigger protect_sensitive_profile_fields verifica app.internal_credit';
  RAISE NOTICE '  - creditar_pontos_interno seta a flag antes do UPDATE';
  RAISE NOTICE '  - increment_referrals usa função central';
  RAISE NOTICE '  - registrar_compartilhamento usa função central';
  RAISE NOTICE '  - registrar_visita_experiencias usa função central';
  RAISE NOTICE '  - creditar_aniversario criado/corrigido';
  RAISE NOTICE '  - verificar_perfil_completo usa função central';
END $$;
