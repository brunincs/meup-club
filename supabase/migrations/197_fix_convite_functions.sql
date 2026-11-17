-- Migration: 197_fix_convite_functions.sql
-- Corrige funções de convites que usavam tabela/colunas erradas
-- Me,up Club - Modelo Exclusivo

-- ============================================
-- FIX 1: contar_convites_fundador
-- Estava usando plano_config.key/value (não existe)
-- Deve usar config_exclusivo.chave/valor ou get_config_exclusivo_int
-- ============================================
CREATE OR REPLACE FUNCTION contar_convites_fundador(p_fundador_id UUID)
RETURNS TABLE (
  total_emitidos INTEGER,
  enviados INTEGER,
  aceitos INTEGER,
  disponiveis INTEGER,
  expirados INTEGER
) AS $$
DECLARE
  v_max_convites INTEGER;
BEGIN
  -- Busca limite de convites da config usando a função helper correta
  v_max_convites := get_config_exclusivo_int('convites_por_fundador', 2);

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_emitidos,
    COUNT(*) FILTER (WHERE c.status = 'enviado')::INTEGER as enviados,
    COUNT(*) FILTER (WHERE c.status = 'aceito')::INTEGER as aceitos,
    (v_max_convites - COUNT(*)::INTEGER) as disponiveis,
    COUNT(*) FILTER (WHERE c.status = 'expirado')::INTEGER as expirados
  FROM convites c
  WHERE c.fundador_id = p_fundador_id
    AND c.status NOT IN ('cancelado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX 2: Criar alias get_config_int para compatibilidade
-- Algumas funções usam get_config_int que não existe
-- ============================================
CREATE OR REPLACE FUNCTION get_config_int(p_chave TEXT, p_default INTEGER DEFAULT 0)
RETURNS INTEGER AS $$
BEGIN
  -- Delega para a função correta
  RETURN get_config_exclusivo_int(p_chave, p_default);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FIX 3: verificar_elegibilidade_cpf (já usa get_config_int, agora funciona)
-- Recria para garantir que está correta
-- ============================================
CREATE OR REPLACE FUNCTION verificar_elegibilidade_cpf(p_cpf_hash TEXT)
RETURNS TABLE (
  elegivel BOOLEAN,
  motivo TEXT,
  fonte TEXT,
  nome_encontrado TEXT,
  ultima_atividade DATE
) AS $$
DECLARE
  v_meses_cliente INTEGER;
  v_data_corte DATE;
  v_encontrado_base BOOLEAN := FALSE;
  v_encontrado_emissao BOOLEAN := FALSE;
  v_nome TEXT;
  v_data DATE;
BEGIN
  -- Busca configuração de meses (agora usa alias que delega para config_exclusivo)
  v_meses_cliente := COALESCE(get_config_int('meses_cliente', 15), 15);
  v_data_corte := CURRENT_DATE - (v_meses_cliente || ' months')::INTERVAL;

  -- 1. Verifica na base de clientes importada
  SELECT bc.nome, bc.ultima_compra
  INTO v_nome, v_data
  FROM base_clientes bc
  WHERE bc.cpf_hash = p_cpf_hash
    AND bc.ativo = TRUE
    AND bc.ultima_compra >= v_data_corte
  LIMIT 1;

  IF v_nome IS NOT NULL THEN
    RETURN QUERY SELECT
      TRUE,
      'Cliente encontrado na base histórica',
      'base_clientes'::TEXT,
      v_nome,
      v_data;
    RETURN;
  END IF;

  -- 2. Verifica nas emissões (passagens emitidas)
  SELECT p.nome, e.created_at::DATE
  INTO v_nome, v_data
  FROM emissoes e
  JOIN profiles p ON p.id = e.user_id
  WHERE p.cpf_hash = p_cpf_hash
    AND e.created_at >= v_data_corte
    AND e.status IN ('emitido', 'concluido', 'completed')
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_nome IS NOT NULL THEN
    RETURN QUERY SELECT
      TRUE,
      'Cliente com emissão nos últimos ' || v_meses_cliente || ' meses',
      'emissoes'::TEXT,
      v_nome,
      v_data;
    RETURN;
  END IF;

  -- 3. Não encontrado em nenhuma fonte
  RETURN QUERY SELECT
    FALSE,
    'CPF não encontrado na base de clientes',
    'nenhum'::TEXT,
    NULL::TEXT,
    NULL::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX 4: get_vagas_status (já usa get_config_int, agora funciona)
-- ============================================
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
  -- Busca totais da config (agora usa alias correto)
  v_prime_total := get_config_int('vagas_prime_fundador', 30);
  v_free_total := get_config_int('vagas_free', 70);

  -- Conta Prime ocupadas (fundadores que pagaram)
  SELECT COUNT(*)::INTEGER INTO v_prime_ocupadas
  FROM profiles p
  WHERE p.is_fundador = TRUE
    AND p.fundador_numero IS NOT NULL;

  -- Conta Free ocupadas (membros não-prime, não via convite)
  SELECT COUNT(*)::INTEGER INTO v_free_ocupadas
  FROM profiles p
  WHERE p.plano = 'free'
    AND COALESCE(p.origem_cadastro, 'direto') = 'direto'
    AND p.is_fundador IS NOT TRUE;

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

COMMENT ON FUNCTION contar_convites_fundador IS 'Conta convites de um fundador - CORRIGIDO para usar config_exclusivo';
COMMENT ON FUNCTION get_config_int IS 'Alias para get_config_exclusivo_int - compatibilidade';
