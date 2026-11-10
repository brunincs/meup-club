-- =============================================
-- MIGRAÇÃO 076: CORRIGIR PONTOS DE EXPLORAR EXPERIÊNCIAS
--
-- PROBLEMA:
-- O card mostra +5 pts (tarefas table), mas a função credita +10 pts.
-- Precisa ser consistente: 5 pts nos dois lados.
--
-- CORREÇÃO:
-- Alterar registrar_visita_experiencias para creditar 5 pts
-- =============================================

-- =============================================
-- 1. CORRIGIR FUNÇÃO registrar_visita_experiencias (5 pts)
-- =============================================
DROP FUNCTION IF EXISTS public.registrar_visita_experiencias(UUID);
CREATE OR REPLACE FUNCTION public.registrar_visita_experiencias(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ja_visitou BOOLEAN;
  v_credit_result JSONB;
BEGIN
  -- Verificar se já visitou (IDEMPOTÊNCIA)
  SELECT EXISTS (
    SELECT 1 FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = 'visitar_experiencias'
  ) INTO v_ja_visitou;

  IF v_ja_visitou THEN
    RETURN jsonb_build_object(
      'success', true,
      'creditou', false,
      'pontos', 0
    );
  END IF;

  -- Registrar conclusão (5 pts, alinhado com tarefas table)
  INSERT INTO missoes_automaticas_concluidas (user_id, missao_tipo, pontos_concedidos)
  VALUES (p_user_id, 'visitar_experiencias', 5)
  ON CONFLICT (user_id, missao_tipo) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'creditou', false, 'pontos', 0);
  END IF;

  -- Creditar 5 pts via função central (alinhado com card)
  v_credit_result := public.creditar_pontos_interno(
    p_user_id,
    5,  -- CORRIGIDO: era 10, agora é 5
    'task',
    'Missão: Explorar experiências'
  );

  IF NOT (v_credit_result->>'success')::boolean THEN
    DELETE FROM missoes_automaticas_concluidas
    WHERE user_id = p_user_id AND missao_tipo = 'visitar_experiencias';

    RETURN jsonb_build_object('success', false, 'creditou', false, 'error', v_credit_result->>'error');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'creditou', true,
    'pontos', 5,  -- CORRIGIDO: era 10, agora é 5
    'balance_after', (v_credit_result->>'balance_after')::integer
  );
END;
$$;

-- =============================================
-- 2. GARANTIR PERMISSÕES
-- =============================================
GRANT EXECUTE ON FUNCTION public.registrar_visita_experiencias TO authenticated;

-- =============================================
-- 3. RECARREGAR SCHEMA
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 4. LOG
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 076: Pontos de Explorar Experiências corrigidos';
  RAISE NOTICE '  - Função registrar_visita_experiencias agora credita 5 pts';
  RAISE NOTICE '  - Alinhado com valor mostrado no card (tarefas.pontos)';
END $$;
