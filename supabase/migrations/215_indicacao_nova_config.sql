-- ============================================
-- MIGRAÇÃO 215: Nova configuração de indicação
-- Pontos de indicação, boas-vindas e multiplicador Free
-- ============================================

-- ============================================
-- 1. NOVOS VALORES EM plano_config (chave/valor)
-- ============================================

-- Pontos de indicação por plano (antes: 3000 free, 5000 prime)
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_indicacao_free', 2000, 'Pontos que Free ganha por indicação quando indicado viaja')
ON CONFLICT (chave) DO UPDATE SET valor = 2000, descricao = EXCLUDED.descricao;

INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_indicacao_prime', 5000, 'Pontos que Prime ganha por indicação quando indicado viaja')
ON CONFLICT (chave) DO UPDATE SET valor = 5000, descricao = EXCLUDED.descricao;

-- Boas-vindas Prime (antes: 2000, agora: 5000)
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_boas_vindas_prime', 5000, 'Pontos de boas-vindas ao ativar Prime (carência 7 dias)')
ON CONFLICT (chave) DO UPDATE SET valor = 5000, descricao = EXCLUDED.descricao;

-- Indicação só para novos clientes
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('indicacao_so_novos_clientes', 1, 'Se 1, indicação só vale se indicado não tinha compra anterior')
ON CONFLICT (chave) DO UPDATE SET valor = 1, descricao = EXCLUDED.descricao;

-- Pontos por real (Free: 0.5, Prime: 1.5)
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_por_real_free', 0.5, 'Pontos por R$1 para Free (era 1, agora 0.5)')
ON CONFLICT (chave) DO UPDATE SET valor = 0.5, descricao = EXCLUDED.descricao;

INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_por_real_prime', 1.5, 'Pontos por R$1 para Prime Anual')
ON CONFLICT (chave) DO UPDATE SET valor = 1.5, descricao = EXCLUDED.descricao;

-- Manter indicação virou Prime (já existe, confirmar valores)
INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_indicado_virou_prime_indicador', 3000, 'Pontos para indicador quando indicado vira Prime')
ON CONFLICT (chave) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO plano_config (chave, valor, descricao)
VALUES ('pontos_indicado_virou_prime_indicado', 1000, 'Pontos para indicado quando vira Prime')
ON CONFLICT (chave) DO UPDATE SET descricao = EXCLUDED.descricao;


-- ============================================
-- 2. FUNÇÃO: get_config_indicacao
-- Retorna configurações de indicação do plano_config
-- ============================================

CREATE OR REPLACE FUNCTION get_config_indicacao()
RETURNS TABLE (
  pontos_indicacao_free INTEGER,
  pontos_indicacao_prime INTEGER,
  pontos_boas_vindas_prime INTEGER,
  indicacao_so_novos_clientes BOOLEAN,
  pontos_por_real_free NUMERIC,
  pontos_por_real_prime NUMERIC,
  pontos_virou_prime_indicador INTEGER,
  pontos_virou_prime_indicado INTEGER,
  carencia_bonus_prime_dias INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicacao_free'), 2000)::INTEGER,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicacao_prime'), 5000)::INTEGER,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_boas_vindas_prime'), 5000)::INTEGER,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'indicacao_so_novos_clientes'), 1)::INTEGER = 1,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_por_real_free'), 0.5)::NUMERIC,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_por_real_prime'), 1.5)::NUMERIC,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicado_virou_prime_indicador'), 3000)::INTEGER,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicado_virou_prime_indicado'), 1000)::INTEGER,
    COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7)::INTEGER;
END;
$$;

GRANT EXECUTE ON FUNCTION get_config_indicacao() TO authenticated, anon;


-- ============================================
-- 4. FUNÇÃO: get_pontos_indicacao_por_plano
-- Retorna pontos de indicação baseado no plano do indicador
-- ============================================

CREATE OR REPLACE FUNCTION get_pontos_indicacao_por_plano(p_referrer_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plano TEXT;
  v_pontos INTEGER;
BEGIN
  -- Buscar plano efetivo do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(p_referrer_id)), 'free')
  INTO v_plano;

  -- Buscar pontos conforme o plano
  IF v_plano = 'prime' THEN
    SELECT COALESCE(valor, 5000) INTO v_pontos
    FROM plano_config WHERE chave = 'pontos_indicacao_prime';
  ELSE
    SELECT COALESCE(valor, 2000) INTO v_pontos
    FROM plano_config WHERE chave = 'pontos_indicacao_free';
  END IF;

  RETURN COALESCE(v_pontos, 2000);
END;
$$;

GRANT EXECUTE ON FUNCTION get_pontos_indicacao_por_plano(UUID) TO authenticated;


-- ============================================
-- 5. ATUALIZAR admin_confirmar_prime_anual
-- Usar pontos_boas_vindas_prime = 5000
-- ============================================

CREATE OR REPLACE FUNCTION admin_confirmar_prime_anual(
  p_subscription_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_pontos_boas_vindas INTEGER;
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

  -- Buscar configurações
  v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
  v_pontos_boas_vindas := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_boas_vindas_prime'), 5000);
  v_liberar_em := NOW() + (v_dias_pendente || ' days')::INTERVAL;

  -- PONTOS DE BOAS-VINDAS para o assinante (BLOQUEADOS)
  PERFORM creditar_pontos_bloqueados(
    v_subscription.user_id,
    v_pontos_boas_vindas,
    'Bônus de boas-vindas Prime Anual',
    v_liberar_em,
    NULL,
    p_subscription_id
  );

  -- BUSCAR REFERRAL para bônus de indicação
  SELECT r.*, p.name as referred_name INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = v_subscription.user_id
  AND r.prime_anual_pontos_creditados = FALSE
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Bônus de boas-vindas creditado (bloqueado ' || v_dias_pendente || ' dias)',
      'pontos_boas_vindas', v_pontos_boas_vindas,
      'liberar_em', v_liberar_em
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Buscar valores de config
  v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicado_virou_prime_indicador'), 3000);
  v_pontos_indicado := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicado_virou_prime_indicado'), 1000);

  -- Se indicador é FREE, registrar ganho perdido
  IF v_indicador_plano = 'free' THEN
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
      'message', 'Bônus de boas-vindas creditado. Indicador é Free - bônus de indicação não creditado.',
      'pontos_boas_vindas', v_pontos_boas_vindas,
      'liberar_em', v_liberar_em,
      'indicador_plano', 'free'
    );
  END IF;

  -- Indicador é PRIME - criar pontos bloqueados
  PERFORM creditar_pontos_bloqueados(
    v_referral.referrer_id,
    v_pontos_indicador,
    'Indicação: ' || v_indicado_nome || ' virou Prime',
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  PERFORM creditar_pontos_bloqueados(
    v_referral.referred_id,
    v_pontos_indicado,
    'Bônus: você assinou o Prime Anual',
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  UPDATE referrals SET
    prime_anual_ativado = TRUE,
    prime_anual_ativado_em = NOW(),
    prime_anual_pontos_creditados = FALSE
  WHERE id = v_referral.id;

  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_referral.referrer_id,
    'referral_signup',
    'Seu amigo virou Prime!',
    v_indicado_nome || ' assinou o Prime Anual. +' || v_pontos_indicador || ' pts (liberam em ' || v_dias_pendente || ' dias).',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pontos bloqueados por ' || v_dias_pendente || ' dias',
    'liberar_em', v_liberar_em,
    'pontos_boas_vindas', v_pontos_boas_vindas,
    'pontos_indicador', v_pontos_indicador,
    'pontos_indicado', v_pontos_indicado
  );
END;
$$;


-- ============================================
-- 6. ATUALIZAR aprovar_emissao_unificada
-- Usar multiplicador do plano_config
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_emissao_unificada(
  p_emissao_id UUID,
  p_admin_id UUID,
  p_viagem_dados JSONB,
  p_voos JSONB,
  p_passageiros JSONB,
  p_skip_pontos BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emissao RECORD;
  v_is_admin BOOLEAN;
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
  v_multiplicador NUMERIC;
  v_plano TEXT;
  v_ciclo TEXT;
  v_viagem_id UUID;
  v_voo JSONB;
  v_voo_id UUID;
  v_passageiro JSONB;
  v_passageiro_id UUID;
  v_passageiro_voo JSONB;
  v_passageiro_map JSONB := '{}'::JSONB;
  v_referral_result JSONB;
  v_tem_trecho_valido BOOLEAN := FALSE;
  v_destino TEXT;
  v_proxima_exp RECORD;
  v_notif_msg TEXT;
BEGIN
  -- 1. VERIFICAR SE É ADMIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- 2. BUSCAR EMISSÃO COM LOCK
  SELECT * INTO v_emissao
  FROM emissoes
  WHERE id = p_emissao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  -- 3. VALIDAR STATUS
  IF v_emissao.status NOT IN ('pendente', 'aprovada') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta emissão não pode ser processada',
      'status_atual', v_emissao.status
    );
  END IF;

  IF v_emissao.status = 'aprovada' AND NOT p_skip_pontos THEN
    IF EXISTS (SELECT 1 FROM viagens WHERE emissao_id = p_emissao_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Esta emissão já possui viagem associada'
      );
    END IF;
  END IF;

  -- 4. VALIDAR TRECHOS
  IF p_voos IS NOT NULL AND jsonb_array_length(p_voos) > 0 THEN
    FOR v_voo IN SELECT * FROM jsonb_array_elements(p_voos)
    LOOP
      IF (
        (v_voo->>'origem_iata' IS NOT NULL AND v_voo->>'origem_iata' != '') OR
        (v_voo->>'origem_cidade' IS NOT NULL AND v_voo->>'origem_cidade' != '')
      ) AND (
        (v_voo->>'destino_iata' IS NOT NULL AND v_voo->>'destino_iata' != '') OR
        (v_voo->>'destino_cidade' IS NOT NULL AND v_voo->>'destino_cidade' != '')
      ) AND (
        v_voo->>'data_voo' IS NOT NULL AND v_voo->>'data_voo' != ''
      ) AND (
        v_voo->>'companhia' IS NOT NULL AND v_voo->>'companhia' != ''
      ) AND (
        v_voo->>'numero_voo' IS NOT NULL AND v_voo->>'numero_voo' != ''
      ) AND (
        v_voo->>'localizador' IS NOT NULL AND v_voo->>'localizador' != ''
      ) THEN
        v_tem_trecho_valido := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_tem_trecho_valido THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Preencha pelo menos 1 trecho completo (origem, destino, data, companhia, voo, localizador)'
    );
  END IF;

  -- 5. VALIDAR PASSAGEIROS
  IF p_passageiros IS NULL OR jsonb_array_length(p_passageiros) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe pelo menos 1 passageiro');
  END IF;

  -- 6. SE NÃO ESTÁ PULANDO PONTOS, CALCULAR E CREDITAR
  IF NOT p_skip_pontos THEN
    SELECT
      COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_emissao.user_id)), 'free'),
      COALESCE((SELECT ciclo::TEXT FROM plano_efetivo(v_emissao.user_id)), NULL)
    INTO v_plano, v_ciclo;

    -- Buscar multiplicador do config
    IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
      v_multiplicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_por_real_prime'), 1.5);
    ELSE
      v_multiplicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_por_real_free'), 0.5);
    END IF;

    v_pontos_base := FLOOR(v_emissao.valor);
    v_pontos_final := FLOOR(v_emissao.valor * v_multiplicador);

    -- USAR creditar_pontos_viagem
    PERFORM creditar_pontos_viagem(
      v_emissao.user_id,
      v_pontos_final,
      'Emissão aprovada: R$ ' || v_emissao.valor::TEXT ||
        CASE WHEN v_multiplicador > 1 THEN ' (Prime anual ' || v_multiplicador || 'x)' ELSE ' (Free ' || v_multiplicador || 'x)' END,
      p_emissao_id
    );

    -- Verificar e pagar indicação
    SELECT creditar_pontos_primeira_emissao_v2(p_emissao_id, v_emissao.user_id) INTO v_referral_result;

    -- Atualizar emissão
    UPDATE emissoes SET
      status = 'aprovada',
      pontos_creditados = v_pontos_final,
      multiplicador_aplicado = v_multiplicador,
      plano_na_aprovacao = v_plano,
      ciclo_na_aprovacao = v_ciclo,
      admin_id = p_admin_id,
      processed_at = NOW(),
      card_lido = TRUE
    WHERE id = p_emissao_id;
  ELSE
    UPDATE emissoes SET card_lido = TRUE WHERE id = p_emissao_id;
    v_pontos_final := v_emissao.pontos_creditados;
    v_multiplicador := COALESCE(v_emissao.multiplicador_aplicado, 1.0);
    v_plano := v_emissao.plano_na_aprovacao;
  END IF;

  v_destino := COALESCE(p_viagem_dados->>'destino', 'sua viagem');

  -- 7. CRIAR VIAGEM
  INSERT INTO viagens (
    user_id, emissao_id, titulo, origem, destino, data_ida, data_volta,
    emitido_em, status, dados_status, card_hash
  ) VALUES (
    v_emissao.user_id,
    p_emissao_id,
    COALESCE(
      p_viagem_dados->>'titulo',
      COALESCE(p_viagem_dados->>'origem', '') || ' → ' || COALESCE(p_viagem_dados->>'destino', '')
    ),
    p_viagem_dados->>'origem',
    p_viagem_dados->>'destino',
    NULLIF(p_viagem_dados->>'data_ida', '')::DATE,
    NULLIF(p_viagem_dados->>'data_volta', '')::DATE,
    NULLIF(p_viagem_dados->>'emitido_em', '')::DATE,
    'confirmada',
    'conferido',
    NULL
  )
  RETURNING id INTO v_viagem_id;

  -- 8. INSERIR PASSAGEIROS
  FOR v_passageiro IN SELECT * FROM jsonb_array_elements(COALESCE(p_passageiros, '[]'::JSONB))
  LOOP
    IF v_passageiro->>'nome' IS NOT NULL AND v_passageiro->>'nome' != '' THEN
      INSERT INTO viagem_passageiros (viagem_id, nome)
      VALUES (v_viagem_id, v_passageiro->>'nome')
      RETURNING id INTO v_passageiro_id;

      v_passageiro_map := v_passageiro_map || jsonb_build_object(
        UPPER(TRIM(v_passageiro->>'nome')),
        v_passageiro_id
      );
    END IF;
  END LOOP;

  -- 9. INSERIR VOOS
  FOR v_voo IN SELECT * FROM jsonb_array_elements(COALESCE(p_voos, '[]'::JSONB))
  LOOP
    INSERT INTO viagem_voos (
      viagem_id, sentido, ordem, localizador, companhia, numero_voo, classe_cabine,
      origem_iata, origem_aeroporto, origem_cidade,
      destino_iata, destino_aeroporto, destino_cidade,
      partida_em, chegada_em, partida_local, chegada_local,
      duracao, direto, escalas, data_voo
    ) VALUES (
      v_viagem_id,
      COALESCE(v_voo->>'sentido', 'trecho'),
      COALESCE((v_voo->>'ordem')::INTEGER, 1),
      v_voo->>'localizador',
      v_voo->>'companhia',
      v_voo->>'numero_voo',
      v_voo->>'classe_cabine',
      v_voo->>'origem_iata',
      v_voo->>'origem_aeroporto',
      v_voo->>'origem_cidade',
      v_voo->>'destino_iata',
      v_voo->>'destino_aeroporto',
      v_voo->>'destino_cidade',
      NULLIF(v_voo->>'partida_em', '')::TIMESTAMPTZ,
      NULLIF(v_voo->>'chegada_em', '')::TIMESTAMPTZ,
      v_voo->>'partida_local',
      v_voo->>'chegada_local',
      v_voo->>'duracao',
      COALESCE((v_voo->>'direto')::BOOLEAN, TRUE),
      COALESCE((v_voo->>'escalas')::INTEGER, 0),
      NULLIF(v_voo->>'data_voo', '')::DATE
    )
    RETURNING id INTO v_voo_id;

    FOR v_passageiro_voo IN SELECT * FROM jsonb_array_elements(COALESCE(v_voo->'passageiros', '[]'::JSONB))
    LOOP
      DECLARE
        v_pax_id UUID;
        v_pax_nome TEXT := UPPER(TRIM(v_passageiro_voo->>'nome'));
      BEGIN
        v_pax_id := (v_passageiro_map->>v_pax_nome)::UUID;

        IF v_pax_id IS NOT NULL THEN
          INSERT INTO viagem_voo_passageiros (voo_id, passageiro_id, eticket, bagagem, bagagem_despachada)
          VALUES (
            v_voo_id,
            v_pax_id,
            v_passageiro_voo->>'eticket',
            v_passageiro_voo->>'bagagem',
            COALESCE((v_passageiro_voo->>'bagagem_despachada')::BOOLEAN, FALSE)
          )
          ON CONFLICT (voo_id, passageiro_id) DO NOTHING;
        END IF;
      END;
    END LOOP;
  END LOOP;

  -- 10. NOTIFICAR CLIENTE
  IF NOT p_skip_pontos THEN
    SELECT * INTO v_proxima_exp FROM get_proxima_experiencia(v_emissao.user_id);

    v_notif_msg := 'Sua viagem para ' || v_destino || ' rendeu +' || v_pontos_final::TEXT || ' pontos!';

    IF v_multiplicador > 1 THEN
      v_notif_msg := v_notif_msg || ' (Prime ' || v_multiplicador || 'x)';
    END IF;

    IF v_proxima_exp.nome IS NOT NULL AND v_proxima_exp.pontos_faltam > 0 THEN
      v_notif_msg := v_notif_msg || ' Faltam ' || v_proxima_exp.pontos_faltam || ' pts para ' || v_proxima_exp.nome || '.';
    END IF;

    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_emissao.user_id,
      'emissao_aprovada',
      'Viagem aprovada!',
      v_notif_msg,
      FALSE
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'emissao_id', p_emissao_id,
    'viagem_id', v_viagem_id,
    'pontos', v_pontos_final,
    'multiplicador', v_multiplicador,
    'plano', v_plano,
    'referral_result', v_referral_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ============================================
-- 7. ATUALIZAR creditar_pontos_primeira_emissao_v2
-- Usar pontos_indicacao_free e pontos_indicacao_prime do config
-- ============================================

CREATE OR REPLACE FUNCTION creditar_pontos_primeira_emissao_v2(
  p_emissao_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_indicador_plano TEXT;
  v_pontos INTEGER;
  v_indicado_nome TEXT;
  v_so_novos_clientes BOOLEAN;
  v_ja_era_cliente BOOLEAN;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Verificar se já creditou para esta emissão
  IF EXISTS (
    SELECT 1 FROM referrals r
    WHERE r.referred_id = p_user_id
    AND r.emissao_primeira_id = p_emissao_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Já creditado para esta emissão');
  END IF;

  -- Buscar referral pendente ou cadastrado
  SELECT r.*, p.name as referred_name
  INTO v_referral
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referred_id = p_user_id
  AND r.status IN ('pending', 'cadastrado')
  AND r.emissao_primeira_creditada = FALSE
  FOR UPDATE;

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Sem indicação pendente');
  END IF;

  v_indicado_nome := v_referral.referred_name;

  -- Verificar se só vale para novos clientes
  v_so_novos_clientes := COALESCE((SELECT valor FROM plano_config WHERE chave = 'indicacao_so_novos_clientes'), 1) = 1;

  IF v_so_novos_clientes THEN
    -- Verificar se indicado já era cliente (base_clientes com compra ou emissão anterior)
    v_ja_era_cliente := EXISTS (
      SELECT 1 FROM base_clientes bc
      WHERE (bc.email = (SELECT email FROM profiles WHERE id = p_user_id)
         OR bc.cpf = (SELECT cpf FROM profiles WHERE id = p_user_id))
      AND bc.ultima_compra IS NOT NULL
    ) OR EXISTS (
      SELECT 1 FROM emissoes e
      WHERE e.user_id = p_user_id
      AND e.id != p_emissao_id
      AND e.status = 'aprovada'
    );

    IF v_ja_era_cliente THEN
      -- Marcar como não elegível
      UPDATE referrals SET
        status = 'nao_elegivel',
        motivo_rejeicao = 'Indicado já era cliente da Me,up antes do cadastro'
      WHERE id = v_referral.id;

      RETURN jsonb_build_object(
        'success', false,
        'reason', 'Indicado já era cliente',
        'referral_id', v_referral.id
      );
    END IF;
  END IF;

  -- Buscar plano do indicador
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Buscar pontos conforme plano
  IF v_indicador_plano = 'prime' THEN
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicacao_prime'), 5000);
  ELSE
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'pontos_indicacao_free'), 2000);
  END IF;

  -- Buscar saldo atual
  SELECT COALESCE(points, 0) INTO v_balance_before FROM profiles WHERE id = v_referral.referrer_id;
  v_balance_after := v_balance_before + v_pontos;

  -- Creditar pontos na hora (sem carência)
  INSERT INTO point_transactions (user_id, amount, type, reason, reference_id, balance_before, balance_after)
  VALUES (v_referral.referrer_id, v_pontos, 'referral', 'Indicação: ' || v_indicado_nome || ' viajou', v_referral.id, v_balance_before, v_balance_after);

  UPDATE profiles SET
    points = v_balance_after,
    updated_at = NOW()
  WHERE id = v_referral.referrer_id;

  -- Atualizar referral
  UPDATE referrals SET
    status = 'approved',
    points_awarded = v_pontos,
    emissao_primeira_id = p_emissao_id,
    emissao_primeira_creditada = TRUE,
    processed_at = NOW()
  WHERE id = v_referral.id;

  -- Notificar indicador
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_referral.referrer_id,
    'referral_approved',
    v_indicado_nome || ' viajou!',
    v_indicado_nome || ' comprou a primeira viagem com a Me,up. Você ganhou +' || v_pontos || ' pts!',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral.id,
    'pontos', v_pontos,
    'indicador_plano', v_indicador_plano
  );
END;
$$;


-- ============================================
-- 8. ADICIONAR COLUNAS NA REFERRALS SE NÃO EXISTEM
-- ============================================

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS emissao_primeira_id UUID REFERENCES emissoes(id);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS emissao_primeira_creditada BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;


-- ============================================
-- 9. GERAR referral_code PARA QUEM NÃO TEM
-- ============================================

DO $$
DECLARE
  v_profile RECORD;
  v_new_code TEXT;
BEGIN
  FOR v_profile IN
    SELECT id, name FROM profiles
    WHERE referral_code IS NULL
    AND status_acesso = 'aprovado'
  LOOP
    -- Gerar código único
    v_new_code := 'MEUP' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 4));

    -- Garantir unicidade
    WHILE EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_new_code) LOOP
      v_new_code := 'MEUP' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 4));
    END LOOP;

    UPDATE profiles SET referral_code = v_new_code WHERE id = v_profile.id;
    RAISE NOTICE 'Gerado código % para %', v_new_code, v_profile.name;
  END LOOP;
END $$;


-- ============================================
-- 10. LOG
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migração 215: Nova configuração de indicação';
  RAISE NOTICE '  - pontos_indicacao_free = 2000';
  RAISE NOTICE '  - pontos_indicacao_prime = 5000';
  RAISE NOTICE '  - pontos_boas_vindas_prime = 5000';
  RAISE NOTICE '  - pontos_por_real_free = 0.5';
  RAISE NOTICE '  - pontos_por_real_prime = 1.5';
  RAISE NOTICE '  - indicacao_so_novos_clientes = true';
END $$;
