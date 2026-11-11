-- ============================================
-- MIGRAÇÃO 097: Remover recompensas de cotação
-- Manter apenas: Primeira viagem e Prime Anual
-- ============================================

-- ============================================
-- 1. ATUALIZAR plano_config - REMOVER COTAÇÃO
-- ============================================

-- Remover valores de cotação
DELETE FROM plano_config WHERE chave IN (
  'indicacao_cotacao_indicador',
  'indicacao_cotacao_indicado',
  'bonus_cotacao_prime',
  'bonus_cotacao_free'
);

-- Adicionar/atualizar valores corretos
INSERT INTO plano_config (chave, valor, descricao) VALUES
  ('indicacao_compra_free', 3000, 'Pontos para indicador Free na primeira emissão do indicado'),
  ('indicacao_compra_prime', 5000, 'Pontos para indicador Prime na primeira emissão do indicado'),
  ('indicacao_anual_indicador', 3000, 'Pontos para indicador Prime quando indicado assina Prime Anual'),
  ('indicacao_anual_indicado', 1000, 'Pontos para indicado ao assinar Prime Anual (se indicador Prime)'),
  ('dias_bloqueio', 7, 'Dias de bloqueio para pontos de assinatura')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao;

-- ============================================
-- 2. ATUALIZAR admin_validar_cotacao - SEM PONTOS
-- ============================================

CREATE OR REPLACE FUNCTION admin_validar_cotacao(
  p_cotacao_id UUID,
  p_destino TEXT DEFAULT NULL,
  p_data_ida DATE DEFAULT NULL,
  p_data_volta DATE DEFAULT NULL,
  p_num_pessoas INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cotacao RECORD;
BEGIN
  -- Buscar cotação
  SELECT * INTO v_cotacao FROM cotacoes WHERE id = p_cotacao_id;

  IF v_cotacao.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cotação não encontrada');
  END IF;

  IF v_cotacao.status != 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cotação já foi processada');
  END IF;

  -- Atualizar cotação como validada (SEM CREDITAR PONTOS)
  UPDATE cotacoes SET
    status = 'validada',
    destino = COALESCE(p_destino, destino),
    data_ida = COALESCE(p_data_ida, data_ida),
    data_volta = COALESCE(p_data_volta, data_volta),
    num_pessoas = COALESCE(p_num_pessoas, num_pessoas),
    validada_em = NOW(),
    validada_por = auth.uid(),
    pontos_creditados = FALSE -- Nunca credita pontos
  WHERE id = p_cotacao_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cotação validada',
    'pontos_creditados', false
  );
END;
$$;

-- ============================================
-- 3. ATUALIZAR get_referral_steps - SEM COTAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION get_referral_steps()
RETURNS TABLE (
  referral_id UUID,
  referred_id UUID,
  referred_name TEXT,
  referred_email TEXT,
  cadastrou BOOLEAN,
  primeira_emissao BOOLEAN,
  emissao_pontos INTEGER,
  prime_anual BOOLEAN,
  prime_anual_pontos INTEGER,
  prime_anual_pendente BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_plano TEXT;
  v_pontos_compra INTEGER;
  v_pontos_anual INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Buscar plano do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_user_id)), 'free') INTO v_plano;

  -- Buscar valores de pontos
  SELECT valor INTO v_pontos_compra FROM plano_config
    WHERE chave = CASE WHEN v_plano = 'prime' THEN 'indicacao_compra_prime' ELSE 'indicacao_compra_free' END;
  SELECT valor INTO v_pontos_anual FROM plano_config WHERE chave = 'indicacao_anual_indicador';

  v_pontos_compra := COALESCE(v_pontos_compra, CASE WHEN v_plano = 'prime' THEN 5000 ELSE 3000 END);
  v_pontos_anual := COALESCE(v_pontos_anual, 3000);

  RETURN QUERY
  SELECT
    r.id as referral_id,
    r.referred_id,
    p.name as referred_name,
    p.email as referred_email,
    TRUE as cadastrou,
    -- Primeira emissão aprovada
    EXISTS(
      SELECT 1 FROM emissoes e
      WHERE e.user_id = r.referred_id
      AND e.status = 'approved'
      AND e.origem = 'equipe'
      LIMIT 1
    ) as primeira_emissao,
    -- Pontos ganhos na emissão (verificar histórico)
    COALESCE((
      SELECT SUM(ph.pontos)::INTEGER
      FROM points_history ph
      WHERE ph.user_id = v_user_id
      AND ph.tipo = 'referral'
      AND ph.descricao ILIKE '%primeira emissão%' || p.name || '%'
    ), 0) as emissao_pontos,
    -- Prime Anual
    EXISTS(
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = r.referred_id
      AND s.plano = 'prime'
      AND s.ciclo = 'anual'
      AND s.status = 'active'
    ) as prime_anual,
    -- Pontos do Prime Anual
    COALESCE((
      SELECT SUM(ph.pontos)::INTEGER
      FROM points_history ph
      WHERE ph.user_id = v_user_id
      AND ph.tipo = 'referral'
      AND ph.descricao ILIKE '%Prime Anual%' || p.name || '%'
    ), 0) as prime_anual_pontos,
    -- Pendente (7 dias)
    EXISTS(
      SELECT 1 FROM pending_points pp
      WHERE pp.user_id = v_user_id
      AND pp.status = 'pendente'
      AND pp.motivo ILIKE '%' || p.name || '%'
    ) as prime_anual_pendente
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referrer_id = v_user_id
  AND r.status IN ('active', 'approved', 'pending')
  ORDER BY r.created_at DESC;
END;
$$;

-- ============================================
-- 4. FUNÇÃO: Registrar ganho perdido (atualizada)
-- Agora só para compra e prime_anual
-- ============================================

CREATE OR REPLACE FUNCTION registrar_ganho_perdido(
  p_indicador_id UUID,
  p_indicado_id UUID,
  p_tipo TEXT, -- 'compra' ou 'prime_anual'
  p_pontos_ganhos INTEGER,
  p_pontos_perdidos INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_indicado_nome TEXT;
  v_mensagem TEXT;
BEGIN
  -- Só registra se indicador é Free
  IF (SELECT plano FROM plano_efetivo(p_indicador_id)) = 'prime' THEN
    RETURN;
  END IF;

  -- Buscar nome do indicado
  SELECT name INTO v_indicado_nome FROM profiles WHERE id = p_indicado_id;
  v_indicado_nome := COALESCE(v_indicado_nome, 'Seu amigo');

  -- Criar mensagem baseada no tipo
  IF p_tipo = 'compra' THEN
    v_mensagem := format(
      'Na compra de %s você ganhou +%s pts. No Prime, teria ganho +%s pts — +%s pts a mais!',
      v_indicado_nome,
      to_char(p_pontos_ganhos, 'FM9,999'),
      to_char(p_pontos_ganhos + p_pontos_perdidos, 'FM9,999'),
      to_char(p_pontos_perdidos, 'FM9,999')
    );
  ELSIF p_tipo = 'prime_anual' THEN
    v_mensagem := format(
      '%s assinou Prime Anual. No Prime, você teria ganho +%s pts!',
      v_indicado_nome,
      to_char(p_pontos_perdidos, 'FM9,999')
    );
  ELSE
    RETURN;
  END IF;

  -- Inserir na tabela (criar se não existir)
  INSERT INTO missed_earnings (user_id, referral_id, tipo, pontos_perdidos, mensagem)
  SELECT
    p_indicador_id,
    r.id,
    p_tipo,
    p_pontos_perdidos,
    v_mensagem
  FROM referrals r
  WHERE r.referrer_id = p_indicador_id AND r.referred_id = p_indicado_id
  LIMIT 1;

EXCEPTION WHEN OTHERS THEN
  -- Ignora erros silenciosamente
  NULL;
END;
$$;

-- ============================================
-- 5. ATUALIZAR aprovar_emissao - Com ganhos perdidos
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_emissao_com_pontos(
  p_emissao_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emissao RECORD;
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos_indicador INTEGER;
  v_pontos_free INTEGER;
  v_pontos_prime INTEGER;
BEGIN
  -- Buscar emissão
  SELECT * INTO v_emissao FROM emissoes WHERE id = p_emissao_id;

  IF v_emissao.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  -- Verificar se é primeira emissão do usuário
  IF EXISTS(
    SELECT 1 FROM emissoes
    WHERE user_id = v_emissao.user_id
    AND id != p_emissao_id
    AND status = 'approved'
    AND origem = 'equipe'
  ) THEN
    -- Não é primeira emissão, apenas aprovar
    UPDATE emissoes SET status = 'approved', approved_at = NOW(), approved_by = auth.uid()
    WHERE id = p_emissao_id;

    RETURN jsonb_build_object('success', true, 'message', 'Emissão aprovada (não é primeira)');
  END IF;

  -- É primeira emissão - verificar indicação
  SELECT r.*, p.name as indicador_nome
  INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referrer_id
  WHERE r.referred_id = v_emissao.user_id
  LIMIT 1;

  -- Buscar valores de pontos
  SELECT valor INTO v_pontos_free FROM plano_config WHERE chave = 'indicacao_compra_free';
  SELECT valor INTO v_pontos_prime FROM plano_config WHERE chave = 'indicacao_compra_prime';
  v_pontos_free := COALESCE(v_pontos_free, 3000);
  v_pontos_prime := COALESCE(v_pontos_prime, 5000);

  -- Aprovar emissão
  UPDATE emissoes SET status = 'approved', approved_at = NOW(), approved_by = auth.uid()
  WHERE id = p_emissao_id;

  -- Se tem indicação, creditar pontos
  IF v_referral.id IS NOT NULL THEN
    -- Buscar plano do indicador no momento da aprovação
    SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free') INTO v_indicador_plano;

    IF v_indicador_plano = 'prime' THEN
      v_pontos_indicador := v_pontos_prime;
    ELSE
      v_pontos_indicador := v_pontos_free;
      -- Registrar ganho perdido para Free
      PERFORM registrar_ganho_perdido(
        v_referral.referrer_id,
        v_emissao.user_id,
        'compra',
        v_pontos_free,
        v_pontos_prime - v_pontos_free
      );
    END IF;

    -- Creditar pontos ao indicador
    PERFORM creditar_pontos_central(
      v_referral.referrer_id,
      v_pontos_indicador,
      'referral',
      'Primeira emissão de ' || (SELECT name FROM profiles WHERE id = v_emissao.user_id)
    );

    -- Marcar indicação como processada
    UPDATE referrals SET
      primeira_emissao_aprovada = TRUE,
      primeira_emissao_em = NOW()
    WHERE id = v_referral.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Emissão aprovada com bônus de indicação',
      'indicador_plano', v_indicador_plano,
      'pontos_indicador', v_pontos_indicador
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Emissão aprovada');
END;
$$;

-- ============================================
-- 6. CRIAR TABELA missed_earnings SE NÃO EXISTIR
-- ============================================

CREATE TABLE IF NOT EXISTS missed_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  referral_id UUID REFERENCES referrals(id),
  tipo TEXT NOT NULL, -- 'compra', 'prime_anual'
  pontos_perdidos INTEGER NOT NULL,
  mensagem TEXT NOT NULL,
  visualizado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missed_earnings_user ON missed_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_missed_earnings_visualizado ON missed_earnings(user_id, visualizado);

-- RLS
ALTER TABLE missed_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "missed_earnings_read_own" ON missed_earnings;
CREATE POLICY "missed_earnings_read_own" ON missed_earnings
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "missed_earnings_admin" ON missed_earnings;
CREATE POLICY "missed_earnings_admin" ON missed_earnings
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- ============================================
-- 7. FUNÇÕES DE CONSULTA DE GANHOS PERDIDOS
-- ============================================

CREATE OR REPLACE FUNCTION get_missed_earnings()
RETURNS TABLE (
  id UUID,
  tipo TEXT,
  pontos_perdidos INTEGER,
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
    me.tipo,
    me.pontos_perdidos,
    me.mensagem,
    me.visualizado,
    me.created_at
  FROM missed_earnings me
  WHERE me.user_id = auth.uid()
  ORDER BY me.created_at DESC
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION get_total_missed_earnings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(pontos_perdidos)::INTEGER
    FROM missed_earnings
    WHERE user_id = auth.uid()
  ), 0);
END;
$$;

CREATE OR REPLACE FUNCTION mark_missed_earnings_viewed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE missed_earnings
  SET visualizado = TRUE
  WHERE user_id = auth.uid()
  AND visualizado = FALSE;
END;
$$;

-- ============================================
-- 8. ATUALIZAR AÇÃO PRIME ANUAL - Com ganhos perdidos
-- ============================================

CREATE OR REPLACE FUNCTION admin_confirmar_prime_anual(p_subscription_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos_indicador INTEGER;
  v_pontos_indicado INTEGER;
  v_dias_bloqueio INTEGER;
  v_liberar_em TIMESTAMPTZ;
BEGIN
  -- Buscar assinatura
  SELECT * INTO v_sub FROM subscriptions WHERE id = p_subscription_id;

  IF v_sub.id IS NULL OR v_sub.ciclo != 'anual' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura anual não encontrada');
  END IF;

  -- Buscar indicação
  SELECT r.*, p.name as indicador_nome
  INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referrer_id
  WHERE r.referred_id = v_sub.user_id
  LIMIT 1;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Sem indicador');
  END IF;

  -- Verificar plano do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free') INTO v_indicador_plano;

  IF v_indicador_plano != 'prime' THEN
    -- Indicador é Free - registrar ganho perdido
    SELECT valor INTO v_pontos_indicador FROM plano_config WHERE chave = 'indicacao_anual_indicador';
    v_pontos_indicador := COALESCE(v_pontos_indicador, 3000);

    PERFORM registrar_ganho_perdido(
      v_referral.referrer_id,
      v_sub.user_id,
      'prime_anual',
      0,
      v_pontos_indicador
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Indicador Free - sem bônus, ganho perdido registrado'
    );
  END IF;

  -- Indicador é Prime - creditar pontos bloqueados
  SELECT valor INTO v_pontos_indicador FROM plano_config WHERE chave = 'indicacao_anual_indicador';
  SELECT valor INTO v_pontos_indicado FROM plano_config WHERE chave = 'indicacao_anual_indicado';
  SELECT valor INTO v_dias_bloqueio FROM plano_config WHERE chave = 'dias_bloqueio';

  v_pontos_indicador := COALESCE(v_pontos_indicador, 3000);
  v_pontos_indicado := COALESCE(v_pontos_indicado, 1000);
  v_dias_bloqueio := COALESCE(v_dias_bloqueio, 7);
  v_liberar_em := NOW() + (v_dias_bloqueio || ' days')::INTERVAL;

  -- Criar pontos pendentes para indicador
  INSERT INTO pending_points (user_id, subscription_id, pontos, motivo, liberar_em)
  VALUES (
    v_referral.referrer_id,
    p_subscription_id,
    v_pontos_indicador,
    'Bônus indicação Prime Anual de ' || (SELECT name FROM profiles WHERE id = v_sub.user_id),
    v_liberar_em
  );

  -- Criar pontos pendentes para indicado
  INSERT INTO pending_points (user_id, subscription_id, pontos, motivo, liberar_em)
  VALUES (
    v_sub.user_id,
    p_subscription_id,
    v_pontos_indicado,
    'Bônus de indicado ao assinar Prime Anual',
    v_liberar_em
  );

  -- Marcar indicação como processada
  UPDATE referrals SET
    prime_anual_confirmado = TRUE,
    prime_anual_em = NOW()
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'indicador_pontos', v_pontos_indicador,
    'indicado_pontos', v_pontos_indicado,
    'liberar_em', v_liberar_em
  );
END;
$$;
