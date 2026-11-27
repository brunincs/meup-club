-- ============================================
-- MIGRAÇÃO 216: Corrigir get_planos_config
-- Ler valores reais de plano_config em vez de hardcoded
-- Free: 0.5 pt/R$, 2000 indicação
-- Prime: 1.5 pt/R$, 5000 indicação
-- ============================================

CREATE OR REPLACE FUNCTION get_planos_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_free_mult NUMERIC;
  v_prime_mult NUMERIC;
  v_free_indicacao INTEGER;
  v_prime_indicacao INTEGER;
  v_dias_bloqueio INTEGER;
BEGIN
  -- Ler multiplicadores de plano_config (fonte única de verdade)
  SELECT COALESCE(valor, 0.5) INTO v_free_mult
  FROM plano_config WHERE chave = 'pontos_por_real_free';

  SELECT COALESCE(valor, 1.5) INTO v_prime_mult
  FROM plano_config WHERE chave = 'pontos_por_real_prime';

  -- Ler pontos de indicação
  SELECT COALESCE(valor, 2000) INTO v_free_indicacao
  FROM plano_config WHERE chave = 'pontos_indicacao_free';

  SELECT COALESCE(valor, 5000) INTO v_prime_indicacao
  FROM plano_config WHERE chave = 'pontos_indicacao_prime';

  -- Dias de bloqueio
  SELECT COALESCE(valor, 7) INTO v_dias_bloqueio
  FROM plano_config WHERE chave = 'carencia_bonus_prime_dias';

  -- Garantir fallbacks se não existirem as chaves
  v_free_mult := COALESCE(v_free_mult, 0.5);
  v_prime_mult := COALESCE(v_prime_mult, 1.5);
  v_free_indicacao := COALESCE(v_free_indicacao, 2000);
  v_prime_indicacao := COALESCE(v_prime_indicacao, 5000);
  v_dias_bloqueio := COALESCE(v_dias_bloqueio, 7);

  RETURN jsonb_build_object(
    'free', jsonb_build_object(
      'nome', 'Free',
      'descricao', 'Acesso básico ao clube',
      'pontosCheckin', 10,
      'pontosIndicacao', v_free_indicacao,
      'multiplicadorViagem', v_free_mult,
      'fatorPontos', 150
    ),
    'prime', jsonb_build_object(
      'nome', 'Prime',
      'descricao', 'Benefícios exclusivos',
      'pontosCheckin', 30,
      'pontosIndicacao', v_prime_indicacao,
      'multiplicadorViagem', v_prime_mult,
      'fatorPontos', 130,
      'pontosAnualIndicador', 3000,
      'pontosAnualIndicado', 1000
    ),
    'config', jsonb_build_object(
      'diasBloqueio', v_dias_bloqueio
    )
  );
END;
$$;

-- Log
DO $$
BEGIN
  RAISE NOTICE '✓ Migração 216: get_planos_config lendo de plano_config';
  RAISE NOTICE '  - Free: 0.5 pt/R$, 2000 indicação';
  RAISE NOTICE '  - Prime: 1.5 pt/R$, 5000 indicação';
END $$;
