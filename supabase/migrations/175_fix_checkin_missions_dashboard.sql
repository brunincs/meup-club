-- ============================================
-- MIGRAÇÃO 175: Corrigir check-in, missões e dashboard
-- Itens do prompt dashboard-inicio.md
-- ============================================

-- ============================================
-- ITEM 4: CORRIGIR CHECK-IN
-- - Prime: 30 pts, Free: 10 pts (via plano_config)
-- - Remover lógica de streak bonus
-- - Corrigir check-ins com valor errado
-- ============================================

-- 1. Estornar a diferença do check-in de Bruno (50 → 30 = -20)
-- Identificar: check-in de 50 pts para usuário Prime deveria ser 30
DO $$
DECLARE
  v_wrong_checkin RECORD;
  v_correct_pts INTEGER;
  v_diff INTEGER;
  v_user_balance INTEGER;
BEGIN
  FOR v_wrong_checkin IN
    SELECT c.id, c.user_id, c.pontos, p.name,
           COALESCE((SELECT s.plano FROM subscriptions s WHERE s.user_id = c.user_id AND s.status = 'active'), 'free') as plano
    FROM checkins c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.pontos NOT IN (10, 30)
  LOOP
    -- Determinar valor correto
    IF v_wrong_checkin.plano = 'prime' THEN
      v_correct_pts := 30;
    ELSE
      v_correct_pts := 10;
    END IF;

    v_diff := v_wrong_checkin.pontos - v_correct_pts;

    IF v_diff > 0 THEN
      -- Buscar saldo atual
      SELECT points INTO v_user_balance FROM profiles WHERE id = v_wrong_checkin.user_id;

      -- Debitar a diferença
      UPDATE profiles
      SET points = points - v_diff, updated_at = NOW()
      WHERE id = v_wrong_checkin.user_id;

      -- Registrar transação de ajuste (usando tipo 'debit')
      INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
      VALUES (
        v_wrong_checkin.user_id,
        -v_diff,
        'debit',
        'Correção check-in: ' || v_wrong_checkin.pontos || '→' || v_correct_pts || ' pts',
        v_user_balance,
        v_user_balance - v_diff
      );

      -- Atualizar o check-in com valor correto
      UPDATE checkins SET pontos = v_correct_pts WHERE id = v_wrong_checkin.id;

      RAISE NOTICE 'Corrigido check-in de % (%): % → % pts (estornado % pts)',
        v_wrong_checkin.name, v_wrong_checkin.user_id, v_wrong_checkin.pontos, v_correct_pts, v_diff;
    END IF;
  END LOOP;
END $$;

-- 2. Recriar função fazer_checkin COM plano do usuário
DROP FUNCTION IF EXISTS fazer_checkin();

CREATE OR REPLACE FUNCTION fazer_checkin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_plano TEXT;
  v_pontos INTEGER;
  v_hoje DATE;
  v_ja_fez_hoje BOOLEAN;
  v_ultimo_checkin DATE;
  v_streak INTEGER;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar plano do usuário
  SELECT COALESCE(
    (SELECT s.plano::TEXT FROM subscriptions s WHERE s.user_id = v_user_id AND s.status = 'active'),
    'free'
  ) INTO v_plano;

  -- Buscar pontos da plano_config baseado no plano
  IF v_plano = 'prime' THEN
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_checkin_prime';
    v_pontos := COALESCE(v_pontos, 30);
  ELSE
    SELECT valor INTO v_pontos FROM plano_config WHERE chave = 'pontos_checkin_free';
    v_pontos := COALESCE(v_pontos, 10);
  END IF;

  -- Data de HOJE no fuso America/Sao_Paulo
  v_hoje := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Verificar se já fez check-in HOJE (por data, não timestamp)
  SELECT
    EXISTS (
      SELECT 1 FROM checkins
      WHERE user_id = v_user_id
        AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_hoje
    ),
    (
      SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE
      FROM checkins
      WHERE user_id = v_user_id
      ORDER BY created_at DESC
      LIMIT 1
    )
  INTO v_ja_fez_hoje, v_ultimo_checkin;

  IF v_ja_fez_hoje THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_in',
      'message', 'Você já fez check-in hoje. Volte amanhã!'
    );
  END IF;

  -- Calcular streak (apenas informativo, SEM bônus de pontos)
  IF v_ultimo_checkin IS NULL THEN
    v_streak := 1;
  ELSIF v_ultimo_checkin = v_hoje - 1 THEN
    SELECT COALESCE(
      (SELECT streak FROM checkins WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 1), 0
    ) + 1 INTO v_streak;
  ELSE
    v_streak := 1;
  END IF;

  -- Buscar saldo atual
  SELECT COALESCE(points, 0) INTO v_balance_before
  FROM profiles WHERE id = v_user_id;

  IF v_balance_before IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  v_balance_after := v_balance_before + v_pontos;

  -- Creditar pontos
  UPDATE profiles
  SET points = v_balance_after, updated_at = NOW()
  WHERE id = v_user_id;

  -- Registrar transação
  INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
  VALUES (v_user_id, v_pontos, 'task', 'Check-in diário', v_balance_before, v_balance_after);

  -- Registrar check-in
  INSERT INTO checkins (user_id, pontos, streak)
  VALUES (v_user_id, v_pontos, v_streak);

  -- Notificação (sem mencionar streak)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, icon)
    VALUES (
      v_user_id,
      'checkin',
      'Check-in feito!',
      'Você ganhou +' || v_pontos || ' pontos!',
      'calendar'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'plano', v_plano,
    'streak', v_streak,
    'balance_after', v_balance_after
  );
END;
$$;

-- ============================================
-- ITEM 5: CORRIGIR MISSÕES
-- - Apenas 7 missões ativas
-- - Remover bônus de classe da lista
-- - Teto de 5000 pts em missões
-- ============================================

-- 1. Desativar TODAS as missões primeiro
UPDATE tarefas SET ativa = false;

-- 2. Ativar APENAS as 7 missões oficiais
UPDATE tarefas SET ativa = true WHERE nome ILIKE '%Explorar%experiência%' OR nome ILIKE '%Explorar experiências%';
UPDATE tarefas SET ativa = true WHERE nome ILIKE '%Completar perfil%';
UPDATE tarefas SET ativa = true WHERE nome ILIKE '%Seguir%Instagram%';
UPDATE tarefas SET ativa = true WHERE nome ILIKE '%Avaliar%Google%';
UPDATE tarefas SET ativa = true WHERE nome ILIKE '%comunidade%WhatsApp%' OR nome ILIKE '%WhatsApp%comunidade%';
UPDATE tarefas SET ativa = true WHERE nome ILIKE '%Primeira indicação%' OR nome ILIKE '%1ª indicação%';
UPDATE tarefas SET ativa = true WHERE nome ILIKE '%Primeira venda%' OR nome ILIKE '%1ª viagem%' OR nome ILIKE '%Primeira viagem%';

-- 3. GARANTIR que bônus de classe NÃO é missão (desativar qualquer coisa com nome de classe)
UPDATE tarefas SET ativa = false
WHERE nome ILIKE '%Exclusive%'
   OR nome ILIKE '%Primeira Classe%'
   OR nome ILIKE '%Executiva%'
   OR nome ILIKE '%Econômica Premium%'
   OR nome ILIKE '%Meup%Exclusive%';

-- 4. Desativar Check-in Diário da lista (ele é tratado separadamente)
UPDATE tarefas SET ativa = false WHERE nome ILIKE '%Check-in%';

-- 5. Criar função para validar teto de 5000 pts em missões
CREATE OR REPLACE FUNCTION validar_teto_missoes(p_user_id UUID, p_pontos_novos INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_missoes INTEGER;
  v_teto INTEGER := 5000;
BEGIN
  -- Somar pontos de missões já creditadas
  SELECT COALESCE(SUM(amount), 0) INTO v_total_missoes
  FROM point_transactions
  WHERE user_id = p_user_id
    AND type = 'task'
    AND reason NOT ILIKE '%check-in%';

  -- Verificar se ultrapassaria o teto
  IF (v_total_missoes + p_pontos_novos) > v_teto THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 6. Verificar missões ativas
DO $$
DECLARE
  v_missao RECORD;
BEGIN
  RAISE NOTICE '=== MISSÕES ATIVAS ===';
  FOR v_missao IN
    SELECT nome, pontos, tipo FROM tarefas WHERE ativa = true ORDER BY pontos
  LOOP
    RAISE NOTICE '% - % pts (%)', v_missao.nome, v_missao.pontos, v_missao.tipo;
  END LOOP;
END $$;

-- ============================================
-- Verificação final
-- ============================================
DO $$
DECLARE
  v_checkin_count INTEGER;
  v_missoes_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_checkin_count FROM checkins WHERE pontos NOT IN (10, 30);
  SELECT COUNT(*) INTO v_missoes_count FROM tarefas WHERE ativa = true;

  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO ===';
  RAISE NOTICE 'Check-ins com valor errado restantes: %', v_checkin_count;
  RAISE NOTICE 'Missões ativas: %', v_missoes_count;
END $$;
