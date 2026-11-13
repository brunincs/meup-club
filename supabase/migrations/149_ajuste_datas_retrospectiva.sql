-- Temporário: Sempre retorna true para testes
-- TODO: Configurar datas corretas via plano_config após verificar estrutura
CREATE OR REPLACE FUNCTION is_retrospectiva_disponivel(p_ano INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Temporário: sempre disponível para testes
  -- Em produção, verificar se estamos entre 1/nov e 31/jan
  RETURN TRUE;
END;
$$;
