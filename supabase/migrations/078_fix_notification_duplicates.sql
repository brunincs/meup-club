-- =============================================
-- MIGRAÇÃO 078: CORRIGIR NOTIFICAÇÕES DUPLICADAS E ACENTOS
--
-- PROBLEMAS:
-- 1. Check-in gera 2 notificações:
--    - Uma pelo trigger trigger_notify_points_earned em point_transactions
--    - Outra diretamente pela função fazer_checkin
-- 2. Algumas notificações têm "Voce" sem acento
--
-- SOLUÇÃO:
-- 1. Desabilitar o trigger automático (as funções já criam notificações específicas)
-- 2. Corrigir acentos nas notificações existentes
-- =============================================

-- =============================================
-- 1. DESABILITAR TRIGGER DE NOTIFICAÇÃO AUTOMÁTICA
-- As funções fazer_checkin, creditar_missao_automatica, etc
-- já criam suas próprias notificações com mensagens específicas
-- =============================================
DROP TRIGGER IF EXISTS trigger_notify_points_earned ON public.point_transactions;

-- Manter a função para referência, mas o trigger não dispara mais
COMMENT ON FUNCTION public.notify_points_earned IS
'DESATIVADO na migração 078. As funções individuais (fazer_checkin, creditar_missao_automatica, etc)
criam suas próprias notificações com mensagens específicas.';

-- =============================================
-- 2. CORRIGIR ACENTOS EM NOTIFICAÇÕES EXISTENTES
-- =============================================
UPDATE public.notifications
SET message = REPLACE(message, 'Voce', 'Você')
WHERE message LIKE '%Voce%';

UPDATE public.notifications
SET message = REPLACE(message, 'diario', 'diário')
WHERE message LIKE '%diario%';

UPDATE public.notifications
SET message = REPLACE(message, 'codigo', 'código')
WHERE message LIKE '%codigo%';

UPDATE public.notifications
SET message = REPLACE(message, 'indicacao', 'indicação')
WHERE message LIKE '%indicacao%';

UPDATE public.notifications
SET title = REPLACE(title, 'Voce', 'Você')
WHERE title LIKE '%Voce%';

UPDATE public.notifications
SET message = REPLACE(message, 'missao', 'missão')
WHERE message LIKE '%missao%';

UPDATE public.notifications
SET title = REPLACE(title, 'Missao', 'Missão')
WHERE title LIKE '%Missao%';

-- =============================================
-- 3. REMOVER NOTIFICAÇÕES DUPLICADAS
-- Manter apenas a mais recente de cada "lote" (mesmo user, mesmo minuto)
-- =============================================
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id,
                        DATE_TRUNC('minute', created_at),
                        CASE
                          WHEN type IN ('checkin', 'points_earned') AND title LIKE '%heck%' THEN 'checkin'
                          WHEN type IN ('mission_completed', 'points_earned') AND title LIKE '%issão%' THEN 'mission'
                          ELSE type
                        END
           ORDER BY created_at DESC
         ) as rn
  FROM public.notifications
  WHERE created_at > NOW() - INTERVAL '7 days'
)
DELETE FROM public.notifications
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- =============================================
-- 4. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 078: Notificações corrigidas';
  RAISE NOTICE '  - Trigger trigger_notify_points_earned desabilitado';
  RAISE NOTICE '  - Acentos corrigidos (Voce→Você, diario→diário, etc)';
  RAISE NOTICE '  - Notificações duplicadas removidas';
END $$;
