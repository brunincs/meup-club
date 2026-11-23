-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 210: Corrigir referências a p.plano e adicionar tipo 'bonus'
-- ══════════════════════════════════════════════════════════════════════════════
-- Problemas corrigidos:
-- 1. get_vagas_status: p.plano não existe em profiles
-- 2. get_push_inscricoes_para_notificacao: p.plano não existe em profiles
-- 3. point_transactions: tipo 'bonus' não existia na constraint
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. ADICIONAR TIPO 'bonus' NA CONSTRAINT DE point_transactions
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_type_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'credit',
    'debit',
    'redemption',
    'referral',
    'task',
    'welcome_referral',
    'estorno',
    'referral_aprovada',
    'emissao_aprovada',
    'bonus',           -- NOVO: para bônus de boas-vindas, aniversário, etc.
    'adjustment',      -- ajustes manuais
    'birthday',        -- bônus aniversário
    'checkin'          -- check-in diário
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. CORRIGIR get_vagas_status - Usar subscriptions ao invés de profiles.plano
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_vagas_status()
RETURNS TABLE (
  vagas_prime_total INTEGER,
  vagas_prime_ocupadas INTEGER,
  vagas_prime_disponiveis INTEGER,
  vagas_free_total INTEGER,
  vagas_free_ocupadas INTEGER,
  vagas_free_disponiveis INTEGER,
  convites_total INTEGER,
  convites_emitidos INTEGER,
  convites_aceitos INTEGER
) AS $$
DECLARE
  v_prime_total INTEGER;
  v_free_total INTEGER;
  v_prime_ocupadas INTEGER;
  v_free_ocupadas INTEGER;
  v_convites_total INTEGER;
  v_convites_emitidos INTEGER;
  v_convites_aceitos INTEGER;
BEGIN
  -- Busca totais da config
  v_prime_total := get_config_int('vagas_prime_fundador', 30);
  v_free_total := get_config_int('vagas_free', 70);

  -- Conta Prime ocupadas (fundadores que pagaram)
  SELECT COUNT(*)::INTEGER INTO v_prime_ocupadas
  FROM profiles p
  WHERE p.is_fundador = TRUE
    AND p.fundador_numero IS NOT NULL;

  -- Conta Free ocupadas (membros aprovados sem subscription prime)
  -- Corrigido: Não usa p.plano que não existe em profiles
  SELECT COUNT(*)::INTEGER INTO v_free_ocupadas
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id
  WHERE p.status_acesso = 'aprovado'
    AND p.is_fundador IS NOT TRUE
    AND (s.id IS NULL OR s.plano = 'free' OR s.status != 'active');

  -- Convites (2 por fundador Prime)
  v_convites_total := v_prime_ocupadas * get_config_int('convites_por_fundador', 2);

  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE status = 'aceito')::INTEGER
  INTO v_convites_emitidos, v_convites_aceitos
  FROM convites
  WHERE status NOT IN ('cancelado');

  RETURN QUERY SELECT
    v_prime_total,
    v_prime_ocupadas,
    GREATEST(0, v_prime_total - v_prime_ocupadas),
    v_free_total,
    v_free_ocupadas,
    GREATEST(0, v_free_total - v_free_ocupadas),
    v_convites_total,
    v_convites_emitidos,
    v_convites_aceitos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. CORRIGIR get_push_inscricoes_para_notificacao
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_push_inscricoes_para_notificacao(
  p_tipo TEXT,
  p_destino TEXT DEFAULT 'todos'
)
RETURNS TABLE (
  id UUID,
  cliente_id UUID,
  endpoint TEXT,
  chaves JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.cliente_id,
    pi.endpoint,
    pi.chaves
  FROM push_inscricoes pi
  JOIN profiles p ON p.id = pi.cliente_id
  LEFT JOIN subscriptions s ON s.user_id = p.id
  WHERE pi.ativo = true
    -- Filter by notification type preference
    AND (
      (p_tipo = 'viagem' AND p.notif_viagens = true) OR
      (p_tipo = 'pontos' AND p.notif_pontos = true) OR
      (p_tipo = 'missao' AND p.notif_missoes = true) OR
      (p_tipo = 'novidade' AND p.notif_novidades = true) OR
      (p_tipo = 'manual') -- Manual notifications always go through
    )
    -- Filter by destination (corrigido: usa s.plano ao invés de p.plano)
    AND (
      p_destino = 'todos' OR
      (p_destino = 'prime' AND s.plano = 'prime' AND s.status = 'active') OR
      (p_destino = 'fundadores' AND p.is_fundador = true) OR
      (p_destino::UUID = pi.cliente_id) -- Specific user
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. CORRIGIR POLITICAS DE app_eventos para permitir insert sem autenticação
-- ══════════════════════════════════════════════════════════════════════════════

-- Permite inserir eventos mesmo sem estar logado (cliente_id pode ser NULL)
DROP POLICY IF EXISTS "cliente_insere_seus_eventos" ON app_eventos;
CREATE POLICY "permite_inserir_eventos" ON app_eventos
  FOR INSERT
  WITH CHECK (
    cliente_id IS NULL OR cliente_id = auth.uid()
  );

-- Permitir inserção anônima para eventos de PWA
DROP POLICY IF EXISTS "anon_insere_eventos" ON app_eventos;
CREATE POLICY "anon_insere_eventos" ON app_eventos
  FOR INSERT
  TO anon
  WITH CHECK (cliente_id IS NULL);

-- ══════════════════════════════════════════════════════════════════════════════
-- GARANTIR PERMISSÕES
-- ══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION get_vagas_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_vagas_status() TO anon;
GRANT EXECUTE ON FUNCTION get_push_inscricoes_para_notificacao(TEXT, TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- LOG
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 210: Referências a plano corrigidas';
  RAISE NOTICE '  - Tipo bonus adicionado a point_transactions';
  RAISE NOTICE '  - get_vagas_status: corrigido p.plano -> subscriptions';
  RAISE NOTICE '  - get_push_inscricoes_para_notificacao: corrigido p.plano -> s.plano';
  RAISE NOTICE '  - app_eventos: política de RLS ajustada';
END $$;
