-- =============================================
-- MIGRAÇÃO 201: JOB DE ANIVERSÁRIO
--
-- Funções para processar automaticamente bônus de aniversário:
-- 1. processar_aniversarios_hoje() - job diário executado às 08:00
-- 2. verificar_aniversario_login() - fallback verificado no login
--
-- Regras:
-- - Apenas Prime recebe bônus (5.000 pts)
-- - 29/02 -> 28/02 em anos não bissextos
-- - Mínimo 30 dias desde definição da birth_date (anti-fraude)
-- - Idempotente (não duplica se rodar várias vezes)
-- =============================================

-- =============================================
-- 1. FUNÇÃO AUXILIAR: Verificar se é ano bissexto
-- =============================================
CREATE OR REPLACE FUNCTION public.is_leap_year(p_year INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN (p_year % 4 = 0 AND p_year % 100 <> 0) OR (p_year % 400 = 0);
END;
$$;

-- =============================================
-- 2. FUNÇÃO AUXILIAR: Verificar se hoje é aniversário
-- Considera 29/02 -> 28/02 em anos não bissextos
-- =============================================
CREATE OR REPLACE FUNCTION public.e_aniversario_hoje(p_birth_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_birth_month INTEGER;
  v_birth_day INTEGER;
  v_today_month INTEGER;
  v_today_day INTEGER;
  v_current_year INTEGER;
BEGIN
  IF p_birth_date IS NULL THEN
    RETURN FALSE;
  END IF;

  v_birth_month := EXTRACT(MONTH FROM p_birth_date);
  v_birth_day := EXTRACT(DAY FROM p_birth_date);
  v_today_month := EXTRACT(MONTH FROM v_today);
  v_today_day := EXTRACT(DAY FROM v_today);
  v_current_year := EXTRACT(YEAR FROM v_today);

  -- Caso especial: nasceu em 29/02
  IF v_birth_month = 2 AND v_birth_day = 29 THEN
    -- Se ano atual NÃO é bissexto, considerar 28/02
    IF NOT is_leap_year(v_current_year) THEN
      RETURN v_today_month = 2 AND v_today_day = 28;
    END IF;
  END IF;

  -- Caso normal: comparar mês e dia
  RETURN v_birth_month = v_today_month AND v_birth_day = v_today_day;
END;
$$;

-- =============================================
-- 3. FUNÇÃO: processar_aniversarios_hoje()
-- Job diário que credita bônus para todos os Prime aniversariantes
-- =============================================
CREATE OR REPLACE FUNCTION public.processar_aniversarios_hoje()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano_atual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_missao_tipo TEXT := 'aniversario_' || v_ano_atual::TEXT;
  v_processados INTEGER := 0;
  v_creditados INTEGER := 0;
  v_erros INTEGER := 0;
  v_usuario RECORD;
  v_credit_result JSONB;
  v_pontos INTEGER;
  v_benefits RECORD;
BEGIN
  -- Buscar todos os usuários elegíveis:
  -- 1. Tem birth_date preenchida
  -- 2. É Prime (assinatura ativa)
  -- 3. Hoje é aniversário
  -- 4. Mínimo 30 dias desde definição da birth_date
  -- 5. Ainda não recebeu o bônus este ano
  FOR v_usuario IN
    SELECT
      p.id,
      p.name,
      p.birth_date,
      p.birth_date_set_at
    FROM profiles p
    WHERE p.birth_date IS NOT NULL
      AND e_aniversario_hoje(p.birth_date)
      AND p.birth_date_set_at IS NOT NULL
      AND p.birth_date_set_at < (CURRENT_TIMESTAMP - INTERVAL '30 days')
      AND NOT EXISTS (
        SELECT 1 FROM missoes_automaticas_concluidas mac
        WHERE mac.user_id = p.id AND mac.missao_tipo = v_missao_tipo
      )
  LOOP
    v_processados := v_processados + 1;

    -- Buscar benefícios do plano (verificar se é Prime)
    SELECT * INTO v_benefits FROM public.get_user_benefits(v_usuario.id);
    v_pontos := COALESCE(v_benefits.pontos_aniversario, 0);

    -- Se não tem bônus de aniversário (Free), pular
    IF v_pontos = 0 THEN
      CONTINUE;
    END IF;

    -- Registrar para idempotência (ANTES de creditar)
    INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
    VALUES (v_usuario.id, v_missao_tipo, v_pontos)
    ON CONFLICT (user_id, missao_tipo) DO NOTHING;

    -- Se já existia (conflito), pular
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Creditar via função central
    BEGIN
      v_credit_result := public.creditar_pontos_interno(
        v_usuario.id,
        v_pontos,
        'birthday',
        'Feliz aniversário! Bônus especial ' || v_ano_atual::TEXT
      );

      IF (v_credit_result->>'success')::boolean THEN
        v_creditados := v_creditados + 1;

        -- Criar notificação
        BEGIN
          INSERT INTO notifications (user_id, type, title, message, icon)
          VALUES (
            v_usuario.id,
            'points_earned',
            'Feliz aniversário! 🎂',
            'Você ganhou ' || v_pontos || ' pontos do Me,up Club. Aproveite seu dia especial!',
            'cake'
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Erro ao criar notificação para %: %', v_usuario.id, SQLERRM;
        END;
      ELSE
        -- Falhou, remover registro de idempotência
        DELETE FROM missoes_automaticas_concluidas
        WHERE user_id = v_usuario.id AND missao_tipo = v_missao_tipo;
        v_erros := v_erros + 1;
        RAISE NOTICE 'Erro ao creditar aniversário para %: %', v_usuario.id, v_credit_result->>'error';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Erro inesperado
      DELETE FROM missoes_automaticas_concluidas
      WHERE user_id = v_usuario.id AND missao_tipo = v_missao_tipo;
      v_erros := v_erros + 1;
      RAISE NOTICE 'Exceção ao processar aniversário de %: %', v_usuario.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'data', CURRENT_DATE,
    'processados', v_processados,
    'creditados', v_creditados,
    'erros', v_erros,
    'pontos_por_usuario', 5000
  );
END;
$$;

-- =============================================
-- 4. FUNÇÃO: verificar_aniversario_login()
-- Fallback chamado no login para garantir que não perca o bônus
-- =============================================
CREATE OR REPLACE FUNCTION public.verificar_aniversario_login(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario RECORD;
  v_ano_atual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_missao_tipo TEXT := 'aniversario_' || v_ano_atual::TEXT;
  v_benefits RECORD;
  v_pontos INTEGER;
  v_credit_result JSONB;
BEGIN
  -- Buscar dados do usuário
  SELECT
    id,
    name,
    birth_date,
    birth_date_set_at
  INTO v_usuario
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Verificar se tem birth_date
  IF v_usuario.birth_date IS NULL THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'reason', 'birth_date não definida');
  END IF;

  -- Verificar se hoje é aniversário
  IF NOT e_aniversario_hoje(v_usuario.birth_date) THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'reason', 'Não é aniversário hoje');
  END IF;

  -- Verificar regra anti-fraude: mínimo 30 dias desde definição
  IF v_usuario.birth_date_set_at IS NULL OR
     v_usuario.birth_date_set_at > (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN
    RETURN jsonb_build_object(
      'success', true,
      'creditou', false,
      'reason', 'Data de nascimento definida há menos de 30 dias'
    );
  END IF;

  -- Verificar se já recebeu este ano
  IF EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = v_missao_tipo
  ) THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'reason', 'Bônus já creditado este ano');
  END IF;

  -- Buscar benefícios do plano
  SELECT * INTO v_benefits FROM public.get_user_benefits(p_user_id);
  v_pontos := COALESCE(v_benefits.pontos_aniversario, 0);

  -- Se não tem bônus (Free)
  IF v_pontos = 0 THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'reason', 'Plano não inclui bônus de aniversário');
  END IF;

  -- Registrar para idempotência
  INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, v_missao_tipo, v_pontos)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'reason', 'Já processado');
  END IF;

  -- Creditar
  v_credit_result := public.creditar_pontos_interno(
    p_user_id,
    v_pontos,
    'birthday',
    'Feliz aniversário! Bônus especial ' || v_ano_atual::TEXT
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    -- Rollback idempotência
    DELETE FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = v_missao_tipo;

    RETURN jsonb_build_object(
      'success', false,
      'creditou', false,
      'error', v_credit_result->>'error'
    );
  END IF;

  -- Notificação
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'points_earned',
      'Feliz aniversário! 🎂',
      'Você ganhou ' || v_pontos || ' pontos do Me,up Club. Aproveite seu dia especial!',
      'cake'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'creditou', true,
    'pontos', v_pontos,
    'balance_after', (v_credit_result->>'balance_after')::integer
  );
END;
$$;

-- =============================================
-- 5. PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.is_leap_year(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_aniversario_hoje(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.processar_aniversarios_hoje() TO service_role;
GRANT EXECUTE ON FUNCTION public.verificar_aniversario_login(UUID) TO authenticated;

-- =============================================
-- 6. NOTIFICAR POSTGREST
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 7. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 201: Job de Aniversário';
  RAISE NOTICE '  - Função is_leap_year() criada';
  RAISE NOTICE '  - Função e_aniversario_hoje() criada';
  RAISE NOTICE '  - Função processar_aniversarios_hoje() para job diário';
  RAISE NOTICE '  - Função verificar_aniversario_login() para fallback no login';
  RAISE NOTICE '  - Regras: 29/02->28/02, min 30 dias, apenas Prime';
END $$;
