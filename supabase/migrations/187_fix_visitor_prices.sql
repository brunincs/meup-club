-- ============================================
-- MIGRAÇÃO 187: Visitantes veem preços Prime
-- Por prompt: "Visitante da landing vê o preço Prime"
-- ============================================

-- Atualizar função para mostrar Prime para visitantes
DROP FUNCTION IF EXISTS get_experiencias_com_precos(UUID);

CREATE OR REPLACE FUNCTION get_experiencias_com_precos(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao TEXT,
  valor_reais NUMERIC,
  valor_referencia_reais NUMERIC,
  pontos_free INTEGER,
  pontos_prime INTEGER,
  pontos_usuario INTEGER,
  classe_minima INTEGER,
  selo TEXT,
  imagem_url TEXT,
  tipo_entrega TEXT,
  subtipo_entrega TEXT,
  ordem INTEGER,
  ativa BOOLEAN,
  tipo TEXT,
  destino TEXT,
  vinculado_viagem BOOLEAN,
  por_passageiro BOOLEAN,
  por_trecho BOOLEAN,
  compra_minima_reais NUMERIC,
  limite_por_compra INTEGER,
  regras TEXT,
  o_que_inclui TEXT,
  categoria TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_plano TEXT;
  v_is_visitor BOOLEAN;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  v_is_visitor := (v_user_id IS NULL);

  -- Buscar plano do usuário (visitante usa NULL)
  IF NOT v_is_visitor THEN
    SELECT COALESCE(
      (SELECT s.plano::TEXT FROM subscriptions s WHERE s.user_id = v_user_id AND s.status = 'active'),
      'free'
    ) INTO v_plano;
  ELSE
    v_plano := NULL; -- Visitante
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.descricao,
    e.valor_reais,
    e.valor_referencia_reais,
    COALESCE(e.pontos_free, 0) as pontos_free,
    COALESCE(e.pontos_prime, 0) as pontos_prime,
    -- Visitante vê preço Prime, cliente logado vê preço do seu plano
    CASE
      WHEN e.tipo = 'sob_consulta' THEN NULL
      WHEN e.tipo = 'privilegio' THEN NULL
      WHEN v_is_visitor THEN COALESCE(e.pontos_prime, 0) -- VISITANTE = PRIME
      WHEN v_plano = 'prime' THEN COALESCE(e.pontos_prime, 0)
      ELSE COALESCE(e.pontos_free, 0)
    END as pontos_usuario,
    COALESCE(e.classe_minima, 1) as classe_minima,
    e.selo,
    e.imagem_url,
    e.tipo_entrega,
    e.subtipo_entrega,
    COALESCE(e.ordem, 999) as ordem,
    COALESCE(e.ativa, true) as ativa,
    COALESCE(e.tipo, 'fixo') as tipo,
    e.destino,
    COALESCE(e.vinculado_viagem, false) as vinculado_viagem,
    COALESCE(e.por_passageiro, false) as por_passageiro,
    COALESCE(e.por_trecho, false) as por_trecho,
    e.compra_minima_reais,
    e.limite_por_compra,
    e.regras,
    e.o_que_inclui,
    e.categoria
  FROM experiencias e
  WHERE e.ativa = TRUE
  ORDER BY e.ordem ASC, e.nome ASC;
END;
$$;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE 'Função get_experiencias_com_precos atualizada: visitantes veem preço Prime';
END $$;
