-- ============================================
-- FIX: FUNÇÕES DE MISSÃO ACEITAM p_user_id ARBITRÁRIO
--
-- VULNERABILIDADE: As funções abaixo aceitam p_user_id como parâmetro,
-- permitindo que um atacante passe qualquer ID e credite pontos
-- para si mesmo ou outros infinitamente:
--   - fazer_checkin(p_user_id)
--   - registrar_compartilhamento(p_user_id)
--   - registrar_visita_experiencias(p_user_id)
--   - creditar_missao_automatica(p_user_id, ...) -- usada internamente
--
-- CORREÇÃO:
-- 1. fazer_checkin, registrar_compartilhamento, registrar_visita:
--    Ignorar p_user_id e usar auth.uid() internamente
-- 2. creditar_missao_automatica: manter p_user_id mas adicionar
--    verificação de que é chamada apenas por triggers/funções internas
--    OU que o chamador é admin OU que p_user_id = auth.uid()
-- ============================================

-- ============================================
-- 1. CORRIGIR fazer_checkin
-- Ignora p_user_id, usa auth.uid()
-- ============================================

CREATE OR REPLACE FUNCTION public.fazer_checkin(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ultimo_checkin TIMESTAMPTZ;
  v_pode_fazer BOOLEAN;
  v_pontos INTEGER := 50;
  v_proximo_checkin TIMESTAMPTZ;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- =============================================
  -- CORREÇÃO: IGNORAR p_user_id, USAR auth.uid()
  -- =============================================
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  -- =============================================

  -- Buscar último check-in do usuário
  SELECT created_at INTO v_ultimo_checkin
  FROM public.checkins
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Verificar se pode fazer (nunca fez OU faz mais de 24h)
  IF v_ultimo_checkin IS NULL THEN
    v_pode_fazer := true;
  ELSE
    v_pode_fazer := (NOW() - v_ultimo_checkin) >= INTERVAL '24 hours';
    v_proximo_checkin := v_ultimo_checkin + INTERVAL '24 hours';
  END IF;

  IF NOT v_pode_fazer THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ja_fez_hoje',
      'proximo_checkin', v_proximo_checkin,
      'horas_restantes', EXTRACT(EPOCH FROM (v_proximo_checkin - NOW())) / 3600
    );
  END IF;

  -- Buscar saldo atual ANTES de creditar
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = v_user_id;

  -- Calcular saldo DEPOIS
  v_balance_after := v_balance_before + v_pontos;

  -- Registrar check-in
  INSERT INTO public.checkins (user_id, pontos)
  VALUES (v_user_id, v_pontos);

  -- Creditar pontos
  UPDATE public.profiles
  SET points = v_balance_after
  WHERE id = v_user_id;

  -- Registrar transação COM balance_before e balance_after
  INSERT INTO public.point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (v_user_id, v_pontos, 'task', 'Check-in diario', v_balance_before, v_balance_after);

  -- Criar notificação
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_user_id,
      'points_earned',
      'Check-in realizado!',
      'Voce ganhou ' || v_pontos || ' pontos pelo check-in diario!',
      'sparkles',
      jsonb_build_object('amount', v_pontos, 'type', 'checkin')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Notificação é secundária
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'proximo_checkin', NOW() + INTERVAL '24 hours'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao fazer check-in: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- 2. CORRIGIR pode_fazer_checkin
-- Ignora p_user_id, usa auth.uid()
-- ============================================

CREATE OR REPLACE FUNCTION public.pode_fazer_checkin(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ultimo_checkin TIMESTAMPTZ;
  v_pode_fazer BOOLEAN;
  v_proximo_checkin TIMESTAMPTZ;
BEGIN
  -- CORREÇÃO: IGNORAR p_user_id, USAR auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('pode', false, 'error', 'Não autenticado');
  END IF;

  SELECT created_at INTO v_ultimo_checkin
  FROM public.checkins
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_ultimo_checkin IS NULL THEN
    RETURN jsonb_build_object('pode', true);
  END IF;

  v_pode_fazer := (NOW() - v_ultimo_checkin) >= INTERVAL '24 hours';
  v_proximo_checkin := v_ultimo_checkin + INTERVAL '24 hours';

  RETURN jsonb_build_object(
    'pode', v_pode_fazer,
    'proximo_checkin', v_proximo_checkin,
    'horas_restantes', CASE WHEN v_pode_fazer THEN 0 ELSE EXTRACT(EPOCH FROM (v_proximo_checkin - NOW())) / 3600 END
  );
END;
$$;

-- ============================================
-- 3. CORRIGIR registrar_compartilhamento
-- Ignora p_user_id, usa auth.uid()
-- ============================================

CREATE OR REPLACE FUNCTION public.registrar_compartilhamento(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pontos INTEGER := 20;
  v_creditou BOOLEAN;
BEGIN
  -- CORREÇÃO: IGNORAR p_user_id, USAR auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT public.creditar_missao_automatica(
    v_user_id,
    'compartilhar_codigo',
    v_pontos,
    'Compartilhou o codigo de indicacao'
  ) INTO v_creditou;

  RETURN jsonb_build_object(
    'success', true,
    'creditou', v_creditou,
    'pontos', CASE WHEN v_creditou THEN v_pontos ELSE 0 END
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 4. CORRIGIR registrar_visita_experiencias
-- Ignora p_user_id, usa auth.uid()
-- ============================================

CREATE OR REPLACE FUNCTION public.registrar_visita_experiencias(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pontos INTEGER := 5;
  v_creditou BOOLEAN;
BEGIN
  -- CORREÇÃO: IGNORAR p_user_id, USAR auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT public.creditar_missao_automatica(
    v_user_id,
    'explorar_experiencias',
    v_pontos,
    'Explorou as experiencias'
  ) INTO v_creditou;

  RETURN jsonb_build_object(
    'success', true,
    'creditou', v_creditou,
    'pontos', CASE WHEN v_creditou THEN v_pontos ELSE 0 END
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 5. CORRIGIR creditar_missao_automatica
-- Aceita p_user_id mas verifica se:
--   - Chamador é admin, OU
--   - p_user_id = auth.uid() (próprio usuário), OU
--   - É chamada por trigger (auth.uid() é NULL mas tem contexto de trigger)
-- ============================================

CREATE OR REPLACE FUNCTION public.creditar_missao_automatica(
  p_user_id UUID,
  p_missao_tipo TEXT,
  p_pontos INTEGER,
  p_descricao TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := false;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- =============================================
  -- VERIFICAÇÃO DE SEGURANÇA
  -- Permite se:
  -- 1. Chamador é admin
  -- 2. p_user_id = auth.uid() (usuário creditando para si mesmo)
  -- 3. auth.uid() é NULL (chamada de trigger interno)
  -- =============================================
  v_caller_id := auth.uid();

  IF v_caller_id IS NOT NULL THEN
    -- Há um chamador autenticado - verificar permissões
    SELECT (role = 'admin') INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;

    -- Se não é admin E não é o próprio usuário, bloquear
    IF NOT COALESCE(v_is_admin, false) AND v_caller_id <> p_user_id THEN
      RAISE EXCEPTION 'Não é permitido creditar missão para outro usuário';
    END IF;
  END IF;
  -- Se v_caller_id é NULL, é chamada de trigger - permitir
  -- =============================================

  -- Tentar inserir (falhará se já existe devido ao UNIQUE)
  INSERT INTO public.missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, p_missao_tipo, p_pontos)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  -- Se não inseriu (já existia), retorna false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Buscar saldo atual ANTES de creditar
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calcular saldo DEPOIS
  v_balance_after := v_balance_before + p_pontos;

  -- Creditar pontos
  UPDATE public.profiles
  SET points = v_balance_after
  WHERE id = p_user_id;

  -- Registrar transação COM balance_before e balance_after
  INSERT INTO public.point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (p_user_id, p_pontos, 'task', p_descricao, v_balance_before, v_balance_after);

  -- Criar notificação
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      p_user_id,
      'points_earned',
      'Missao concluida!',
      'Voce ganhou ' || p_pontos || ' pontos: ' || p_descricao,
      'target',
      jsonb_build_object('amount', p_pontos, 'missao', p_missao_tipo)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Notificação é secundária
    NULL;
  END;

  RETURN true;

EXCEPTION WHEN OTHERS THEN
  -- Se for nossa exception de segurança, re-lançar
  IF SQLERRM LIKE 'Não é permitido%' THEN
    RAISE;
  END IF;
  RETURN false;
END;
$$;

-- ============================================
-- 6. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.fazer_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_fazer_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_compartilhamento TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_visita_experiencias TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_missao_automatica TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION public.fazer_checkin IS
'Check-in diário. IGNORA p_user_id e usa auth.uid() para segurança.
Usuário só pode fazer check-in para si mesmo.';

COMMENT ON FUNCTION public.registrar_compartilhamento IS
'Registra compartilhamento de código. IGNORA p_user_id, usa auth.uid().';

COMMENT ON FUNCTION public.registrar_visita_experiencias IS
'Registra visita às experiências. IGNORA p_user_id, usa auth.uid().';

COMMENT ON FUNCTION public.creditar_missao_automatica IS
'Credita pontos de missão automática.
Verifica segurança: só admin ou próprio usuário podem chamar.
Triggers internos (auth.uid() = NULL) são permitidos.';
