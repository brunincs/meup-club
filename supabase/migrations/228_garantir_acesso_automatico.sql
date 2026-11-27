-- ============================================
-- MIGRATION 228: Rede de segurança para acesso automático
-- Função garantir_acesso_automatico() chamada pelo frontend
-- se o trigger não conseguiu aprovar
-- ============================================

-- ============================================
-- 1. FUNÇÃO GARANTIR ACESSO AUTOMÁTICO
-- Chamada pelo PendingApprovalScreen como fallback
-- ============================================

CREATE OR REPLACE FUNCTION public.garantir_acesso_automatico()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_origem_acesso TEXT;
  v_referred_by UUID;
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_bonus_dado BOOLEAN;
BEGIN
  -- Pegar usuário logado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Buscar status atual
  SELECT status_acesso, origem_acesso, referred_by
  INTO v_current_status, v_origem_acesso, v_referred_by
  FROM profiles
  WHERE id = v_user_id;

  -- Se já está aprovado, não faz nada
  IF v_current_status = 'aprovado' THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'aprovado',
      'message', 'Já aprovado'
    );
  END IF;

  -- Se recusado, não muda
  IF v_current_status = 'recusado' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'recusado',
      'message', 'Conta recusada'
    );
  END IF;

  -- Verificar vagas disponíveis
  SELECT COALESCE(get_config('vagas_free_total', '70')::INTEGER, 70) INTO v_vagas_total;

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

  v_vagas_livres := v_vagas_total - v_vagas_ocupadas;

  -- Se não tem vaga, coloca em espera
  IF v_vagas_livres <= 0 THEN
    UPDATE profiles
    SET
      status_acesso = 'em_espera',
      updated_at = NOW()
    WHERE id = v_user_id
      AND status_acesso IS DISTINCT FROM 'em_espera';

    RETURN jsonb_build_object(
      'success', true,
      'status', 'em_espera',
      'message', 'Sem vagas disponíveis, colocado em lista de espera'
    );
  END IF;

  -- Tem vaga! Aprovar usuário
  UPDATE profiles
  SET
    status_acesso = 'aprovado',
    acesso_aprovado_em = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Creditar bônus de boas-vindas (idempotente)
  BEGIN
    -- Verificar se já recebeu o bônus
    SELECT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE user_id = v_user_id
        AND type = 'bonus'
        AND reason ILIKE '%boas-vindas%'
    ) INTO v_bonus_dado;

    IF NOT v_bonus_dado THEN
      PERFORM creditar_boas_vindas_free(v_user_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignora erro no bônus, não impede aprovação
    NULL;
  END;

  -- Se tem indicador, registrar o referral (idempotente)
  IF v_referred_by IS NOT NULL THEN
    BEGIN
      -- Verificar se já existe referral
      IF NOT EXISTS (
        SELECT 1 FROM referrals
        WHERE referrer_id = v_referred_by
          AND referred_id = v_user_id
      ) THEN
        INSERT INTO referrals (referrer_id, referred_id, status, created_at)
        VALUES (v_referred_by, v_user_id, 'pending', NOW());
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignora erro no referral
      NULL;
    END;
  END IF;

  -- Enviar notificação de boas-vindas
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_user_id,
      'access',
      'Bem-vindo ao Me,up Club!',
      'Sua conta foi aprovada! Acesse o app e comece a acumular pontos.',
      'check-circle'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'aprovado',
    'message', 'Conta aprovada com sucesso',
    'bonus_creditado', NOT v_bonus_dado
  );
END;
$$;

-- Permitir que usuários autenticados chamem
GRANT EXECUTE ON FUNCTION public.garantir_acesso_automatico() TO authenticated;

-- ============================================
-- 2. DESTRAVAR USUÁRIOS PRESOS (em_analise ou NULL)
-- Aprovar todos que estão em_analise e deveriam estar aprovados
-- ============================================

DO $$
DECLARE
  v_vagas_total INTEGER;
  v_vagas_ocupadas INTEGER;
  v_vagas_livres INTEGER;
  v_user RECORD;
  v_aprovados INTEGER := 0;
BEGIN
  -- Buscar configuração de vagas
  SELECT COALESCE(
    (SELECT value::INTEGER FROM config WHERE key = 'vagas_free_total'),
    70
  ) INTO v_vagas_total;

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

  v_vagas_livres := v_vagas_total - v_vagas_ocupadas;

  RAISE NOTICE 'Vagas Free: % total, % ocupadas, % livres', v_vagas_total, v_vagas_ocupadas, v_vagas_livres;

  -- Aprovar usuários presos (em_analise, NULL, ou vazio)
  -- Por ordem de cadastro, até o limite de vagas
  FOR v_user IN
    SELECT id, email, name, referred_by
    FROM profiles
    WHERE (status_acesso IS NULL OR status_acesso = 'em_analise' OR status_acesso = '')
      AND COALESCE(is_teste, false) = false
    ORDER BY created_at ASC
    LIMIT v_vagas_livres
  LOOP
    -- Aprovar
    UPDATE profiles
    SET
      status_acesso = 'aprovado',
      acesso_aprovado_em = NOW(),
      updated_at = NOW()
    WHERE id = v_user.id;

    -- Creditar bônus se não tem
    IF NOT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE user_id = v_user.id
        AND type = 'bonus'
        AND reason ILIKE '%boas-vindas%'
    ) THEN
      BEGIN
        PERFORM creditar_boas_vindas_free(v_user.id);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao creditar bônus para %: %', v_user.email, SQLERRM;
      END;
    END IF;

    -- Registrar referral se tem indicador
    IF v_user.referred_by IS NOT NULL THEN
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM referrals
          WHERE referrer_id = v_user.referred_by
            AND referred_id = v_user.id
        ) THEN
          INSERT INTO referrals (referrer_id, referred_id, status, created_at)
          VALUES (v_user.referred_by, v_user.id, 'pending', NOW());
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar referral para %: %', v_user.email, SQLERRM;
      END;
    END IF;

    v_aprovados := v_aprovados + 1;
    RAISE NOTICE 'Aprovado: % (%)', v_user.name, v_user.email;
  END LOOP;

  -- Se ainda tem gente presa e não tem vaga, colocar em espera
  UPDATE profiles
  SET
    status_acesso = 'em_espera',
    updated_at = NOW()
  WHERE (status_acesso IS NULL OR status_acesso = 'em_analise' OR status_acesso = '')
    AND COALESCE(is_teste, false) = false;

  RAISE NOTICE '✓ Total aprovados nesta correção: %', v_aprovados;
END $$;

-- ============================================
-- 3. NOTIFICAR POSTRGREST
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- LOG
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 228: Função garantir_acesso_automatico criada + usuários destravados';
END $$;
