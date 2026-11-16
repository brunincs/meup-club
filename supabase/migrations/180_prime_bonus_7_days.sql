-- ============================================
-- MIGRAÇÃO 180: Bônus do Prime ficam bloqueados 7 dias
-- Pontos de viagem e indicação de compra: na hora
-- Bônus Prime (boas-vindas e indicação virou Prime): 7 dias
-- ============================================

-- ============================================
-- 1. ADICIONAR CONFIGURAÇÃO DE CARÊNCIA DO PRIME
-- ============================================

INSERT INTO plano_config (chave, valor, descricao)
VALUES ('carencia_bonus_prime_dias', 7, 'Dias de carência para liberar bônus do Prime (boas-vindas e indicação virou Prime)')
ON CONFLICT (chave) DO UPDATE SET valor = 7, descricao = EXCLUDED.descricao;


-- ============================================
-- 2. FUNÇÃO: get_proxima_experiencia
-- Retorna a experiência mais próxima do usuário
-- ============================================

CREATE OR REPLACE FUNCTION get_proxima_experiencia(p_user_id UUID)
RETURNS TABLE (
  nome TEXT,
  pontos_faltam INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pontos_disponiveis INTEGER;
  v_level_id INTEGER;
BEGIN
  -- Buscar pontos disponíveis e nível do usuário
  SELECT
    COALESCE(p.points, 0) - COALESCE(p.pontos_bloqueados, 0),
    COALESCE(p.level_id, 1)
  INTO v_pontos_disponiveis, v_level_id
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Buscar experiência mais próxima que o usuário pode alcançar
  RETURN QUERY
  SELECT
    e.name::TEXT,
    (e.points_free - v_pontos_disponiveis)::INTEGER AS pontos_faltam
  FROM experiencias e
  WHERE e.ativa = TRUE
    AND e.classe_minima <= v_level_id
    AND e.points_free > v_pontos_disponiveis
  ORDER BY e.points_free ASC
  LIMIT 1;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_proxima_experiencia(UUID) TO authenticated;


-- ============================================
-- 3. ATUALIZAR aprovar_emissao_unificada
-- Notificação com "Faltam Y para [experiência]"
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

    IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
      v_multiplicador := 1.5;
    ELSE
      v_multiplicador := 1.0;
    END IF;

    v_pontos_base := FLOOR(v_emissao.valor);
    v_pontos_final := FLOOR(v_emissao.valor * v_multiplicador);

    -- USAR creditar_pontos_viagem (respeita carência configurada)
    PERFORM creditar_pontos_viagem(
      v_emissao.user_id,
      v_pontos_final,
      'Emissão aprovada: R$ ' || v_emissao.valor::TEXT ||
        CASE WHEN v_multiplicador > 1 THEN ' (Prime anual 1.5x)' ELSE '' END,
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

  -- Extrair destino para notificação
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

  -- 10. NOTIFICAR CLIENTE (com próxima experiência)
  IF NOT p_skip_pontos THEN
    -- Buscar próxima experiência
    SELECT * INTO v_proxima_exp FROM get_proxima_experiencia(v_emissao.user_id);

    -- Montar mensagem
    v_notif_msg := 'Sua viagem para ' || v_destino || ' rendeu +' || v_pontos_final::TEXT || ' pontos!';

    IF v_multiplicador > 1 THEN
      v_notif_msg := v_notif_msg || ' (Prime anual 1.5x)';
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
-- 4. REVERTER LIBERAÇÃO DE PENDING_POINTS DE BÔNUS PRIME
-- Os que são de boas-vindas ou indicação Prime devem continuar bloqueados
-- ============================================

DO $$
DECLARE
  v_pending RECORD;
  v_dias_prime INTEGER;
BEGIN
  -- Buscar carência do Prime
  SELECT COALESCE(valor, 7) INTO v_dias_prime
  FROM plano_config WHERE chave = 'carencia_bonus_prime_dias';

  -- Rebloquear os que são de bônus Prime e ainda não passaram 7 dias
  FOR v_pending IN
    SELECT pp.*, p.points as saldo_atual
    FROM pending_points pp
    JOIN profiles p ON p.id = pp.user_id
    WHERE pp.status = 'liberado'
    AND pp.liberado_em > NOW() - INTERVAL '1 hour'  -- Liberados agora
    AND (
      pp.motivo ILIKE '%boas-vindas%'
      OR pp.motivo ILIKE '%Prime Anual%'
      OR pp.motivo ILIKE '%virou Prime%'
      OR pp.motivo ILIKE '%assinou o Prime%'
    )
    AND pp.created_at > NOW() - (v_dias_prime || ' days')::INTERVAL
  LOOP
    -- Reverter para pendente
    UPDATE pending_points SET
      status = 'pendente',
      liberado_em = NULL,
      liberar_em = v_pending.created_at + (v_dias_prime || ' days')::INTERVAL
    WHERE id = v_pending.id;

    -- Se já foi creditado, bloquear novamente
    IF v_pending.creditado_no_saldo THEN
      UPDATE profiles SET
        pontos_bloqueados = COALESCE(pontos_bloqueados, 0) + v_pending.pontos
      WHERE id = v_pending.user_id;
    END IF;

    RAISE NOTICE 'Rebloqueado bônus Prime: % pts para user %', v_pending.pontos, v_pending.user_id;
  END LOOP;
END $$;


-- ============================================
-- 5. ATUALIZAR admin_confirmar_prime_anual
-- Usar carencia_bonus_prime_dias do config
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
  v_pontos_boas_vindas INTEGER := 2000;
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

  -- Usar carência do Prime (padrão 7 dias)
  v_dias_pendente := COALESCE((SELECT valor FROM plano_config WHERE chave = 'carencia_bonus_prime_dias'), 7);
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

  -- Se indicador é FREE, registrar ganho perdido
  IF v_indicador_plano = 'free' THEN
    v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicador_prime'), 3000);

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
  v_pontos_indicador := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicador_prime'), 3000);
  v_pontos_indicado := COALESCE((SELECT valor FROM plano_config WHERE chave = 'prime_anual_indicado'), 1000);

  -- Creditar indicador (bloqueado)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referrer_id,
    v_pontos_indicador,
    'Indicação: ' || v_indicado_nome || ' virou Prime',
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  -- Creditar indicado extra (bloqueado)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referred_id,
    v_pontos_indicado,
    'Bônus: você assinou o Prime Anual',
    v_liberar_em,
    v_referral.id,
    p_subscription_id
  );

  -- Marcar referral
  UPDATE referrals SET
    prime_anual_ativado = TRUE,
    prime_anual_ativado_em = NOW(),
    prime_anual_pontos_creditados = FALSE -- Ainda bloqueados
  WHERE id = v_referral.id;

  -- Notificar indicador
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
-- 6. COMENTÁRIOS E LOG
-- ============================================

COMMENT ON FUNCTION get_proxima_experiencia IS
'Retorna a experiência mais próxima que o usuário pode alcançar com seus pontos atuais.
Usado nas notificações de aprovação de emissão.';

DO $$
BEGIN
  RAISE NOTICE '✓ Migração 180: Bônus Prime com 7 dias de carência';
  RAISE NOTICE '  - carencia_bonus_prime_dias = 7';
  RAISE NOTICE '  - Boas-vindas Prime: 7 dias bloqueado';
  RAISE NOTICE '  - Indicação virou Prime: 7 dias bloqueado';
  RAISE NOTICE '  - Viagem e indicação de compra: na hora';
  RAISE NOTICE '  - Notificação com próxima experiência';
END $$;
