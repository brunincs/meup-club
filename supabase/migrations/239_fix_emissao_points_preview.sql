-- ============================================
-- MIGRATION 239: Corrigir get_emissao_points_preview
-- Problema: Free contava 1 pt por R$1, deveria ser 0.5
-- ============================================

CREATE OR REPLACE FUNCTION public.get_emissao_points_preview(p_user_id UUID, p_valor INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano TEXT;
  v_ciclo TEXT;
  v_multiplicador DECIMAL(4,2);
  v_pontos_base INTEGER;
  v_pontos_final INTEGER;
BEGIN
  -- BUSCAR PLANO E CICLO
  v_plano := COALESCE(get_plano_usuario(p_user_id), 'free');
  v_ciclo := get_ciclo_usuario(p_user_id);

  -- CALCULAR MULTIPLICADOR CORRETO
  -- Free: 0.5 pt por R$1
  -- Prime mensal: 1.0 pt por R$1
  -- Prime anual: 1.5 pt por R$1
  IF v_plano = 'prime' AND v_ciclo = 'anual' THEN
    v_multiplicador := 1.5;
  ELSIF v_plano = 'prime' THEN
    v_multiplicador := 1.0;
  ELSE
    -- FREE = 0.5 pt por R$1
    v_multiplicador := 0.5;
  END IF;

  -- CALCULAR PONTOS
  v_pontos_base := p_valor;  -- valor em reais
  v_pontos_final := FLOOR(v_pontos_base * v_multiplicador);

  -- Garantir pelo menos 1 ponto
  IF v_pontos_final < 1 THEN
    v_pontos_final := 1;
  END IF;

  RETURN jsonb_build_object(
    'plano', v_plano,
    'ciclo', v_ciclo,
    'multiplicador', v_multiplicador,
    'pontos_base', v_pontos_base,
    'pontos_final', v_pontos_final,
    'label', v_pontos_final || ' pts' || CASE
      WHEN v_plano = 'prime' AND v_ciclo = 'anual' THEN ' (Prime anual 1.5x)'
      WHEN v_plano = 'prime' THEN ' (Prime 1.0x)'
      ELSE ' (Free 0.5x)'
    END
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_emissao_points_preview(UUID, INTEGER) TO authenticated;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 239: get_emissao_points_preview corrigido';
  RAISE NOTICE '  - Free: 0.5 pt por R$1';
  RAISE NOTICE '  - Prime mensal: 1.0 pt por R$1';
  RAISE NOTICE '  - Prime anual: 1.5 pt por R$1';
END $$;
