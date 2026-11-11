-- ============================================
-- MIGRAÇÃO 114: Adicionar fundador_ano em plano_config
-- ============================================

INSERT INTO plano_config (chave, valor, descricao)
VALUES ('fundador_ano', 2026, 'Ano do selo de fundador atual')
ON CONFLICT (chave) DO UPDATE SET valor = 2026;
