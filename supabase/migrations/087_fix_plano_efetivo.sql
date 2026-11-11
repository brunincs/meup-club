-- =============================================
-- MIGRAÇÃO 087: CORRIGIR plano_efetivo
--
-- PROBLEMA: plano_efetivo retorna TEXT scalar,
--           mas get_user_benefits espera record(plano, ciclo)
--
-- SOLUÇÃO: Retornar TABLE(plano, ciclo)
-- =============================================

DROP FUNCTION IF EXISTS public.plano_efetivo(UUID);

CREATE OR REPLACE FUNCTION public.plano_efetivo(p_user_id UUID)
RETURNS TABLE(plano subscription_plano, ciclo subscription_ciclo)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano subscription_plano := 'free';
  v_ciclo subscription_ciclo := 'mensal';
BEGIN
  -- Buscar assinatura ativa do usuário
  SELECT s.plano, s.ciclo INTO v_plano, v_ciclo
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Retornar plano e ciclo (default: free/mensal)
  RETURN QUERY SELECT
    COALESCE(v_plano, 'free'::subscription_plano),
    COALESCE(v_ciclo, 'mensal'::subscription_ciclo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.plano_efetivo(UUID) TO authenticated;

-- =============================================
-- VERIFICAÇÃO
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 087: plano_efetivo corrigido para retornar (plano, ciclo)';
END $$;
