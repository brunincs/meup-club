-- ============================================
-- MIGRAÇÃO 186: Atualizar RPC get_experiencias_com_precos
-- Usar campos pré-calculados pontos_prime e pontos_free
-- Incluir novos campos: tipo, destino, etc.
-- ============================================

-- Dropar função antiga e recriar com novos campos
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
  v_classe_usuario INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Buscar plano e classe do usuário
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(
      (SELECT s.plano::TEXT FROM subscriptions s WHERE s.user_id = v_user_id AND s.status = 'active'),
      'free'
    ) INTO v_plano;

    -- Buscar classe atual do usuário (para privilégios)
    SELECT COALESCE(
      (SELECT pe.id FROM plano_efetivo(v_user_id) pe),
      1
    ) INTO v_classe_usuario;
  ELSE
    v_plano := 'free';
    v_classe_usuario := 1;
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.descricao,
    e.valor_reais,
    e.valor_referencia_reais,
    -- Usar campos pré-calculados
    COALESCE(e.pontos_free, 0) as pontos_free,
    COALESCE(e.pontos_prime, 0) as pontos_prime,
    -- Pontos do usuário baseado no plano
    CASE
      WHEN e.tipo = 'sob_consulta' THEN NULL -- Sob consulta não tem preço fixo
      WHEN e.tipo = 'privilegio' THEN NULL -- Privilégio não usa pontos
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
    -- Novos campos
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
    -- Esconder privilégios se o usuário não é Me,up Exclusive (classe 5)
    -- Mas mostrar para todos (prompt diz que é para motivação)
    -- A restrição é só no botão de resgate
  ORDER BY
    -- Ordenar: destino do usuário primeiro (futuro), depois por ordem
    e.ordem ASC,
    e.nome ASC;
END;
$$;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE 'Função get_experiencias_com_precos atualizada com novos campos';
END $$;
