-- ============================================
-- BACKUP ANTES DO RESET - 2026-11-12
-- Execute este script para exportar dados atuais
-- ============================================

-- 1. Listar contagem de registros em cada tabela
SELECT 'profiles' as tabela, COUNT(*) as registros FROM profiles
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'point_transactions', COUNT(*) FROM point_transactions
UNION ALL SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'viagens', COUNT(*) FROM viagens
UNION ALL SELECT 'viagem_voos', COUNT(*) FROM viagem_voos
UNION ALL SELECT 'viagem_passageiros', COUNT(*) FROM viagem_passageiros
UNION ALL SELECT 'emissoes', COUNT(*) FROM emissoes
UNION ALL SELECT 'resgates', COUNT(*) FROM resgates
UNION ALL SELECT 'tarefa_solicitacoes', COUNT(*) FROM tarefa_solicitacoes
UNION ALL SELECT 'checkin_history', COUNT(*) FROM checkin_history
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL SELECT 'experiencias', COUNT(*) FROM experiencias
UNION ALL SELECT 'plano_config', COUNT(*) FROM plano_config
ORDER BY tabela;

-- 2. Exportar profiles (para referência)
-- COPY profiles TO '/tmp/backup_profiles.csv' WITH CSV HEADER;

-- 3. Exportar point_transactions
-- COPY point_transactions TO '/tmp/backup_transactions.csv' WITH CSV HEADER;

-- 4. Exportar referrals
-- COPY referrals TO '/tmp/backup_referrals.csv' WITH CSV HEADER;

-- 5. Exportar viagens
-- COPY viagens TO '/tmp/backup_viagens.csv' WITH CSV HEADER;
