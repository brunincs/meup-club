-- ============================================
-- MIGRAÇÃO 131: Sistema de Lembrete de Check-in
-- ============================================

-- 1. Adicionar colunas de check-in em viagem_voos
ALTER TABLE viagem_voos
ADD COLUMN IF NOT EXISTS checkin_feito_em TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS checkin_feito_por UUID REFERENCES profiles(id) DEFAULT NULL;

COMMENT ON COLUMN viagem_voos.checkin_feito_em IS 'Data/hora em que a equipe fez o check-in';
COMMENT ON COLUMN viagem_voos.checkin_feito_por IS 'Admin que fez o check-in';

-- 2. Criar índice para buscar voos próximos
CREATE INDEX IF NOT EXISTS idx_viagem_voos_partida_em ON viagem_voos(partida_em);

-- 3. Função para enviar lembretes de check-in (roda a cada 15 min)
-- Cria notificação para voos com partida entre 23h45 e 24h
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
BEGIN
  -- Buscar voos de viagens conferidas com partida entre 23h45 e 24h
  FOR v_voo IN
    SELECT
      vv.id AS voo_id,
      v.user_id,
      v.id AS viagem_id,
      vv.origem_cidade,
      vv.destino_cidade,
      vv.numero_voo,
      vv.companhia,
      vv.partida_em,
      vv.partida_local
    FROM viagem_voos vv
    JOIN viagens v ON vv.viagem_id = v.id
    WHERE v.dados_status = 'conferido'
      AND vv.partida_em IS NOT NULL
      AND vv.partida_em BETWEEN NOW() + INTERVAL '23 hours 45 minutes'
                            AND NOW() + INTERVAL '24 hours'
  LOOP
    -- Chave de idempotência: voo_id + data do lembrete
    v_notification_key := 'checkin_reminder_' || v_voo.voo_id::TEXT || '_' || DATE(v_voo.partida_em)::TEXT;

    -- Verificar se já existe notificação para este voo/data
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = v_voo.user_id
        AND type = 'checkin_reminder'
        AND metadata->>'notification_key' = v_notification_key
    ) THEN
      -- Formatar horário local (usar partida_local se disponível)
      v_horario_local := COALESCE(
        v_voo.partida_local,
        TO_CHAR(v_voo.partida_em AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
      );

      -- Criar notificação
      INSERT INTO notifications (user_id, type, title, message, icon, read, metadata)
      VALUES (
        v_voo.user_id,
        'checkin_reminder',
        '✈️ Sua viagem é amanhã!',
        COALESCE(v_voo.origem_cidade, '') || ' → ' || COALESCE(v_voo.destino_cidade, '') ||
          ' · ' || COALESCE(v_voo.companhia, '') || COALESCE(v_voo.numero_voo, '') ||
          ' às ' || v_horario_local ||
          '. Fica ligado: nossa equipe vai fazer seu check-in e enviar seus cartões de embarque em breve.',
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

-- 4. Função para admin buscar check-ins das próximas 48h
CREATE OR REPLACE FUNCTION get_checkins_proximos()
RETURNS TABLE (
  voo_id UUID,
  viagem_id UUID,
  user_id UUID,
  cliente_nome TEXT,
  cliente_email TEXT,
  origem_cidade TEXT,
  destino_cidade TEXT,
  origem_iata CHAR(3),
  destino_iata CHAR(3),
  numero_voo TEXT,
  companhia TEXT,
  localizador TEXT,
  partida_em TIMESTAMPTZ,
  partida_local TEXT,
  sentido TEXT,
  checkin_feito_em TIMESTAMPTZ,
  checkin_feito_por UUID,
  checkin_feito_por_nome TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vv.id AS voo_id,
    v.id AS viagem_id,
    v.user_id,
    p.name AS cliente_nome,
    p.email AS cliente_email,
    vv.origem_cidade,
    vv.destino_cidade,
    vv.origem_iata,
    vv.destino_iata,
    vv.numero_voo,
    vv.companhia,
    vv.localizador,
    vv.partida_em,
    vv.partida_local,
    vv.sentido,
    vv.checkin_feito_em,
    vv.checkin_feito_por,
    admin.name AS checkin_feito_por_nome
  FROM viagem_voos vv
  JOIN viagens v ON vv.viagem_id = v.id
  JOIN profiles p ON v.user_id = p.id
  LEFT JOIN profiles admin ON vv.checkin_feito_por = admin.id
  WHERE v.dados_status = 'conferido'
    AND vv.partida_em IS NOT NULL
    AND vv.partida_em BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
  ORDER BY vv.partida_em ASC;
END;
$$;

-- 5. Função para admin marcar check-in como feito
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
  v_user_id UUID;
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

  -- Notificar cliente
  INSERT INTO notifications (user_id, type, title, message, icon, read, metadata)
  VALUES (
    v_voo.user_id,
    'checkin_done',
    '✅ Check-in realizado!',
    'A equipe Me,up fez o check-in do seu voo ' ||
      COALESCE(v_voo.companhia, '') || COALESCE(v_voo.numero_voo, '') ||
      ' (' || COALESCE(v_voo.origem_cidade, '') || ' → ' || COALESCE(v_voo.destino_cidade, '') || ')' ||
      '. Seus cartões de embarque serão enviados em breve.',
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

-- 6. Configurar pg_cron para rodar a cada 15 minutos
-- NOTA: pg_cron precisa estar habilitado no projeto Supabase
-- Esta query só funciona se a extensão estiver disponível

DO $do_block$
BEGIN
  -- Verificar se pg_cron está disponível
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remover job anterior se existir
    PERFORM cron.unschedule('checkin_reminder_job');

    -- Criar novo job a cada 15 minutos
    PERFORM cron.schedule(
      'checkin_reminder_job',
      '*/15 * * * *',
      'SELECT enviar_lembretes_checkin()'
    );

    RAISE NOTICE 'Job de lembrete de check-in configurado!';
  ELSE
    RAISE NOTICE 'pg_cron não está disponível. Configure manualmente via Supabase Dashboard > Database > Extensions.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao configurar pg_cron: %. Configure manualmente.', SQLERRM;
END $do_block$;

-- 7. Permissões
GRANT EXECUTE ON FUNCTION enviar_lembretes_checkin() TO service_role;
GRANT EXECUTE ON FUNCTION get_checkins_proximos() TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_checkin_feito(UUID, UUID) TO authenticated;
