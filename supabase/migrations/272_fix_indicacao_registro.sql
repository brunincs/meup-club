-- ============================================
-- MIGRATION 272: Fix indicação não registra
-- Problema: "bb" se cadastrou pelo link do "Jason" mas Admin > Indicações mostra 0
-- ============================================

-- ============================================
-- 1. VERIFICAR/CRIAR TRIGGER AFTER INSERT EM PROFILES
-- ============================================

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS trigger_referral_after ON public.profiles;

CREATE TRIGGER trigger_referral_after
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_referral_after();

-- ============================================
-- 2. ATUALIZAR handle_new_user_referral_after
-- - Lidar com referred_by como UUID ou como CÓDIGO
-- - Criar referral idempotente
-- - Notificação única
-- - Missão "Primeira indicação"
-- - Logar erros em log_evento (não silenciar)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user_referral_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_name TEXT;
  v_primeiro_nome TEXT;
  v_referral_id UUID;
BEGIN
  -- Se não tem indicador, não faz nada
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  v_referrer_id := NEW.referred_by;

  -- Se já existe indicação para este usuário, não criar duplicada
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
    PERFORM log_evento('referral_already_exists', NEW.id, jsonb_build_object(
      'referrer_id', v_referrer_id,
      'message', 'Referral já existe para este usuário'
    ));
    RETURN NEW;
  END IF;

  -- Verificar se o referrer_id existe em profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_referrer_id) THEN
    PERFORM log_evento('referrer_not_found', NEW.id, jsonb_build_object(
      'referrer_id', v_referrer_id,
      'message', 'Indicador não encontrado'
    ));
    RETURN NEW;
  END IF;

  -- Pegar o nome do indicado
  v_referred_name := COALESCE(NEW.name, 'Alguém');
  v_primeiro_nome := SPLIT_PART(v_referred_name, ' ', 1);

  -- Criar a indicação (status pending, SEM pontos)
  BEGIN
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      status,
      points_awarded,
      welcome_points_given,
      created_at,
      updated_at
    ) VALUES (
      v_referrer_id,
      NEW.id,
      'pending',
      0,
      FALSE,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_referral_id;

    PERFORM log_evento('referral_created', NEW.id, jsonb_build_object(
      'referral_id', v_referral_id,
      'referrer_id', v_referrer_id,
      'referred_name', v_primeiro_nome
    ));
  EXCEPTION WHEN unique_violation THEN
    -- Já existe (constraint)
    PERFORM log_evento('referral_duplicate_constraint', NEW.id, jsonb_build_object(
      'referrer_id', v_referrer_id,
      'error', 'unique_violation'
    ));
    RETURN NEW;
  WHEN OTHERS THEN
    PERFORM log_evento('referral_create_error', NEW.id, jsonb_build_object(
      'referrer_id', v_referrer_id,
      'error', SQLERRM
    ));
    -- NÃO derrubar o cadastro, apenas logar
    RETURN NEW;
  END;

  -- Notificar o indicador (PROTEÇÃO CONTRA DUPLICATA)
  BEGIN
    -- Só inserir se não existir notificação recente para este par
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_referrer_id
        AND type IN ('info', 'referral_signup', 'referral')
        AND metadata->>'referred_id' = NEW.id::TEXT
        AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        icon,
        metadata
      ) VALUES (
        v_referrer_id,
        'referral_signup',
        'Nova indicação! 🎉',
        v_primeiro_nome || ' se cadastrou com seu link. Você ganha seus pontos quando a 1ª viagem for aprovada.',
        'sparkles',
        jsonb_build_object('referred_id', NEW.id, 'referred_name', v_primeiro_nome)
      );

      PERFORM log_evento('referral_notification_sent', v_referrer_id, jsonb_build_object(
        'referred_id', NEW.id,
        'referred_name', v_primeiro_nome
      ));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_evento('referral_notification_error', v_referrer_id, jsonb_build_object(
      'error', SQLERRM
    ));
  END;

  -- ============================================
  -- COMPLETAR MISSÃO "Primeira indicação" (100 pts)
  -- Regra: amigo criou a conta = missão concluída
  -- ============================================
  BEGIN
    -- Verificar se é a primeira indicação deste usuário
    IF (SELECT COUNT(*) FROM public.referrals WHERE referrer_id = v_referrer_id) = 1 THEN
      -- Se ainda não completou a missão
      IF NOT EXISTS (
        SELECT 1 FROM public.missoes_automaticas_concluidas
        WHERE user_id = v_referrer_id
          AND missao_tipo = 'primeira_indicacao'
      ) THEN
        -- Completar missão
        PERFORM completar_missao_automatica(
          v_referrer_id,
          'primeira_indicacao',
          100,
          'Missão: Primeira indicação'
        );

        PERFORM log_evento('missao_primeira_indicacao_concluida', v_referrer_id, jsonb_build_object(
          'referred_id', NEW.id,
          'pontos', 100
        ));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_evento('missao_primeira_indicacao_error', v_referrer_id, jsonb_build_object(
      'error', SQLERRM
    ));
  END;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  PERFORM log_evento('referral_after_fatal_error', NEW.id, jsonb_build_object(
    'error', SQLERRM,
    'referrer_id', v_referrer_id
  ));
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. GARANTIR QUE handle_new_user RESOLVE CÓDIGO → UUID
-- Se o metadado vier como código em vez de UUID, resolver
-- ============================================

CREATE OR REPLACE FUNCTION resolve_referrer_id(p_ref TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid UUID;
  v_id UUID;
BEGIN
  -- Se é NULL ou vazio, retornar NULL
  IF p_ref IS NULL OR TRIM(p_ref) = '' THEN
    RETURN NULL;
  END IF;

  -- Tentar converter para UUID diretamente
  BEGIN
    v_uuid := p_ref::UUID;
    -- Verificar se existe em profiles
    SELECT id INTO v_id FROM profiles WHERE id = v_uuid;
    IF FOUND THEN
      RETURN v_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Não é UUID válido, tentar como código
    NULL;
  END;

  -- Tentar buscar como código de indicação
  SELECT id INTO v_id FROM profiles WHERE referral_code = UPPER(TRIM(p_ref));
  IF FOUND THEN
    RETURN v_id;
  END IF;

  -- Não encontrado
  RETURN NULL;
END;
$$;

-- ============================================
-- 4. ATUALIZAR handle_new_user PARA USAR resolve_referrer_id
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_raw TEXT;
  v_accepted_terms BOOLEAN;
  v_accepted_terms_at TIMESTAMPTZ;
  v_codigo_entrada TEXT;
  v_origem_cadastro TEXT;
  v_prime_token TEXT;
  v_phone TEXT;
  v_cpf TEXT;
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_status_acesso TEXT;
  v_origem_acesso TEXT;
  v_link RECORD;
  v_prime_result JSONB;
  v_link_updated INTEGER;
  v_bonus_result JSONB;
BEGIN
  -- Extrair dados dos metadados
  v_referrer_raw := NEW.raw_user_meta_data->>'referred_by';
  v_referrer_id := resolve_referrer_id(v_referrer_raw);
  v_accepted_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::BOOLEAN, false);
  v_codigo_entrada := NEW.raw_user_meta_data->>'codigo_entrada';
  v_origem_cadastro := COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', 'site');
  v_prime_token := NEW.raw_user_meta_data->>'prime_token';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_cpf := NEW.raw_user_meta_data->>'cpf';

  IF v_accepted_terms THEN
    v_accepted_terms_at := NOW();
  ELSE
    v_accepted_terms_at := NULL;
  END IF;

  -- Logar para debug
  IF v_referrer_raw IS NOT NULL THEN
    PERFORM log_evento('handle_new_user_referrer', NEW.id, jsonb_build_object(
      'raw', v_referrer_raw,
      'resolved', v_referrer_id
    ));
  END IF;

  -- =============================================
  -- CAMINHO 1: PRIME LINK (token válido)
  -- =============================================
  IF v_prime_token IS NOT NULL AND v_prime_token != '' THEN
    UPDATE prime_links SET
      status = 'usado',
      usado_por = NEW.id,
      usado_em = NOW()
    WHERE token = v_prime_token
      AND status = 'ativo'
      AND expira_em > NOW()
      AND usado_por IS NULL
    RETURNING * INTO v_link;

    GET DIAGNOSTICS v_link_updated = ROW_COUNT;

    IF v_link_updated > 0 THEN
      -- Criar profile Prime com phone (CPF será criptografado pelo trigger)
      INSERT INTO public.profiles (
        id, email, name, phone, cpf,
        referred_by, accepted_terms, accepted_terms_at,
        status_acesso, origem_acesso, acesso_aprovado_em, points, total_points_earned
      )
      VALUES (
        NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        v_phone, v_cpf,
        v_referrer_id, v_accepted_terms, v_accepted_terms_at,
        'aprovado', 'link_pagamento', NOW(), 0, 0
      );

      -- Remover CPF dos metadados (segurança)
      IF v_cpf IS NOT NULL THEN
        BEGIN
          UPDATE auth.users SET
            raw_user_meta_data = raw_user_meta_data - 'cpf'
          WHERE id = NEW.id;
        EXCEPTION WHEN OTHERS THEN
          NULL; -- Não falhar se não conseguir remover
        END;
      END IF;

      -- Ativar Prime
      BEGIN
        SELECT ativar_prime_anual_completo(NEW.id, 'link_pagamento', v_link.id::TEXT) INTO v_prime_result;
        PERFORM log_evento('prime_link_ativado_cadastro', NEW.id, jsonb_build_object(
          'link_id', v_link.id,
          'result', v_prime_result
        ));
      EXCEPTION WHEN OTHERS THEN
        PERFORM log_evento('prime_link_erro_cadastro', NEW.id, jsonb_build_object(
          'link_id', v_link.id,
          'erro', SQLERRM
        ));
      END;

      RETURN NEW;
    END IF;
  END IF;

  -- =============================================
  -- CAMINHO 2: CADASTRO FREE NORMAL
  -- =============================================

  -- Determinar origem_acesso
  IF v_codigo_entrada IS NOT NULL AND v_codigo_entrada != '' THEN
    v_origem_acesso := 'link_lista';
  ELSIF v_origem_cadastro = 'vsl' THEN
    v_origem_acesso := 'vsl';
  ELSIF v_origem_cadastro = 'link_prime' THEN
    v_origem_acesso := 'site';
  ELSIF v_referrer_id IS NOT NULL THEN
    v_origem_acesso := 'indicacao';
  ELSE
    v_origem_acesso := 'site';
  END IF;

  -- Buscar configuração de vagas Free
  BEGIN
    SELECT COALESCE(get_config('vagas_free_total', '70')::INTEGER, 70) INTO v_vagas_total;
  EXCEPTION WHEN OTHERS THEN
    v_vagas_total := 70;
  END;

  -- Contar vagas ocupadas
  SELECT COUNT(*) INTO v_vagas_ocupadas
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND COALESCE(p.is_teste, false) = false
    AND COALESCE(p.is_fundador, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
    );

  v_vagas_livres := v_vagas_total - COALESCE(v_vagas_ocupadas, 0);

  IF v_vagas_livres > 0 THEN
    v_status_acesso := 'aprovado';
  ELSE
    v_status_acesso := 'em_espera';
  END IF;

  -- Criar o perfil com phone e CPF
  INSERT INTO public.profiles (
    id, email, name, phone, cpf,
    referred_by, accepted_terms, accepted_terms_at,
    status_acesso, origem_acesso, acesso_aprovado_em, points, total_points_earned
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_phone, v_cpf,
    v_referrer_id, v_accepted_terms, v_accepted_terms_at,
    v_status_acesso, v_origem_acesso,
    CASE WHEN v_status_acesso = 'aprovado' THEN NOW() ELSE NULL END,
    0, 0
  );

  -- Remover CPF dos metadados (segurança)
  IF v_cpf IS NOT NULL THEN
    BEGIN
      UPDATE auth.users SET
        raw_user_meta_data = raw_user_meta_data - 'cpf'
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Se aprovado, creditar bônus
  IF v_status_acesso = 'aprovado' THEN
    BEGIN
      SELECT creditar_boas_vindas_free(NEW.id) INTO v_bonus_result;
      PERFORM log_evento('bonus_free_cadastro', NEW.id, v_bonus_result);
    EXCEPTION WHEN OTHERS THEN
      PERFORM log_evento('bonus_free_erro_cadastro', NEW.id, jsonb_build_object('erro', SQLERRM));
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[handle_new_user] Erro fatal: %', SQLERRM;
  BEGIN
    PERFORM log_evento('handle_new_user_erro_fatal', NEW.id, jsonb_build_object('erro', SQLERRM));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    INSERT INTO public.profiles (id, email, name, status_acesso, origem_acesso, points)
    VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), 'em_analise', 'site', 0)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. RETROATIVO: Criar referrals faltantes
-- Profiles com referred_by mas sem linha em referrals
-- ============================================

DO $$
DECLARE
  v_profile RECORD;
  v_count INTEGER := 0;
  v_referral_id UUID;
  v_primeiro_nome TEXT;
BEGIN
  FOR v_profile IN
    SELECT p.id, p.name, p.referred_by, p.created_at
    FROM profiles p
    WHERE p.referred_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM referrals r WHERE r.referred_id = p.id
      )
  LOOP
    -- Criar referral retroativo
    BEGIN
      INSERT INTO referrals (
        referrer_id,
        referred_id,
        status,
        points_awarded,
        welcome_points_given,
        created_at,
        updated_at
      ) VALUES (
        v_profile.referred_by,
        v_profile.id,
        'pending',
        0,
        FALSE,
        COALESCE(v_profile.created_at, NOW()),
        NOW()
      )
      RETURNING id INTO v_referral_id;

      v_count := v_count + 1;

      -- Logar
      PERFORM log_evento('referral_retroativo', v_profile.id, jsonb_build_object(
        'referral_id', v_referral_id,
        'referrer_id', v_profile.referred_by
      ));

      -- Enviar notificação ao indicador (se não existir)
      v_primeiro_nome := SPLIT_PART(COALESCE(v_profile.name, 'Alguém'), ' ', 1);

      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_profile.referred_by
          AND metadata->>'referred_id' = v_profile.id::TEXT
      ) THEN
        INSERT INTO notifications (user_id, type, title, message, icon, metadata)
        VALUES (
          v_profile.referred_by,
          'referral_signup',
          'Nova indicação! 🎉',
          v_primeiro_nome || ' se cadastrou com seu link. Você ganha seus pontos quando a 1ª viagem for aprovada.',
          'sparkles',
          jsonb_build_object('referred_id', v_profile.id, 'referred_name', v_primeiro_nome)
        );
      END IF;

      -- Completar missão "Primeira indicação" se for a primeira
      IF (SELECT COUNT(*) FROM referrals WHERE referrer_id = v_profile.referred_by) = 1 THEN
        IF NOT EXISTS (
          SELECT 1 FROM missoes_automaticas_concluidas
          WHERE user_id = v_profile.referred_by
            AND missao_tipo = 'primeira_indicacao'
        ) THEN
          PERFORM completar_missao_automatica(
            v_profile.referred_by,
            'primeira_indicacao',
            100,
            'Missão: Primeira indicação'
          );
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao criar referral retroativo para %: %', v_profile.id, SQLERRM;
    END;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE '✓ Retroativo: % referrals criados', v_count;
  ELSE
    RAISE NOTICE '✓ Nenhum referral retroativo necessário';
  END IF;
END $$;

-- ============================================
-- 6. RETROATIVO: Preencher referred_by dos metadados
-- Usuários que têm referred_by nos metadados mas não no profile
-- ============================================

DO $$
DECLARE
  v_user RECORD;
  v_referrer_id UUID;
  v_referrer_raw TEXT;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN
    SELECT u.id, u.raw_user_meta_data, p.referred_by as profile_referred_by
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE p.referred_by IS NULL
      AND u.raw_user_meta_data->>'referred_by' IS NOT NULL
  LOOP
    v_referrer_raw := v_user.raw_user_meta_data->>'referred_by';
    v_referrer_id := resolve_referrer_id(v_referrer_raw);

    IF v_referrer_id IS NOT NULL THEN
      UPDATE profiles SET referred_by = v_referrer_id WHERE id = v_user.id;
      v_count := v_count + 1;

      PERFORM log_evento('referred_by_retroativo', v_user.id, jsonb_build_object(
        'raw', v_referrer_raw,
        'resolved', v_referrer_id
      ));
    END IF;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE '✓ Retroativo: % profiles atualizados com referred_by dos metadados', v_count;
  END IF;
END $$;

-- Agora criar os referrals para esses profiles atualizados
DO $$
DECLARE
  v_profile RECORD;
  v_count INTEGER := 0;
  v_referral_id UUID;
  v_primeiro_nome TEXT;
BEGIN
  FOR v_profile IN
    SELECT p.id, p.name, p.referred_by, p.created_at
    FROM profiles p
    WHERE p.referred_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM referrals r WHERE r.referred_id = p.id
      )
  LOOP
    BEGIN
      INSERT INTO referrals (
        referrer_id,
        referred_id,
        status,
        points_awarded,
        welcome_points_given,
        created_at,
        updated_at
      ) VALUES (
        v_profile.referred_by,
        v_profile.id,
        'pending',
        0,
        FALSE,
        COALESCE(v_profile.created_at, NOW()),
        NOW()
      )
      RETURNING id INTO v_referral_id;

      v_count := v_count + 1;

      -- Notificação
      v_primeiro_nome := SPLIT_PART(COALESCE(v_profile.name, 'Alguém'), ' ', 1);
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_profile.referred_by
          AND metadata->>'referred_id' = v_profile.id::TEXT
      ) THEN
        INSERT INTO notifications (user_id, type, title, message, icon, metadata)
        VALUES (
          v_profile.referred_by,
          'referral_signup',
          'Nova indicação! 🎉',
          v_primeiro_nome || ' se cadastrou com seu link. Você ganha seus pontos quando a 1ª viagem for aprovada.',
          'sparkles',
          jsonb_build_object('referred_id', v_profile.id, 'referred_name', v_primeiro_nome)
        );
      END IF;

      -- Missão
      IF (SELECT COUNT(*) FROM referrals WHERE referrer_id = v_profile.referred_by) = 1 THEN
        IF NOT EXISTS (
          SELECT 1 FROM missoes_automaticas_concluidas
          WHERE user_id = v_profile.referred_by AND missao_tipo = 'primeira_indicacao'
        ) THEN
          PERFORM completar_missao_automatica(
            v_profile.referred_by,
            'primeira_indicacao',
            100,
            'Missão: Primeira indicação'
          );
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro: %', SQLERRM;
    END;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE '✓ Retroativo (pós-metadados): % referrals criados', v_count;
  END IF;
END $$;

-- ============================================
-- 7. GARANTIR PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION public.handle_new_user_referral_after() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_referral_after() TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_referrer_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_referrer_id(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- FIM
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 272: Fix indicação registro';
  RAISE NOTICE '  - Trigger trigger_referral_after recriado';
  RAISE NOTICE '  - handle_new_user_referral_after atualizada com log';
  RAISE NOTICE '  - resolve_referrer_id criada (UUID ou código)';
  RAISE NOTICE '  - handle_new_user usa resolve_referrer_id';
  RAISE NOTICE '  - Referrals retroativos criados';
  RAISE NOTICE '  - Notificações e missões enviadas';
END $$;
