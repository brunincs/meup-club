-- ============================================
-- MIGRAÇÃO 161: Força atualização do schema PostgREST
-- Cria um comentário na função para forçar mudança
-- ============================================

-- Adicionar comentário à função para forçar mudança de schema
COMMENT ON FUNCTION get_passageiros_voo(TEXT, TEXT) IS
'Retorna passageiros de um voo com status de resgate. v2 - Parâmetros TEXT para compatibilidade com Supabase RPC.';

-- Forçar reload do schema PostgREST
NOTIFY pgrst, 'reload schema';

-- Também vamos verificar e dropar quaisquer outras versões que possam existir
DO $$
BEGIN
  -- Verificar se existe função com assinatura UUID
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_passageiros_voo'
    AND pg_get_function_identity_arguments(p.oid) LIKE '%uuid%'
  ) THEN
    RAISE NOTICE 'Encontrada versão com UUID - tentando dropar...';
    -- Tentar dropar qualquer versão UUID restante
    BEGIN
      DROP FUNCTION IF EXISTS get_passageiros_voo(UUID, TEXT);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    BEGIN
      DROP FUNCTION IF EXISTS get_passageiros_voo(UUID);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  ELSE
    RAISE NOTICE 'Nenhuma versão UUID encontrada - OK';
  END IF;
END $$;

-- Listar todas as versões existentes para debug
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_passageiros_voo';
