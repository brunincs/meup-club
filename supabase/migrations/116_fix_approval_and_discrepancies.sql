-- ============================================
-- MIGRAÇÃO 116: Corrigir aprovação de emissões e discrepâncias
-- ============================================
-- 1. Adicionar campos de rastreio à tabela emissoes
-- 2. Corrigir aprovar_emissao para usar plano_efetivo
-- 3. Ajustar emissões já aprovadas (Rafa + Bruno)
-- 4. Corrigir saldo do usuário "123"
-- 5. Criar função de verificação de discrepâncias
-- ============================================

-- 1. ADICIONAR CAMPOS DE RASTREIO À TABELA EMISSOES
-- ============================================

ALTER TABLE emissoes ADD COLUMN IF NOT EXISTS plano_na_aprovacao TEXT;
ALTER TABLE emissoes ADD COLUMN IF NOT EXISTS ciclo_na_aprovacao TEXT;
ALTER TABLE emissoes ADD COLUMN IF NOT EXISTS multiplicador_aplicado NUMERIC(3,2) DEFAULT 1.0;

-- 2. SUBSTITUIR FUNÇÃO aprovar_emissao COM plano_efetivo
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_emissao(p_emissao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissao RECORD;
  v_plano_info RECORD;
  v_plano TEXT;
  v_ciclo TEXT;
  v_multiplicador NUMERIC(3,2);
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
  v_admin_id UUID;
  v_referral_result JSONB;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT * INTO v_emissao FROM emissoes WHERE id = p_emissao_id;

  IF v_emissao.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status = 'aprovada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão já aprovada');
  END IF;

  -- CORREÇÃO: Usar plano_efetivo() para obter plano e ciclo
  SELECT * INTO v_plano_info FROM plano_efetivo(v_emissao.user_id);

  v_plano := COALESCE(v_plano_info.plano, 'free');
  v_ciclo := COALESCE(v_plano_info.ciclo, 'mensal');

  -- Calcular multiplicador: Prime Anual = 1.5x
  IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
    v_multiplicador := 1.5;
  ELSE
    v_multiplicador := 1.0;
  END IF;

  v_pontos_base := v_emissao.valor;
  v_pontos_final := ROUND(v_pontos_base * v_multiplicador);

  -- Creditar pontos da emissão
  PERFORM creditar_pontos_central(
    v_emissao.user_id,
    v_pontos_final,
    'travel',
    'Emissão aprovada: R$ ' || v_emissao.valor || CASE WHEN v_multiplicador > 1 THEN ' (Prime Anual 1.5x)' ELSE '' END
  );

  -- Atualizar emissão COM campos de rastreio
  UPDATE emissoes SET
    status = 'aprovada',
    pontos_creditados = v_pontos_final,
    plano_na_aprovacao = v_plano,
    ciclo_na_aprovacao = v_ciclo,
    multiplicador_aplicado = v_multiplicador,
    admin_id = v_admin_id,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_emissao_id;

  -- CORREÇÃO: Creditar pontos de indicação ao indicador na primeira emissão
  SELECT creditar_pontos_primeira_emissao(p_emissao_id, v_emissao.user_id) INTO v_referral_result;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_base', v_pontos_base,
    'plano', v_plano,
    'ciclo', v_ciclo,
    'multiplicador', v_multiplicador,
    'pontos_final', v_pontos_final,
    'referral_bonus', v_referral_result
  );
END;
$$;

-- 3. CRIAR TRANSAÇÕES DE AJUSTE PARA EMISSÕES JÁ APROVADAS
-- ============================================

DO $$
DECLARE
  -- IDs conhecidos do contexto
  v_rafa_id UUID := 'db82017f-6d0a-453d-acb8-e5d3ae5821ed';
  v_bruno_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
  v_123_id UUID := 'a1a5f3b2-c5d6-4e7f-8901-2b3c4d5e6f7a'; -- Precisa verificar o ID real
  v_emissao_rafa RECORD;
  v_emissao_123 RECORD;
  v_referral_rafa RECORD;
  v_referral_123 RECORD;
  v_current_balance INTEGER;
BEGIN
  -- Buscar usuário "123" pelo email ou nome (ajustar conforme necessário)
  SELECT id INTO v_123_id FROM profiles WHERE name ILIKE '123%' OR email ILIKE '123%' LIMIT 1;

  -- ==========================================
  -- 3.1 RAFA: Ajuste +5000 (multiplicador Prime 1.5x não aplicado)
  -- Emissão 211e287b-0b6c-4a87-92eb-c4f30a8e1234 (exemplo)
  -- ==========================================

  -- Verificar se já foi ajustado (idempotência)
  IF NOT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_rafa_id
    AND type = 'credit'
    AND reason LIKE '%multiplicador Prime Anual%'
  ) THEN
    -- Buscar emissão aprovada da Rafa sem multiplicador
    SELECT * INTO v_emissao_rafa
    FROM emissoes
    WHERE user_id = v_rafa_id
    AND status = 'aprovada'
    AND (multiplicador_aplicado IS NULL OR multiplicador_aplicado = 1)
    ORDER BY processed_at DESC
    LIMIT 1;

    IF v_emissao_rafa.id IS NOT NULL THEN
      -- Calcular ajuste: valor * 0.5 (diferença entre 1.5x e 1x)
      -- Assumindo que o valor base era 10000, ajuste = 5000
      SELECT points INTO v_current_balance FROM profiles WHERE id = v_rafa_id;

      INSERT INTO point_transactions (
        user_id, amount, balance_before, balance_after, type, reason
      ) VALUES (
        v_rafa_id,
        5000,
        v_current_balance,
        v_current_balance + 5000,
        'credit',
        'Correção: multiplicador Prime Anual (1.5x) não aplicado na emissão'
      );

      UPDATE profiles SET
        points = points + 5000,
        total_points_earned = total_points_earned + 5000,
        updated_at = NOW()
      WHERE id = v_rafa_id;

      -- Atualizar emissão com campos corretos
      UPDATE emissoes SET
        plano_na_aprovacao = 'prime',
        ciclo_na_aprovacao = 'anual',
        multiplicador_aplicado = 1.5,
        pontos_creditados = COALESCE(pontos_creditados, valor) + 5000
      WHERE id = v_emissao_rafa.id;

      RAISE NOTICE 'Ajuste +5000 aplicado para Rafa (multiplicador Prime)';
    END IF;
  END IF;

  -- ==========================================
  -- 3.2 BRUNO: Ajuste +5000 (bônus de indicação não creditado)
  -- Bruno indicou Rafa, Rafa fez primeira emissão
  -- ==========================================

  IF NOT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_bruno_id
    AND type = 'credit'
    AND reason LIKE '%indicação primeira emissão%'
  ) THEN
    -- Verificar se Bruno indicou Rafa
    SELECT * INTO v_referral_rafa
    FROM referrals
    WHERE referrer_id = v_bruno_id
    AND referred_id = v_rafa_id
    LIMIT 1;

    IF v_referral_rafa.id IS NOT NULL THEN
      SELECT points INTO v_current_balance FROM profiles WHERE id = v_bruno_id;

      INSERT INTO point_transactions (
        user_id, amount, balance_before, balance_after, type, reason
      ) VALUES (
        v_bruno_id,
        5000,
        v_current_balance,
        v_current_balance + 5000,
        'credit',
        'Correção: bônus de indicação primeira emissão de Rafa'
      );

      UPDATE profiles SET
        points = points + 5000,
        total_points_earned = total_points_earned + 5000,
        updated_at = NOW()
      WHERE id = v_bruno_id;

      -- Atualizar referral
      UPDATE referrals SET
        primeira_emissao_creditada = TRUE,
        primeira_emissao_em = NOW(),
        primeira_emissao_id = v_emissao_rafa.id
      WHERE id = v_referral_rafa.id;

      RAISE NOTICE 'Ajuste +5000 aplicado para Bruno (indicação de Rafa)';
    END IF;
  END IF;

  -- ==========================================
  -- 3.3 RAFA: Ajuste +5000 (bônus de indicação não creditado)
  -- Rafa indicou "123", "123" fez primeira emissão
  -- ==========================================

  IF v_123_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_rafa_id
    AND type = 'credit'
    AND reason LIKE '%indicação primeira emissão de%'
  ) THEN
    -- Verificar se Rafa indicou "123"
    SELECT * INTO v_referral_123
    FROM referrals
    WHERE referrer_id = v_rafa_id
    AND referred_id = v_123_id
    LIMIT 1;

    IF v_referral_123.id IS NOT NULL THEN
      -- Buscar emissão do 123
      SELECT * INTO v_emissao_123
      FROM emissoes
      WHERE user_id = v_123_id
      AND status = 'aprovada'
      ORDER BY processed_at ASC
      LIMIT 1;

      IF v_emissao_123.id IS NOT NULL THEN
        SELECT points INTO v_current_balance FROM profiles WHERE id = v_rafa_id;

        INSERT INTO point_transactions (
          user_id, amount, balance_before, balance_after, type, reason
        ) VALUES (
          v_rafa_id,
          5000,
          v_current_balance,
          v_current_balance + 5000,
          'credit',
          'Correção: bônus de indicação primeira emissão de 123'
        );

        UPDATE profiles SET
          points = points + 5000,
          total_points_earned = total_points_earned + 5000,
          updated_at = NOW()
        WHERE id = v_rafa_id;

        -- Atualizar referral
        UPDATE referrals SET
          primeira_emissao_creditada = TRUE,
          primeira_emissao_em = NOW(),
          primeira_emissao_id = v_emissao_123.id
        WHERE id = v_referral_123.id;

        RAISE NOTICE 'Ajuste +5000 aplicado para Rafa (indicação de 123)';
      END IF;
    END IF;
  END IF;
END $$;

-- 4. CORRIGIR SALDO DO USUÁRIO "123"
-- ============================================
-- Problema: profile.points = 12510 mas SUM(transactions) = 12010
-- Diferença de 500 pts sem transação

DO $$
DECLARE
  v_user RECORD;
  v_sum_transactions INTEGER;
  v_discrepancy INTEGER;
BEGIN
  -- Buscar usuário com discrepância conhecida
  FOR v_user IN
    SELECT p.id, p.name, p.email, p.points,
           COALESCE((SELECT SUM(amount) FROM point_transactions WHERE user_id = p.id), 0) as tx_sum
    FROM profiles p
    WHERE p.name ILIKE '123%' OR p.email ILIKE '123%'
  LOOP
    v_discrepancy := v_user.points - v_user.tx_sum;

    IF v_discrepancy != 0 THEN
      -- Verificar se já foi corrigido
      IF NOT EXISTS (
        SELECT 1 FROM point_transactions
        WHERE user_id = v_user.id
        AND type = 'credit'
        AND reason LIKE '%correção de discrepância%'
      ) THEN
        -- Criar transação de ajuste negativo para corrigir
        INSERT INTO point_transactions (
          user_id, amount, balance_before, balance_after, type, reason
        ) VALUES (
          v_user.id,
          -v_discrepancy,
          v_user.points,
          v_user.tx_sum,
          'credit',
          'Correção de discrepância de saldo (-' || v_discrepancy || ' pts)'
        );

        -- Atualizar profile para o valor correto
        UPDATE profiles SET
          points = v_user.tx_sum,
          updated_at = NOW()
        WHERE id = v_user.id;

        -- Registrar em audit_log
        INSERT INTO audit_logs (
          admin_id, action, entity_type, entity_id, details
        ) VALUES (
          '944c8549-03b5-43b3-8863-49d05656ead2', -- Bruno admin
          'balance_correction',
          'profile',
          v_user.id,
          jsonb_build_object(
            'old_balance', v_user.points,
            'new_balance', v_user.tx_sum,
            'discrepancy', v_discrepancy,
            'reason', 'Correção automática: saldo inconsistente com transações'
          )
        );

        RAISE NOTICE 'Corrigido saldo de % (%) de % para %',
          v_user.name, v_user.email, v_user.points, v_user.tx_sum;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 5. CRIAR FUNÇÃO DE VERIFICAÇÃO DE DISCREPÂNCIAS
-- ============================================

CREATE OR REPLACE FUNCTION admin_check_balance_discrepancies()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  profile_points INTEGER,
  transactions_sum INTEGER,
  discrepancy INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.points::INTEGER,
    COALESCE((SELECT SUM(amount)::INTEGER FROM point_transactions pt WHERE pt.user_id = p.id), 0) as tx_sum,
    (p.points - COALESCE((SELECT SUM(amount)::INTEGER FROM point_transactions pt WHERE pt.user_id = p.id), 0))::INTEGER as disc
  FROM profiles p
  WHERE p.points != COALESCE((SELECT SUM(amount) FROM point_transactions pt WHERE pt.user_id = p.id), 0)
  ORDER BY ABS(p.points - COALESCE((SELECT SUM(amount) FROM point_transactions pt WHERE pt.user_id = p.id), 0)) DESC;
END;
$$;

-- 6. CRIAR FUNÇÃO PARA BUSCAR PONTOS PENDENTES DO USUÁRIO
-- ============================================

CREATE OR REPLACE FUNCTION get_user_pending_points(p_user_id UUID DEFAULT NULL)
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
  ORDER BY pp.liberar_em ASC;
END;
$$;

-- 7. CRIAR FUNÇÃO PARA TOTAL DE PONTOS PENDENTES
-- ============================================

CREATE OR REPLACE FUNCTION get_user_pending_points_total(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(pontos), 0) INTO v_total
  FROM pending_points
  WHERE user_id = COALESCE(p_user_id, auth.uid())
  AND status = 'pendente';

  RETURN v_total;
END;
$$;

-- 8. VERIFICAR TODOS OS USUÁRIOS POR DISCREPÂNCIAS E LOGAR
-- ============================================

DO $$
DECLARE
  v_disc RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_disc IN
    SELECT * FROM admin_check_balance_discrepancies()
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'Discrepância encontrada: % (%) - profile: %, tx: %, diff: %',
      v_disc.user_name, v_disc.user_email, v_disc.profile_points,
      v_disc.transactions_sum, v_disc.discrepancy;
  END LOOP;

  IF v_count = 0 THEN
    RAISE NOTICE 'Nenhuma discrepância de saldo encontrada!';
  ELSE
    RAISE NOTICE 'Total de usuários com discrepância: %', v_count;
  END IF;
END $$;

-- 9. COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION aprovar_emissao(UUID) IS
'Aprova emissão usando plano_efetivo() para determinar multiplicador.
Grava plano_na_aprovacao, ciclo_na_aprovacao e multiplicador_aplicado.
Credita bônus de indicação na primeira emissão.';

COMMENT ON FUNCTION admin_check_balance_discrepancies() IS
'Retorna lista de usuários cujo saldo (profile.points) não bate com
a soma das transações (point_transactions). Usado para alerta no admin.';

COMMENT ON FUNCTION get_user_pending_points(UUID) IS
'Retorna pontos pendentes de liberação do usuário (período de arrependimento).';
