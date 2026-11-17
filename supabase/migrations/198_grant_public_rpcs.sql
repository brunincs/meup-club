-- Migration: 198_grant_public_rpcs.sql
-- Concede permissões para RPCs públicas (acessíveis sem login)
-- Me,up Club - Modelo Exclusivo

-- ============================================
-- GRANT: validar_convite
-- Permite que usuários anônimos validem códigos de convite
-- (necessário para página /convite/:code funcionar sem login)
-- ============================================
GRANT EXECUTE ON FUNCTION validar_convite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validar_convite(TEXT) TO authenticated;

-- ============================================
-- GRANT: get_vagas_status
-- Permite verificar status de vagas (landing page)
-- ============================================
GRANT EXECUTE ON FUNCTION get_vagas_status() TO anon;
GRANT EXECUTE ON FUNCTION get_vagas_status() TO authenticated;

-- ============================================
-- GRANT: get_config_exclusivo
-- Permite ler configs públicas
-- ============================================
GRANT EXECUTE ON FUNCTION get_config_exclusivo(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_config_exclusivo(TEXT, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION get_config_exclusivo_int(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_config_exclusivo_int(TEXT, INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION get_config_int(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_config_int(TEXT, INTEGER) TO authenticated;

-- ============================================
-- GRANT: clube_esta_aberto / esta_em_prelancamento
-- Permite verificar status do clube
-- ============================================
GRANT EXECUTE ON FUNCTION clube_esta_aberto() TO anon;
GRANT EXECUTE ON FUNCTION clube_esta_aberto() TO authenticated;

GRANT EXECUTE ON FUNCTION esta_em_prelancamento() TO anon;
GRANT EXECUTE ON FUNCTION esta_em_prelancamento() TO authenticated;

COMMENT ON FUNCTION validar_convite IS 'Valida código de convite - PÚBLICO (acessível sem login)';
