-- =============================================
-- MIGRAÇÃO 082: CORREÇÃO ENUM PLANO + MISSÕES
--
-- 1. Cria função plano_efetivo(user_id) RETURNS TEXT
-- 2. Corrige comparações enum = text em todas as funções
-- 3. Atualiza descrições das missões de indicação
-- 4. Adiciona coluna meta_valor em tarefas
-- =============================================

-- =============================================
-- 1. FUNÇÃO HELPER: plano_efetivo(user_id)
-- Retorna 'free' ou 'prime' baseado na assinatura ativa
-- =============================================
DROP FUNCTION IF EXISTS public.plano_efetivo(UUID);
CREATE OR REPLACE FUNCTION public.plano_efetivo(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT := 'free';
BEGIN
  -- Buscar assinatura ativa do usuário
  SELECT s.plano::TEXT INTO v_plano
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Se não encontrou, retorna 'free'
  RETURN COALESCE(v_plano, 'free');
END;
$$;

-- =============================================
-- 2. CORRIGIR approve_referral (usar plano_efetivo)
-- =============================================
CREATE OR REPLACE FUNCTION public.approve_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_referral RECORD;
  v_referrer_plano TEXT := 'free';
  v_points INTEGER;
  v_credit_result JSONB;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE ADMIN
  -- =============================================
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem aprovar indicações');
  END IF;

  -- =============================================
  -- BUSCAR INDICAÇÃO
  -- =============================================
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada');
  END IF;

  -- =============================================
  -- BUSCAR PLANO ATUAL DO INDICADOR (usando helper)
  -- =============================================
  v_referrer_plano := plano_efetivo(v_referral.referrer_id);

  -- =============================================
  -- BUSCAR PONTOS DO PLANO NA CONFIG (cast explícito)
  -- =============================================
  SELECT pc.pontos_indicacao INTO v_points
  FROM plano_config pc
  WHERE pc.plano::TEXT = v_referrer_plano;

  -- Fallback se não encontrar config
  IF v_points IS NULL THEN
    v_points := CASE WHEN v_referrer_plano = 'prime' THEN 5000 ELSE 3000 END;
  END IF;

  -- =============================================
  -- CREDITAR PONTOS (função central, idempotente)
  -- =============================================
  v_credit_result := creditar_pontos_central(
    v_referral.referrer_id,
    v_points,
    'referral_aprovada',
    'Indicação aprovada',
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_credit_result->>'error'
    );
  END IF;

  -- =============================================
  -- ATUALIZAR INDICAÇÃO
  -- =============================================
  UPDATE public.referrals SET
    status = 'approved',
    points_awarded = v_points,
    processed_by = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Incrementar contador de indicações do indicador
  UPDATE public.profiles SET
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  -- =============================================
  -- VERIFICAR MISSÕES DE INDICAÇÃO (idempotente)
  -- =============================================
  PERFORM verificar_missoes_indicacao(v_referral.referrer_id);

  -- =============================================
  -- NOTIFICAÇÃO
  -- =============================================
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_referral.referrer_id,
      'referral_approved',
      'Indicação aprovada!',
      'Você ganhou ' || v_points::TEXT || ' pontos pela sua indicação!',
      'users'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'referrer_plano', v_referrer_plano,
    'new_balance', (v_credit_result->>'balance_after')::integer,
    'referrer_id', v_referral.referrer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao aprovar indicação: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 3. CORRIGIR get_referral_points_preview
-- =============================================
CREATE OR REPLACE FUNCTION public.get_referral_points_preview(p_referrer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_plano TEXT := 'free';
  v_points INTEGER;
BEGIN
  -- Usar helper para buscar plano
  v_referrer_plano := plano_efetivo(p_referrer_id);

  -- Buscar pontos do plano (cast explícito)
  SELECT pc.pontos_indicacao INTO v_points
  FROM plano_config pc
  WHERE pc.plano::TEXT = v_referrer_plano;

  IF v_points IS NULL THEN
    v_points := CASE WHEN v_referrer_plano = 'prime' THEN 5000 ELSE 3000 END;
  END IF;

  RETURN jsonb_build_object(
    'plano', v_referrer_plano,
    'pontos', v_points
  );
END;
$$;

-- =============================================
-- 4. CRIAR FUNÇÃO PARA VERIFICAR MISSÕES DE INDICAÇÃO
-- Idempotente: credita uma vez só por missão
-- =============================================
CREATE OR REPLACE FUNCTION public.verificar_missoes_indicacao(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_aprovadas INTEGER;
  v_tarefa RECORD;
  v_meta INTEGER;
  v_ja_concluiu BOOLEAN;
BEGIN
  -- Contar indicações APROVADAS do usuário
  SELECT COUNT(*) INTO v_total_aprovadas
  FROM referrals
  WHERE referrer_id = p_user_id
    AND status = 'approved';

  -- Verificar cada missão de indicação
  FOR v_tarefa IN
    SELECT id, nome, pontos, missao_tipo
    FROM tarefas
    WHERE ativa = true
      AND missao_tipo IN ('primeira_indicacao', '5_indicacoes', '10_indicacoes')
  LOOP
    -- Determinar meta baseado no tipo
    v_meta := CASE v_tarefa.missao_tipo
      WHEN 'primeira_indicacao' THEN 1
      WHEN '5_indicacoes' THEN 5
      WHEN '10_indicacoes' THEN 10
      ELSE 0
    END;

    -- Verificar se já concluiu esta missão
    SELECT EXISTS(
      SELECT 1 FROM missoes_automaticas_concluidas
      WHERE user_id = p_user_id AND tarefa_id = v_tarefa.id
    ) INTO v_ja_concluiu;

    -- Se atingiu a meta e ainda não concluiu, creditar
    IF v_total_aprovadas >= v_meta AND NOT v_ja_concluiu THEN
      -- Registrar conclusão (idempotente)
      INSERT INTO missoes_automaticas_concluidas (user_id, tarefa_id)
      VALUES (p_user_id, v_tarefa.id)
      ON CONFLICT (user_id, tarefa_id) DO NOTHING;

      -- Creditar pontos
      PERFORM creditar_pontos_central(
        p_user_id,
        v_tarefa.pontos,
        'task',
        'Missão concluída: ' || v_tarefa.nome,
        'credit'
      );

      -- Notificação
      BEGIN
        INSERT INTO notifications (user_id, type, title, message, icon)
        VALUES (
          p_user_id,
          'mission_completed',
          'Missão concluída!',
          'Você completou "' || v_tarefa.nome || '" e ganhou ' || v_tarefa.pontos || ' pontos!',
          'trophy'
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END;
$$;

-- =============================================
-- 5. FUNÇÃO PARA BUSCAR PROGRESSO DE INDICAÇÕES
-- Usada pelo frontend para mostrar X de N
-- =============================================
CREATE OR REPLACE FUNCTION public.get_referral_progress(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_aprovadas INTEGER;
BEGIN
  -- Contar APENAS indicações aprovadas
  SELECT COUNT(*) INTO v_total_aprovadas
  FROM referrals
  WHERE referrer_id = p_user_id
    AND status = 'approved';

  RETURN jsonb_build_object(
    'aprovadas', v_total_aprovadas
  );
END;
$$;

-- =============================================
-- 6. ADICIONAR COLUNA meta_valor EM tarefas
-- Para missões com meta numérica (5 indicações = 5)
-- =============================================
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS meta_valor INTEGER DEFAULT NULL;

-- Atualizar missões existentes com meta
UPDATE public.tarefas SET meta_valor = 1 WHERE missao_tipo = 'primeira_indicacao';
UPDATE public.tarefas SET meta_valor = 5 WHERE missao_tipo = '5_indicacoes';
UPDATE public.tarefas SET meta_valor = 10 WHERE missao_tipo = '10_indicacoes';

-- =============================================
-- 7. ATUALIZAR DESCRIÇÕES DAS MISSÕES
-- "Alcance X totais" → "Tenha X aprovadas"
-- =============================================
UPDATE public.tarefas
SET descricao = 'Tenha 1 indicação aprovada'
WHERE missao_tipo = 'primeira_indicacao';

UPDATE public.tarefas
SET descricao = 'Tenha 5 indicações aprovadas'
WHERE missao_tipo = '5_indicacoes';

UPDATE public.tarefas
SET descricao = 'Tenha 10 indicações aprovadas'
WHERE missao_tipo = '10_indicacoes';

-- =============================================
-- 8. PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.plano_efetivo TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_missoes_indicacao TO authenticated;

-- =============================================
-- 9. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 082: Correção enum plano + missões';
  RAISE NOTICE '  - Função plano_efetivo(user_id) criada';
  RAISE NOTICE '  - approve_referral corrigida';
  RAISE NOTICE '  - get_referral_points_preview corrigida';
  RAISE NOTICE '  - verificar_missoes_indicacao criada (idempotente)';
  RAISE NOTICE '  - get_referral_progress criada';
  RAISE NOTICE '  - Descrições de missões atualizadas';
END $$;
