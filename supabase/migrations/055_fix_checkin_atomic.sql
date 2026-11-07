-- ============================================
-- FIX: CHECK-IN DIÁRIO COM ATOMICIDADE
--
-- BUG: fazer_checkin chamava check_rate_limit com parâmetros errados
-- (4 args ao invés de 3, tipos incompatíveis), causando erro
-- "function does not exist" ANTES de creditar pontos.
--
-- CORREÇÃO:
-- 1. Usar auth.uid() (NUNCA p_user_id)
-- 2. Verificar último check-in via tabela checkins (não rate_limits)
-- 3. ATOMICIDADE: creditar PRIMEIRO, registrar trava DEPOIS
-- 4. Se crédito falhar, rollback automático impede trava
-- 5. Pontos via config (não hardcoded)
-- ============================================

-- =============================================
-- PARTE 1: Garantir config de pontos existe
-- =============================================

INSERT INTO public.config (key, value)
VALUES ('PONTOS_CHECKIN', '50')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- PARTE 2: Remover versões antigas e criar nova
-- =============================================

-- Remover versões antigas (com parâmetros)
DROP FUNCTION IF EXISTS public.fazer_checkin(UUID);
DROP FUNCTION IF EXISTS public.fazer_checkin();
DROP FUNCTION IF EXISTS public.pode_fazer_checkin(UUID);
DROP FUNCTION IF EXISTS public.pode_fazer_checkin();

CREATE OR REPLACE FUNCTION public.fazer_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pontos INTEGER;
  v_ultimo_checkin TIMESTAMPTZ;
  v_proximo_checkin TIMESTAMPTZ;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- SEMPRE usar auth.uid() - NUNCA aceitar parâmetro
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar pontos da config (não hardcoded)
  SELECT COALESCE((value #>> '{}')::integer, 50) INTO v_pontos
  FROM public.config
  WHERE key = 'PONTOS_CHECKIN';

  IF v_pontos IS NULL THEN
    v_pontos := 50; -- Fallback seguro
  END IF;

  -- Verificar último check-in (via tabela checkins, não rate_limits)
  SELECT created_at INTO v_ultimo_checkin
  FROM public.checkins
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se já fez check-in nas últimas 24h, bloquear
  IF v_ultimo_checkin IS NOT NULL AND (NOW() - v_ultimo_checkin) < INTERVAL '24 hours' THEN
    v_proximo_checkin := v_ultimo_checkin + INTERVAL '24 hours';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_in',
      'message', 'Você já fez check-in hoje. Volte amanhã!',
      'proximo_checkin', v_proximo_checkin,
      'horas_restantes', EXTRACT(EPOCH FROM (v_proximo_checkin - NOW())) / 3600
    );
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- ATOMICIDADE: Tudo abaixo é uma transação única
  -- Se qualquer passo falhar, NADA é gravado (rollback automático)
  -- ═══════════════════════════════════════════════════════════

  -- PASSO 1: Buscar saldo atual
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_balance_before IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'profile_not_found',
      'message', 'Perfil não encontrado'
    );
  END IF;

  v_balance_after := v_balance_before + v_pontos;

  -- PASSO 2: CREDITAR pontos PRIMEIRO (antes da trava)
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- PASSO 3: Registrar transação (com acentos UTF-8)
  INSERT INTO public.point_transactions (
    user_id, amount, type, reason, balance_before, balance_after
  ) VALUES (
    v_user_id, v_pontos, 'task', 'Check-in diário', v_balance_before, v_balance_after
  );

  -- PASSO 4: Registrar check-in (TRAVA) - SÓ DEPOIS do crédito
  INSERT INTO public.checkins (user_id, pontos)
  VALUES (v_user_id, v_pontos);

  -- PASSO 5: Notificação (secundária, não bloqueia)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, icon)
    VALUES (
      v_user_id,
      'checkin',
      'Check-in realizado!',
      'Você ganhou ' || v_pontos || ' pontos pelo check-in diário!',
      'calendar'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Notificação é secundária
  END;

  -- Sucesso
  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'proximo_checkin', NOW() + INTERVAL '24 hours'
  );

-- Se QUALQUER erro ocorrer, toda a transação é revertida
-- Isso inclui: crédito, transação E trava (checkins)
-- Usuário pode tentar novamente
END;
$$;

-- =============================================
-- PARTE 3: Função pode_fazer_checkin (corrigir p/ usar auth.uid())
-- =============================================

CREATE OR REPLACE FUNCTION public.pode_fazer_checkin()
RETURNS jsonb
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
  -- SEMPRE usar auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('pode_fazer', false, 'error', 'Não autenticado');
  END IF;

  SELECT created_at INTO v_ultimo_checkin
  FROM public.checkins
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_ultimo_checkin IS NULL THEN
    RETURN jsonb_build_object('pode_fazer', true);
  END IF;

  v_pode_fazer := (NOW() - v_ultimo_checkin) >= INTERVAL '24 hours';
  v_proximo_checkin := v_ultimo_checkin + INTERVAL '24 hours';

  RETURN jsonb_build_object(
    'pode_fazer', v_pode_fazer,
    'ultimo_checkin', v_ultimo_checkin,
    'proximo_checkin', v_proximo_checkin,
    'horas_restantes', CASE WHEN v_pode_fazer THEN 0 ELSE EXTRACT(EPOCH FROM (v_proximo_checkin - NOW())) / 3600 END
  );
END;
$$;

-- =============================================
-- PARTE 4: Permissões
-- =============================================

GRANT EXECUTE ON FUNCTION public.fazer_checkin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_fazer_checkin() TO authenticated;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION public.fazer_checkin IS
'Check-in diário com ATOMICIDADE:
- Usa auth.uid() (nunca parâmetro)
- Credita pontos PRIMEIRO, registra trava DEPOIS
- Se crédito falhar, trava NÃO é gravada (rollback)
- Pontos via config PONTOS_CHECKIN
- Limite: 1x a cada 24h';

COMMENT ON FUNCTION public.pode_fazer_checkin IS
'Verifica se usuário pode fazer check-in (24h desde último).
Usa auth.uid(), não aceita parâmetro.';
