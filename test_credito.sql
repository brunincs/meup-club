-- Teste dos fluxos de crédito
DO $$
DECLARE
  v_test_id UUID := '00000000-0000-0000-0000-000000000099';
  v_result JSONB;
  v_points INTEGER;
BEGIN
  -- Limpar teste anterior se existir
  DELETE FROM checkins WHERE user_id = v_test_id;
  DELETE FROM missoes_automaticas_concluidas WHERE user_id = v_test_id;
  DELETE FROM point_transactions WHERE user_id = v_test_id;
  DELETE FROM notifications WHERE user_id = v_test_id;
  DELETE FROM profiles WHERE id = v_test_id;

  -- Criar perfil de teste
  INSERT INTO profiles (id, name, email, points, role)
  VALUES (v_test_id, 'Teste Fluxo', 'teste.fluxo@teste.com', 0, 'user');

  RAISE NOTICE '1. Perfil criado com 0 pontos';

  -- Testar creditar_pontos_interno
  v_result := creditar_pontos_interno(v_test_id, 100, 'task', 'Teste direto');
  RAISE NOTICE '2. creditar_pontos_interno: %', v_result;

  -- Verificar saldo
  SELECT points INTO v_points FROM profiles WHERE id = v_test_id;
  RAISE NOTICE '3. Saldo após crédito: % pontos', v_points;

  -- Testar creditar_missao_automatica
  PERFORM creditar_missao_automatica(v_test_id, 'teste_missao', 50, 'Missão de teste');

  SELECT points INTO v_points FROM profiles WHERE id = v_test_id;
  RAISE NOTICE '4. Saldo após missão: % pontos', v_points;

  -- Testar idempotência (chamar de novo não deve creditar)
  PERFORM creditar_missao_automatica(v_test_id, 'teste_missao', 50, 'Missão de teste');

  SELECT points INTO v_points FROM profiles WHERE id = v_test_id;
  RAISE NOTICE '5. Saldo após 2a chamada (idempotente): % pontos', v_points;

  -- Limpar
  DELETE FROM checkins WHERE user_id = v_test_id;
  DELETE FROM missoes_automaticas_concluidas WHERE user_id = v_test_id;
  DELETE FROM point_transactions WHERE user_id = v_test_id;
  DELETE FROM notifications WHERE user_id = v_test_id;
  DELETE FROM profiles WHERE id = v_test_id;

  RAISE NOTICE '6. Teste concluído com sucesso!';
END $$;
