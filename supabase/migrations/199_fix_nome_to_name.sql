-- Migration: 199_fix_nome_to_name.sql
-- Corrige funções que usam p.nome (não existe) para p.name (correto)
-- A tabela profiles usa 'name', não 'nome'
-- Me,up Club

-- ============================================
-- FIX: validar_convite - usa p.name em vez de p.nome
-- ============================================
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
  -- Busca o convite (CORRIGIDO: p.name em vez de p.nome)
  SELECT c.*, p.name as fundador_nome
  INTO v_convite
  FROM convites c
  JOIN profiles p ON p.id = c.fundador_id
  WHERE c.codigo = UPPER(p_codigo);

  -- Convite não existe
  IF v_convite IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Código de convite inválido'::TEXT,
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
      'Este convite já foi utilizado'::TEXT,
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
      ('Este convite expirou em ' || to_char(v_convite.expira_em, 'DD/MM/YYYY'))::TEXT,
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
      'Este convite foi cancelado'::TEXT,
      v_convite.id,
      v_convite.fundador_nome,
      v_convite.fundador_id,
      v_convite.expira_em;
    RETURN;
  END IF;

  -- Convite válido!
  RETURN QUERY SELECT
    TRUE,
    ('Convite válido - você foi convidado por ' || v_convite.fundador_nome)::TEXT,
    v_convite.id,
    v_convite.fundador_nome,
    v_convite.fundador_id,
    v_convite.expira_em;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX: aceitar_convite - usa p.name em vez de p.nome
-- ============================================
CREATE OR REPLACE FUNCTION aceitar_convite(
  p_convite_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  sucesso BOOLEAN,
  mensagem TEXT,
  fundador_nome TEXT
) AS $$
DECLARE
  v_convite RECORD;
  v_janela_dias INTEGER;
BEGIN
  -- Busca o convite (CORRIGIDO: p.name em vez de p.nome)
  SELECT c.*, p.name as fundador_nome
  INTO v_convite
  FROM convites c
  JOIN profiles p ON p.id = c.fundador_id
  WHERE c.id = p_convite_id
  FOR UPDATE;

  -- Validações
  IF v_convite IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Convite não encontrado'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_convite.status = 'aceito' THEN
    RETURN QUERY SELECT FALSE, 'Este convite já foi utilizado'::TEXT, v_convite.fundador_nome;
    RETURN;
  END IF;

  IF v_convite.status = 'expirado' OR v_convite.expira_em < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Este convite expirou'::TEXT, v_convite.fundador_nome;
    RETURN;
  END IF;

  -- Busca janela de ativação Prime
  v_janela_dias := get_config_int('janela_prime_convidado_dias', 7);

  -- Atualiza o convite
  UPDATE convites SET
    status = 'aceito',
    aceito_por = p_user_id,
    aceito_em = NOW()
  WHERE id = p_convite_id;

  -- Atualiza o profile do usuário
  UPDATE profiles SET
    origem_cadastro = 'convite',
    convidado_por = v_convite.fundador_id,
    convite_id = p_convite_id,
    pode_ativar_prime_ate = NOW() + (v_janela_dias || ' days')::INTERVAL
  WHERE id = p_user_id;

  RETURN QUERY SELECT
    TRUE,
    ('Bem-vindo ao Me,up Club! Você foi convidado por ' || v_convite.fundador_nome)::TEXT,
    v_convite.fundador_nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX: verificar_elegibilidade_cpf - usa p.name em vez de p.nome
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
  v_nome TEXT;
  v_data DATE;
BEGIN
  -- Busca configuração de meses
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
      'Cliente encontrado na base histórica'::TEXT,
      'base_clientes'::TEXT,
      v_nome,
      v_data;
    RETURN;
  END IF;

  -- 2. Verifica nas emissões (CORRIGIDO: p.name em vez de p.nome)
  SELECT p.name, e.created_at::DATE
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
      ('Cliente com emissão nos últimos ' || v_meses_cliente || ' meses')::TEXT,
      'emissoes'::TEXT,
      v_nome,
      v_data;
    RETURN;
  END IF;

  -- 3. Não encontrado em nenhuma fonte
  RETURN QUERY SELECT
    FALSE,
    'CPF não encontrado na base de clientes'::TEXT,
    'nenhum'::TEXT,
    NULL::TEXT,
    NULL::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicar GRANTs após recriar funções
GRANT EXECUTE ON FUNCTION validar_convite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validar_convite(TEXT) TO authenticated;

COMMENT ON FUNCTION validar_convite IS 'Valida código de convite - CORRIGIDO: usa p.name';
COMMENT ON FUNCTION aceitar_convite IS 'Aceita convite - CORRIGIDO: usa p.name';
COMMENT ON FUNCTION verificar_elegibilidade_cpf IS 'Verifica elegibilidade por CPF - CORRIGIDO: usa p.name';
