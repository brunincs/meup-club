-- =============================================
-- MIGRAÇÃO 088: CORRIGIR USO DE plano_efetivo
--
-- PROBLEMA: Funções chamam plano_efetivo() esperando TEXT,
--           mas agora retorna TABLE(plano, ciclo)
--
-- SOLUÇÃO: Criar helpers e corrigir funções
-- =============================================

-- =============================================
-- 1. HELPERS PARA FACILITAR USO
-- =============================================

-- Helper: retorna só o plano (TEXT)
CREATE OR REPLACE FUNCTION public.get_plano_usuario(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT := 'free';
BEGIN
  SELECT plano::TEXT INTO v_plano FROM plano_efetivo(p_user_id);
  RETURN COALESCE(v_plano, 'free');
END;
$$;

-- Helper: retorna só o ciclo (TEXT)
CREATE OR REPLACE FUNCTION public.get_ciclo_usuario(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ciclo TEXT := 'mensal';
BEGIN
  SELECT ciclo::TEXT INTO v_ciclo FROM plano_efetivo(p_user_id);
  RETURN COALESCE(v_ciclo, 'mensal');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_plano_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ciclo_usuario(UUID) TO authenticated;

-- =============================================
-- 2. CORRIGIR approve_referral
-- =============================================

CREATE OR REPLACE FUNCTION public.approve_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_referral RECORD;
  v_referrer_plano TEXT := 'free';
  v_points INTEGER;
  v_credit_result JSONB;
  v_existing_credit RECORD;
BEGIN
  -- VERIFICAÇÃO DE ADMIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem aprovar indicações');
  END IF;

  -- BUSCAR INDICAÇÃO COM LOCK
  SELECT * INTO v_referral FROM public.referrals WHERE id = p_referral_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  -- Só permitir aprovar se status = pending
  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi processada (status: ' || v_referral.status || ')');
  END IF;

  -- TRAVA ANTI-DUPLO-CRÉDITO
  SELECT * INTO v_existing_credit
  FROM public.point_transactions
  WHERE user_id = v_referral.referrer_id
    AND type IN ('referral', 'referral_aprovada')
    AND reason LIKE '%' || COALESCE((SELECT name FROM profiles WHERE id = v_referral.referred_id), '') || '%'
    AND estornado = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Já existe crédito ativo para esta indicação. Se foi erro, estorne primeiro.'
    );
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- BUSCAR PLANO ATUAL DO INDICADOR (CORRIGIDO)
  -- ═══════════════════════════════════════════════════════════════
  v_referrer_plano := get_plano_usuario(v_referral.referrer_id);

  -- BUSCAR PONTOS DO PLANO NA CONFIG
  SELECT pc.pontos_indicacao INTO v_points
  FROM plano_config pc
  WHERE pc.plano::TEXT = v_referrer_plano;

  IF v_points IS NULL THEN
    v_points := CASE WHEN v_referrer_plano = 'prime' THEN 5000 ELSE 3000 END;
  END IF;

  -- CREDITAR PONTOS
  v_credit_result := creditar_pontos_central(
    v_referral.referrer_id,
    v_points,
    'referral',
    'Indicação aprovada: ' || COALESCE((SELECT name FROM profiles WHERE id = v_referral.referred_id), 'usuário'),
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_credit_result->>'error'
    );
  END IF;

  -- ATUALIZAR INDICAÇÃO
  UPDATE public.referrals SET
    status = 'approved',
    points_awarded = v_points,
    processed_by = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Incrementar contador
  UPDATE public.profiles SET
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  -- VERIFICAR MISSÕES
  PERFORM verificar_missoes_indicacao(v_referral.referrer_id);

  -- NOTIFICAÇÃO
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_referral.referrer_id,
      'referral_approved',
      'Indicação aprovada!',
      'Você ganhou ' || v_points::TEXT || ' pontos pela sua indicação!',
      'users'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'referrer_plano', v_referrer_plano,
    'new_balance', (v_credit_result->>'balance_after')::integer,
    'referrer_id', v_referral.referrer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao aprovar indicação: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 3. CORRIGIR get_referral_points_preview
-- =============================================

CREATE OR REPLACE FUNCTION public.get_referral_points_preview(p_referrer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT;
  v_ciclo TEXT;
  v_points INTEGER;
BEGIN
  -- BUSCAR PLANO E CICLO (CORRIGIDO)
  v_plano := get_plano_usuario(p_referrer_id);
  v_ciclo := get_ciclo_usuario(p_referrer_id);

  -- BUSCAR PONTOS NA CONFIG
  SELECT pc.pontos_indicacao INTO v_points
  FROM plano_config pc
  WHERE pc.plano::TEXT = v_plano;

  IF v_points IS NULL THEN
    v_points := CASE WHEN v_plano = 'prime' THEN 5000 ELSE 3000 END;
  END IF;

  RETURN jsonb_build_object(
    'plano', v_plano,
    'ciclo', v_ciclo,
    'pontos', v_points,
    'label', CASE
      WHEN v_plano = 'prime' THEN v_points || ' pts (Prime)'
      ELSE v_points || ' pts (Free)'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_points_preview(UUID) TO authenticated;

-- =============================================
-- 4. CORRIGIR aprovar_emissao
-- =============================================

CREATE OR REPLACE FUNCTION public.aprovar_emissao(p_emissao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_emissao RECORD;
  v_plano TEXT;
  v_ciclo TEXT;
  v_multiplicador DECIMAL(3,2) := 1.0;
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
  v_credit_result JSONB;
  v_existing_credit RECORD;
BEGIN
  -- VERIFICAÇÃO DE ADMIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
  FROM public.profiles WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem aprovar emissões');
  END IF;

  -- BUSCAR EMISSÃO COM LOCK
  SELECT * INTO v_emissao FROM public.emissoes WHERE id = p_emissao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status <> 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão já foi processada');
  END IF;

  -- TRAVA ANTI-DUPLO-CRÉDITO
  SELECT * INTO v_existing_credit
  FROM public.point_transactions
  WHERE user_id = v_emissao.user_id
    AND type = 'emissao'
    AND reason LIKE '%R$%' || v_emissao.valor::TEXT || '%'
    AND estornado = FALSE
    AND created_at > NOW() - INTERVAL '5 minutes'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Crédito recente encontrado para esta emissão'
    );
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- BUSCAR PLANO E CICLO DO USUÁRIO (CORRIGIDO)
  -- ═══════════════════════════════════════════════════════════════
  v_plano := get_plano_usuario(v_emissao.user_id);
  v_ciclo := get_ciclo_usuario(v_emissao.user_id);

  -- CALCULAR MULTIPLICADOR
  -- Prime ANUAL = 1.5x, Prime mensal = 1.0x, Free = 1.0x
  IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
    v_multiplicador := 1.5;
  ELSE
    v_multiplicador := 1.0;
  END IF;

  -- CALCULAR PONTOS
  v_pontos_base := v_emissao.valor; -- R$ 1 = 1 ponto base
  v_pontos_final := ROUND(v_pontos_base * v_multiplicador);

  -- CREDITAR PONTOS
  v_credit_result := creditar_pontos_central(
    v_emissao.user_id,
    v_pontos_final,
    'emissao',
    'Emissão aprovada: R$ ' || v_emissao.valor || CASE
      WHEN v_multiplicador > 1 THEN ' (Prime anual ' || v_multiplicador || 'x)'
      ELSE ''
    END,
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_credit_result->>'error'
    );
  END IF;

  -- ATUALIZAR EMISSÃO
  UPDATE public.emissoes SET
    status = 'aprovada',
    pontos_creditados = v_pontos_final,
    multiplicador_aplicado = v_multiplicador,
    plano_na_aprovacao = v_plano,
    ciclo_na_aprovacao = v_ciclo,
    admin_id = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_emissao_id;

  -- ATUALIZAR TOTAL DE VENDAS NO PERFIL
  UPDATE public.profiles SET
    total_sales_value = COALESCE(total_sales_value, 0) + v_emissao.valor,
    updated_at = NOW()
  WHERE id = v_emissao.user_id;

  -- NOTIFICAÇÃO
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon, metadata)
    VALUES (
      v_emissao.user_id,
      'emissao_approved',
      'Emissão aprovada!',
      'Você ganhou ' || v_pontos_final || ' pontos pela emissão de R$ ' || v_emissao.valor || '!',
      'plane',
      jsonb_build_object(
        'valor', v_emissao.valor,
        'pontos', v_pontos_final,
        'multiplicador', v_multiplicador,
        'plano', v_plano,
        'ciclo', v_ciclo
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notificação falhou: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_creditados', v_pontos_final,
    'pontos_base', v_pontos_base,
    'multiplicador', v_multiplicador,
    'plano', v_plano,
    'ciclo', v_ciclo,
    'new_balance', (v_credit_result->>'balance_after')::integer
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erro ao aprovar emissão: ' || SQLERRM
  );
END;
$$;

-- =============================================
-- 5. FUNÇÃO PREVIEW DE EMISSÃO (para admin)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_emissao_points_preview(p_user_id UUID, p_valor INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT;
  v_ciclo TEXT;
  v_multiplicador DECIMAL(3,2) := 1.0;
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
BEGIN
  -- BUSCAR PLANO E CICLO
  v_plano := get_plano_usuario(p_user_id);
  v_ciclo := get_ciclo_usuario(p_user_id);

  -- CALCULAR MULTIPLICADOR
  IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
    v_multiplicador := 1.5;
  ELSE
    v_multiplicador := 1.0;
  END IF;

  -- CALCULAR PONTOS
  v_pontos_base := p_valor;
  v_pontos_final := ROUND(v_pontos_base * v_multiplicador);

  RETURN jsonb_build_object(
    'plano', v_plano,
    'ciclo', v_ciclo,
    'multiplicador', v_multiplicador,
    'pontos_base', v_pontos_base,
    'pontos_final', v_pontos_final,
    'label', v_pontos_final || ' pts' || CASE
      WHEN v_multiplicador > 1 THEN ' (Prime anual ' || v_multiplicador || 'x)'
      ELSE ' (Free)'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_emissao_points_preview(UUID, INTEGER) TO authenticated;

-- =============================================
-- 6. ADICIONAR COLUNAS DE HISTÓRICO EM emissoes
-- =============================================

DO $$
BEGIN
  -- Adicionar colunas se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissoes' AND column_name = 'plano_na_aprovacao') THEN
    ALTER TABLE public.emissoes ADD COLUMN plano_na_aprovacao TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissoes' AND column_name = 'ciclo_na_aprovacao') THEN
    ALTER TABLE public.emissoes ADD COLUMN ciclo_na_aprovacao TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissoes' AND column_name = 'multiplicador_aplicado') THEN
    ALTER TABLE public.emissoes ADD COLUMN multiplicador_aplicado DECIMAL(3,2);
  END IF;
END $$;

-- =============================================
-- 7. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 088: Uso de plano_efetivo corrigido';
  RAISE NOTICE '  - Helpers get_plano_usuario e get_ciclo_usuario criados';
  RAISE NOTICE '  - approve_referral corrigido';
  RAISE NOTICE '  - aprovar_emissao corrigido (multiplicador 1.5x para Prime anual)';
  RAISE NOTICE '  - get_referral_points_preview corrigido';
  RAISE NOTICE '  - get_emissao_points_preview criado';
END $$;
