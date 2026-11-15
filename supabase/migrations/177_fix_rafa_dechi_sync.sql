-- ============================================
-- MIGRAÇÃO 177: Sincronizar saldo do rafa dechi
-- Após migração 176, profile=34536 e sum(tx)=34036
-- Adicionar +500 credit para igualar
-- ============================================

INSERT INTO point_transactions (user_id, amount, type, reason, balance_before, balance_after)
VALUES (
  '010c760f-26d1-43dd-800f-798c8a01e50d',
  500,
  'credit',
  'Ajuste técnico: sincronização saldo/transações (auditoria 15/11)',
  34036,
  34536
);

-- Verificação: após esta migração, SUM(amount) deve ser = profile.points
