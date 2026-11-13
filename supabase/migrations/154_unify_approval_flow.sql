-- ============================================
-- MIGRAÇÃO 154: Unificar Fluxo de Aprovação de Emissões
-- Garante que TODA emissão aprovada crie viagem em "Minhas Viagens"
-- com pontos creditados corretamente e indicação paga se houver
-- ============================================

-- ============================================
-- 1. FUNÇÃO UNIFICADA: aprovar_emissao_unificada
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_emissao_unificada(
  p_emissao_id UUID,
  p_admin_id UUID,
  p_viagem_dados JSONB,       -- {titulo, origem, destino, data_ida, data_volta}
  p_voos JSONB,               -- [{sentido, data_voo, localizador, companhia, numero_voo, ...}]
  p_passageiros JSONB,        -- [{nome}]
  p_skip_pontos BOOLEAN DEFAULT FALSE  -- TRUE para "Completar viagem" (sem creditar pontos)
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

  -- 4. VALIDAR TRECHOS (pelo menos 1 trecho completo)
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

    -- Creditar pontos
    PERFORM creditar_pontos_central(
      v_emissao.user_id,
      v_pontos_final,
      'emissao',
      'Emissão aprovada: R$ ' || v_emissao.valor::TEXT ||
        CASE WHEN v_multiplicador > 1 THEN ' (Prime anual 1.5x)' ELSE '' END,
      'credit'
    );

    -- Verificar e pagar indicação (se houver)
    SELECT creditar_pontos_primeira_emissao(p_emissao_id, v_emissao.user_id) INTO v_referral_result;

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
    UPDATE emissoes SET
      card_lido = TRUE
    WHERE id = p_emissao_id;

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

  -- 10. NOTIFICAR CLIENTE (se não pulou pontos)
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
    'referral_result', v_referral_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION aprovar_emissao_unificada(UUID, UUID, JSONB, JSONB, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION aprovar_emissao_unificada(UUID, UUID, JSONB, JSONB, JSONB, BOOLEAN) TO service_role;


-- ============================================
-- 2. FUNÇÃO: completar_viagem_emissao
-- Para emissões já aprovadas que não têm viagem
-- ============================================

CREATE OR REPLACE FUNCTION completar_viagem_emissao(
  p_emissao_id UUID,
  p_admin_id UUID,
  p_viagem_dados JSONB,
  p_voos JSONB,
  p_passageiros JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emissao RECORD;
  v_is_admin BOOLEAN;
BEGIN
  -- 1. Verificar admin
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- 2. Verificar emissão
  SELECT * INTO v_emissao FROM emissoes WHERE id = p_emissao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não encontrada');
  END IF;

  IF v_emissao.status != 'aprovada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emissão não está aprovada');
  END IF;

  -- 3. Verificar se já tem viagem
  IF EXISTS (SELECT 1 FROM viagens WHERE emissao_id = p_emissao_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta emissão já possui viagem');
  END IF;

  -- 4. Chamar função unificada com skip_pontos = TRUE
  RETURN aprovar_emissao_unificada(
    p_emissao_id,
    p_admin_id,
    p_viagem_dados,
    p_voos,
    p_passageiros,
    TRUE  -- Não creditar pontos (já foram creditados)
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION completar_viagem_emissao(UUID, UUID, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION completar_viagem_emissao(UUID, UUID, JSONB, JSONB, JSONB) TO service_role;


-- ============================================
-- 3. VIEW: emissoes_sem_viagem
-- Emissões aprovadas que não têm viagem associada
-- ============================================

CREATE OR REPLACE VIEW emissoes_sem_viagem AS
SELECT
  e.id,
  e.user_id,
  p.name as user_name,
  p.email as user_email,
  e.valor,
  e.pontos_creditados,
  e.data_emissao,
  e.card_url,
  e.card_path,
  e.card_meup_path,
  e.created_at,
  e.processed_at
FROM emissoes e
JOIN profiles p ON p.id = e.user_id
LEFT JOIN viagens v ON v.emissao_id = e.id
WHERE e.status = 'aprovada'
  AND v.id IS NULL
ORDER BY e.created_at DESC;

-- RLS para a view
GRANT SELECT ON emissoes_sem_viagem TO authenticated;


-- ============================================
-- 4. FUNÇÃO: get_emissoes_sem_viagem
-- RPC para buscar emissões aprovadas sem viagem
-- ============================================

CREATE OR REPLACE FUNCTION get_emissoes_sem_viagem()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  valor NUMERIC,
  pontos_creditados INTEGER,
  data_emissao DATE,
  card_url TEXT,
  card_path TEXT,
  card_meup_path TEXT,
  created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    p.name::TEXT as user_name,
    p.email::TEXT as user_email,
    e.valor,
    e.pontos_creditados,
    e.data_emissao,
    e.card_url,
    e.card_path,
    e.card_meup_path,
    e.created_at,
    e.processed_at
  FROM emissoes e
  JOIN profiles p ON p.id = e.user_id
  LEFT JOIN viagens v ON v.emissao_id = e.id
  WHERE e.status = 'aprovada'
    AND v.id IS NULL
  ORDER BY e.created_at DESC;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_emissoes_sem_viagem() TO authenticated;


-- ============================================
-- 5. DEPRECAR FUNÇÕES ANTIGAS (manter como fallback)
-- ============================================

-- Marcar aprovar_emissao_seguro como deprecated
COMMENT ON FUNCTION aprovar_emissao_seguro(UUID, UUID) IS
'DEPRECATED: Use aprovar_emissao_unificada. Esta função não cria viagem.';

-- Marcar lancar_emissao_equipe_completa como deprecated
COMMENT ON FUNCTION lancar_emissao_equipe_completa(UUID, NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, JSONB, TEXT) IS
'DEPRECATED: Use aprovar_emissao_unificada. Mantida para compatibilidade.';


-- ============================================
-- 6. ADICIONAR COLUNA data_voo SE NÃO EXISTIR
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viagem_voos' AND column_name = 'data_voo'
  ) THEN
    ALTER TABLE viagem_voos ADD COLUMN data_voo DATE;
    COMMENT ON COLUMN viagem_voos.data_voo IS 'Data do voo (para quando não temos horário completo)';
  END IF;
END $$;


-- ============================================
-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION aprovar_emissao_unificada IS
'Função unificada para aprovar emissões.
Sempre cria viagem completa em "Minhas Viagens".
Credita pontos com multiplicador correto.
Paga indicação se houver.
Use p_skip_pontos=TRUE para completar viagem sem creditar pontos novamente.';

COMMENT ON FUNCTION completar_viagem_emissao IS
'Completa viagem para emissões já aprovadas que não têm viagem.
Não credita pontos (já foram creditados na aprovação original).';

COMMENT ON FUNCTION get_emissoes_sem_viagem IS
'Retorna emissões aprovadas que não têm viagem associada.
Útil para identificar emissões antigas que precisam ter viagem completada.';
