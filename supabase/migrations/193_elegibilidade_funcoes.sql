-- Migration: 193_elegibilidade_funcoes.sql
-- Funções de verificação de elegibilidade
-- Me,up Club - Modelo Exclusivo

-- Função principal: verificar elegibilidade por CPF hash
CREATE OR REPLACE FUNCTION verificar_elegibilidade_cpf(p_cpf_hash TEXT)
RETURNS TABLE (
  elegivel BOOLEAN,
  motivo TEXT,
  fonte TEXT, -- 'base_clientes' | 'emissoes' | 'nenhum'
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
  -- Busca configuração de meses
  SELECT COALESCE(get_config_int('meses_cliente', 15), 15) INTO v_meses_cliente;
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

-- Função para validar código de convite
CREATE OR REPLACE FUNCTION validar_convite(p_codigo TEXT)
RETURNS TABLE (
  valido BOOLEAN,
  motivo TEXT,
  convite_id UUID,
  fundador_nome TEXT,
  fundador_id UUID,
  expira_em TIMESTAMPTZ
) AS $$
DECLARE
  v_convite RECORD;
BEGIN
  -- Busca o convite
  SELECT c.*, p.nome as fundador_nome
  INTO v_convite
  FROM convites c
  JOIN profiles p ON p.id = c.fundador_id
  WHERE c.codigo = UPPER(p_codigo);

  -- Convite não existe
  IF v_convite IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Código de convite inválido',
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Convite já foi aceito
  IF v_convite.status = 'aceito' THEN
    RETURN QUERY SELECT
      FALSE,
      'Este convite já foi utilizado',
      v_convite.id,
      v_convite.fundador_nome,
      v_convite.fundador_id,
      v_convite.expira_em;
    RETURN;
  END IF;

  -- Convite expirado
  IF v_convite.expira_em < NOW() THEN
    -- Atualiza status para expirado
    UPDATE convites SET status = 'expirado' WHERE id = v_convite.id;

    RETURN QUERY SELECT
      FALSE,
      'Este convite expirou em ' || to_char(v_convite.expira_em, 'DD/MM/YYYY'),
      v_convite.id,
      v_convite.fundador_nome,
      v_convite.fundador_id,
      v_convite.expira_em;
    RETURN;
  END IF;

  -- Convite cancelado
  IF v_convite.status = 'cancelado' THEN
    RETURN QUERY SELECT
      FALSE,
      'Este convite foi cancelado',
      v_convite.id,
      v_convite.fundador_nome,
      v_convite.fundador_id,
      v_convite.expira_em;
    RETURN;
  END IF;

  -- Convite válido!
  RETURN QUERY SELECT
    TRUE,
    'Convite válido - você foi convidado por ' || v_convite.fundador_nome,
    v_convite.id,
    v_convite.fundador_nome,
    v_convite.fundador_id,
    v_convite.expira_em;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter status das vagas
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

COMMENT ON FUNCTION verificar_elegibilidade_cpf IS 'Verifica se CPF é elegível para cadastro no clube';
COMMENT ON FUNCTION validar_convite IS 'Valida código de convite de fundador';
COMMENT ON FUNCTION get_vagas_status IS 'Retorna status atual de vagas do clube';
