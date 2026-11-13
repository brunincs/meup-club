-- ============================================
-- MIGRAÇÃO 148: Sistema de Retrospectiva Anual
-- ============================================

-- 1. Adicionar configuração de datas da retrospectiva em plano_config
ALTER TABLE plano_config ADD COLUMN IF NOT EXISTS
  retrospectiva_inicio TEXT DEFAULT '12-01'; -- MM-DD
ALTER TABLE plano_config ADD COLUMN IF NOT EXISTS
  retrospectiva_fim TEXT DEFAULT '01-31'; -- MM-DD (próximo ano)

-- 2. Adicionar tipo de notificação retrospectiva
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    -- Pontos
    'points_earned',
    'points',
    -- Níveis
    'level_up',
    'level_bonus',
    -- Resgates
    'redemption',
    'redemption_approved',
    'redemption_rejected',
    -- Entregas/Vouchers
    'resgate_aprovado',
    'resgate_entregue',
    'resgate_cancelado',
    'voucher_utilizado',
    -- Indicações
    'referral',
    'referral_signup',
    'referral_prime',
    'referral_approved',
    'referral_bonus',
    -- Check-in
    'checkin',
    'checkin_reminder',
    'checkin_done',
    -- Missões
    'mission_completed',
    -- Sistema
    'system',
    -- Emissões
    'emissao_aprovada',
    'emissao_recusada',
    -- Assinatura
    'subscription',
    'prime',
    'fundador',
    -- Retrospectiva
    'retrospectiva_disponivel',
    -- Outros
    'birthday',
    'welcome',
    'info',
    'alert',
    'success',
    'warning'
  ]::text[])
);

-- 3. RPC: Obter dados da retrospectiva
CREATE OR REPLACE FUNCTION get_retrospectiva(
  p_user_id UUID,
  p_ano INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_viagens_count INTEGER;
  v_voos_count INTEGER;
  v_km_voados DECIMAL;
  v_horas_ar DECIMAL;
  v_cidades JSONB;
  v_destino_top TEXT;
  v_destino_top_count INTEGER;
  v_cia_top TEXT;
  v_cia_top_count INTEGER;
  v_pontos_ano INTEGER;
  v_experiencias_count INTEGER;
  v_indicados_viajaram INTEGER;
  v_plano TEXT;
  v_pontos_prime_extra INTEGER;
BEGIN
  -- Contar viagens do ano (só confirmada/realizada)
  SELECT COUNT(*) INTO v_viagens_count
  FROM viagens v
  WHERE v.user_id = p_user_id
    AND v.status IN ('confirmada', 'realizada')
    AND EXTRACT(YEAR FROM v.data_ida) = p_ano;

  -- Se não tem viagens, retorna vazio
  IF v_viagens_count = 0 THEN
    RETURN jsonb_build_object(
      'tem_dados', false,
      'ano', p_ano
    );
  END IF;

  -- Contar voos
  SELECT COUNT(*) INTO v_voos_count
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE v.user_id = p_user_id
    AND v.status IN ('confirmada', 'realizada')
    AND EXTRACT(YEAR FROM COALESCE(vv.data_voo, v.data_ida)) = p_ano;

  -- Calcular km voados usando haversine
  SELECT COALESCE(SUM(
    haversine_km(
      ao.latitude, ao.longitude,
      ad.latitude, ad.longitude
    )
  ), 0) INTO v_km_voados
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  LEFT JOIN aeroportos ao ON ao.iata = vv.origem_iata
  LEFT JOIN aeroportos ad ON ad.iata = vv.destino_iata
  WHERE v.user_id = p_user_id
    AND v.status IN ('confirmada', 'realizada')
    AND EXTRACT(YEAR FROM COALESCE(vv.data_voo, v.data_ida)) = p_ano
    AND ao.iata IS NOT NULL
    AND ad.iata IS NOT NULL;

  -- Calcular horas no ar (soma de durações)
  SELECT COALESCE(SUM(
    CASE
      WHEN vv.duracao ~ '(\d+)h' THEN
        (REGEXP_MATCH(vv.duracao, '(\d+)h'))[1]::INTEGER * 60
      ELSE 0
    END +
    CASE
      WHEN vv.duracao ~ '(\d+)m' THEN
        (REGEXP_MATCH(vv.duracao, '(\d+)m'))[1]::INTEGER
      ELSE 0
    END
  ) / 60.0, 0) INTO v_horas_ar
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE v.user_id = p_user_id
    AND v.status IN ('confirmada', 'realizada')
    AND EXTRACT(YEAR FROM COALESCE(vv.data_voo, v.data_ida)) = p_ano;

  -- Cidades visitadas (únicas)
  SELECT jsonb_agg(DISTINCT vv.destino_cidade) INTO v_cidades
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE v.user_id = p_user_id
    AND v.status IN ('confirmada', 'realizada')
    AND EXTRACT(YEAR FROM COALESCE(vv.data_voo, v.data_ida)) = p_ano
    AND vv.destino_cidade IS NOT NULL;

  -- Destino mais visitado
  SELECT vv.destino_cidade, COUNT(*) INTO v_destino_top, v_destino_top_count
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE v.user_id = p_user_id
    AND v.status IN ('confirmada', 'realizada')
    AND EXTRACT(YEAR FROM COALESCE(vv.data_voo, v.data_ida)) = p_ano
    AND vv.destino_cidade IS NOT NULL
  GROUP BY vv.destino_cidade
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Companhia mais usada
  SELECT vv.companhia, COUNT(*) INTO v_cia_top, v_cia_top_count
  FROM viagem_voos vv
  JOIN viagens v ON v.id = vv.viagem_id
  WHERE v.user_id = p_user_id
    AND v.status IN ('confirmada', 'realizada')
    AND EXTRACT(YEAR FROM COALESCE(vv.data_voo, v.data_ida)) = p_ano
    AND vv.companhia IS NOT NULL
  GROUP BY vv.companhia
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Pontos ganhos no ano
  SELECT COALESCE(SUM(amount), 0) INTO v_pontos_ano
  FROM point_transactions pt
  WHERE pt.user_id = p_user_id
    AND pt.amount > 0
    AND EXTRACT(YEAR FROM pt.created_at) = p_ano;

  -- Experiências resgatadas
  SELECT COUNT(*) INTO v_experiencias_count
  FROM resgates r
  WHERE r.user_id = p_user_id
    AND EXTRACT(YEAR FROM r.created_at) = p_ano;

  -- Amigos indicados que viajaram
  SELECT COUNT(DISTINCT ref.referred_id) INTO v_indicados_viajaram
  FROM referrals ref
  JOIN viagens v ON v.user_id = ref.referred_id
  WHERE ref.referrer_id = p_user_id
    AND ref.status = 'approved'
    AND EXTRACT(YEAR FROM v.data_ida) = p_ano
    AND v.status IN ('confirmada', 'realizada');

  -- Verificar plano do usuário
  SELECT COALESCE(s.plano::TEXT, 'free') INTO v_plano
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  LIMIT 1;

  IF v_plano IS NULL THEN
    v_plano := 'free';
  END IF;

  -- Calcular pontos extras que teria com Prime (se Free)
  IF v_plano = 'free' THEN
    -- Simular: viagens renderiam 1.5x (50% a mais)
    -- Buscar pontos de viagem do ano
    SELECT COALESCE(SUM(
      CASE WHEN pt.reason ILIKE '%viagem%' OR pt.reason ILIKE '%emiss%' THEN ROUND(pt.amount * 0.5) ELSE 0 END
    ), 0)::INTEGER INTO v_pontos_prime_extra
    FROM point_transactions pt
    WHERE pt.user_id = p_user_id
      AND pt.amount > 0
      AND EXTRACT(YEAR FROM pt.created_at) = p_ano;
  ELSE
    v_pontos_prime_extra := 0;
  END IF;

  -- Montar resultado
  v_result := jsonb_build_object(
    'tem_dados', true,
    'ano', p_ano,
    'plano', v_plano,
    'viagens', v_viagens_count,
    'voos', v_voos_count,
    'km_voados', ROUND(v_km_voados),
    'horas_ar', ROUND(v_horas_ar, 1),
    'cidades', COALESCE(v_cidades, '[]'::jsonb),
    'total_cidades', jsonb_array_length(COALESCE(v_cidades, '[]'::jsonb)),
    'destino_top', v_destino_top,
    'destino_top_count', v_destino_top_count,
    'cia_top', v_cia_top,
    'cia_top_count', v_cia_top_count,
    'pontos_ano', v_pontos_ano,
    'experiencias', v_experiencias_count,
    'indicados_viajaram', v_indicados_viajaram,
    'pontos_prime_extra', v_pontos_prime_extra
  );

  RETURN v_result;
END;
$$;

-- 4. RPC: Verificar se retrospectiva está disponível
CREATE OR REPLACE FUNCTION is_retrospectiva_disponivel(p_ano INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inicio TEXT;
  v_fim TEXT;
  v_hoje DATE := CURRENT_DATE;
  v_data_inicio DATE;
  v_data_fim DATE;
BEGIN
  -- Buscar datas da config (usa o plano free como referência)
  SELECT retrospectiva_inicio, retrospectiva_fim
  INTO v_inicio, v_fim
  FROM plano_config
  WHERE plano = 'free'
  LIMIT 1;

  -- Default se não configurado
  v_inicio := COALESCE(v_inicio, '12-01');
  v_fim := COALESCE(v_fim, '01-31');

  -- Construir datas
  v_data_inicio := (p_ano || '-' || v_inicio)::DATE;
  v_data_fim := ((p_ano + 1) || '-' || v_fim)::DATE;

  RETURN v_hoje BETWEEN v_data_inicio AND v_data_fim;
END;
$$;

-- 5. RPC: Admin pode visualizar retrospectiva de qualquer usuário
CREATE OR REPLACE FUNCTION admin_get_retrospectiva(
  p_admin_id UUID,
  p_user_id UUID,
  p_ano INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar se é admin
  SELECT role = 'admin' INTO v_is_admin
  FROM profiles
  WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Retornar retrospectiva do usuário
  RETURN get_retrospectiva(p_user_id, p_ano);
END;
$$;

-- 6. Grants
GRANT EXECUTE ON FUNCTION get_retrospectiva(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION is_retrospectiva_disponivel(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_retrospectiva(UUID, UUID, INTEGER) TO authenticated;

-- 7. Comentários
COMMENT ON FUNCTION get_retrospectiva IS 'Retorna estatísticas da retrospectiva anual do usuário';
COMMENT ON FUNCTION is_retrospectiva_disponivel IS 'Verifica se a retrospectiva do ano está no período de exibição';
COMMENT ON FUNCTION admin_get_retrospectiva IS 'Permite admin visualizar retrospectiva de qualquer usuário';
