-- ============================================
-- CONFERÊNCIA: Admin vs Cliente (Experiências)
-- Compara o que o admin mostra com o que o cliente vê
-- via RPC get_experiencias_com_precos
-- ============================================

-- Esta query deve retornar 0 linhas se tudo estiver correto
-- Qualquer linha retornada indica discrepância

WITH admin_view AS (
  -- O que o admin vê (leitura direta da tabela)
  SELECT
    id,
    nome,
    tipo,
    valor_referencia_reais,
    pontos_prime AS admin_prime,
    pontos_free AS admin_free
  FROM experiencias
  WHERE ativa = TRUE
),
cliente_view AS (
  -- O que o cliente vê (via RPC, simulando usuário free)
  SELECT
    id,
    pontos_prime AS cliente_prime,
    pontos_free AS cliente_free
  FROM get_experiencias_com_precos(NULL) -- NULL = visitante, mostra Prime
)
SELECT
  a.id,
  a.nome,
  a.tipo,
  a.valor_referencia_reais,
  a.admin_prime,
  c.cliente_prime,
  CASE WHEN a.admin_prime = c.cliente_prime THEN 'OK' ELSE 'ERRO' END AS check_prime,
  a.admin_free,
  c.cliente_free,
  CASE WHEN a.admin_free = c.cliente_free THEN 'OK' ELSE 'ERRO' END AS check_free
FROM admin_view a
LEFT JOIN cliente_view c ON a.id = c.id
WHERE
  -- Só mostra linhas com discrepância
  (a.admin_prime IS DISTINCT FROM c.cliente_prime)
  OR (a.admin_free IS DISTINCT FROM c.cliente_free)
ORDER BY a.nome;

-- ============================================
-- RESUMO: Contagem de experiências por status
-- ============================================

SELECT
  COUNT(*) FILTER (WHERE tipo = 'fixo' AND pontos_prime IS NOT NULL AND pontos_free IS NOT NULL) AS fixo_ok,
  COUNT(*) FILTER (WHERE tipo = 'fixo' AND (pontos_prime IS NULL OR pontos_free IS NULL)) AS fixo_sem_preco,
  COUNT(*) FILTER (WHERE tipo = 'sob_consulta') AS sob_consulta,
  COUNT(*) FILTER (WHERE tipo = 'em_breve') AS em_breve,
  COUNT(*) FILTER (WHERE tipo = 'privilegio') AS privilegio,
  COUNT(*) AS total
FROM experiencias
WHERE ativa = TRUE;

-- ============================================
-- AMOSTRA: Valores esperados (cálculo = valor × fator, CEIL ao múltiplo de 250)
-- Fatores: Prime = 125, Free = 150
-- ============================================

SELECT
  nome,
  valor_referencia_reais,
  pontos_prime,
  pontos_free,
  -- Verificar se o cálculo está correto
  CASE
    WHEN tipo IN ('sob_consulta', 'privilegio') THEN
      CASE WHEN pontos_prime IS NULL AND pontos_free IS NULL THEN 'OK (sem pontos)' ELSE 'VERIFICAR' END
    WHEN pontos_prime = CEIL(valor_referencia_reais * 125 / 250.0) * 250
     AND pontos_free = CEIL(valor_referencia_reais * 150 / 250.0) * 250 THEN 'OK'
    ELSE 'RECALCULAR'
  END AS conferencia,
  -- Valores esperados (para debug)
  CEIL(valor_referencia_reais * 125 / 250.0) * 250 AS prime_esperado,
  CEIL(valor_referencia_reais * 150 / 250.0) * 250 AS free_esperado
FROM experiencias
WHERE ativa = TRUE
  AND (
    nome LIKE '%Assento padrão%nacional%'
    OR nome LIKE '%Sala VIP%'
    OR nome LIKE '%Burj Khalifa%'
    OR nome LIKE '%1ª bagagem%internacional%'
  )
ORDER BY nome;

-- ============================================
-- TODAS AS EXPERIÊNCIAS: Verificar cálculo
-- ============================================

SELECT
  nome,
  tipo,
  valor_referencia_reais AS valor_ref,
  pontos_prime AS prime_atual,
  CEIL(valor_referencia_reais * 125 / 250.0) * 250 AS prime_calc,
  pontos_free AS free_atual,
  CEIL(valor_referencia_reais * 150 / 250.0) * 250 AS free_calc,
  CASE
    WHEN tipo IN ('sob_consulta', 'privilegio') AND pontos_prime IS NULL THEN 'OK'
    WHEN pontos_prime = CEIL(valor_referencia_reais * 125 / 250.0) * 250
     AND pontos_free = CEIL(valor_referencia_reais * 150 / 250.0) * 250 THEN 'OK'
    ELSE 'DIFF'
  END AS status
FROM experiencias
WHERE ativa = TRUE
ORDER BY ordem;
