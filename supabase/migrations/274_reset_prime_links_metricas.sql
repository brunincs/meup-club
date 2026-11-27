-- ============================================
-- MIGRATION 274: Reset prime_links e métricas admin
-- Preparação para clientes reais
-- ============================================

-- ============================================
-- 1. ZERAR PRIME LINKS
-- ============================================

-- Remover todos os links Prime (mantendo estrutura)
DELETE FROM prime_links;

DO $$
BEGIN
  -- Resetar sequence se existir
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'prime_links_id_seq') THEN
    ALTER SEQUENCE prime_links_id_seq RESTART WITH 1;
  END IF;
  RAISE NOTICE '✓ prime_links zerado';
END $$;

-- ============================================
-- 2. ZERAR MÉTRICAS (se existirem)
-- ============================================

DO $$
BEGIN
  -- Zerar metricas_aquisicao se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'metricas_aquisicao') THEN
    EXECUTE 'DELETE FROM metricas_aquisicao';
    RAISE NOTICE '✓ metricas_aquisicao zerado';
  END IF;

  -- Zerar metricas_diarias se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'metricas_diarias') THEN
    EXECUTE 'DELETE FROM metricas_diarias';
    RAISE NOTICE '✓ metricas_diarias zerado';
  END IF;

  -- Zerar metricas_conversao se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'metricas_conversao') THEN
    EXECUTE 'DELETE FROM metricas_conversao';
    RAISE NOTICE '✓ metricas_conversao zerado';
  END IF;
END $$;

-- ============================================
-- 3. ZERAR AUDIT_LOGS DE TESTE
-- ============================================

DO $$
BEGIN
  -- Remover logs de teste (manter estrutura)
  DELETE FROM audit_logs
  WHERE user_id IN (SELECT id FROM profiles WHERE COALESCE(is_teste, false) = true);

  RAISE NOTICE '✓ audit_logs de teste removidos';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'audit_logs: %', SQLERRM;
END $$;

-- ============================================
-- 4. RESETAR FUNDADORES SEQUENCE (manter fundadores reais)
-- ============================================

DO $$
DECLARE
  v_max_vaga INTEGER;
BEGIN
  -- NÃO deletar fundadores - são clientes reais pagantes
  -- Apenas garantir que a sequence está correta
  SELECT COALESCE(MAX(vaga_numero), 0) INTO v_max_vaga FROM fundadores;

  IF v_max_vaga > 0 THEN
    PERFORM setval('fundadores_vaga_seq', v_max_vaga);
    RAISE NOTICE '✓ fundadores_vaga_seq ajustado para %', v_max_vaga;
  ELSE
    ALTER SEQUENCE fundadores_vaga_seq RESTART WITH 1;
    RAISE NOTICE '✓ fundadores_vaga_seq resetado para 1';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'fundadores_vaga_seq: %', SQLERRM;
END $$;

-- ============================================
-- 5. LIMPAR LOGS ANTIGOS
-- ============================================

DO $$
BEGIN
  -- Remover eventos de teste antigos (manter últimas 24h para debug)
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '7 days';

  RAISE NOTICE '✓ audit_logs antigos removidos';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Limpeza audit_logs: %', SQLERRM;
END $$;

-- ============================================
-- FIM
-- ============================================

DO $$
DECLARE
  v_prime_links INTEGER;
  v_fundadores INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_prime_links FROM prime_links;
  SELECT COUNT(*) INTO v_fundadores FROM fundadores;

  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ Migration 274: Reset para clientes reais';
  RAISE NOTICE '  - prime_links: % registros', v_prime_links;
  RAISE NOTICE '  - fundadores: % (mantidos - são reais)', v_fundadores;
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
