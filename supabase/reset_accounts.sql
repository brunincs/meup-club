-- ═══════════════════════════════════════════════════════════════════════════════
-- RESET PRÉ-LANÇAMENTO ME,UP CLUB
-- ═══════════════════════════════════════════════════════════════════════════════
-- AÇÃO IRREVERSÍVEL! Executar apenas no Supabase SQL Editor com backup feito.
-- Mantém APENAS o admin: Bruno (brunocesarperal@gmail.com)
-- ID: 944c8549-03b5-43b3-8863-49d05656ead2
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- ETAPA 1: MOSTRAR ESTADO ANTES (execute primeiro e anote os números)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Listar todos os usuários
SELECT 'USUARIOS' as tabela, id, name, email, role, points, total_points_earned, created_at
FROM profiles
ORDER BY created_at;

-- Contagem por tabela de dados
SELECT 'profiles' as tabela, COUNT(*) as registros FROM profiles
UNION ALL SELECT 'point_transactions', COUNT(*) FROM point_transactions
UNION ALL SELECT 'pending_points', COUNT(*) FROM pending_points
UNION ALL SELECT 'checkins', COUNT(*) FROM checkins
UNION ALL SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL SELECT 'emissoes', COUNT(*) FROM emissoes
UNION ALL SELECT 'resgate_solicitacoes', COUNT(*) FROM resgate_solicitacoes
UNION ALL SELECT 'vouchers', COUNT(*) FROM vouchers
UNION ALL SELECT 'arquivos_resgate', COUNT(*) FROM arquivos_resgate
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'user_tasks', COUNT(*) FROM user_tasks
UNION ALL SELECT 'tarefa_solicitacoes', COUNT(*) FROM tarefa_solicitacoes
UNION ALL SELECT 'missoes_automaticas_concluidas', COUNT(*) FROM missoes_automaticas_concluidas
UNION ALL SELECT 'missed_earnings', COUNT(*) FROM missed_earnings
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'fundadores', COUNT(*) FROM fundadores
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ETAPA 2: APAGAR OUTROS USUÁRIOS (todos exceto Bruno)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ID do Bruno (manter apenas este)
DO $$
DECLARE
  v_bruno_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
  v_other_users UUID[];
BEGIN
  -- Coletar IDs dos outros usuários
  SELECT array_agg(id) INTO v_other_users
  FROM profiles
  WHERE id != v_bruno_id;

  IF v_other_users IS NOT NULL AND array_length(v_other_users, 1) > 0 THEN
    RAISE NOTICE 'Removendo % usuários (exceto Bruno)', array_length(v_other_users, 1);

    -- Deletar dados relacionados (cascata manual para garantir)
    DELETE FROM vouchers WHERE resgate_id IN (
      SELECT id FROM resgate_solicitacoes WHERE user_id = ANY(v_other_users)
    );
    DELETE FROM arquivos_resgate WHERE resgate_id IN (
      SELECT id FROM resgate_solicitacoes WHERE user_id = ANY(v_other_users)
    );
    DELETE FROM resgate_solicitacoes WHERE user_id = ANY(v_other_users);
    DELETE FROM point_transactions WHERE user_id = ANY(v_other_users);
    DELETE FROM pending_points WHERE user_id = ANY(v_other_users);
    DELETE FROM checkins WHERE user_id = ANY(v_other_users);
    DELETE FROM emissoes WHERE user_id = ANY(v_other_users);
    DELETE FROM notifications WHERE user_id = ANY(v_other_users);
    DELETE FROM user_tasks WHERE user_id = ANY(v_other_users);
    DELETE FROM tarefa_solicitacoes WHERE user_id = ANY(v_other_users);
    DELETE FROM missoes_automaticas_concluidas WHERE user_id = ANY(v_other_users);
    DELETE FROM missed_earnings WHERE user_id = ANY(v_other_users);
    DELETE FROM fundadores WHERE user_id = ANY(v_other_users);
    DELETE FROM subscriptions WHERE user_id = ANY(v_other_users);

    -- Remover referrals onde o outro usuário é referrer OU referred
    DELETE FROM referrals WHERE referrer_id = ANY(v_other_users) OR referred_id = ANY(v_other_users);

    -- Audit logs: manter apenas de ações admin do Bruno
    DELETE FROM audit_logs WHERE admin_id = ANY(v_other_users);

    -- Deletar profiles dos outros
    DELETE FROM profiles WHERE id = ANY(v_other_users);

    -- Deletar de auth.users (CASCADE não apaga automaticamente)
    DELETE FROM auth.users WHERE id = ANY(v_other_users);

    RAISE NOTICE 'Usuários removidos com sucesso';
  ELSE
    RAISE NOTICE 'Nenhum outro usuário para remover';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ETAPA 3: ZERAR DADOS DO BRUNO (conta fica como admin)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_bruno_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
  v_classe_inicial INTEGER;
BEGIN
  -- Buscar classe inicial (level_id 1)
  SELECT id INTO v_classe_inicial FROM classes ORDER BY pontos_minimos ASC LIMIT 1;
  v_classe_inicial := COALESCE(v_classe_inicial, 1);

  RAISE NOTICE 'Zerando dados do Bruno (ID: %)', v_bruno_id;

  -- Deletar vouchers e arquivos de resgates do Bruno
  DELETE FROM vouchers WHERE resgate_id IN (
    SELECT id FROM resgate_solicitacoes WHERE user_id = v_bruno_id
  );
  DELETE FROM arquivos_resgate WHERE resgate_id IN (
    SELECT id FROM resgate_solicitacoes WHERE user_id = v_bruno_id
  );

  -- Deletar todos os registros do Bruno (exceto audit_logs de admin)
  DELETE FROM resgate_solicitacoes WHERE user_id = v_bruno_id;
  DELETE FROM point_transactions WHERE user_id = v_bruno_id;
  DELETE FROM pending_points WHERE user_id = v_bruno_id;
  DELETE FROM checkins WHERE user_id = v_bruno_id;
  DELETE FROM emissoes WHERE user_id = v_bruno_id;
  DELETE FROM notifications WHERE user_id = v_bruno_id;
  DELETE FROM user_tasks WHERE user_id = v_bruno_id;
  DELETE FROM tarefa_solicitacoes WHERE user_id = v_bruno_id;
  DELETE FROM missoes_automaticas_concluidas WHERE user_id = v_bruno_id;
  DELETE FROM missed_earnings WHERE user_id = v_bruno_id;
  DELETE FROM fundadores WHERE user_id = v_bruno_id;
  DELETE FROM subscriptions WHERE user_id = v_bruno_id;
  DELETE FROM referrals WHERE referrer_id = v_bruno_id OR referred_id = v_bruno_id;

  -- Resetar profile do Bruno (manter nome, email, CPF, telefone, role)
  UPDATE profiles SET
    points = 0,
    total_points_earned = 0,
    level_id = v_classe_inicial,
    total_referrals = 0,
    -- Resetar flags de missões de perfil
    perfil_completo = FALSE,
    instagram_seguindo = FALSE,
    primeiro_resgate = FALSE,
    streak_days = 0,
    last_checkin = NULL,
    updated_at = NOW()
  WHERE id = v_bruno_id;

  RAISE NOTICE 'Bruno resetado: 0 pts, classe inicial, sem histórico';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ETAPA 4: ZERAR CONTADORES (vagas de fundador, sequência)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Resetar sequência de vagas de fundador
ALTER SEQUENCE IF EXISTS fundadores_vaga_seq RESTART WITH 1;

-- Garantir que não há ganhadores
DELETE FROM fundadores; -- Já deve estar vazio, mas garante

-- Verificar vagas (deve mostrar 100 de 100)
SELECT * FROM get_fundadores_count();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ETAPA 5: VERIFICAR ESTADO FINAL
-- ═══════════════════════════════════════════════════════════════════════════════

-- Deve mostrar apenas Bruno
SELECT 'USUARIOS RESTANTES' as info, id, name, email, role, points, level_id, created_at
FROM profiles;

-- Contagem final (tudo deve ser 0 ou 1 para profile)
SELECT 'profiles' as tabela, COUNT(*) as registros FROM profiles
UNION ALL SELECT 'point_transactions', COUNT(*) FROM point_transactions
UNION ALL SELECT 'pending_points', COUNT(*) FROM pending_points
UNION ALL SELECT 'checkins', COUNT(*) FROM checkins
UNION ALL SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL SELECT 'emissoes', COUNT(*) FROM emissoes
UNION ALL SELECT 'resgate_solicitacoes', COUNT(*) FROM resgate_solicitacoes
UNION ALL SELECT 'vouchers', COUNT(*) FROM vouchers
UNION ALL SELECT 'arquivos_resgate', COUNT(*) FROM arquivos_resgate
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'user_tasks', COUNT(*) FROM user_tasks
UNION ALL SELECT 'tarefa_solicitacoes', COUNT(*) FROM tarefa_solicitacoes
UNION ALL SELECT 'missoes_automaticas_concluidas', COUNT(*) FROM missoes_automaticas_concluidas
UNION ALL SELECT 'missed_earnings', COUNT(*) FROM missed_earnings
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'fundadores', COUNT(*) FROM fundadores;

-- Vagas de fundador
SELECT 'VAGAS FUNDADOR' as info, * FROM get_fundadores_count();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ETAPA 6: LIMPAR STORAGE (execute manualmente no dashboard)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Vá em Storage → buckets e delete:
-- - Todos os arquivos em 'cards-meup'
-- - Todos os arquivos em 'comprovantes'
-- - Todos os arquivos em 'uploads'
-- - Todos os arquivos em 'entregas-resgate'
-- - Todos os arquivos em 'private-cards'

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DO SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════
