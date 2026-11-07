-- ============================================
-- FIX: ACENTUAÇÃO COMPLETA EM TODAS AS FONTES
--
-- Corrige acentos em:
-- - fazer_checkin: "Check-in diário", "Você ganhou"
-- - registrar_visita_experiencias: "Explorou as experiências"
-- - notify_level_up: "alcançada"
-- - registrar_compartilhamento: "código de indicação"
-- - Também corrige registros existentes
-- ============================================

-- =============================================
-- PARTE 1: CORRIGIR fazer_checkin
-- =============================================

CREATE OR REPLACE FUNCTION public.fazer_checkin(p_user_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pontos INTEGER := 50;
  v_last_checkin TIMESTAMPTZ;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Determinar user_id
  IF p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
  ELSE
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Verificar rate limit (1x por dia)
  IF NOT public.check_rate_limit(v_user_id, 'checkin', 1, interval '20 hours') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já fez check-in hoje. Volte amanhã!'
    );
  END IF;

  -- Buscar saldo atual
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM public.profiles
  WHERE id = v_user_id;

  v_balance_after := v_balance_before + v_pontos;

  -- Atualizar pontos
  UPDATE public.profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- Registrar transação (COM ACENTOS CORRETOS)
  INSERT INTO public.point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (v_user_id, v_pontos, 'task', 'Check-in diário', v_balance_before, v_balance_after);

  -- Notificação (COM ACENTOS CORRETOS)
  INSERT INTO public.notifications (user_id, type, title, message, icon)
  VALUES (
    v_user_id,
    'checkin',
    'Check-in realizado!',
    'Você ganhou ' || v_pontos || ' pontos pelo check-in diário!',
    'calendar'
  );

  RETURN jsonb_build_object(
    'success', true,
    'points', v_pontos,
    'balance', v_balance_after
  );
END;
$$;

-- =============================================
-- PARTE 2: CORRIGIR registrar_visita_experiencias
-- =============================================

CREATE OR REPLACE FUNCTION public.registrar_visita_experiencias(p_user_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Determinar user_id
  IF p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
  ELSE
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Verificar rate limit
  IF NOT public.check_rate_limit(v_user_id, 'visita_experiencias', 10, interval '1 hour') THEN
    RETURN jsonb_build_object('success', true, 'already_visited', true);
  END IF;

  -- Registrar missão (COM ACENTOS CORRETOS)
  INSERT INTO public.tarefas_usuario (user_id, missao_tipo, pontos_ganhos, motivo)
  VALUES (
    v_user_id,
    'explorar_experiencias',
    5,
    'Explorou as experiências'
  )
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'first_visit', true);
END;
$$;

-- =============================================
-- PARTE 3: CORRIGIR notify_level_up (notificações de classe)
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_level_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level_name TEXT;
  v_level_icon TEXT;
BEGIN
  -- Se level_id mudou para um valor maior (subiu de classe)
  IF NEW.level_id > OLD.level_id THEN
    -- Mapear level_id para nome (COM ACENTOS CORRETOS)
    CASE NEW.level_id
      WHEN 2 THEN v_level_name := 'Premium Economy'; v_level_icon := '✈️';
      WHEN 3 THEN v_level_name := 'Executiva'; v_level_icon := '🥂';
      WHEN 4 THEN v_level_name := 'Primeira Classe'; v_level_icon := '👑';
      ELSE v_level_name := 'Nova Classe'; v_level_icon := '🎉';
    END CASE;

    -- Criar notificação (COM ACENTOS CORRETOS)
    INSERT INTO public.notifications (
      user_id, type, title, message, icon, metadata
    ) VALUES (
      NEW.id,
      'level_up',
      'Parabéns! Você subiu de classe!',
      'Classe ' || v_level_name || ' alcançada! Continue acumulando pontos.',
      v_level_icon,
      jsonb_build_object('new_level', NEW.level_id, 'level_name', v_level_name)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS trigger_notify_level_up ON public.profiles;
CREATE TRIGGER trigger_notify_level_up
  AFTER UPDATE OF level_id ON public.profiles
  FOR EACH ROW
  WHEN (NEW.level_id IS DISTINCT FROM OLD.level_id)
  EXECUTE FUNCTION public.notify_level_up();

-- =============================================
-- PARTE 4: CORRIGIR registrar_compartilhamento
-- =============================================

DROP FUNCTION IF EXISTS public.registrar_compartilhamento(UUID);

CREATE OR REPLACE FUNCTION public.registrar_compartilhamento(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_to_add INTEGER := 20;
  v_current_points INTEGER;
  v_new_points INTEGER;
BEGIN
  -- Verificar rate limit
  IF NOT public.check_rate_limit(p_user_id, 'compartilhamento', 1, interval '24 hours') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já compartilhou hoje. Tente novamente amanhã.'
    );
  END IF;

  -- Buscar pontos atuais
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM public.profiles
  WHERE id = p_user_id;

  v_new_points := v_current_points + v_points_to_add;

  -- Atualizar pontos
  UPDATE public.profiles
  SET points = v_new_points, updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar transação (COM ACENTOS CORRETOS)
  INSERT INTO public.point_transactions (
    user_id, amount, balance_before, balance_after, type, reason, created_at
  ) VALUES (
    p_user_id, v_points_to_add, v_current_points, v_new_points,
    'task', 'Compartilhou o código de indicação', NOW()
  );

  -- Marcar missão como concluída (COM ACENTOS CORRETOS)
  INSERT INTO public.tarefas_usuario (user_id, missao_tipo, pontos_ganhos, motivo)
  VALUES (p_user_id, 'compartilhar_codigo', v_points_to_add, 'Compartilhou o código de indicação')
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'points_earned', v_points_to_add,
    'new_balance', v_new_points
  );
END;
$$;

-- =============================================
-- PARTE 5: CORRIGIR REGISTROS EXISTENTES
-- =============================================

-- Transações
UPDATE public.point_transactions SET reason = 'Check-in diário' WHERE reason = 'Check-in diario';
UPDATE public.point_transactions SET reason = 'Explorou as experiências' WHERE reason = 'Explorou as experiencias';
UPDATE public.point_transactions SET reason = 'Compartilhou o código de indicação' WHERE reason LIKE '%codigo de indicacao%';
UPDATE public.point_transactions SET reason = 'Boas-vindas: cadastro por indicação' WHERE reason LIKE '%cadastro por indica%' AND reason NOT LIKE '%indicação%';
UPDATE public.point_transactions SET reason = 'Boas-vindas: indicação de novo membro' WHERE reason LIKE '%indica%o de novo%' AND reason NOT LIKE '%indicação%';
UPDATE public.point_transactions SET reason = REPLACE(reason, 'indicacoes', 'indicações') WHERE reason LIKE '%indicacoes%';

-- Notificações
UPDATE public.notifications SET message = REPLACE(message, 'diario', 'diário') WHERE message LIKE '%diario%';
UPDATE public.notifications SET message = REPLACE(message, 'Voce', 'Você') WHERE message LIKE '%Voce%';
UPDATE public.notifications SET message = REPLACE(message, 'alcancada', 'alcançada') WHERE message LIKE '%alcancada%';
UPDATE public.notifications SET message = REPLACE(message, 'indicacao', 'indicação') WHERE message LIKE '%indicacao%';
UPDATE public.notifications SET message = REPLACE(message, 'codigo', 'código') WHERE message LIKE '%codigo%';
UPDATE public.notifications SET title = REPLACE(title, 'Voce', 'Você') WHERE title LIKE '%Voce%';

-- Nota: tabelas tarefas_usuario e tarefas não existem neste schema
-- Os acentos são corrigidos apenas nas tabelas existentes acima

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION public.fazer_checkin IS
'Check-in diário. Rate limit: 1x a cada 20h. Dá 50 pontos.
Descrições com acentuação correta (UTF-8).';

COMMENT ON FUNCTION public.registrar_visita_experiencias IS
'Registra visita às experiências. Rate limit: 10x/hora.
Descrições com acentuação correta (UTF-8).';

COMMENT ON FUNCTION public.notify_level_up IS
'Notifica usuário quando sobe de classe.
Descrições com acentuação correta (UTF-8): "alcançada", "Você", etc.';

COMMENT ON FUNCTION public.registrar_compartilhamento IS
'Registra compartilhamento do código de indicação. Rate limit: 1x/dia. Dá 20 pontos.
Descrições com acentuação correta (UTF-8).';
