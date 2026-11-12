-- ============================================
-- MIGRAÇÃO 133: Ajustar texto das notificações de check-in
-- Sem termos técnicos, mensagens curtas e claras
-- ============================================

-- 1. Atualizar função de lembrete 24h
CREATE OR REPLACE FUNCTION enviar_lembretes_checkin()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voo RECORD;
  v_count INTEGER := 0;
  v_notification_key TEXT;
  v_horario_local TEXT;
  v_origem TEXT;
  v_destino TEXT;
BEGIN
  FOR v_voo IN
    SELECT
      vv.id AS voo_id,
      v.user_id,
      v.id AS viagem_id,
      vv.origem_cidade,
      vv.destino_cidade,
      vv.partida_em,
      vv.partida_local
    FROM viagem_voos vv
    JOIN viagens v ON vv.viagem_id = v.id
    WHERE v.dados_status = 'conferido'
      AND vv.partida_em IS NOT NULL
      AND vv.partida_em BETWEEN NOW() + INTERVAL '23 hours 45 minutes'
                            AND NOW() + INTERVAL '24 hours'
  LOOP
    v_notification_key := 'checkin_reminder_' || v_voo.voo_id::TEXT || '_' || DATE(v_voo.partida_em)::TEXT;

    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = v_voo.user_id
        AND type = 'checkin_reminder'
        AND metadata->>'notification_key' = v_notification_key
    ) THEN
      -- Horário local
      v_horario_local := COALESCE(
        v_voo.partida_local,
        TO_CHAR(v_voo.partida_em AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
      );

      -- Nomes das cidades (sem estado/UF)
      v_origem := SPLIT_PART(COALESCE(v_voo.origem_cidade, 'Origem'), '/', 1);
      v_destino := SPLIT_PART(COALESCE(v_voo.destino_cidade, 'Destino'), '/', 1);

      INSERT INTO notifications (user_id, type, title, message, icon, read, metadata)
      VALUES (
        v_voo.user_id,
        'checkin_reminder',
        'Sua viagem é amanhã',
        v_origem || ' → ' || v_destino || ' às ' || v_horario_local || '. Nossa equipe fará seu check-in.',
        'plane',
        FALSE,
        jsonb_build_object(
          'notification_key', v_notification_key,
          'voo_id', v_voo.voo_id,
          'viagem_id', v_voo.viagem_id,
          'link', '/minhas-viagens'
        )
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 2. Atualizar função de marcar check-in
CREATE OR REPLACE FUNCTION marcar_checkin_feito(
  p_voo_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voo RECORD;
  v_origem TEXT;
  v_destino TEXT;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Buscar dados do voo
  SELECT vv.*, v.user_id INTO v_voo
  FROM viagem_voos vv
  JOIN viagens v ON vv.viagem_id = v.id
  WHERE vv.id = p_voo_id;

  IF v_voo IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voo não encontrado');
  END IF;

  -- Marcar check-in como feito
  UPDATE viagem_voos
  SET checkin_feito_em = NOW(),
      checkin_feito_por = p_admin_id
  WHERE id = p_voo_id;

  -- Nomes das cidades (sem estado/UF)
  v_origem := SPLIT_PART(COALESCE(v_voo.origem_cidade, 'Origem'), '/', 1);
  v_destino := SPLIT_PART(COALESCE(v_voo.destino_cidade, 'Destino'), '/', 1);

  -- Notificar cliente (sem termos técnicos)
  INSERT INTO notifications (user_id, type, title, message, icon, read, metadata)
  VALUES (
    v_voo.user_id,
    'checkin_done',
    'Check-in feito',
    'Sua viagem ' || v_origem || ' → ' || v_destino || ' está com check-in feito. Em breve enviamos seus cartões de embarque.',
    'check',
    FALSE,
    jsonb_build_object(
      'voo_id', p_voo_id,
      'viagem_id', v_voo.viagem_id,
      'link', '/minhas-viagens'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'voo_id', p_voo_id,
    'checkin_feito_em', NOW()
  );
END;
$$;
