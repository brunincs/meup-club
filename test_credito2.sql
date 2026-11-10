-- Teste do crédito com usuário real (Bruno)
DO $$
DECLARE
  v_bruno_id UUID := '944c8549-03b5-43b3-8863-49d05656ead2';
  v_result JSONB;
  v_points_before INTEGER;
  v_points_after INTEGER;
BEGIN
  -- Saldo antes
  SELECT points INTO v_points_before FROM profiles WHERE id = v_bruno_id;
  RAISE NOTICE '1. Saldo Bruno ANTES: % pontos', v_points_before;

  -- Testar creditar_pontos_interno (adiciona 10 pontos de teste)
  v_result := creditar_pontos_interno(v_bruno_id, 10, 'task', 'Teste de crédito central');
  RAISE NOTICE '2. Resultado creditar_pontos_interno: %', v_result;

  -- Saldo depois
  SELECT points INTO v_points_after FROM profiles WHERE id = v_bruno_id;
  RAISE NOTICE '3. Saldo Bruno DEPOIS: % pontos', v_points_after;

  -- Verificar se creditou corretamente
  IF v_points_after = v_points_before + 10 THEN
    RAISE NOTICE '4. SUCESSO! Crédito funcionou corretamente.';
  ELSE
    RAISE NOTICE '4. FALHA! Esperado %, obtido %', v_points_before + 10, v_points_after;
  END IF;

  -- Reverter o teste (debitar os 10 pontos)
  v_result := creditar_pontos_interno(v_bruno_id, -10, 'adjustment', 'Reversão do teste');
  RAISE NOTICE '5. Reversão: %', v_result;

  -- Confirmar reversão
  SELECT points INTO v_points_after FROM profiles WHERE id = v_bruno_id;
  RAISE NOTICE '6. Saldo final: % pontos (deve ser igual ao inicial)', v_points_after;
END $$;
