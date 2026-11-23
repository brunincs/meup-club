-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 209: Corrigir admin_aprovar_usuario - colunas corretas
-- ══════════════════════════════════════════════════════════════════════════════
-- A migration 208 usava colunas erradas na tabela subscriptions
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_aprovar_usuario(
  p_user_id UUID,
  p_plano TEXT DEFAULT 'free', -- 'free' ou 'prime'
  p_criar_assinatura BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_profile RECORD;
  v_novo_numero INTEGER;
  v_subscription_id UUID;
  v_existing_sub UUID;
BEGIN
  -- Verificar admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas admins podem aprovar');
  END IF;

  -- Buscar perfil
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_profile.status_acesso = 'aprovado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já está aprovado');
  END IF;

  -- Atualizar status
  UPDATE profiles SET
    status_acesso = 'aprovado',
    acesso_aprovado_em = NOW(),
    acesso_aprovado_por = v_admin_id,
    motivo_recusa = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Se for Prime Fundador e criar assinatura
  IF p_plano = 'prime' AND p_criar_assinatura THEN
    -- Buscar próximo número de fundador
    SELECT COALESCE(MAX(fundador_numero), 0) + 1 INTO v_novo_numero
    FROM profiles WHERE fundador_numero IS NOT NULL;

    -- Atualizar como fundador
    UPDATE profiles SET
      is_fundador = true,
      fundador_numero = v_novo_numero
    WHERE id = p_user_id;

    -- Verificar se já tem subscription (constraint unique)
    SELECT id INTO v_existing_sub FROM subscriptions WHERE user_id = p_user_id;

    IF v_existing_sub IS NOT NULL THEN
      -- Atualizar subscription existente
      UPDATE subscriptions SET
        plano = 'prime',
        ciclo = 'anual',
        status = 'active',
        started_at = NOW(),
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '1 year',
        origem = 'manual',
        origem_ref = 'admin:' || v_admin_id::text,
        updated_at = NOW()
      WHERE id = v_existing_sub
      RETURNING id INTO v_subscription_id;
    ELSE
      -- CRIAR NOVA ASSINATURA PRIME
      INSERT INTO subscriptions (
        user_id,
        plano,
        ciclo,
        status,
        started_at,
        current_period_start,
        current_period_end,
        origem,
        origem_ref,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        'prime',
        'anual',
        'active',
        NOW(),
        NOW(),
        NOW() + INTERVAL '1 year',
        'manual',
        'admin:' || v_admin_id::text,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_subscription_id;
    END IF;

    -- Creditar bônus de boas-vindas (2000 pontos)
    BEGIN
      PERFORM public.creditar_pontos_interno(
        p_user_id,
        2000,
        'bonus',
        'Bônus de boas-vindas Prime Fundador'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao creditar bônus: %', SQLERRM;
    END;
  END IF;

  -- Criar notificação de aprovação
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      p_user_id,
      'system',
      CASE WHEN p_plano = 'prime' THEN 'Bem-vindo, Fundador! 🎉👑' ELSE 'Bem-vindo ao Me,up Club! 🎉' END,
      CASE WHEN p_plano = 'prime'
        THEN 'Sua conta Prime Fundador foi ativada! Você ganhou 2.000 pontos de boas-vindas.'
        ELSE 'Sua conta foi aprovada. Acesse o clube e comece a acumular pontos!'
      END,
      'check-circle'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Audit log
  BEGIN
    INSERT INTO audit_log (actor_id, actor_role, action, resource_type, resource_id, new_values)
    VALUES (
      v_admin_id,
      'admin',
      'aprovar_usuario',
      'profile',
      p_user_id::TEXT,
      jsonb_build_object(
        'plano', p_plano,
        'criar_assinatura', p_criar_assinatura,
        'subscription_id', v_subscription_id,
        'fundador_numero', v_novo_numero
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'plano', p_plano,
    'fundador_numero', v_novo_numero,
    'subscription_id', v_subscription_id,
    'aprovado_em', NOW()
  );
END;
$$;

-- Garantir permissão
GRANT EXECUTE ON FUNCTION public.admin_aprovar_usuario(UUID, TEXT, BOOLEAN) TO authenticated;

-- Log
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 209: admin_aprovar_usuario corrigida (v2)';
  RAISE NOTICE '  - Usa colunas corretas da tabela subscriptions';
  RAISE NOTICE '  - Trata caso de subscription já existente';
END $$;
