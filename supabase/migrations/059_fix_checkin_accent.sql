-- ============================================
-- 059: Corrige acento em "Check-in Diário"
-- ============================================

-- Atualizar nome na tabela tarefas
UPDATE public.tarefas
SET nome = 'Check-in Diário',
    descricao = 'Faça check-in uma vez por dia e ganhe pontos'
WHERE nome ILIKE '%check-in diario%';

-- Atualizar transações existentes
UPDATE public.point_transactions
SET reason = 'Check-in Diário'
WHERE reason ILIKE '%check-in diario%';

-- Atualizar notificações existentes
UPDATE public.notifications
SET message = REPLACE(message, 'check-in diario', 'check-in diário')
WHERE message ILIKE '%check-in diario%';

-- ============================================
-- Recriar a função de check-in com acento correto
-- ============================================
CREATE OR REPLACE FUNCTION public.perform_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_last_checkin timestamp with time zone;
  v_pontos integer := 50;
  v_balance_before integer;
  v_balance_after integer;
BEGIN
  -- Obter user_id do token JWT
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Buscar último check-in
  SELECT ultimo_checkin INTO v_last_checkin
  FROM public.profiles
  WHERE id = v_user_id;

  -- Verificar se pode fazer check-in (24h desde o último)
  IF v_last_checkin IS NOT NULL AND
     v_last_checkin > (now() - interval '24 hours') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já fez check-in hoje',
      'proximo_checkin', (v_last_checkin + interval '24 hours')
    );
  END IF;

  -- Obter saldo atual com lock
  SELECT points INTO v_balance_before
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  v_balance_after := COALESCE(v_balance_before, 0) + v_pontos;

  -- Atualizar perfil (pontos + timestamp)
  UPDATE public.profiles
  SET points = v_balance_after,
      ultimo_checkin = now(),
      updated_at = now()
  WHERE id = v_user_id;

  -- Registrar transação
  INSERT INTO public.point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (v_user_id, v_pontos, 'task', 'Check-in Diário', v_balance_before, v_balance_after);

  -- Criar notificação
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'points',
    'Check-in realizado!',
    'Você ganhou ' || v_pontos || ' pontos pelo check-in diário!',
    jsonb_build_object('points', v_pontos, 'type', 'checkin')
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'balance_after', v_balance_after,
    'proximo_checkin', (now() + interval '24 hours')
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.perform_checkin() TO authenticated;
