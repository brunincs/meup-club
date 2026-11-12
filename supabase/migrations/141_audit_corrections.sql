-- ============================================
-- MIGRAÇÃO 141: Auditoria Completa - Correções
-- Implementa todas as regras financeiras finais
-- ============================================

-- ============================================
-- 1. ATUALIZAR VALORES EM plano_config (chave-valor)
-- ============================================

-- Valores de indicação
UPDATE plano_config SET valor = 3000, descricao = 'Pontos para indicador Free na primeira compra do indicado' WHERE chave = 'emissao_indicador_free';
UPDATE plano_config SET valor = 5000, descricao = 'Pontos para indicador Prime na primeira compra do indicado' WHERE chave = 'emissao_indicador_prime';

-- Bônus Prime Anual
UPDATE plano_config SET valor = 3000, descricao = 'Pontos para indicador Prime quando indicado assina Prime Anual' WHERE chave = 'prime_anual_indicador_prime';
UPDATE plano_config SET valor = 1000, descricao = 'Pontos para indicado quando assina Prime Anual' WHERE chave = 'prime_anual_indicado';
UPDATE plano_config SET valor = 7, descricao = 'Dias que os pontos ficam pendentes (período de arrependimento)' WHERE chave = 'prime_anual_dias_pendente';

-- Inserir novas chaves se não existirem
INSERT INTO plano_config (chave, valor, descricao) VALUES
  ('resgate_pontos_por_real_free', 150, 'Pontos necessários para R$1 de resgate (Free)'),
  ('resgate_pontos_por_real_prime', 125, 'Pontos necessários para R$1 de resgate (Prime)'),
  ('bonus_boasvindas_prime', 2000, 'Pontos de boas-vindas ao assinar Prime'),
  ('pontos_checkin_free', 10, 'Pontos de check-in diário (Free)'),
  ('pontos_checkin_prime', 30, 'Pontos de check-in diário (Prime)'),
  ('pontos_aniversario_prime', 5000, 'Pontos de aniversário (Prime)'),
  ('multiplicador_free', 100, 'Multiplicador viagem Free (100 = 1.0x)'),
  ('multiplicador_prime', 150, 'Multiplicador viagem Prime Anual (150 = 1.5x)'),
  ('teto_missoes', 5000, 'Teto de pontos de missões por usuário'),
  ('premio_fundadores', 500000, 'Valor do prêmio do sorteio fundadores'),
  ('preco_prime_anual', 997, 'Preço cheio Prime Anual')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao;

-- ============================================
-- 2. CRIAR TABELA DE CONTROLE DE LOTES
-- ============================================

CREATE TABLE IF NOT EXISTS fundadores_lotes (
  id SERIAL PRIMARY KEY,
  lote_numero INTEGER NOT NULL UNIQUE,
  vagas_total INTEGER NOT NULL,
  vagas_vendidas INTEGER DEFAULT 0,
  preco NUMERIC(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir lotes
INSERT INTO fundadores_lotes (lote_numero, vagas_total, preco, ativo) VALUES
  (1, 20, 497, TRUE),
  (2, 40, 597, FALSE),
  (3, 40, 697, FALSE)
ON CONFLICT (lote_numero) DO UPDATE SET
  vagas_total = EXCLUDED.vagas_total,
  preco = EXCLUDED.preco;

-- ============================================
-- 3. FUNÇÃO PARA OBTER PREÇO ATUAL DO LOTE
-- ============================================

CREATE OR REPLACE FUNCTION get_preco_fundador_atual()
RETURNS TABLE (
  lote_numero INTEGER,
  preco NUMERIC(10,2),
  vagas_restantes INTEGER,
  total_vendidas INTEGER,
  proximo_lote BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lote RECORD;
  v_vendidas INTEGER;
  v_soma_vagas INTEGER;
BEGIN
  -- Contar fundadores já registrados
  SELECT COUNT(*) INTO v_vendidas FROM fundadores_vagas;

  -- Encontrar lote atual
  v_soma_vagas := 0;
  FOR v_lote IN
    SELECT * FROM fundadores_lotes ORDER BY lote_numero
  LOOP
    v_soma_vagas := v_soma_vagas + v_lote.vagas_total;
    IF v_vendidas < v_soma_vagas THEN
      -- Este é o lote atual
      RETURN QUERY SELECT
        v_lote.lote_numero,
        v_lote.preco,
        (v_soma_vagas - v_vendidas)::INTEGER,
        v_vendidas,
        FALSE;
      RETURN;
    END IF;
  END LOOP;

  -- Todos os lotes esgotados
  RETURN QUERY SELECT
    0::INTEGER,
    997::NUMERIC(10,2),
    0::INTEGER,
    v_vendidas,
    FALSE;
END;
$$;

-- ============================================
-- 4. REMOVER PONTOS DE CADASTRO
-- ============================================

DROP TRIGGER IF EXISTS tr_welcome_points ON profiles;
DROP TRIGGER IF EXISTS trigger_welcome_points ON profiles;
DROP FUNCTION IF EXISTS give_welcome_points();

-- ============================================
-- 5. FUNÇÃO PARA BÔNUS BOAS-VINDAS PRIME
-- ============================================

CREATE OR REPLACE FUNCTION creditar_boasvindas_prime(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ja_recebeu BOOLEAN;
  v_credit_result JSONB;
  v_bonus_pontos INTEGER;
BEGIN
  -- Verificar se já recebeu boas-vindas Prime
  SELECT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = p_user_id
    AND type = 'welcome'
    AND reason ILIKE '%prime%'
  ) INTO v_ja_recebeu;

  IF v_ja_recebeu THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'message', 'Bônus já creditado anteriormente');
  END IF;

  -- Buscar valor do bônus
  v_bonus_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'bonus_boasvindas_prime'), 2000);

  -- Creditar pontos de boas-vindas
  v_credit_result := creditar_pontos_central(
    p_user_id,
    v_bonus_pontos,
    'welcome',
    'Boas-vindas ao Me,up Prime!',
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_credit_result->>'error');
  END IF;

  -- Notificar
  INSERT INTO notifications (user_id, type, title, message, icon)
  VALUES (
    p_user_id,
    'welcome',
    'Bem-vindo ao Me,up Prime!',
    'Você ganhou ' || v_bonus_pontos || ' pontos de boas-vindas!',
    'sparkles'
  );

  RETURN jsonb_build_object(
    'success', true,
    'creditou', true,
    'pontos', v_bonus_pontos
  );
END;
$$;

-- ============================================
-- 6. BÔNUS QUANDO INDICADO VIRA PRIME
-- +3000 para quem indicou, +1000 para o indicado
-- ============================================

CREATE OR REPLACE FUNCTION bonus_indicacao_prime(p_novo_prime_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_pontos_referrer INTEGER;
  v_pontos_referred INTEGER;
  v_credit_referrer JSONB;
  v_credit_referred JSONB;
BEGIN
  -- Verificar se foi indicado
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_novo_prime_id
  AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'bonus_indicacao', false);
  END IF;

  -- Verificar se já recebeu este bônus
  IF EXISTS (
    SELECT 1 FROM point_transactions
    WHERE user_id = v_referral.referrer_id
    AND type = 'referral_bonus'
    AND reason ILIKE '%virou Prime%'
    AND metadata->>'referred_id' = p_novo_prime_id::TEXT
  ) THEN
    RETURN jsonb_build_object('success', true, 'bonus_indicacao', false, 'message', 'Bônus já creditado');
  END IF;

  -- Buscar valores
  v_pontos_referrer := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicador_prime'), 3000);
  v_pontos_referred := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicado'), 1000);

  -- Creditar para quem indicou
  v_credit_referrer := creditar_pontos_central(
    v_referral.referrer_id,
    v_pontos_referrer,
    'referral_bonus',
    'Bônus: seu indicado virou Prime!',
    'credit'
  );

  -- Creditar para o indicado
  v_credit_referred := creditar_pontos_central(
    p_novo_prime_id,
    v_pontos_referred,
    'referral_bonus',
    'Bônus por ter sido indicado ao Prime',
    'credit'
  );

  -- Notificar referrer
  INSERT INTO notifications (user_id, type, title, message, icon)
  VALUES (
    v_referral.referrer_id,
    'referral_prime',
    'Seu indicado virou Prime!',
    'Você ganhou +' || v_pontos_referrer || ' pontos porque seu amigo assinou o Prime!',
    'sparkles'
  );

  RETURN jsonb_build_object(
    'success', true,
    'bonus_indicacao', true,
    'referrer_bonus', v_pontos_referrer,
    'referred_bonus', v_pontos_referred
  );
END;
$$;

-- ============================================
-- 7. ATUALIZAR MISSÕES COM VALORES CORRETOS
-- ============================================

-- Desativar missão "compartilhar código"
UPDATE tarefas SET ativa = FALSE WHERE nome ILIKE '%compartilhar%código%' OR nome ILIKE '%share%';

-- Atualizar valores das missões
UPDATE tarefas SET pontos = 5 WHERE nome ILIKE '%explorar%experiência%' OR nome ILIKE '%visitar%';
UPDATE tarefas SET pontos = 50 WHERE nome ILIKE '%completar%perfil%';
UPDATE tarefas SET pontos = 250 WHERE nome ILIKE '%instagram%' OR nome ILIKE '%seguir%';
UPDATE tarefas SET pontos = 500 WHERE nome ILIKE '%google%' OR nome ILIKE '%avaliar%';
UPDATE tarefas SET pontos = 100 WHERE nome ILIKE '%primeira%indicação%' OR nome ILIKE '%1%indicação%';

-- Inserir missões faltantes
INSERT INTO tarefas (nome, descricao, pontos, tipo, icone, ativa, ordem)
SELECT 'Entrar na comunidade WhatsApp', 'Entre no grupo exclusivo Me,up no WhatsApp', 250, 'unica', '💬', TRUE, 50
WHERE NOT EXISTS (SELECT 1 FROM tarefas WHERE nome ILIKE '%comunidade%whatsapp%');

INSERT INTO tarefas (nome, descricao, pontos, tipo, icone, ativa, ordem)
SELECT 'Primeira viagem comprada', 'Complete sua primeira compra de viagem', 200, 'unica', '✈️', TRUE, 60
WHERE NOT EXISTS (SELECT 1 FROM tarefas WHERE nome ILIKE '%primeira%viagem%');

-- ============================================
-- 8. FUNÇÃO PARA VERIFICAR TETO DE MISSÕES
-- ============================================

CREATE OR REPLACE FUNCTION verificar_teto_missoes(p_user_id UUID)
RETURNS TABLE (
  pontos_usados INTEGER,
  teto INTEGER,
  disponivel INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teto INTEGER;
  v_usados INTEGER;
BEGIN
  -- Buscar teto
  v_teto := COALESCE((SELECT valor FROM plano_config WHERE chave = 'teto_missoes'), 5000);

  -- Calcular pontos já ganhos em missões
  SELECT COALESCE(SUM(pontos_concedidos), 0) INTO v_usados
  FROM missoes_automaticas_concluidas
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_usados, v_teto, GREATEST(0, v_teto - v_usados);
END;
$$;

-- ============================================
-- 9. PONTOS PENDENTES (7 DIAS)
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_release_date TIMESTAMPTZ;

-- ============================================
-- 10. FUNÇÃO PARA APROVAR INDICAÇÃO COM COMPRA
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_indicacao_com_compra(
  p_referral_id UUID,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_referrer_plano TEXT;
  v_pontos_referrer INTEGER;
  v_credit_result JSONB;
BEGIN
  -- Buscar indicação
  SELECT * INTO v_referral FROM referrals WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF v_referral.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação já aprovada');
  END IF;

  -- Verificar plano do referrer
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_referrer_plano;

  -- Definir pontos baseado no plano
  IF v_referrer_plano = 'prime' THEN
    v_pontos_referrer := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_prime'), 5000);
  ELSE
    v_pontos_referrer := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_free'), 3000);
  END IF;

  -- Creditar pontos ao referrer
  v_credit_result := creditar_pontos_central(
    v_referral.referrer_id,
    v_pontos_referrer,
    'referral',
    'Indicação aprovada: amigo comprou viagem',
    'credit'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_credit_result->>'error');
  END IF;

  -- Atualizar status da indicação
  UPDATE referrals SET
    status = 'approved',
    approved_at = NOW(),
    approved_by = COALESCE(p_admin_id, auth.uid())
  WHERE id = p_referral_id;

  -- Notificar
  INSERT INTO notifications (user_id, type, title, message, icon, metadata)
  VALUES (
    v_referral.referrer_id,
    'referral_approved',
    'Indicação aprovada!',
    'Seu amigo comprou uma viagem. Você ganhou ' || v_pontos_referrer || ' pontos!',
    'gift',
    jsonb_build_object('pontos', v_pontos_referrer)
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos_creditados', v_pontos_referrer,
    'referrer_id', v_referral.referrer_id
  );
END;
$$;

-- ============================================
-- 11. PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION get_preco_fundador_atual() TO authenticated;
GRANT EXECUTE ON FUNCTION aprovar_indicacao_com_compra(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bonus_indicacao_prime(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_teto_missoes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION creditar_boasvindas_prime(UUID) TO authenticated;

GRANT SELECT ON fundadores_lotes TO authenticated;
