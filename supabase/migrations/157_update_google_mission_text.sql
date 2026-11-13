-- ============================================
-- MIGRAÇÃO: Atualizar texto da missão Google
-- Trocar "Deixe uma avaliação 5 estrelas" por texto mais neutro
-- ============================================

-- Atualizar a descrição da missão do Google
UPDATE tarefas
SET
  descricao = 'Conte no Google como foi sua experiência com a Me,up',
  updated_at = NOW()
WHERE LOWER(nome) LIKE '%google%'
   OR LOWER(nome) LIKE '%avaliar%google%'
   OR LOWER(nome) LIKE '%avaliação%google%';

-- Também atualizar se houver menção a "5 estrelas" na descrição
UPDATE tarefas
SET
  descricao = 'Conte no Google como foi sua experiência com a Me,up',
  updated_at = NOW()
WHERE LOWER(descricao) LIKE '%5 estrelas%'
  AND (LOWER(nome) LIKE '%google%' OR LOWER(descricao) LIKE '%google%');
