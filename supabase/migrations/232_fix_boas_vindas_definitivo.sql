-- ============================================
-- MIGRAÇÃO 232: FIX DEFINITIVO BÔNUS BOAS-VINDAS
-- Problema: usuários recebem 500 ou 100 pts ao invés de 1000
-- ============================================

-- ============================================
-- 1. GARANTIR CONFIG CORRETA
-- ============================================
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_boas_vindas_free', 1000, 'Pontos de boas-vindas para Free aprovado')
ON CONFLICT (chave) DO UPDATE SET valor = 1000, descricao = EXCLUDED.descricao;

-- ============================================
-- 2. RECRIAR creditar_boas_vindas_free (SEM usar 500 ou 100!)
-- ============================================
CREATE OR REPLACE FUNCTION creditar_boas_vindas_free(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos INTEGER := 1000;  -- HARDCODED 1000, não buscar de config
  v_ja_creditado BOOLEAN;
  v_profile RECORD;
  v_saldo_antes INTEGER;
  v_saldo_depois INTEGER;
BEGIN
  -- Verificar se usuário existe
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  -- Não creditar para contas de teste
  IF COALESCE(v_profile.is_teste, false) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Conta de teste');
  END IF;

  -- Verificar se já recebeu bônus de boas-vindas (qualquer tipo)
  SELECT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = p_user_id
    AND (
      reason ILIKE '%boas-vindas%'
      OR reason ILIKE '%welcome%'
      OR reason ILIKE '%lançamento%'
      OR reason ILIKE '%cadastro%'
    )
    AND amount > 0
  ) INTO v_ja_creditado;

  IF v_ja_creditado THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'Já recebeu bônus');
  END IF;

  -- Calcular saldos
  v_saldo_antes := COALESCE(v_profile.points, 0);
  v_saldo_depois := v_saldo_antes + v_pontos;

  -- Creditar pontos
  BEGIN
    INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
    VALUES (
      p_user_id,
      v_pontos,
      'credit',
      'Bônus de boas-vindas · lançamento Me,up Club',
      v_saldo_antes,
      v_saldo_depois
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar o INSERT, logar e continuar
    RAISE WARNING 'Falha ao inserir point_transaction: %', SQLERRM;
  END;

  -- Atualizar saldo
  UPDATE profiles
  SET points = v_saldo_depois,
      total_points_earned = COALESCE(total_points_earned, 0) + v_pontos,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Criar notificação (ignorar erros)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      p_user_id,
      'info',  -- Usar 'info' em vez de 'welcome' para evitar problemas de constraint
      'Bônus de boas-vindas!',
      'Você ganhou ' || v_pontos || ' pts de boas-vindas no Me,up Club!',
      FALSE
    );
  EXCEPTION WHEN OTHERS THEN
    -- Notificação é secundária, ignorar erro
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'message', 'Bônus de boas-vindas creditado'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro em creditar_boas_vindas_free: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 3. RECRIAR handle_new_user (GARANTIR 1000)
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_accepted_terms BOOLEAN;
  v_accepted_terms_at TIMESTAMPTZ;
  v_codigo_entrada TEXT;
  v_origem_cadastro TEXT;
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_status_acesso TEXT;
  v_origem_acesso TEXT;
BEGIN
  -- Extrair dados dos metadados
  v_referrer_id := (NEW.raw_user_meta_data->>'referred_by')::UUID;
  v_accepted_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::BOOLEAN, false);
  v_codigo_entrada := NEW.raw_user_meta_data->>'codigo_entrada';
  v_origem_cadastro := COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', 'site');

  IF v_accepted_terms THEN
    v_accepted_terms_at := NOW();
  ELSE
    v_accepted_terms_at := NULL;
  END IF;

  -- Determinar origem_acesso
  IF v_codigo_entrada IS NOT NULL AND v_codigo_entrada != '' THEN
    v_origem_acesso := 'link_lista';
  ELSIF v_referrer_id IS NOT NULL THEN
    v_origem_acesso := 'indicacao';
  ELSE
    v_origem_acesso := 'site';
  END IF;

  -- Buscar configuração de vagas Free (default 70)
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
      WHERE s.user_id = p.id
        AND s.status = 'active'
        AND s.plano = 'prime'
    );

  v_vagas_livres := v_vagas_total - COALESCE(v_vagas_ocupadas, 0);

  -- Se há vaga, aprova direto; senão, lista de espera
  IF v_vagas_livres > 0 THEN
    v_status_acesso := 'aprovado';
  ELSE
    v_status_acesso := 'em_espera';
  END IF;

  -- Criar o perfil já com status definido
  INSERT INTO public.profiles (
    id, email, name, referred_by, accepted_terms, accepted_terms_at,
    status_acesso, origem_acesso, acesso_aprovado_em, points, total_points_earned
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_referrer_id, v_accepted_terms, v_accepted_terms_at,
    v_status_acesso, v_origem_acesso,
    CASE WHEN v_status_acesso = 'aprovado' THEN NOW() ELSE NULL END,
    0, 0  -- Inicializar pontos em 0
  );

  -- Se aprovado, creditar bônus de boas-vindas Free (1000 pts)
  IF v_status_acesso = 'aprovado' THEN
    -- Usar bloco separado para não afetar o trigger
    BEGIN
      PERFORM creditar_boas_vindas_free(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao creditar boas-vindas: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro em handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- 4. GARANTIR handle_new_user_referral_after NÃO CREDITA PONTOS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_referral_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Se não tem indicador, não faz nada
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  v_referrer_id := NEW.referred_by;

  -- Se já existe indicação para este usuário, não criar duplicada
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Criar a indicação (status pending, SEM pontos)
  -- Pontos de boas-vindas são dados pelo creditar_boas_vindas_free (1000 pts)
  -- Pontos de indicação são dados na primeira emissão aprovada
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
      FALSE,  -- NÃO dar pontos aqui
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar referral: %', SQLERRM;
  END;

  -- Notificar o indicador (sem mencionar pontos)
  BEGIN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      icon,
      metadata
    ) VALUES (
      v_referrer_id,
      'info',  -- Usar 'info' em vez de 'referral_signup'
      'Alguém entrou pelo seu convite!',
      'Uma pessoa se cadastrou usando seu código de indicação.',
      'wave',
      jsonb_build_object('referred_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Notificação é secundária
  END;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[REFERRAL AFTER] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. CORRIGIR USUÁRIOS COM PONTOS ERRADOS
-- ============================================
DO $$
DECLARE
  v_user RECORD;
  v_bonus_atual INTEGER;
  v_diferenca INTEGER;
  v_saldo_atual INTEGER;
  v_saldo_novo INTEGER;
BEGIN
  -- Encontrar usuários Free aprovados com menos de 1000 pts de bônus
  FOR v_user IN
    SELECT p.id, p.email, p.points, p.created_at
    FROM profiles p
    WHERE p.status_acesso = 'aprovado'
      AND COALESCE(p.is_teste, false) = false
      AND COALESCE(p.is_fundador, false) = false
      -- Criado recentemente (últimos 7 dias)
      AND p.created_at > NOW() - INTERVAL '7 days'
      -- Não é Prime
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = p.id AND s.status = 'active' AND s.plano = 'prime'
      )
  LOOP
    -- Verificar quanto de bônus já recebeu
    SELECT COALESCE(SUM(amount), 0) INTO v_bonus_atual
    FROM point_transactions
    WHERE user_id = v_user.id
      AND (
        reason ILIKE '%boas-vindas%'
        OR reason ILIKE '%welcome%'
        OR reason ILIKE '%lançamento%'
        OR reason ILIKE '%cadastro%'
      )
      AND amount > 0;

    -- Se recebeu menos de 1000, complementar
    IF v_bonus_atual < 1000 THEN
      v_diferenca := 1000 - v_bonus_atual;
      v_saldo_atual := COALESCE(v_user.points, 0);
      v_saldo_novo := v_saldo_atual + v_diferenca;

      -- Verificar se já recebeu complemento
      IF NOT EXISTS (
        SELECT 1 FROM point_transactions
        WHERE user_id = v_user.id
          AND reason = 'Complemento bônus boas-vindas (correção)'
      ) THEN
        -- Creditar diferença
        INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
        VALUES (
          v_user.id,
          v_diferenca,
          'credit',
          'Complemento bônus boas-vindas (correção)',
          v_saldo_atual,
          v_saldo_novo
        );

        -- Atualizar saldo
        UPDATE profiles
        SET points = v_saldo_novo,
            total_points_earned = COALESCE(total_points_earned, 0) + v_diferenca,
            updated_at = NOW()
        WHERE id = v_user.id;

        RAISE NOTICE 'Corrigido: % - +% pts (tinha % de bônus)', v_user.email, v_diferenca, v_bonus_atual;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 6. CRIAR RPC PARA ADMIN VERIFICAR/CORRIGIR
-- ============================================
CREATE OR REPLACE FUNCTION admin_verificar_bonus_boas_vindas()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  points INTEGER,
  bonus_boas_vindas INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.created_at,
    COALESCE(p.points, 0),
    COALESCE((
      SELECT SUM(pt.amount)::INTEGER
      FROM point_transactions pt
      WHERE pt.user_id = p.id
        AND (
          pt.reason ILIKE '%boas-vindas%'
          OR pt.reason ILIKE '%welcome%'
          OR pt.reason ILIKE '%lançamento%'
        )
        AND pt.amount > 0
    ), 0) as bonus_boas_vindas,
    CASE
      WHEN COALESCE((
        SELECT SUM(pt.amount)
        FROM point_transactions pt
        WHERE pt.user_id = p.id
          AND (pt.reason ILIKE '%boas-vindas%' OR pt.reason ILIKE '%welcome%' OR pt.reason ILIKE '%lançamento%')
          AND pt.amount > 0
      ), 0) >= 1000 THEN 'OK'
      WHEN COALESCE((
        SELECT SUM(pt.amount)
        FROM point_transactions pt
        WHERE pt.user_id = p.id
          AND (pt.reason ILIKE '%boas-vindas%' OR pt.reason ILIKE '%welcome%' OR pt.reason ILIKE '%lançamento%')
          AND pt.amount > 0
      ), 0) > 0 THEN 'INCOMPLETO'
      ELSE 'SEM_BONUS'
    END as status
  FROM profiles p
  WHERE p.status_acesso = 'aprovado'
    AND COALESCE(p.is_teste, false) = false
    AND p.created_at > NOW() - INTERVAL '30 days'
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_verificar_bonus_boas_vindas() TO authenticated;

-- ============================================
-- NOTIFICAR POSTGREST
-- ============================================
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 232: Bônus boas-vindas corrigido para 1000 pts';
  RAISE NOTICE '  - creditar_boas_vindas_free: agora usa 1000 hardcoded';
  RAISE NOTICE '  - handle_new_user: chama creditar_boas_vindas_free';
  RAISE NOTICE '  - handle_new_user_referral_after: NÃO credita pontos';
  RAISE NOTICE '  - Usuários recentes corrigidos automaticamente';
END $$;
