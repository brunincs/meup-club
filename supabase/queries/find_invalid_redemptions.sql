-- ============================================
-- QUERY: Identificar Resgates com Dados Invalidos
-- Execute no SQL Editor do Supabase para listar registros problematicos
-- ============================================

-- 1. LISTAR TODOS OS RESGATES INVALIDOS (para revisao)
SELECT
  rs.id,
  rs.experiencia_nome,
  e.tipo_entrega,
  e.subtipo_entrega,
  rs.status,
  rs.viagem_id,
  rs.voo_id,
  rs.formulario_dados,
  rs.created_at,
  p.name as cliente,
  p.email as cliente_email,
  CASE
    -- Servico de voo sem viagem
    WHEN e.tipo_entrega = 'servico_voo' AND rs.viagem_id IS NULL
      THEN 'FALTA VIAGEM'
    -- Servico de voo (assento/bagagem) sem passageiro
    WHEN e.tipo_entrega = 'servico_voo'
      AND e.subtipo_entrega IN ('assento', 'bagagem')
      AND NULLIF(TRIM(rs.formulario_dados->>'passageiro'), '') IS NULL
      THEN 'FALTA PASSAGEIRO'
    -- Servico de voo (sala_vip) sem aeroporto
    WHEN e.tipo_entrega = 'servico_voo'
      AND e.subtipo_entrega = 'sala_vip'
      AND NULLIF(TRIM(rs.formulario_dados->>'aeroporto'), '') IS NULL
      THEN 'FALTA AEROPORTO'
    -- Arquivo sem destino
    WHEN e.tipo_entrega = 'arquivo'
      AND NULLIF(TRIM(rs.formulario_dados->>'destino'), '') IS NULL
      THEN 'FALTA DESTINO'
    -- Envio fisico sem endereco
    WHEN e.tipo_entrega = 'envio_fisico'
      AND NULLIF(TRIM(rs.formulario_dados->>'destinatario'), '') IS NULL
      THEN 'FALTA DESTINATARIO'
    WHEN e.tipo_entrega = 'envio_fisico'
      AND NULLIF(TRIM(rs.formulario_dados->>'cep'), '') IS NULL
      THEN 'FALTA CEP'
    WHEN e.tipo_entrega = 'envio_fisico'
      AND NULLIF(TRIM(rs.formulario_dados->>'logradouro'), '') IS NULL
      THEN 'FALTA ENDERECO'
    ELSE 'OUTRO'
  END as problema
FROM resgate_solicitacoes rs
JOIN experiencias e ON e.id = rs.experiencia_id
JOIN profiles p ON p.id = rs.user_id
WHERE
  -- Servico de voo sem viagem
  (e.tipo_entrega = 'servico_voo' AND rs.viagem_id IS NULL)
  OR
  -- Servico de voo (assento/bagagem) sem passageiro
  (e.tipo_entrega = 'servico_voo'
   AND e.subtipo_entrega IN ('assento', 'bagagem')
   AND NULLIF(TRIM(rs.formulario_dados->>'passageiro'), '') IS NULL)
  OR
  -- Servico de voo (sala_vip) sem aeroporto
  (e.tipo_entrega = 'servico_voo'
   AND e.subtipo_entrega = 'sala_vip'
   AND NULLIF(TRIM(rs.formulario_dados->>'aeroporto'), '') IS NULL)
  OR
  -- Arquivo sem destino
  (e.tipo_entrega = 'arquivo'
   AND NULLIF(TRIM(rs.formulario_dados->>'destino'), '') IS NULL)
  OR
  -- Envio fisico sem endereco
  (e.tipo_entrega = 'envio_fisico'
   AND (
     NULLIF(TRIM(rs.formulario_dados->>'destinatario'), '') IS NULL
     OR NULLIF(TRIM(rs.formulario_dados->>'cep'), '') IS NULL
     OR NULLIF(TRIM(rs.formulario_dados->>'logradouro'), '') IS NULL
   ))
ORDER BY rs.created_at DESC;


-- ============================================
-- 2. CONTAGEM POR TIPO DE PROBLEMA
-- ============================================

SELECT
  e.tipo_entrega,
  e.subtipo_entrega,
  COUNT(*) as total_invalidos
FROM resgate_solicitacoes rs
JOIN experiencias e ON e.id = rs.experiencia_id
WHERE
  (e.tipo_entrega = 'servico_voo' AND rs.viagem_id IS NULL)
  OR
  (e.tipo_entrega = 'servico_voo'
   AND e.subtipo_entrega IN ('assento', 'bagagem')
   AND NULLIF(TRIM(rs.formulario_dados->>'passageiro'), '') IS NULL)
  OR
  (e.tipo_entrega = 'servico_voo'
   AND e.subtipo_entrega = 'sala_vip'
   AND NULLIF(TRIM(rs.formulario_dados->>'aeroporto'), '') IS NULL)
  OR
  (e.tipo_entrega = 'arquivo'
   AND NULLIF(TRIM(rs.formulario_dados->>'destino'), '') IS NULL)
  OR
  (e.tipo_entrega = 'envio_fisico'
   AND (
     NULLIF(TRIM(rs.formulario_dados->>'destinatario'), '') IS NULL
     OR NULLIF(TRIM(rs.formulario_dados->>'cep'), '') IS NULL
     OR NULLIF(TRIM(rs.formulario_dados->>'logradouro'), '') IS NULL
   ))
GROUP BY e.tipo_entrega, e.subtipo_entrega
ORDER BY total_invalidos DESC;


-- ============================================
-- 3. CANCELAR RESGATES INVALIDOS (com devolucao de pontos)
-- ATENCAO: Execute apenas apos revisar a lista acima!
-- Descomente para executar
-- ============================================

/*
-- Cancela cada resgate invalido devolvendo os pontos
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rs.id
    FROM resgate_solicitacoes rs
    JOIN experiencias e ON e.id = rs.experiencia_id
    WHERE rs.status IN ('pendente', 'solicitado', 'em_preparacao')
      AND (
        (e.tipo_entrega = 'servico_voo' AND rs.viagem_id IS NULL)
        OR (e.tipo_entrega = 'servico_voo'
            AND e.subtipo_entrega IN ('assento', 'bagagem')
            AND NULLIF(TRIM(rs.formulario_dados->>'passageiro'), '') IS NULL)
        OR (e.tipo_entrega = 'envio_fisico'
            AND NULLIF(TRIM(rs.formulario_dados->>'cep'), '') IS NULL)
      )
  LOOP
    PERFORM admin_cancel_redemption(r.id, 'Cancelado automaticamente - dados incompletos');
  END LOOP;
END $$;
*/
