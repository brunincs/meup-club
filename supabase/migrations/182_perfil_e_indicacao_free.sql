-- ============================================
-- MIGRAÇÃO 182: Corrige missão "Completar perfil" + Free ganha na indicação Prime
-- ============================================

-- ============================================
-- 1. FUNÇÃO ÚNICA is_perfil_completo
-- Campos obrigatórios: name, phone, city, state, birth_date
-- ============================================

CREATE OR REPLACE FUNCTION is_perfil_completo(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT name, phone, city, state, birth_date INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (
    v_profile.name IS NOT NULL AND TRIM(v_profile.name) != '' AND
    v_profile.phone IS NOT NULL AND TRIM(v_profile.phone) != '' AND
    v_profile.city IS NOT NULL AND TRIM(v_profile.city) != '' AND
    v_profile.state IS NOT NULL AND TRIM(v_profile.state) != '' AND
    v_profile.birth_date IS NOT NULL
  );
END;
$$;

-- Função para retornar campos faltantes
CREATE OR REPLACE FUNCTION get_campos_faltantes_perfil(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_faltantes TEXT[] := '{}';
BEGIN
  SELECT name, phone, city, state, birth_date INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN ARRAY['nome', 'telefone', 'cidade', 'estado', 'data de nascimento'];
  END IF;

  IF v_profile.name IS NULL OR TRIM(v_profile.name) = '' THEN
    v_faltantes := array_append(v_faltantes, 'nome');
  END IF;
  IF v_profile.phone IS NULL OR TRIM(v_profile.phone) = '' THEN
    v_faltantes := array_append(v_faltantes, 'telefone');
  END IF;
  IF v_profile.city IS NULL OR TRIM(v_profile.city) = '' THEN
    v_faltantes := array_append(v_faltantes, 'cidade');
  END IF;
  IF v_profile.state IS NULL OR TRIM(v_profile.state) = '' THEN
    v_faltantes := array_append(v_faltantes, 'estado');
  END IF;
  IF v_profile.birth_date IS NULL THEN
    v_faltantes := array_append(v_faltantes, 'data de nascimento');
  END IF;

  RETURN v_faltantes;
END;
$$;

-- ============================================
-- 2. CORRIGIR TRIGGER verificar_perfil_completo
-- Agora usa a função is_perfil_completo
-- ============================================

CREATE OR REPLACE FUNCTION verificar_perfil_completo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil_completo BOOLEAN;
  v_ja_creditado BOOLEAN;
  v_credit_result JSONB;
  v_pontos INTEGER := 50; -- Pontos da missão
BEGIN
  -- Usar função única de verificação
  v_perfil_completo := is_perfil_completo(NEW.id);

  -- Se não está completo, não fazer nada
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
  VALUES (NEW.id, 'completar_perfil', v_pontos)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  -- Se não inseriu (já existia), não creditar
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Creditar via função central
  v_credit_result := public.creditar_pontos_interno(
    NEW.id,
    v_pontos,
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
      VALUES (NEW.id, 'mission_completed', 'Perfil completo!', 'Você ganhou ' || v_pontos || ' pontos!', 'user-check');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger para detectar mudanças em TODOS os campos relevantes
DROP TRIGGER IF EXISTS tr_verificar_perfil_completo ON public.profiles;
CREATE TRIGGER tr_verificar_perfil_completo
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (
  OLD.name IS DISTINCT FROM NEW.name OR
  OLD.phone IS DISTINCT FROM NEW.phone OR
  OLD.city IS DISTINCT FROM NEW.city OR
  OLD.state IS DISTINCT FROM NEW.state OR
  OLD.birth_date IS DISTINCT FROM NEW.birth_date
)
EXECUTE FUNCTION verificar_perfil_completo();

-- ============================================
-- 3. CORRIGIR USUÁRIOS COM PERFIL COMPLETO MAS MISSÃO PENDENTE
-- ============================================

DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
  v_credit_result JSONB;
  v_pontos INTEGER := 50;
BEGIN
  FOR v_user IN
    SELECT p.id, p.name
    FROM profiles p
    WHERE is_perfil_completo(p.id) = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM missoes_automaticas_concluidas mac
      WHERE mac.user_id = p.id AND mac.missao_tipo = 'completar_perfil'
    )
  LOOP
    -- Registrar missão como concluída
    INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
    VALUES (v_user.id, 'completar_perfil', v_pontos)
    ON CONFLICT (user_id, missao_tipo) DO NOTHING;

    IF FOUND THEN
      -- Creditar pontos
      v_credit_result := creditar_pontos_interno(
        v_user.id,
        v_pontos,
        'task',
        'Missão: Completar perfil (correção)'
      );

      IF (v_credit_result->>'success')::boolean THEN
        v_count := v_count + 1;
        RAISE NOTICE '✓ Corrigido: % (ID: %)', v_user.name, v_user.id;

        -- Notificação
        INSERT INTO notifications (user_id, type, title, message, icon)
        VALUES (v_user.id, 'mission_completed', 'Perfil completo!', 'Você ganhou ' || v_pontos || ' pontos!', 'user-check');
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Total de usuários corrigidos: %', v_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 4. CONFIGURAÇÃO: FREE GANHA NA INDICAÇÃO PRIME
-- ============================================

-- Adicionar config se não existir
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('indicacao_prime_bonus_free', 2000, 'Pontos para indicador FREE quando amigo vira Prime Anual')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao;

-- Garantir que a config do Prime existe
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('indicacao_prime_bonus_prime', 3000, 'Pontos para indicador PRIME quando amigo vira Prime Anual')
ON CONFLICT (chave) DO NOTHING;

-- ============================================
-- 5. ATUALIZAR admin_confirmar_prime_anual PARA DAR PONTOS AO FREE
-- ============================================

CREATE OR REPLACE FUNCTION admin_confirmar_prime_anual(p_subscription_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos_indicador INTEGER;
  v_pontos_indicado INTEGER;
  v_dias_pendente INTEGER;
  v_liberar_em TIMESTAMPTZ;
  v_indicado_nome TEXT;
  v_pontos_boas_vindas INTEGER := 2000;
BEGIN
  -- Buscar assinatura
  SELECT s.*, p.name as user_name INTO v_subscription
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.id = p_subscription_id;

  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não encontrada');
  END IF;

  IF v_subscription.ciclo != 'anual' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não é anual');
  END IF;

  -- Usar carência do Prime (padrão 7 dias)
  v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  -- PONTOS DE BOAS-VINDAS para o assinante (BLOQUEADOS)
  PERFORM creditar_pontos_bloqueados(
    v_subscription.user_id,
    v_pontos_boas_vindas,
    'Bônus de boas-vindas Prime Anual',
    v_liberar_em,
    NULL,
    p_subscription_id
  );

  -- BUSCAR REFERRAL para bônus de indicação
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = v_subscription.user_id
  AND r.prime_anual_pontos_creditados = FALSE
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Bônus de boas-vindas creditado (bloqueado ' || v_dias_pendente || ' dias)',
      'pontos_boas_vindas', v_pontos_boas_vindas,
      'liberar_em', v_liberar_em
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Pontos do indicado (igual para todos)
  v_pontos_indicado := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicado'), 1000);

  -- AGORA FREE TAMBÉM GANHA!
  IF v_indicador_plano = 'free' THEN
    -- Free ganha menos que Prime, mas GANHA!
    v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'indicacao_prime_bonus_free'), 2000);
  ELSE
    -- Prime ganha mais
    v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'indicacao_prime_bonus_prime'), 3000);
  END IF;

  -- Creditar indicador (bloqueado por 7 dias)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referrer_id,
    v_pontos_indicador,
    'Indicação: ' || v_indicado_nome || ' virou Prime',
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  -- Creditar indicado extra (bloqueado por 7 dias)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referred_id,
    v_pontos_indicado,
    'Bônus: você assinou o Prime Anual',
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  -- Marcar referral
  UPDATE referrals SET
    prime_anual_ativado = TRUE,
    prime_anual_ativado_em = NOW(),
    prime_anual_pontos_creditados = FALSE -- Ainda bloqueados
  WHERE id = v_referral.id;

  -- Notificar indicador
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_referral.referrer_id,
    'referral_signup',
    'Seu amigo virou Prime!',
    v_indicado_nome || ' assinou o Prime Anual. +' || v_pontos_indicador || ' pts (liberam em ' || v_dias_pendente || ' dias).',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pontos bloqueados por ' || v_dias_pendente || ' dias',
    'liberar_em', v_liberar_em,
    'pontos_boas_vindas', v_pontos_boas_vindas,
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado,
    'indicador_plano', v_indicador_plano
  );
END;
$$;

-- ============================================
-- 6. VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
  v_config RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DE CONFIGURAÇÃO';
  RAISE NOTICE '========================================';

  FOR v_config IN
    SELECT chave, valor FROM plano_config
    WHERE chave IN ('indicacao_prime_bonus_free', 'indicacao_prime_bonus_prime', 'prime_anual_indicado')
    ORDER BY chave
  LOOP
    RAISE NOTICE '% = %', v_config.chave, v_config.valor;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;
