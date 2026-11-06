-- ============================================
-- HIGH-01: RATE LIMITING EM FUNÇÕES SENSÍVEIS
--
-- VULNERABILIDADE: Funções como fazer_checkin, registrar_compartilhamento
-- podem ser chamadas repetidamente sem limite (mesmo que não creditem
-- pontos duplos, geram carga desnecessária no banco).
--
-- CORREÇÃO: Tabela de rate limiting + verificação nas funções
-- ============================================

-- 1. Criar tabela de rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  call_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action_type, window_start)
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
ON public.rate_limits(user_id, action_type, window_start DESC);

-- RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Apenas o próprio usuário pode ver seus rate limits
CREATE POLICY "Users view own rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Função auxiliar de rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action_type TEXT,
  p_max_calls INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false; -- Não autenticado = bloqueado
  END IF;

  -- Janela de tempo (truncada para o minuto)
  v_window_start := date_trunc('minute', NOW());

  -- Tentar inserir ou incrementar contador
  INSERT INTO public.rate_limits (user_id, action_type, window_start, call_count)
  VALUES (v_user_id, p_action_type, v_window_start, 1)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET call_count = rate_limits.call_count + 1
  RETURNING call_count INTO v_current_count;

  -- Verificar limite
  IF v_current_count > p_max_calls THEN
    RETURN false; -- Limite excedido
  END IF;

  RETURN true; -- OK
END;
$$;

-- 3. Atualizar fazer_checkin com rate limiting
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
  -- CORREÇÃO: IGNORAR p_user_id, USAR auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;

  -- RATE LIMITING: máximo 5 chamadas por minuto
  IF NOT public.check_rate_limit('checkin', 5, 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'rate_limit_exceeded',
      'message', 'Muitas tentativas. Aguarde um momento.'
    );
  END IF;

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

  v_balance_after := v_balance_before + v_pontos;

  -- Registrar check-in
  INSERT INTO public.checkins (user_id, pontos)
  VALUES (v_user_id, v_pontos);

  -- Creditar pontos
  UPDATE public.profiles
  SET points = v_balance_after
  WHERE id = v_user_id;

  -- Registrar transação
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

-- 4. Atualizar registrar_compartilhamento com rate limiting
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
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- RATE LIMITING: máximo 10 chamadas por minuto
  IF NOT public.check_rate_limit('compartilhamento', 10, 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'rate_limit_exceeded',
      'message', 'Muitas tentativas. Aguarde um momento.'
    );
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

-- 5. Atualizar registrar_visita_experiencias com rate limiting
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
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- RATE LIMITING: máximo 10 chamadas por minuto
  IF NOT public.check_rate_limit('visita_experiencias', 10, 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'rate_limit_exceeded',
      'message', 'Muitas tentativas. Aguarde um momento.'
    );
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

-- 6. Limpar rate limits antigos (job de manutenção)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- 7. Permissões
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits TO service_role;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.rate_limits IS
'Tabela de rate limiting para prevenir abuso de funções RPC.
Armazena contagem de chamadas por usuário/ação/janela de tempo.';

COMMENT ON FUNCTION public.check_rate_limit IS
'Verifica e registra chamada para rate limiting.
Retorna true se dentro do limite, false se excedeu.
Padrão: 10 chamadas por minuto.';
