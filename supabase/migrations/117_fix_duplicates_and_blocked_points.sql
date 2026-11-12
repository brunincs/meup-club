-- ============================================
-- MIGRAÇÃO 117: Correções de pontos duplicados e pontos bloqueados
-- ============================================
-- 1. Estornar créditos de indicação duplicados
-- 2. Idempotência nas funções de indicação
-- 3. Pontos do Prime aparecem na hora mas bloqueados
-- 4. Corrigir aprovar_emissao para usar plano_efetivo
-- 5. Verificar discrepâncias de saldo
-- ============================================

-- 1. ESTORNAR CRÉDITOS DUPLICADOS
-- ============================================

DO $$
DECLARE
  v_bruno_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
  v_rafa_id UUID := 'db82017f-6d0a-453d-acb8-e5d3ae5821ed';
  v_current_balance INTEGER;
BEGIN
  -- ==========================================
  -- 1.1 BRUNO: -5.000 (crédito duplicado de indicação)
  -- ==========================================
  IF NOT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_bruno_id
    AND type = 'estorno'
    AND reason LIKE '%crédito de indicação duplicado%'
  ) THEN
    SELECT points INTO v_current_balance FROM profiles WHERE id = v_bruno_id;

    IF v_current_balance IS NOT NULL AND v_current_balance >= 5000 THEN
      INSERT INTO point_transactions (
        user_id, amount, balance_before, balance_after, type, reason
      ) VALUES (
        v_bruno_id,
        -5000,
        v_current_balance,
        v_current_balance - 5000,
        'estorno',
        'Correção: crédito de indicação duplicado'
      );

      UPDATE profiles SET
        points = points - 5000,
        updated_at = NOW()
      WHERE id = v_bruno_id;

      RAISE NOTICE 'Estorno -5000 aplicado para Bruno. Novo saldo: %', v_current_balance - 5000;
    END IF;
  END IF;

  -- ==========================================
  -- 1.2 RAFA: -5.000 (crédito duplicado de indicação)
  -- ==========================================
  IF NOT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_rafa_id
    AND type = 'estorno'
    AND reason LIKE '%crédito de indicação duplicado%'
  ) THEN
    SELECT points INTO v_current_balance FROM profiles WHERE id = v_rafa_id;

    IF v_current_balance IS NOT NULL AND v_current_balance >= 5000 THEN
      INSERT INTO point_transactions (
        user_id, amount, balance_before, balance_after, type, reason
      ) VALUES (
        v_rafa_id,
        -5000,
        v_current_balance,
        v_current_balance - 5000,
        'estorno',
        'Correção: crédito de indicação duplicado'
      );

      UPDATE profiles SET
        points = points - 5000,
        updated_at = NOW()
      WHERE id = v_rafa_id;

      RAISE NOTICE 'Estorno -5000 aplicado para Rafa. Novo saldo: %', v_current_balance - 5000;
    END IF;
  END IF;
END $$;

-- 2. ADICIONAR COLUNAS DE PONTOS BLOQUEADOS
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pontos_bloqueados INTEGER DEFAULT 0;

-- 3. ALTERAR pending_points PARA USAR NOVO MODELO
-- ============================================

-- Adicionar coluna para indicar se já foi creditado no saldo
ALTER TABLE pending_points ADD COLUMN IF NOT EXISTS creditado_no_saldo BOOLEAN DEFAULT FALSE;

-- 4. FUNÇÃO: Creditar pontos bloqueados (aparecem na hora, mas não podem ser gastos)
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_bloqueados(
  p_user_id UUID,
  p_pontos INTEGER,
  p_motivo TEXT,
  p_liberar_em TIMESTAMPTZ,
  p_referral_id UUID DEFAULT NULL,
  p_subscription_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_blocked_before INTEGER;
  v_blocked_after INTEGER;
  v_transaction_id UUID;
  v_pending_id UUID;
BEGIN
  -- Setar flag de chamada interna
  PERFORM set_config('app.internal_credit', 'true', true);

  -- Buscar saldos atuais
  SELECT COALESCE(points, 0), COALESCE(pontos_bloqueados, 0)
  INTO v_balance_before, v_blocked_before
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_balance_before IS NULL THEN
    PERFORM set_config('app.internal_credit', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  v_balance_after := v_balance_before + p_pontos;
  v_blocked_after := v_blocked_before + p_pontos;

  -- Atualizar perfil (pontos e pontos_bloqueados)
  UPDATE profiles SET
    points = v_balance_after,
    pontos_bloqueados = v_blocked_after,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Criar transação
  INSERT INTO point_transactions (
    user_id, amount, balance_before, balance_after, type, reason
  ) VALUES (
    p_user_id, p_pontos, v_balance_before, v_balance_after, 'credit', p_motivo || ' (bloqueado até ' || TO_CHAR(p_liberar_em, 'DD/MM') || ')'
  )
  RETURNING id INTO v_transaction_id;

  -- Criar registro de pontos pendentes
  INSERT INTO pending_points (
    user_id, pontos, motivo, liberar_em, referral_id, subscription_id, status, creditado_no_saldo
  ) VALUES (
    p_user_id, p_pontos, p_motivo, p_liberar_em, p_referral_id, p_subscription_id, 'pendente', TRUE
  )
  RETURNING id INTO v_pending_id;

  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'pending_id', v_pending_id,
    'balance_after', v_balance_after,
    'blocked', v_blocked_after
  );
END;
$$;

-- 5. FUNÇÃO: Liberar pontos bloqueados (cron job atualizado)
-- ============================================

CREATE OR REPLACE FUNCTION liberar_pontos_pendentes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_pending IN
    SELECT * FROM pending_points
    WHERE status = 'pendente'
    AND liberar_em <= NOW()
  LOOP
    -- Se já foi creditado no saldo, só desbloqueia
    IF v_pending.creditado_no_saldo THEN
      -- Desbloquear os pontos
      UPDATE profiles SET
        pontos_bloqueados = GREATEST(0, pontos_bloqueados - v_pending.pontos),
        updated_at = NOW()
      WHERE id = v_pending.user_id;

      -- Notificar usuário
      INSERT INTO notifications (user_id, type, title, message, icon)
      VALUES (
        v_pending.user_id,
        'points',
        'Pontos liberados!',
        'Seus ' || v_pending.pontos || ' pontos de ' || COALESCE(v_pending.motivo, 'bônus') || ' foram liberados para uso.',
        'unlock'
      );
    ELSE
      -- Modelo antigo: creditar pontos
      PERFORM creditar_pontos_central(
        v_pending.user_id,
        v_pending.pontos,
        'referral',
        v_pending.motivo
      );
    END IF;

    -- Marcar como liberado
    UPDATE pending_points SET
      status = 'liberado',
      liberado_em = NOW()
    WHERE id = v_pending.id;

    -- Se tiver referral_id, marcar como creditado
    IF v_pending.referral_id IS NOT NULL THEN
      UPDATE referrals SET prime_anual_pontos_creditados = TRUE
      WHERE id = v_pending.referral_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 6. FUNÇÃO: Cancelar pontos bloqueados (arrependimento)
-- ============================================

CREATE OR REPLACE FUNCTION cancelar_pontos_pendentes_assinatura(
  p_subscription_id UUID,
  p_motivo TEXT DEFAULT 'Cancelamento no período de arrependimento'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Setar flag de chamada interna
  PERFORM set_config('app.internal_credit', 'true', true);

  FOR v_pending IN
    SELECT * FROM pending_points
    WHERE subscription_id = p_subscription_id
    AND status = 'pendente'
  LOOP
    -- Se já foi creditado no saldo, estornar
    IF v_pending.creditado_no_saldo THEN
      -- Descontar do saldo e dos bloqueados
      UPDATE profiles SET
        points = GREATEST(0, points - v_pending.pontos),
        pontos_bloqueados = GREATEST(0, pontos_bloqueados - v_pending.pontos),
        updated_at = NOW()
      WHERE id = v_pending.user_id;

      -- Criar transação de estorno
      INSERT INTO point_transactions (
        user_id, amount, balance_before, balance_after, type, reason
      )
      SELECT
        v_pending.user_id,
        -v_pending.pontos,
        p.points + v_pending.pontos,
        p.points,
        'estorno',
        p_motivo
      FROM profiles p WHERE p.id = v_pending.user_id;
    END IF;

    -- Marcar como cancelado
    UPDATE pending_points SET
      status = 'cancelado',
      cancelado_motivo = p_motivo
    WHERE id = v_pending.id;

    v_count := v_count + 1;
  END LOOP;

  PERFORM set_config('app.internal_credit', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'cancelados', v_count
  );
END;
$$;

-- 7. FUNÇÃO: Aprovar indicação com IDEMPOTÊNCIA
-- ============================================

CREATE OR REPLACE FUNCTION approve_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_referral RECORD;
  v_plano TEXT;
  v_pontos INTEGER;
  v_result JSONB;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- LOCK para evitar race conditions
  SELECT * INTO v_referral
  FROM referrals
  WHERE id = p_referral_id
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status = 'approved' THEN
    -- IDEMPOTÊNCIA: já foi aprovada, retorna sucesso sem creditar novamente
    RETURN jsonb_build_object(
      'success', true,
      'points_awarded', v_referral.points_awarded,
      'referrer_id', v_referral.referrer_id,
      'message', 'Pontos já creditados anteriormente'
    );
  END IF;

  IF v_referral.status = 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já foi rejeitada. Use "Reabrir" primeiro.');
  END IF;

  -- Buscar plano do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free') INTO v_plano;

  -- Buscar pontos do plano
  IF v_plano = 'prime' THEN
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_indicacao_prime';
    v_pontos := COALESCE(v_pontos, 5000);
  ELSE
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_indicacao_free';
    v_pontos := COALESCE(v_pontos, 3000);
  END IF;

  -- Creditar pontos
  SELECT creditar_pontos_central(
    v_referral.referrer_id,
    v_pontos,
    'referral',
    'Indicação aprovada: ' || COALESCE((SELECT name FROM profiles WHERE id = v_referral.referred_id), 'Indicado')
  ) INTO v_result;

  IF NOT (v_result->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', v_result->>'error');
  END IF;

  -- Atualizar indicação
  UPDATE referrals SET
    status = 'approved',
    points_awarded = v_pontos,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Atualizar contador no profile do indicador
  UPDATE profiles SET
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_pontos,
    'referrer_id', v_referral.referrer_id,
    'new_balance', (v_result->>'balance_after')::INTEGER
  );
END;
$$;

-- 8. FUNÇÃO: Creditar pontos de primeira emissão com IDEMPOTÊNCIA
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_primeira_emissao(
  p_emissao_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos INTEGER;
  v_indicado_nome TEXT;
BEGIN
  -- LOCK para idempotência
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = p_user_id
  FOR UPDATE;

  -- Não tem indicação
  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Sem indicação ativa');
  END IF;

  -- IDEMPOTÊNCIA: já foi creditado
  IF v_referral.primeira_emissao_creditada THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Pontos já creditados anteriormente',
      'pontos', 0
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Pontos baseados no plano do indicador
  IF v_indicador_plano = 'prime' THEN
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_prime'), 5000);
  ELSE
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_free'), 3000);
  END IF;

  -- Creditar indicador
  PERFORM creditar_pontos_central(
    v_referral.referrer_id,
    v_pontos,
    'referral',
    'Indicação: primeira viagem de ' || v_indicado_nome
  );

  -- Marcar como creditado
  UPDATE referrals SET
    primeira_emissao_id = p_emissao_id,
    primeira_emissao_creditada = TRUE,
    primeira_emissao_em = NOW()
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'plano_indicador', v_indicador_plano
  );
END;
$$;

-- 9. FUNÇÃO: Ativar Prime Anual com pontos bloqueados (NOVO MODELO)
-- ============================================

CREATE OR REPLACE FUNCTION admin_confirmar_prime_anual(
  p_subscription_id UUID
)
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

  v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_dias_pendente'), 7);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  -- 9.1 PONTOS DE BOAS-VINDAS para o assinante (BLOQUEADOS)
  PERFORM creditar_pontos_bloqueados(
    v_subscription.user_id,
    v_pontos_boas_vindas,
    'Bônus de boas-vindas Prime Anual',
    v_liberar_em,
    NULL,
    p_subscription_id
  );

  -- 9.2 BUSCAR REFERRAL para bônus de indicação
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = v_subscription.user_id
  AND r.prime_anual_pontos_creditados = FALSE
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Bônus de boas-vindas creditado (sem indicação ativa)',
      'pontos_boas_vindas', v_pontos_boas_vindas,
      'liberar_em', v_liberar_em
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Se indicador é FREE, registrar ganho perdido
  IF v_indicador_plano = 'free' THEN
    v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicador_prime'), 3000);

    INSERT INTO missed_earnings (user_id, referral_id, referred_name, evento, valor_perdido, mensagem)
    VALUES (
      v_referral.referrer_id,
      v_referral.id,
      v_indicado_nome,
      'prime_anual',
      v_pontos_indicador,
      v_indicado_nome || ' assinou o Prime Anual! No Prime, você teria ganho +' || v_pontos_indicador || ' pts.'
    );

    UPDATE referrals SET
      prime_anual_ativado = TRUE,
      prime_anual_ativado_em = NOW(),
      prime_anual_pontos_creditados = FALSE
    WHERE id = v_referral.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Bônus de boas-vindas creditado. Indicador é Free - bônus de indicação não creditado.',
      'pontos_boas_vindas', v_pontos_boas_vindas,
      'liberar_em', v_liberar_em,
      'indicador_plano', 'free'
    );
  END IF;

  -- Indicador é PRIME - criar pontos bloqueados
  v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicador_prime'), 3000);
  v_pontos_indicado := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicado'), 1000);

  -- Creditar indicador (bloqueado)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referrer_id,
    v_pontos_indicador,
    'Bônus Prime Anual: ' || v_indicado_nome,
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  -- Creditar indicado extra (bloqueado)
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

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pontos bloqueados por ' || v_dias_pendente || ' dias',
    'liberar_em', v_liberar_em,
    'pontos_boas_vindas', v_pontos_boas_vindas,
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado
  );
END;
$$;

-- 10. APLICAR AOS PENDENTES EXISTENTES (Bruno e Rafa)
-- ============================================

DO $$
DECLARE
  v_bruno_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
  v_rafa_id UUID := 'db82017f-6d0a-453d-acb8-e5d3ae5821ed';
  v_pending RECORD;
BEGIN
  -- Atualizar pending_points existentes para usar novo modelo
  FOR v_pending IN
    SELECT * FROM pending_points
    WHERE status = 'pendente'
    AND creditado_no_saldo = FALSE
    AND user_id IN (v_bruno_id, v_rafa_id)
  LOOP
    -- Marcar como creditado no saldo
    UPDATE pending_points SET creditado_no_saldo = TRUE WHERE id = v_pending.id;

    -- Creditar no saldo e nos bloqueados
    UPDATE profiles SET
      points = COALESCE(points, 0) + v_pending.pontos,
      pontos_bloqueados = COALESCE(pontos_bloqueados, 0) + v_pending.pontos,
      updated_at = NOW()
    WHERE id = v_pending.user_id;

    -- Criar transação
    INSERT INTO point_transactions (
      user_id, amount, balance_before, balance_after, type, reason
    )
    SELECT
      v_pending.user_id,
      v_pending.pontos,
      p.points - v_pending.pontos,
      p.points,
      'credit',
      v_pending.motivo || ' (bloqueado até ' || TO_CHAR(v_pending.liberar_em, 'DD/MM') || ')'
    FROM profiles p WHERE p.id = v_pending.user_id;

    RAISE NOTICE 'Creditado % pts bloqueados para user %', v_pending.pontos, v_pending.user_id;
  END LOOP;
END $$;

-- 11. FUNÇÃO: Buscar saldo disponível (total - bloqueado)
-- ============================================

CREATE OR REPLACE FUNCTION get_user_available_points(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total INTEGER,
  bloqueado INTEGER,
  disponivel INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    COALESCE(p.points, 0)::INTEGER as total,
    COALESCE(p.pontos_bloqueados, 0)::INTEGER as bloqueado,
    (COALESCE(p.points, 0) - COALESCE(p.pontos_bloqueados, 0))::INTEGER as disponivel
  FROM profiles p
  WHERE p.id = v_user_id;
END;
$$;

-- 12. FUNÇÃO: Buscar pontos bloqueados com data de liberação
-- ============================================

CREATE OR REPLACE FUNCTION get_user_blocked_points_details(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  pontos INTEGER,
  motivo TEXT,
  liberar_em TIMESTAMPTZ,
  dias_restantes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    pp.id,
    pp.pontos,
    pp.motivo,
    pp.liberar_em,
    GREATEST(0, EXTRACT(DAY FROM pp.liberar_em - NOW())::INTEGER) as dias_restantes
  FROM pending_points pp
  WHERE pp.user_id = v_user_id
  AND pp.status = 'pendente'
  AND pp.creditado_no_saldo = TRUE
  ORDER BY pp.liberar_em ASC;
END;
$$;

-- 13. VERIFICAR DISCREPÂNCIAS DE SALDO PARA TODOS
-- ============================================

DO $$
DECLARE
  v_user RECORD;
  v_tx_sum INTEGER;
  v_disc INTEGER;
BEGIN
  FOR v_user IN
    SELECT p.id, p.name, p.email, p.points
    FROM profiles p
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO v_tx_sum
    FROM point_transactions WHERE user_id = v_user.id;

    v_disc := v_user.points - v_tx_sum;

    IF v_disc != 0 THEN
      RAISE NOTICE 'DISCREPÂNCIA: % (%) - saldo: %, tx: %, diff: %',
        v_user.name, v_user.email, v_user.points, v_tx_sum, v_disc;
    END IF;
  END LOOP;
END $$;

-- 14. COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION creditar_pontos_bloqueados IS
'Credita pontos que aparecem no saldo mas ficam bloqueados para resgate até liberar_em.
Usado para bônus de Prime Anual com período de arrependimento.';

COMMENT ON FUNCTION get_user_available_points IS
'Retorna saldo total, bloqueado e disponível do usuário.
Disponível = total - bloqueado. Resgate usa só disponível.';

COMMENT ON COLUMN profiles.pontos_bloqueados IS
'Pontos que aparecem no saldo mas não podem ser usados para resgate.
Liberados automaticamente após período de arrependimento.';
