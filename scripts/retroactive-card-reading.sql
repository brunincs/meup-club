-- ============================================
-- Script: Leitura Retroativa de Cards Meup
-- Execute no Supabase SQL Editor (Production)
-- ============================================

-- 1. Ver emissões aprovadas com card que precisam de leitura
SELECT
  e.id,
  e.user_id,
  p.name as usuario,
  e.card_meup_path,
  e.card_lido,
  e.status,
  e.created_at
FROM emissoes e
JOIN profiles p ON e.user_id = p.id
WHERE e.status = 'aprovado'
  AND e.card_meup_path IS NOT NULL
  AND (e.card_lido = false OR e.card_lido IS NULL)
ORDER BY e.created_at DESC;

-- 2. A leitura é feita via Edge Function, então é preciso
--    chamar a função via frontend (AdminEmissoes) ou via API.
--
--    No frontend, vá em Admin → Emissões → aba "Dados pendentes"
--    e clique no botão "Ler card" para cada emissão.
--
--    Ou use curl para chamar diretamente:
--
--    curl -X POST "https://dmemturmddbbzspvdgoh.supabase.co/functions/v1/ler-card-meup" \
--      -H "Authorization: Bearer YOUR_ANON_KEY" \
--      -H "Content-Type: application/json" \
--      -d '{"emissao_id": "UUID_DA_EMISSAO"}'

-- 3. Ver estatísticas de uso da IA
SELECT * FROM ia_uso ORDER BY created_at DESC LIMIT 20;

-- 4. Ver viagens criadas automaticamente
SELECT
  v.titulo,
  v.origem,
  v.destino,
  v.data_ida,
  v.dados_status,
  p.name as usuario
FROM viagens v
JOIN profiles p ON v.user_id = p.id
ORDER BY v.created_at DESC
LIMIT 20;
