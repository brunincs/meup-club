-- Migration: 194_aceitar_convite.sql
-- Funções para aceitar convite e ativar Prime como convidado
-- Me,up Club - Modelo Exclusivo

-- Função para aceitar convite (chamada após cadastro do usuário)
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
  -- Busca o convite
  SELECT c.*, p.nome as fundador_nome
  INTO v_convite
  FROM convites c
  JOIN profiles p ON p.id = c.fundador_id
  WHERE c.id = p_convite_id
  FOR UPDATE;

  -- Validações
  IF v_convite IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Convite não encontrado', NULL::TEXT;
    RETURN;
  END IF;

  IF v_convite.status = 'aceito' THEN
    RETURN QUERY SELECT FALSE, 'Este convite já foi utilizado', v_convite.fundador_nome;
    RETURN;
  END IF;

  IF v_convite.status = 'expirado' OR v_convite.expira_em < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Este convite expirou', v_convite.fundador_nome;
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
    'Bem-vindo ao Me,up Club! Você foi convidado por ' || v_convite.fundador_nome,
    v_convite.fundador_nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para convidado ativar Prime (após comprar passagem)
CREATE OR REPLACE FUNCTION convidado_ativar_prime(p_user_id UUID)
RETURNS TABLE (
  sucesso BOOLEAN,
  mensagem TEXT
) AS $$
DECLARE
  v_profile RECORD;
  v_preco INTEGER;
  v_pontos_indicador INTEGER;
  v_pontos_convidado INTEGER;
BEGIN
  -- Busca profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Validações
  IF v_profile IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Usuário não encontrado';
    RETURN;
  END IF;

  IF v_profile.origem_cadastro != 'convite' THEN
    RETURN QUERY SELECT FALSE, 'Apenas membros convidados podem usar esta função';
    RETURN;
  END IF;

  IF v_profile.plano = 'prime' THEN
    RETURN QUERY SELECT FALSE, 'Você já é membro Prime';
    RETURN;
  END IF;

  IF v_profile.pode_ativar_prime_ate IS NULL OR v_profile.pode_ativar_prime_ate < NOW() THEN
    RETURN QUERY SELECT FALSE, 'O prazo para ativação Prime expirou';
    RETURN;
  END IF;

  -- Verifica se tem emissão (é cliente)
  IF NOT EXISTS (
    SELECT 1 FROM emissoes
    WHERE user_id = p_user_id
      AND status IN ('emitido', 'concluido', 'completed')
  ) THEN
    RETURN QUERY SELECT FALSE, 'Você precisa ter pelo menos uma passagem emitida para ativar o Prime';
    RETURN;
  END IF;

  -- Busca configs
  v_preco := get_config_int('preco_prime_fundador', 597);
  v_pontos_indicador := get_config_int('pontos_indicador_convite', 3000);
  v_pontos_convidado := get_config_int('pontos_convidado_boas_vindas', 1000);

  -- Ativa Prime para o convidado (sem número de fundador, sem selo)
  UPDATE profiles SET
    plano = 'prime',
    prime_via_convite = TRUE,
    prime_ativado_em = NOW()
  WHERE id = p_user_id;

  -- Credita pontos bloqueados para o fundador que convidou
  IF v_profile.convidado_por IS NOT NULL THEN
    INSERT INTO point_transactions (
      user_id,
      amount,
      type,
      description,
      is_blocked,
      blocked_until,
      reference_id,
      reference_type
    ) VALUES (
      v_profile.convidado_por,
      v_pontos_indicador,
      'bonus_convite',
      'Bônus por convidado ativar Prime',
      TRUE,
      NOW() + INTERVAL '90 days',
      p_user_id,
      'convite_prime'
    );

    -- Marca pontos como creditados no convite
    UPDATE convites SET
      pontos_indicador_creditados = TRUE
    WHERE id = v_profile.convite_id;
  END IF;

  -- Credita pontos de boas-vindas para o convidado
  INSERT INTO point_transactions (
    user_id,
    amount,
    type,
    description,
    is_blocked,
    reference_type
  ) VALUES (
    p_user_id,
    v_pontos_convidado,
    'bonus_boas_vindas',
    'Bônus de boas-vindas - Prime via convite',
    FALSE,
    'ativacao_prime_convite'
  );

  -- Atualiza pontos do convidado
  UPDATE profiles SET
    total_points = COALESCE(total_points, 0) + v_pontos_convidado,
    available_points = COALESCE(available_points, 0) + v_pontos_convidado
  WHERE id = p_user_id;

  -- Marca pontos como creditados
  UPDATE convites SET
    pontos_convidado_creditados = TRUE
  WHERE id = v_profile.convite_id;

  RETURN QUERY SELECT
    TRUE,
    'Parabéns! Seu plano Prime foi ativado com ' || v_pontos_convidado || ' pontos de boas-vindas!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se convidado pode ativar Prime
CREATE OR REPLACE FUNCTION verificar_ativacao_prime_convidado(p_user_id UUID)
RETURNS TABLE (
  pode_ativar BOOLEAN,
  motivo TEXT,
  preco INTEGER,
  dias_restantes INTEGER,
  tem_emissao BOOLEAN
) AS $$
DECLARE
  v_profile RECORD;
  v_preco INTEGER;
  v_dias INTEGER;
  v_tem_emissao BOOLEAN;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  v_preco := get_config_int('preco_prime_fundador', 597);

  -- Verifica se tem emissão
  SELECT EXISTS (
    SELECT 1 FROM emissoes
    WHERE user_id = p_user_id
      AND status IN ('emitido', 'concluido', 'completed')
  ) INTO v_tem_emissao;

  -- Não é convidado
  IF v_profile.origem_cadastro != 'convite' THEN
    RETURN QUERY SELECT FALSE, 'Não é membro via convite', v_preco, 0, v_tem_emissao;
    RETURN;
  END IF;

  -- Já é Prime
  IF v_profile.plano = 'prime' THEN
    RETURN QUERY SELECT FALSE, 'Já é membro Prime', v_preco, 0, v_tem_emissao;
    RETURN;
  END IF;

  -- Prazo expirou
  IF v_profile.pode_ativar_prime_ate IS NULL OR v_profile.pode_ativar_prime_ate < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Prazo expirado', v_preco, 0, v_tem_emissao;
    RETURN;
  END IF;

  -- Calcula dias restantes
  v_dias := GREATEST(0, EXTRACT(DAY FROM v_profile.pode_ativar_prime_ate - NOW())::INTEGER);

  -- Pode ativar (mesmo sem emissão, retorna TRUE mas indica que falta emissão)
  IF NOT v_tem_emissao THEN
    RETURN QUERY SELECT TRUE, 'Falta emitir passagem', v_preco, v_dias, v_tem_emissao;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'Pronto para ativar', v_preco, v_dias, v_tem_emissao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION aceitar_convite IS 'Aceita convite de fundador e configura profile do convidado';
COMMENT ON FUNCTION convidado_ativar_prime IS 'Ativa Prime para convidado após comprar passagem';
COMMENT ON FUNCTION verificar_ativacao_prime_convidado IS 'Verifica se convidado pode ativar Prime';
