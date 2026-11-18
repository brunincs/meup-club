-- =============================================
-- MIGRAÇÃO 204: CRON JOB PARA ANIVERSÁRIO
--
-- Agenda execução diária às 08:00 BRT (11:00 UTC)
-- da Edge Function birthday-daily-job
-- =============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job existente se houver (idempotência)
SELECT cron.unschedule('birthday-daily-job')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'birthday-daily-job'
);

-- Criar job diário às 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
  'birthday-daily-job',
  '0 11 * * *',  -- 11:00 UTC = 08:00 BRT
  $$
  SELECT net.http_post(
    url := 'https://dmemturmddbbzspvdgoh.supabase.co/functions/v1/birthday-daily-job',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =============================================
-- LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 204: Cron Job de Aniversário';
  RAISE NOTICE '  - Job birthday-daily-job agendado para 08:00 BRT';
  RAISE NOTICE '  - Chama Edge Function processar_aniversarios_hoje()';
END $$;
