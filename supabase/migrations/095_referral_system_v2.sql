-- ============================================
-- MIGRAÇÃO 095: Sistema de Indicações v2
-- Novas regras: cotação, emissão, assinatura Prime
-- Valores editáveis em plano_config
-- ============================================

-- 1. ATUALIZAR plano_config COM NOVOS VALORES
-- ============================================

-- Limpar e recriar plano_config com todos os valores
DROP TABLE IF EXISTS plano_config CASCADE;
CREATE TABLE plano_config (
  id SERIAL PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor INTEGER NOT NULL,
  descricao TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plano_config (chave, valor, descricao) VALUES
  -- Cotação validada (só Prime ganha)
  ('cotacao_indicador_prime', 500, 'Pontos para indicador Prime quando cotação é validada'),
  ('cotacao_indicado_prime', 500, 'Pontos para indicado quando cotação é validada (só se indicador é Prime)'),

  -- Primeira emissão aprovada
  ('emissao_indicador_free', 3000, 'Pontos para indicador Free na primeira emissão do indicado'),
  ('emissao_indicador_prime', 5000, 'Pontos para indicador Prime na primeira emissão do indicado'),

  -- Assinatura Prime Anual (só Prime ganha)
  ('prime_anual_indicador_prime', 3000, 'Pontos para indicador Prime quando indicado assina Prime Anual'),
  ('prime_anual_indicado', 1000, 'Pontos para indicado quando assina Prime Anual (só se indicador é Prime)'),
  ('prime_anual_dias_pendente', 7, 'Dias que os pontos ficam pendentes (arrependimento)'),

  -- Legado (manter compatibilidade)
  ('pontos_indicacao_free', 3000, 'LEGADO: pontos indicação free'),
  ('pontos_indicacao_prime', 5000, 'LEGADO: pontos indicação prime')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao;

-- 2. TABELA DE COTAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  destino TEXT NOT NULL,
  data_ida DATE NOT NULL,
  data_volta DATE,
  num_pessoas INTEGER NOT NULL DEFAULT 1,
  observacoes TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'validada', 'cancelada')),
  validada_por UUID REFERENCES profiles(id),
  validada_em TIMESTAMPTZ,
  cancelada_motivo TEXT,
  -- Rastreio de pontos
  pontos_creditados BOOLEAN DEFAULT FALSE,
  referral_id UUID REFERENCES referrals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotacoes_user ON cotacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_status ON cotacoes(status);
CREATE INDEX IF NOT EXISTS idx_cotacoes_referral ON cotacoes(referral_id);

-- 3. TABELA DE GANHOS PERDIDOS (para Free)
-- ============================================

CREATE TABLE IF NOT EXISTS missed_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  referral_id UUID REFERENCES referrals(id),
  referred_name TEXT NOT NULL,
  evento TEXT NOT NULL CHECK (evento IN ('cotacao', 'prime_anual')),
  valor_perdido INTEGER NOT NULL,
  mensagem TEXT,
  visualizado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missed_earnings_user ON missed_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_missed_earnings_visualizado ON missed_earnings(user_id, visualizado);

-- 4. TABELA DE PONTOS PENDENTES (arrependimento)
-- ============================================

CREATE TABLE IF NOT EXISTS pending_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  referral_id UUID REFERENCES referrals(id),
  subscription_id UUID REFERENCES subscriptions(id),
  pontos INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  liberar_em TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'liberado', 'cancelado')),
  liberado_em TIMESTAMPTZ,
  cancelado_motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_points_user ON pending_points(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_points_status ON pending_points(status);
CREATE INDEX IF NOT EXISTS idx_pending_points_liberar ON pending_points(liberar_em) WHERE status = 'pendente';

-- 5. ADICIONAR CAMPOS À TABELA referrals
-- ============================================

-- Rastrear cada etapa
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS cotacao_validada BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS cotacao_validada_em TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS cotacao_pontos_creditados BOOLEAN DEFAULT FALSE;

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS primeira_emissao_id UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS primeira_emissao_creditada BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS primeira_emissao_em TIMESTAMPTZ;

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS prime_anual_ativado BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS prime_anual_ativado_em TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS prime_anual_pontos_creditados BOOLEAN DEFAULT FALSE;

-- 6. CPF ÚNICO NO CADASTRO
-- ============================================

-- Remover constraint existente se houver
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_unique;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Criar índice único para CPF não nulo
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_unique
ON profiles(cpf)
WHERE cpf IS NOT NULL AND cpf != '';

-- 7. FUNÇÃO: Obter valor de plano_config
-- ============================================

CREATE OR REPLACE FUNCTION get_config_valor(p_chave TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valor INTEGER;
BEGIN
  SELECT valor INTO v_valor FROM plano_config WHERE chave = p_chave;
  RETURN COALESCE(v_valor, 0);
END;
$$;

-- 8. FUNÇÃO: Validar cotação (Admin)
-- ============================================

CREATE OR REPLACE FUNCTION admin_validar_cotacao(
  p_cotacao_id UUID,
  p_destino TEXT DEFAULT NULL,
  p_data_ida DATE DEFAULT NULL,
  p_data_volta DATE DEFAULT NULL,
  p_num_pessoas INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cotacao RECORD;
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos_indicador INTEGER;
  v_pontos_indicado INTEGER;
  v_admin_id UUID;
  v_indicado_nome TEXT;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Buscar cotação
  SELECT * INTO v_cotacao FROM cotacoes WHERE id = p_cotacao_id;
  IF v_cotacao.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cotação não encontrada');
  END IF;

  IF v_cotacao.status = 'validada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cotação já foi validada');
  END IF;

  -- Atualizar dados da cotação se fornecidos
  UPDATE cotacoes SET
    destino = COALESCE(p_destino, destino),
    data_ida = COALESCE(p_data_ida, data_ida),
    data_volta = COALESCE(p_data_volta, data_volta),
    num_pessoas = COALESCE(p_num_pessoas, num_pessoas),
    status = 'validada',
    validada_por = v_admin_id,
    validada_em = NOW(),
    updated_at = NOW()
  WHERE id = p_cotacao_id;

  -- Buscar referral do usuário da cotação
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = v_cotacao.user_id
  AND r.status = 'approved'
  AND r.cotacao_pontos_creditados = FALSE
  LIMIT 1;

  IF v_referral.id IS NULL THEN
    -- Não tem referral ou já creditou - só valida a cotação
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Cotação validada (sem indicação ativa)',
      'pontos_creditados', false
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Se indicador é FREE, registrar ganho perdido e não creditar
  IF v_indicador_plano = 'free' THEN
    v_pontos_indicador := get_config_valor('cotacao_indicador_prime');

    INSERT INTO missed_earnings (user_id, referral_id, referred_name, evento, valor_perdido, mensagem)
    VALUES (
      v_referral.referrer_id,
      v_referral.id,
      v_indicado_nome,
      'cotacao',
      v_pontos_indicador,
      'A cotação de ' || v_indicado_nome || ' foi validada. No Prime, você teria ganho +' || v_pontos_indicador || ' pts.'
    );

    -- Marcar cotação como processada (sem pontos)
    UPDATE referrals SET
      cotacao_validada = TRUE,
      cotacao_validada_em = NOW(),
      cotacao_pontos_creditados = FALSE
    WHERE id = v_referral.id;

    UPDATE cotacoes SET
      pontos_creditados = FALSE,
      referral_id = v_referral.id
    WHERE id = p_cotacao_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Cotação validada. Indicador é Free - pontos não creditados.',
      'pontos_creditados', false,
      'indicador_plano', 'free'
    );
  END IF;

  -- Indicador é PRIME - creditar pontos
  v_pontos_indicador := get_config_valor('cotacao_indicador_prime');
  v_pontos_indicado := get_config_valor('cotacao_indicado_prime');

  -- Creditar indicador
  PERFORM creditar_pontos_central(
    v_referral.referrer_id,
    v_pontos_indicador,
    'referral',
    'Bônus cotação validada: ' || v_indicado_nome
  );

  -- Creditar indicado
  PERFORM creditar_pontos_central(
    v_referral.referred_id,
    v_pontos_indicado,
    'welcome_referral',
    'Bônus: sua cotação foi validada'
  );

  -- Marcar como creditado
  UPDATE referrals SET
    cotacao_validada = TRUE,
    cotacao_validada_em = NOW(),
    cotacao_pontos_creditados = TRUE
  WHERE id = v_referral.id;

  UPDATE cotacoes SET
    pontos_creditados = TRUE,
    referral_id = v_referral.id
  WHERE id = p_cotacao_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cotação validada! Pontos creditados.',
    'pontos_creditados', true,
    'indicador_plano', 'prime',
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado
  );
END;
$$;

-- 9. FUNÇÃO: Creditar pontos de primeira emissão
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_primeira_emissao(
  p_emissao_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos INTEGER;
  v_indicado_nome TEXT;
BEGIN
  -- Buscar referral do usuário
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = p_user_id
  AND r.status = 'approved'
  AND r.primeira_emissao_creditada = FALSE
  LIMIT 1;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Sem indicação ativa ou já creditado');
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Pontos baseados no plano do indicador
  IF v_indicador_plano = 'prime' THEN
    v_pontos := get_config_valor('emissao_indicador_prime');
  ELSE
    v_pontos := get_config_valor('emissao_indicador_free');
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

-- 10. FUNÇÃO: Ativar Prime Anual (com pontos pendentes)
-- ============================================

CREATE OR REPLACE FUNCTION admin_confirmar_prime_anual(
  p_subscription_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Buscar referral
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = v_subscription.user_id
  AND r.status = 'approved'
  AND r.prime_anual_pontos_creditados = FALSE
  LIMIT 1;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Sem indicação ativa ou já creditado');
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Se indicador é FREE, registrar ganho perdido
  IF v_indicador_plano = 'free' THEN
    v_pontos_indicador := get_config_valor('prime_anual_indicador_prime');

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
      'message', 'Prime Anual confirmado. Indicador é Free - pontos não creditados.',
      'indicador_plano', 'free'
    );
  END IF;

  -- Indicador é PRIME - criar pontos pendentes
  v_pontos_indicador := get_config_valor('prime_anual_indicador_prime');
  v_pontos_indicado := get_config_valor('prime_anual_indicado');
  v_dias_pendente := get_config_valor('prime_anual_dias_pendente');
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  -- Criar pontos pendentes para indicador
  INSERT INTO pending_points (user_id, referral_id, subscription_id, pontos, motivo, liberar_em)
  VALUES (
    v_referral.referrer_id,
    v_referral.id,
    p_subscription_id,
    v_pontos_indicador,
    'Bônus Prime Anual: ' || v_indicado_nome,
    v_liberar_em
  );

  -- Criar pontos pendentes para indicado
  INSERT INTO pending_points (user_id, referral_id, subscription_id, pontos, motivo, liberar_em)
  VALUES (
    v_referral.referred_id,
    v_referral.id,
    p_subscription_id,
    v_pontos_indicado,
    'Bônus: você assinou o Prime Anual',
    v_liberar_em
  );

  -- Marcar referral
  UPDATE referrals SET
    prime_anual_ativado = TRUE,
    prime_anual_ativado_em = NOW(),
    prime_anual_pontos_creditados = FALSE -- Ainda pendentes
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pontos agendados para liberação em ' || v_dias_pendente || ' dias',
    'liberar_em', v_liberar_em,
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado
  );
END;
$$;

-- 11. FUNÇÃO: Liberar pontos pendentes (cron job)
-- ============================================

CREATE OR REPLACE FUNCTION liberar_pontos_pendentes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- Creditar pontos
    PERFORM creditar_pontos_central(
      v_pending.user_id,
      v_pending.pontos,
      'referral',
      v_pending.motivo
    );

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

-- 12. FUNÇÃO: Cancelar pontos pendentes (arrependimento)
-- ============================================

CREATE OR REPLACE FUNCTION cancelar_pontos_pendentes_assinatura(
  p_subscription_id UUID,
  p_motivo TEXT DEFAULT 'Cancelamento no período de arrependimento'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE pending_points SET
    status = 'cancelado',
    cancelado_motivo = p_motivo
  WHERE subscription_id = p_subscription_id
  AND status = 'pendente';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'cancelados', v_count
  );
END;
$$;

-- 13. FUNÇÃO: Reverter cotação (estorno)
-- ============================================

CREATE OR REPLACE FUNCTION admin_reverter_cotacao(
  p_cotacao_id UUID,
  p_motivo TEXT DEFAULT 'Reversão administrativa'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cotacao RECORD;
  v_referral RECORD;
  v_pontos_indicador INTEGER;
  v_pontos_indicado INTEGER;
BEGIN
  SELECT * INTO v_cotacao FROM cotacoes WHERE id = p_cotacao_id;

  IF v_cotacao.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cotação não encontrada');
  END IF;

  IF NOT v_cotacao.pontos_creditados THEN
    -- Só cancelar a cotação
    UPDATE cotacoes SET
      status = 'cancelada',
      cancelada_motivo = p_motivo,
      updated_at = NOW()
    WHERE id = p_cotacao_id;

    RETURN jsonb_build_object('success', true, 'message', 'Cotação cancelada (sem pontos a estornar)');
  END IF;

  -- Buscar referral
  SELECT * INTO v_referral FROM referrals WHERE id = v_cotacao.referral_id;

  v_pontos_indicador := get_config_valor('cotacao_indicador_prime');
  v_pontos_indicado := get_config_valor('cotacao_indicado_prime');

  -- Estornar pontos (transação negativa)
  PERFORM creditar_pontos_central(
    v_referral.referrer_id,
    -v_pontos_indicador,
    'adjustment',
    'Estorno: cotação revertida - ' || p_motivo
  );

  PERFORM creditar_pontos_central(
    v_referral.referred_id,
    -v_pontos_indicado,
    'adjustment',
    'Estorno: cotação revertida - ' || p_motivo
  );

  -- Atualizar registros
  UPDATE cotacoes SET
    status = 'cancelada',
    pontos_creditados = FALSE,
    cancelada_motivo = p_motivo,
    updated_at = NOW()
  WHERE id = p_cotacao_id;

  UPDATE referrals SET
    cotacao_validada = FALSE,
    cotacao_pontos_creditados = FALSE
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'estornado_indicador', v_pontos_indicador,
    'estornado_indicado', v_pontos_indicado
  );
END;
$$;

-- 14. ATUALIZAR aprovar_emissao PARA CREDITAR PRIMEIRA EMISSÃO
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_emissao(p_emissao_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emissao RECORD;
  v_plano TEXT;
  v_ciclo TEXT;
  v_multiplicador NUMERIC;
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

  -- Obter plano e ciclo
  v_plano := COALESCE(get_plano_usuario(v_emissao.user_id), 'free');
  v_ciclo := COALESCE(get_ciclo_usuario(v_emissao.user_id), 'mensal');

  -- Calcular multiplicador
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
    'Emissão aprovada: R$ ' || v_emissao.valor
  );

  -- Atualizar emissão
  UPDATE emissoes SET
    status = 'aprovada',
    pontos_creditados = v_pontos_final,
    multiplicador = v_multiplicador,
    aprovado_por = v_admin_id,
    aprovado_em = NOW(),
    updated_at = NOW()
  WHERE id = p_emissao_id;

  -- NOVO: Creditar pontos de primeira emissão ao indicador
  SELECT creditar_pontos_primeira_emissao(p_emissao_id, v_emissao.user_id) INTO v_referral_result;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_base', v_pontos_base,
    'multiplicador', v_multiplicador,
    'pontos_final', v_pontos_final,
    'referral_bonus', v_referral_result
  );
END;
$$;

-- 15. REMOVER PONTOS DE CADASTRO
-- ============================================

-- Remover trigger de boas-vindas se existir
DROP TRIGGER IF EXISTS trigger_welcome_points ON profiles;
DROP FUNCTION IF EXISTS give_welcome_points();

-- 16. BUSCAR GANHOS PERDIDOS DO USUÁRIO
-- ============================================

CREATE OR REPLACE FUNCTION get_missed_earnings(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  referred_name TEXT,
  evento TEXT,
  valor_perdido INTEGER,
  mensagem TEXT,
  visualizado BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.id,
    me.referred_name,
    me.evento,
    me.valor_perdido,
    me.mensagem,
    me.visualizado,
    me.created_at
  FROM missed_earnings me
  WHERE me.user_id = COALESCE(p_user_id, auth.uid())
  ORDER BY me.created_at DESC;
END;
$$;

-- 17. MARCAR GANHOS PERDIDOS COMO VISUALIZADOS
-- ============================================

CREATE OR REPLACE FUNCTION mark_missed_earnings_viewed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE missed_earnings SET visualizado = TRUE
  WHERE user_id = auth.uid() AND visualizado = FALSE;
END;
$$;

-- 18. BUSCAR TOTAL DE GANHOS PERDIDOS
-- ============================================

CREATE OR REPLACE FUNCTION get_total_missed_earnings(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(valor_perdido), 0) INTO v_total
  FROM missed_earnings
  WHERE user_id = COALESCE(p_user_id, auth.uid());

  RETURN v_total;
END;
$$;

-- 19. FUNÇÃO: Criar cotação
-- ============================================

CREATE OR REPLACE FUNCTION client_criar_cotacao(
  p_destino TEXT,
  p_data_ida DATE,
  p_data_volta DATE DEFAULT NULL,
  p_num_pessoas INTEGER DEFAULT 1,
  p_observacoes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_cotacao_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  INSERT INTO cotacoes (user_id, destino, data_ida, data_volta, num_pessoas, observacoes)
  VALUES (v_user_id, p_destino, p_data_ida, p_data_volta, p_num_pessoas, p_observacoes)
  RETURNING id INTO v_cotacao_id;

  RETURN jsonb_build_object(
    'success', true,
    'cotacao_id', v_cotacao_id
  );
END;
$$;

-- 20. BUSCAR ETAPAS DE INDICAÇÃO POR AMIGO
-- ============================================

CREATE OR REPLACE FUNCTION get_referral_steps(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  referral_id UUID,
  referred_id UUID,
  referred_name TEXT,
  referred_email TEXT,
  cadastrou BOOLEAN,
  cadastrou_em TIMESTAMPTZ,
  cotacao_validada BOOLEAN,
  cotacao_validada_em TIMESTAMPTZ,
  cotacao_pontos INTEGER,
  primeira_emissao BOOLEAN,
  primeira_emissao_em TIMESTAMPTZ,
  emissao_pontos INTEGER,
  prime_anual BOOLEAN,
  prime_anual_em TIMESTAMPTZ,
  prime_anual_pontos INTEGER,
  prime_anual_pendente BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_plano TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Plano do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_user_id)), 'free') INTO v_plano;

  RETURN QUERY
  SELECT
    r.id as referral_id,
    r.referred_id,
    p.name as referred_name,
    p.email as referred_email,
    TRUE as cadastrou,
    r.created_at as cadastrou_em,
    COALESCE(r.cotacao_validada, FALSE) as cotacao_validada,
    r.cotacao_validada_em,
    CASE WHEN r.cotacao_pontos_creditados THEN get_config_valor('cotacao_indicador_prime') ELSE 0 END as cotacao_pontos,
    COALESCE(r.primeira_emissao_creditada, FALSE) as primeira_emissao,
    r.primeira_emissao_em,
    CASE WHEN r.primeira_emissao_creditada THEN
      CASE WHEN v_plano = 'prime' THEN get_config_valor('emissao_indicador_prime')
      ELSE get_config_valor('emissao_indicador_free') END
    ELSE 0 END as emissao_pontos,
    COALESCE(r.prime_anual_ativado, FALSE) as prime_anual,
    r.prime_anual_ativado_em,
    CASE WHEN r.prime_anual_pontos_creditados THEN get_config_valor('prime_anual_indicador_prime') ELSE 0 END as prime_anual_pontos,
    EXISTS(SELECT 1 FROM pending_points pp WHERE pp.referral_id = r.id AND pp.status = 'pendente') as prime_anual_pendente
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referrer_id = v_user_id
  AND r.status = 'approved'
  ORDER BY r.created_at DESC;
END;
$$;

-- 21. BUSCAR COTAÇÕES PENDENTES (Admin)
-- ============================================

CREATE OR REPLACE FUNCTION admin_get_cotacoes_pendentes()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  destino TEXT,
  data_ida DATE,
  data_volta DATE,
  num_pessoas INTEGER,
  observacoes TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  tem_indicacao BOOLEAN,
  indicador_plano TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    p.name as user_name,
    p.email as user_email,
    c.destino,
    c.data_ida,
    c.data_volta,
    c.num_pessoas,
    c.observacoes,
    c.status,
    c.created_at,
    EXISTS(SELECT 1 FROM referrals r WHERE r.referred_id = c.user_id AND r.status = 'approved') as tem_indicacao,
    (SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(r.referrer_id)), 'free')
     FROM referrals r WHERE r.referred_id = c.user_id AND r.status = 'approved' LIMIT 1) as indicador_plano
  FROM cotacoes c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.status = 'pendente'
  ORDER BY c.created_at ASC;
END;
$$;
