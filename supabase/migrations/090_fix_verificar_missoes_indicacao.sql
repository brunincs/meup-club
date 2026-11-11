-- =============================================
-- FIX: verificar_missoes_indicacao usa missao_tipo
-- A tabela missoes_automaticas_concluidas tem missao_tipo, não tarefa_id
-- =============================================

CREATE OR REPLACE FUNCTION verificar_missoes_indicacao(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_aprovadas INTEGER;
  v_tarefa RECORD;
  v_meta INTEGER;
  v_ja_concluiu BOOLEAN;
BEGIN
  -- Contar indicações APROVADAS do usuário
  SELECT COUNT(*) INTO v_total_aprovadas
  FROM referrals
  WHERE referrer_id = p_user_id
    AND status = 'approved';

  -- Verificar cada missão de indicação
  FOR v_tarefa IN
    SELECT id, nome, pontos, missao_tipo
    FROM tarefas
    WHERE ativa = true
      AND missao_tipo IN ('primeira_indicacao', '5_indicacoes', '10_indicacoes')
  LOOP
    -- Determinar meta baseado no tipo
    v_meta := CASE v_tarefa.missao_tipo
      WHEN 'primeira_indicacao' THEN 1
      WHEN '5_indicacoes' THEN 5
      WHEN '10_indicacoes' THEN 10
      ELSE 0
    END;

    -- Verificar se já concluiu esta missão (usa missao_tipo, não tarefa_id)
    SELECT EXISTS(
      SELECT 1 FROM missoes_automaticas_concluidas
      WHERE user_id = p_user_id AND missao_tipo = v_tarefa.missao_tipo
    ) INTO v_ja_concluiu;

    -- Se atingiu a meta e ainda não concluiu, creditar
    IF v_total_aprovadas >= v_meta AND NOT v_ja_concluiu THEN
      -- Registrar conclusão (idempotente)
      INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
      VALUES (p_user_id, v_tarefa.missao_tipo, v_tarefa.pontos)
      ON CONFLICT (user_id, missao_tipo) DO NOTHING;

      -- Creditar pontos
      PERFORM creditar_pontos_central(
        p_user_id,
        v_tarefa.pontos,
        'task',
        'Missão concluída: ' || v_tarefa.nome,
        'credit'
      );

      -- Notificação
      BEGIN
        INSERT INTO notifications (user_id, type, title, message, icon)
        VALUES (
          p_user_id,
          'mission_completed',
          'Missão concluída!',
          'Você completou "' || v_tarefa.nome || '" e ganhou ' || v_tarefa.pontos || ' pontos!',
          'trophy'
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END;
$$;
