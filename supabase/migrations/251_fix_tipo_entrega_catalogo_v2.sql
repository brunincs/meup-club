-- ============================================
-- MIGRATION 251: Fix tipo_entrega do catálogo v2
-- Experiências vinculadas a viagem precisam de tipo_entrega correto
-- ============================================

-- ============================================
-- 1. ASSENTO (servico_voo / assento)
-- ============================================

-- Assento à frente · voo nacional
UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'assento'
WHERE nome ILIKE '%Assento à frente%voo nacional%'
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- Assento padrão · voo nacional
UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'assento'
WHERE nome ILIKE '%Assento padrão%voo nacional%'
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- Escolha de assento · voo internacional
UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'assento'
WHERE nome ILIKE '%Escolha de assento%voo internacional%'
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- ============================================
-- 2. BAGAGEM (servico_voo / bagagem)
-- ============================================

-- 1ª bagagem despachada · voo nacional
UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'bagagem'
WHERE nome ILIKE '%bagagem despachada%voo nacional%'
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- 1ª bagagem despachada · voo internacional
UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'bagagem'
WHERE nome ILIKE '%bagagem despachada%voo internacional%'
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- ============================================
-- 3. SALA VIP (servico_voo / sala_vip)
-- ============================================

UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'sala_vip'
WHERE (nome ILIKE '%Sala VIP%' OR nome ILIKE '%Lounge%')
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- ============================================
-- 4. EMBARQUE PRIORITÁRIO (servico_voo / assento - usa mesmo form)
-- ============================================

UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'assento'
WHERE nome ILIKE '%Embarque prioritário%'
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- ============================================
-- 5. UPGRADE PARA EXECUTIVA (servico_voo / assento)
-- ============================================

UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = 'assento'
WHERE nome ILIKE '%Upgrade%Executiva%'
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- ============================================
-- 6. TRANSFER VIP (servico_voo / null - só viagem + passageiro)
-- ============================================

UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = NULL
WHERE nome ILIKE '%Transfer VIP%'
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- ============================================
-- 7. PASSEIOS/EXPERIÊNCIAS DE DESTINO (servico_voo / null)
-- Precisa de viagem (para data) e passageiros
-- ============================================

UPDATE experiencias
SET tipo_entrega = 'servico_voo', subtipo_entrega = NULL
WHERE (
  nome ILIKE '%Ferry%'
  OR nome ILIKE '%Empire State%'
  OR nome ILIKE '%Burj Khalifa%'
  OR nome ILIKE '%Torre Eiffel%'
  OR nome ILIKE '%Louvre%'
  OR nome ILIKE '%Coliseu%'
  OR nome ILIKE '%Vaticano%'
  OR nome ILIKE '%Sagrada%'
  OR nome ILIKE '%Safári%'
  OR nome ILIKE '%dhow%'
  OR nome ILIKE '%Sena%'
  OR nome ILIKE '%Early check-in%'
  OR nome ILIKE '%late checkout%'
)
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- ============================================
-- 8. CRÉDITOS DE VIAGEM (voucher)
-- ============================================

UPDATE experiencias
SET tipo_entrega = 'voucher', subtipo_entrega = NULL
WHERE (nome ILIKE '%Crédito%viagem%' OR nome ILIKE '%credito%viagem%')
  AND tipo_entrega IS NULL;

-- ============================================
-- 9. eSIM / SEGURO / KIT / ROTEIRO (arquivo ou envio_fisico)
-- ============================================

-- eSIM
UPDATE experiencias
SET tipo_entrega = 'arquivo', subtipo_entrega = NULL
WHERE nome ILIKE '%eSIM%'
  AND tipo_entrega IS NULL;

-- Seguro viagem
UPDATE experiencias
SET tipo_entrega = 'arquivo', subtipo_entrega = NULL
WHERE nome ILIKE '%Seguro viagem%'
  AND tipo_entrega IS NULL;

-- Kit viagem (envio físico)
UPDATE experiencias
SET tipo_entrega = 'envio_fisico', subtipo_entrega = NULL
WHERE nome ILIKE '%Kit viagem%'
  AND tipo_entrega IS NULL;

-- Roteiro
UPDATE experiencias
SET tipo_entrega = 'arquivo', subtipo_entrega = NULL
WHERE (nome ILIKE '%Roteiro%' OR nome ILIKE '%Consultoria de roteiro%')
  AND tipo_entrega IS NULL;

-- ============================================
-- 10. GARANTIR CONSISTÊNCIA: vinculado_viagem = true → tipo_entrega = servico_voo
-- ============================================

UPDATE experiencias
SET tipo_entrega = 'servico_voo'
WHERE vinculado_viagem = TRUE
  AND (tipo_entrega IS NULL OR tipo_entrega = 'voucher');

-- ============================================
-- 11. ATUALIZAR CONSTRAINT DE SUBTIPO (adicionar NULL para passeios)
-- ============================================

-- Remover constraint antiga
ALTER TABLE experiencias DROP CONSTRAINT IF EXISTS experiencias_subtipo_entrega_check;

-- Recriar com valores possíveis
ALTER TABLE experiencias ADD CONSTRAINT experiencias_subtipo_entrega_check
  CHECK (subtipo_entrega IS NULL OR subtipo_entrega IN ('assento', 'bagagem', 'sala_vip', 'embarque', 'passeio'));

NOTIFY pgrst, 'reload schema';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM experiencias
  WHERE tipo_entrega = 'servico_voo';

  RAISE NOTICE '✓ Migration 251: % experiências com tipo_entrega = servico_voo', v_count;
END $$;
