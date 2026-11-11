-- =============================================
-- MIGRAÇÃO 092: CORREÇÕES VOUCHER E CLASSE
-- =============================================
-- 1. Gerar voucher para resgate 263d2bdf já aprovado
-- 2. Corrigir textos com acentos
-- 3. Apagar experiência "Acesso a Lounge"
-- 4. Classe usa total_points_earned (não saldo)
-- =============================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. GERAR VOUCHER PARA RESGATE JÁ APROVADO
-- ═══════════════════════════════════════════════════════════════════

-- Gerar voucher para o resgate específico
DO $$
DECLARE
  v_codigo TEXT;
  v_resgate_id UUID := '263d2bdf-272c-4815-9031-ab6c70276808';
  v_pontos INTEGER;
BEGIN
  -- Verificar se resgate existe e não tem voucher
  SELECT pontos INTO v_pontos
  FROM resgate_solicitacoes
  WHERE id = v_resgate_id;

  IF v_pontos IS NOT NULL THEN
    -- Verificar se já tem voucher
    IF NOT EXISTS (SELECT 1 FROM vouchers WHERE resgate_id = v_resgate_id) THEN
      -- Gerar código único
      v_codigo := gerar_codigo_voucher();

      -- Inserir voucher
      INSERT INTO vouchers (resgate_id, codigo, valor, validade, status)
      VALUES (v_resgate_id, v_codigo, v_pontos, CURRENT_DATE + INTERVAL '12 months', 'disponivel');

      -- Atualizar status do resgate
      UPDATE resgate_solicitacoes
      SET status = 'entregue',
          prazo_entrega = NOW(),
          entregue_em = NOW()
      WHERE id = v_resgate_id;

      RAISE NOTICE 'Voucher criado: %', v_codigo;
    ELSE
      RAISE NOTICE 'Resgate já tem voucher';
    END IF;
  ELSE
    RAISE NOTICE 'Resgate não encontrado';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. CORRIGIR TEXTOS COM ACENTOS
-- ═══════════════════════════════════════════════════════════════════

-- Corrigir reason em point_transactions
UPDATE point_transactions SET reason = 'Devolução (reversão): ' || SUBSTRING(reason FROM 24)
WHERE reason LIKE 'Devolucao (reversao):%';

UPDATE point_transactions SET reason = REPLACE(reason, 'Devolucao', 'Devolução')
WHERE reason LIKE '%Devolucao%';

UPDATE point_transactions SET reason = REPLACE(reason, 'reversao', 'reversão')
WHERE reason LIKE '%reversao%';

UPDATE point_transactions SET reason = REPLACE(reason, 'Indicacao', 'Indicação')
WHERE reason LIKE '%Indicacao%';

UPDATE point_transactions SET reason = REPLACE(reason, 'indicacao', 'indicação')
WHERE reason LIKE '%indicacao%';

UPDATE point_transactions SET reason = REPLACE(reason, 'Emissao', 'Emissão')
WHERE reason LIKE '%Emissao%';

UPDATE point_transactions SET reason = REPLACE(reason, 'emissao', 'emissão')
WHERE reason LIKE '%emissao%';

UPDATE point_transactions SET reason = REPLACE(reason, 'Missao', 'Missão')
WHERE reason LIKE '%Missao%';

UPDATE point_transactions SET reason = REPLACE(reason, 'missao', 'missão')
WHERE reason LIKE '%missao%';

UPDATE point_transactions SET reason = REPLACE(reason, 'Credito', 'Crédito')
WHERE reason LIKE '%Credito%';

UPDATE point_transactions SET reason = REPLACE(reason, 'Nao', 'Não')
WHERE reason LIKE '%Nao %';

UPDATE point_transactions SET reason = REPLACE(reason, 'primeira indicacao realizada', 'Primeira indicação realizada')
WHERE reason ILIKE '%primeira indicacao realizada%';

-- Corrigir experiencias com acentos
UPDATE tarefas SET nome = REPLACE(nome, 'indicacao', 'indicação')
WHERE nome LIKE '%indicacao%';

UPDATE tarefas SET descricao = REPLACE(descricao, 'indicacao', 'indicação')
WHERE descricao LIKE '%indicacao%';

-- ═══════════════════════════════════════════════════════════════════
-- 3. ADICIONAR COLUNA total_points_earned SE NÃO EXISTIR
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_points_earned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_points_earned INTEGER DEFAULT 0;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. APAGAR EXPERIÊNCIA "ACESSO A LOUNGE"
-- ═══════════════════════════════════════════════════════════════════

DELETE FROM experiencias WHERE nome = 'Acesso a Lounge';

-- ═══════════════════════════════════════════════════════════════════
-- 4. CLASSE USA TOTAL DE PONTOS GANHOS (NÃO SALDO)
-- ═══════════════════════════════════════════════════════════════════

-- Criar/atualizar função para calcular total de pontos ganhos
CREATE OR REPLACE FUNCTION calcular_total_pontos_ganhos(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  -- Soma apenas créditos (amount > 0), excluindo estornados
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM point_transactions
  WHERE user_id = p_user_id
    AND amount > 0
    AND estornado = FALSE;

  RETURN v_total;
END;
$$;

-- Criar/atualizar função para calcular nível baseado em pontos ganhos
CREATE OR REPLACE FUNCTION calcular_nivel_por_pontos_ganhos(p_total_ganho INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Níveis baseados em total ganho (não saldo)
  IF p_total_ganho >= 100000 THEN RETURN 5; -- Meup Exclusive
  ELSIF p_total_ganho >= 50000 THEN RETURN 4; -- Primeira Classe
  ELSIF p_total_ganho >= 20000 THEN RETURN 3; -- Executiva
  ELSIF p_total_ganho >= 5000 THEN RETURN 2; -- Econômica Premium
  ELSE RETURN 1; -- Econômica
  END IF;
END;
$$;

-- Atualizar trigger para usar total ganho em vez de saldo
CREATE OR REPLACE FUNCTION atualizar_nivel_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_ganho INTEGER;
  v_nivel_atual INTEGER;
  v_novo_nivel INTEGER;
  v_bonus_nivel INTEGER;
  v_ja_recebeu_bonus BOOLEAN;
BEGIN
  -- Calcular total de pontos ganhos
  v_total_ganho := calcular_total_pontos_ganhos(NEW.user_id);

  -- Calcular novo nível baseado no total ganho
  v_novo_nivel := calcular_nivel_por_pontos_ganhos(v_total_ganho);

  -- Buscar nível atual
  SELECT COALESCE(level_id, 1) INTO v_nivel_atual
  FROM profiles WHERE id = NEW.user_id;

  -- Se subiu de nível
  IF v_novo_nivel > v_nivel_atual THEN
    -- Verificar se já recebeu bônus deste nível (idempotente)
    SELECT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE user_id = NEW.user_id
      AND type = 'level_bonus'
      AND reason LIKE '%nível ' || v_novo_nivel || '%'
      AND estornado = FALSE
    ) INTO v_ja_recebeu_bonus;

    IF NOT v_ja_recebeu_bonus THEN
      -- Bônus por nível
      v_bonus_nivel := CASE v_novo_nivel
        WHEN 2 THEN 1000
        WHEN 3 THEN 3000
        WHEN 4 THEN 5000
        WHEN 5 THEN 10000
        ELSE 0
      END;

      IF v_bonus_nivel > 0 THEN
        -- Creditar bônus
        PERFORM creditar_pontos_central(
          NEW.user_id,
          v_bonus_nivel,
          'level_bonus',
          'Bônus por alcançar nível ' || v_novo_nivel,
          'credit'
        );

        -- Notificação
        BEGIN
          INSERT INTO notifications (user_id, type, title, message, icon)
          VALUES (
            NEW.user_id,
            'level_up',
            'Parabéns! Você subiu de classe!',
            'Você alcançou o nível ' || v_novo_nivel || ' e ganhou ' || v_bonus_nivel || ' pontos de bônus!',
            'trophy'
          );
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END IF;
    END IF;

    -- Atualizar nível no perfil
    UPDATE profiles
    SET level_id = v_novo_nivel,
        total_points_earned = v_total_ganho,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSE
    -- Apenas atualizar total_points_earned
    UPDATE profiles
    SET total_points_earned = v_total_ganho,
        updated_at = NOW()
    WHERE id = NEW.user_id
    AND (total_points_earned IS NULL OR total_points_earned <> v_total_ganho);
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_atualizar_nivel ON point_transactions;
CREATE TRIGGER trigger_atualizar_nivel
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_nivel_usuario();

-- ═══════════════════════════════════════════════════════════════════
-- 5. RECALCULAR NÍVEIS DE TODOS OS USUÁRIOS
-- ═══════════════════════════════════════════════════════════════════

-- Atualizar total_points_earned e level_id de todos
UPDATE profiles p
SET
  total_points_earned = (
    SELECT COALESCE(SUM(amount), 0)::INTEGER
    FROM point_transactions pt
    WHERE pt.user_id = p.id
      AND pt.amount > 0
      AND pt.estornado = FALSE
  ),
  level_id = calcular_nivel_por_pontos_ganhos(
    (SELECT COALESCE(SUM(amount), 0)::INTEGER
     FROM point_transactions pt
     WHERE pt.user_id = p.id
       AND pt.amount > 0
       AND pt.estornado = FALSE)
  ),
  updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- 6. ADICIONAR COLUNA aprovado_por SE NÃO EXISTIR
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resgate_solicitacoes' AND column_name = 'aprovado_por'
  ) THEN
    ALTER TABLE resgate_solicitacoes ADD COLUMN aprovado_por UUID REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resgate_solicitacoes' AND column_name = 'aprovado_em'
  ) THEN
    ALTER TABLE resgate_solicitacoes ADD COLUMN aprovado_em TIMESTAMPTZ;
  END IF;
END $$;
