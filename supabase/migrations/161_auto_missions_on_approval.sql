-- ============================================
-- MIGRAÇÃO 161: Automação de Missões na Aprovação de Emissão
--
-- 1. Missão "1ª viagem comprada" (200 pts) - automática na 1ª emissão
-- 2. Indicação automática na 1ª compra do indicado
-- 3. Missão "1ª indicação" (100 pts) do indicador - automática
-- 4. Notificações no sino
-- 5. Correção de dados passados
-- ============================================

-- ============================================
-- 1. GARANTIR QUE MISSÃO "1ª VIAGEM" EXISTE
-- ============================================
INSERT INTO tarefas (nome, descricao, pontos, tipo, icone, ativa, ordem, missao_tipo)
SELECT '1ª viagem comprada', 'Complete sua primeira compra de viagem com a Me,up', 200, 'unica', '✈️', TRUE, 60, 'primeira_viagem'
WHERE NOT EXISTS (
  SELECT 1 FROM tarefas WHERE missao_tipo = 'primeira_viagem'
);

-- Atualizar missão existente se não tiver missao_tipo
UPDATE tarefas SET missao_tipo = 'primeira_viagem'
WHERE (LOWER(nome) LIKE '%primeira%viagem%' OR LOWER(nome) LIKE '%1ª%viagem%')
  AND missao_tipo IS NULL;


-- ============================================
-- 2. FUNÇÃO: Completar missão automática com idempotência
-- ============================================
CREATE OR REPLACE FUNCTION completar_missao_automatica(
  p_user_id UUID,
  p_missao_tipo TEXT,
  p_pontos INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tarefa_id UUID;
  v_tarefa_nome TEXT;
  v_pontos INTEGER;
BEGIN
  -- Buscar tarefa pelo tipo
  SELECT id, nome, pontos INTO v_tarefa_id, v_tarefa_nome, v_pontos
  FROM tarefas
  WHERE missao_tipo = p_missao_tipo AND ativa = TRUE
  LIMIT 1;

  IF v_tarefa_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missão não encontrada: ' || p_missao_tipo);
  END IF;

  -- Usar pontos da tarefa se não especificado
  v_pontos := COALESCE(p_pontos, v_pontos);

  -- IDEMPOTÊNCIA: verificar se já foi completada
  IF EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = p_missao_tipo
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'message', 'Missão já completada anteriormente'
    );
  END IF;

  -- Creditar pontos
  PERFORM creditar_pontos_central(
    p_user_id,
    v_pontos,
    'mission',
    COALESCE(p_reason, 'Missão: ' || v_tarefa_nome)
  );

  -- Registrar conclusão
  INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, p_missao_tipo, v_pontos);

  -- Notificar usuário
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    p_user_id,
    'mission_completed',
    'Missão concluída!',
    v_tarefa_nome || ': +' || v_pontos || ' pontos',
    FALSE
  );

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'missao', v_tarefa_nome
  );
END;
$$;


-- ============================================
-- 3. FUNÇÃO: Verificar e creditar indicação na 1ª emissão
-- ============================================
CREATE OR REPLACE FUNCTION creditar_indicacao_primeira_emissao(
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
  v_indicador_nome TEXT;
  v_is_primeira_indicacao BOOLEAN;
  v_missao_result JSONB;
BEGIN
  -- LOCK para idempotência
  SELECT r.*,
         p_indicado.name as referred_name,
         p_indicador.name as referrer_name
  INTO v_referral
  FROM referrals r
  JOIN profiles p_indicado ON p_indicado.id = r.referred_id
  JOIN profiles p_indicador ON p_indicador.id = r.referrer_id
  WHERE r.referred_id = p_user_id
  FOR UPDATE;

  -- Sem indicação
  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Sem indicação ativa');
  END IF;

  -- IDEMPOTÊNCIA: já foi creditado
  IF v_referral.primeira_emissao_creditada THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_credited', true,
      'message', 'Indicação já creditada anteriormente'
    );
  END IF;

  v_indicado_nome := v_referral.referred_name;
  v_indicador_nome := v_referral.referrer_name;

  -- Verificar plano do INDICADOR
  SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_referral.referrer_id)), 'free')
  INTO v_indicador_plano;

  -- Pontos baseados no plano do indicador (Prime 5000, Free 3000)
  IF v_indicador_plano = 'prime' THEN
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_prime'), 5000);
  ELSE
    v_pontos := COALESCE((SELECT valor FROM plano_config WHERE chave = 'emissao_indicador_free'), 3000);
  END IF;

  -- Creditar indicador (com bloqueio de 7 dias)
  PERFORM creditar_pontos_bloqueados(
    v_referral.referrer_id,
    v_pontos,
    'Indicação: ' || v_indicado_nome || ' viajou!',
    NOW() + INTERVAL '7 days',
    NULL,
    NULL
  );

  -- Marcar indicação como creditada
  UPDATE referrals SET
    primeira_emissao_id = p_emissao_id,
    primeira_emissao_creditada = TRUE,
    primeira_emissao_em = NOW(),
    status = 'aprovada'
  WHERE id = v_referral.id;

  -- Notificar indicador
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_referral.referrer_id,
    'referral_approved',
    'Seu amigo viajou!',
    v_indicado_nome || ' fez a primeira viagem. +' || v_pontos || ' pontos (liberados em 7 dias)',
    FALSE
  );

  -- Verificar se é a primeira indicação convertida do indicador
  v_is_primeira_indicacao := NOT EXISTS (
    SELECT 1 FROM referrals
    WHERE referrer_id = v_referral.referrer_id
      AND primeira_emissao_creditada = TRUE
      AND id != v_referral.id
  );

  -- Se for a primeira indicação, completar missão "1ª indicação" (100 pts)
  IF v_is_primeira_indicacao THEN
    SELECT completar_missao_automatica(
      v_referral.referrer_id,
      'primeira_indicacao',
      100,
      'Missão: 1ª indicação convertida'
    ) INTO v_missao_result;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pontos', v_pontos,
    'plano_indicador', v_indicador_plano,
    'indicador_id', v_referral.referrer_id,
    'indicador_nome', v_indicador_nome,
    'primeira_indicacao', v_is_primeira_indicacao,
    'missao_result', v_missao_result
  );
END;
$$;


-- ============================================
-- 4. ATUALIZAR aprovar_emissao_unificada
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
  v_missao_result JSONB;
  v_tem_trecho_valido BOOLEAN := FALSE;
  v_is_primeira_emissao BOOLEAN;
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

  -- Se já está aprovada e não está pulando pontos, verificar se já tem viagem
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
      'error', 'Preencha pelo menos 1 trecho completo'
    );
  END IF;

  -- 5. VALIDAR PASSAGEIROS
  IF p_passageiros IS NULL OR jsonb_array_length(p_passageiros) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe pelo menos 1 passageiro');
  END IF;

  -- 6. SE NÃO ESTÁ PULANDO PONTOS
  IF NOT p_skip_pontos THEN
    -- Verificar se é a PRIMEIRA emissão aprovada deste usuário
    v_is_primeira_emissao := NOT EXISTS (
      SELECT 1 FROM emissoes
      WHERE user_id = v_emissao.user_id
        AND status = 'aprovada'
        AND id != p_emissao_id
    );

    -- Buscar plano efetivo
    SELECT
      COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_emissao.user_id)), 'free'),
      COALESCE((SELECT ciclo::TEXT FROM plano_efetivo(v_emissao.user_id)), NULL)
    INTO v_plano, v_ciclo;

    -- Calcular multiplicador
    IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
      v_multiplicador := 1.5;
    ELSE
      v_multiplicador := 1.0;
    END IF;

    v_pontos_base := FLOOR(v_emissao.valor);
    v_pontos_final := FLOOR(v_emissao.valor * v_multiplicador);

    -- Creditar pontos da emissão
    PERFORM creditar_pontos_central(
      v_emissao.user_id,
      v_pontos_final,
      'emissao',
      'Emissão aprovada: R$ ' || v_emissao.valor::TEXT ||
        CASE WHEN v_multiplicador > 1 THEN ' (Prime anual 1.5x)' ELSE '' END,
      'credit'
    );

    -- ======================================
    -- AUTOMAÇÃO 1: Missão "1ª viagem comprada"
    -- ======================================
    IF v_is_primeira_emissao THEN
      SELECT completar_missao_automatica(
        v_emissao.user_id,
        'primeira_viagem',
        200,
        'Missão: 1ª viagem comprada'
      ) INTO v_missao_result;
    END IF;

    -- ======================================
    -- AUTOMAÇÃO 2: Indicação + Missão do indicador
    -- ======================================
    IF v_is_primeira_emissao THEN
      SELECT creditar_indicacao_primeira_emissao(p_emissao_id, v_emissao.user_id)
      INTO v_referral_result;
    END IF;

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
    -- Apenas atualizar que card foi lido
    UPDATE emissoes SET card_lido = TRUE WHERE id = p_emissao_id;
    v_pontos_final := v_emissao.pontos_creditados;
    v_multiplicador := COALESCE(v_emissao.multiplicador_aplicado, 1.0);
    v_plano := v_emissao.plano_na_aprovacao;
  END IF;

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

    -- Inserir passageiros do voo
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
    INSERT INTO notifications (user_id, type, title, message, read)
    VALUES (
      v_emissao.user_id,
      'emissao_aprovada',
      'Viagem aprovada!',
      'Sua emissão de R$ ' || v_emissao.valor::TEXT || ' foi aprovada. +' ||
        v_pontos_final::TEXT || ' pontos creditados!' ||
        CASE WHEN v_multiplicador > 1 THEN ' (Prime anual 1.5x)' ELSE '' END,
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
    'primeira_emissao', COALESCE(v_is_primeira_emissao, FALSE),
    'missao_result', v_missao_result,
    'referral_result', v_referral_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION aprovar_emissao_unificada(UUID, UUID, JSONB, JSONB, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION aprovar_emissao_unificada(UUID, UUID, JSONB, JSONB, JSONB, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION completar_missao_automatica(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION creditar_indicacao_primeira_emissao(UUID, UUID) TO authenticated;


-- ============================================
-- 5. CORRIGIR DADOS PASSADOS
-- ============================================

-- 5.1 Missão "1ª viagem" para quem já tem emissão aprovada mas não tem a missão
DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Corrigindo missões de 1ª viagem pendentes...';

  FOR v_user IN
    SELECT DISTINCT e.user_id, p.name, MIN(e.created_at) as primeira_emissao_em
    FROM emissoes e
    JOIN profiles p ON p.id = e.user_id
    WHERE e.status = 'aprovada'
      AND NOT EXISTS (
        SELECT 1 FROM missoes_automaticas_concluidas mac
        WHERE mac.user_id = e.user_id AND mac.missao_tipo = 'primeira_viagem'
      )
    GROUP BY e.user_id, p.name
  LOOP
    -- Inserir missão concluída (sem creditar pontos de novo)
    INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos, created_at)
    VALUES (v_user.user_id, 'primeira_viagem', 200, v_user.primeira_emissao_em)
    ON CONFLICT DO NOTHING;

    v_count := v_count + 1;
    RAISE NOTICE 'Corrigido: % (user_id: %)', v_user.name, v_user.user_id;
  END LOOP;

  RAISE NOTICE 'Total de missões 1ª viagem corrigidas: %', v_count;
END $$;


-- 5.2 Indicações pendentes onde indicado já tem emissão aprovada
DO $$
DECLARE
  v_ref RECORD;
  v_indicador_plano TEXT;
  v_pontos INTEGER;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Corrigindo indicações pendentes...';

  FOR v_ref IN
    SELECT r.id, r.referrer_id, r.referred_id,
           p_indicado.name as indicado_nome,
           p_indicador.name as indicador_nome,
           e.id as emissao_id
    FROM referrals r
    JOIN profiles p_indicado ON p_indicado.id = r.referred_id
    JOIN profiles p_indicador ON p_indicador.id = r.referrer_id
    JOIN emissoes e ON e.user_id = r.referred_id AND e.status = 'aprovada'
    WHERE r.primeira_emissao_creditada = FALSE
    ORDER BY e.created_at
  LOOP
    -- Verificar plano do indicador
    SELECT COALESCE((SELECT plano::TEXT FROM plano_efetivo(v_ref.referrer_id)), 'free')
    INTO v_indicador_plano;

    IF v_indicador_plano = 'prime' THEN
      v_pontos := 5000;
    ELSE
      v_pontos := 3000;
    END IF;

    -- Verificar se já foi creditado (evitar duplicata)
    IF NOT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE user_id = v_ref.referrer_id
        AND type = 'referral'
        AND reason ILIKE '%' || v_ref.indicado_nome || '%'
    ) THEN
      -- Creditar indicador
      PERFORM creditar_pontos_bloqueados(
        v_ref.referrer_id,
        v_pontos,
        'Indicação: ' || v_ref.indicado_nome || ' viajou! (correção)',
        NOW() + INTERVAL '7 days',
        NULL,
        NULL
      );

      RAISE NOTICE 'Creditado: % recebeu % pts por indicar %',
        v_ref.indicador_nome, v_pontos, v_ref.indicado_nome;
    ELSE
      RAISE NOTICE 'Já creditado anteriormente: % por %', v_ref.indicador_nome, v_ref.indicado_nome;
    END IF;

    -- Marcar como creditado
    UPDATE referrals SET
      primeira_emissao_id = v_ref.emissao_id,
      primeira_emissao_creditada = TRUE,
      primeira_emissao_em = NOW(),
      status = 'aprovada'
    WHERE id = v_ref.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Total de indicações corrigidas: %', v_count;
END $$;


-- 5.3 Missão "1ª indicação" para quem já tem indicação aprovada mas não tem a missão
DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Corrigindo missões de 1ª indicação pendentes...';

  FOR v_user IN
    SELECT DISTINCT r.referrer_id, p.name, MIN(r.primeira_emissao_em) as primeira_indicacao_em
    FROM referrals r
    JOIN profiles p ON p.id = r.referrer_id
    WHERE r.primeira_emissao_creditada = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM missoes_automaticas_concluidas mac
        WHERE mac.user_id = r.referrer_id AND mac.missao_tipo = 'primeira_indicacao'
      )
    GROUP BY r.referrer_id, p.name
  LOOP
    -- Verificar se já foi creditado
    IF NOT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE user_id = v_user.referrer_id
        AND type = 'mission'
        AND reason ILIKE '%1ª indicação%'
    ) THEN
      -- Creditar pontos da missão
      PERFORM creditar_pontos_central(
        v_user.referrer_id,
        100,
        'mission',
        'Missão: 1ª indicação convertida (correção)'
      );
    END IF;

    -- Inserir missão concluída
    INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos, created_at)
    VALUES (v_user.referrer_id, 'primeira_indicacao', 100, COALESCE(v_user.primeira_indicacao_em, NOW()))
    ON CONFLICT DO NOTHING;

    v_count := v_count + 1;
    RAISE NOTICE 'Corrigido: % (user_id: %)', v_user.name, v_user.referrer_id;
  END LOOP;

  RAISE NOTICE 'Total de missões 1ª indicação corrigidas: %', v_count;
END $$;


-- ============================================
-- 6. FUNÇÃO: Estornar emissão (reverte tudo)
-- ============================================
CREATE OR REPLACE FUNCTION estornar_emissao(
  p_emissao_id UUID,
  p_admin_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emissao RECORD;
  v_is_admin BOOLEAN;
  v_referral RECORD;
  v_pontos_estornados INTEGER := 0;
BEGIN
  -- Verificar admin
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin')
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar emissão
  SELECT * INTO v_emissao FROM emissoes WHERE id = p_emissao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status != 'aprovada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não está aprovada');
  END IF;

  -- Verificar se era a primeira emissão (para estornar missão também)
  IF EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = v_emissao.user_id AND missao_tipo = 'primeira_viagem'
  ) AND NOT EXISTS (
    SELECT 1 FROM emissoes
    WHERE user_id = v_emissao.user_id AND status = 'aprovada' AND id != p_emissao_id
  ) THEN
    -- Estornar missão "1ª viagem"
    DELETE FROM missoes_automaticas_concluidas
    WHERE user_id = v_emissao.user_id AND missao_tipo = 'primeira_viagem';

    -- Debitar pontos da missão
    PERFORM creditar_pontos_central(
      v_emissao.user_id,
      -200,
      'mission_reversal',
      'Estorno: Missão 1ª viagem (emissão cancelada)'
    );

    v_pontos_estornados := v_pontos_estornados + 200;
  END IF;

  -- Verificar indicação
  SELECT * INTO v_referral FROM referrals
  WHERE referred_id = v_emissao.user_id
    AND primeira_emissao_id = p_emissao_id
  FOR UPDATE;

  IF v_referral.id IS NOT NULL THEN
    -- Estornar pontos do indicador
    PERFORM creditar_pontos_central(
      v_referral.referrer_id,
      -COALESCE(v_referral.pontos_creditados, 3000),
      'referral_reversal',
      'Estorno: Indicação cancelada (emissão estornada)'
    );

    -- Resetar indicação
    UPDATE referrals SET
      primeira_emissao_id = NULL,
      primeira_emissao_creditada = FALSE,
      primeira_emissao_em = NULL,
      status = 'pendente'
    WHERE id = v_referral.id;

    v_pontos_estornados := v_pontos_estornados + COALESCE(v_referral.pontos_creditados, 3000);
  END IF;

  -- Estornar pontos da emissão
  PERFORM creditar_pontos_central(
    v_emissao.user_id,
    -v_emissao.pontos_creditados,
    'emissao_reversal',
    'Estorno: Emissão cancelada' || COALESCE(' - ' || p_motivo, '')
  );

  v_pontos_estornados := v_pontos_estornados + v_emissao.pontos_creditados;

  -- Atualizar status da emissão
  UPDATE emissoes SET
    status = 'estornada',
    estornado_em = NOW(),
    estornado_por = p_admin_id,
    motivo_estorno = p_motivo
  WHERE id = p_emissao_id;

  -- Deletar viagem associada
  DELETE FROM viagens WHERE emissao_id = p_emissao_id;

  RETURN jsonb_build_object(
    'success', true,
    'pontos_estornados', v_pontos_estornados,
    'indicacao_estornada', v_referral.id IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION estornar_emissao(UUID, UUID, TEXT) TO authenticated;


-- ============================================
-- 7. ADICIONAR COLUNAS PARA ESTORNO SE NÃO EXISTEM
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissoes' AND column_name = 'estornado_em') THEN
    ALTER TABLE emissoes ADD COLUMN estornado_em TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissoes' AND column_name = 'estornado_por') THEN
    ALTER TABLE emissoes ADD COLUMN estornado_por UUID REFERENCES profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissoes' AND column_name = 'motivo_estorno') THEN
    ALTER TABLE emissoes ADD COLUMN motivo_estorno TEXT;
  END IF;

  -- Adicionar status 'estornada' se não existe no check
  -- (assumindo que o status é um text ou enum que aceita novos valores)
END $$;


-- ============================================
-- 8. COMENTÁRIOS
-- ============================================
COMMENT ON FUNCTION completar_missao_automatica IS
'Completa uma missão automática com idempotência.
Credita pontos, registra em missoes_automaticas_concluidas, e notifica usuário.';

COMMENT ON FUNCTION creditar_indicacao_primeira_emissao IS
'Credita indicação na primeira emissão do indicado.
Paga indicador (Prime 5000 / Free 3000 pts com bloqueio de 7 dias).
Completa missão "1ª indicação" do indicador se for a primeira.
Tudo automático, sem fila manual.';

COMMENT ON FUNCTION estornar_emissao IS
'Estorna emissão aprovada.
Reverte: pontos da emissão, missão 1ª viagem, indicação.
Deleta viagem associada.';
