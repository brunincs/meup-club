-- ============================================
-- MIGRAÇÃO 185: Corrigir valores das experiências de destino
-- valor_referencia = custo ÷ 0.8 (margem de 20%)
-- ============================================

-- Ferry da Estátua da Liberdade (custo 155 → valor_ref 193.75)
UPDATE experiencias SET
  valor_referencia_reais = 193.75,
  pontos_prime = 24250,
  pontos_free = 29000
WHERE nome ILIKE '%Ferry%Liberdade%';

-- Empire State Building (custo 364 → valor_ref 455)
UPDATE experiencias SET
  valor_referencia_reais = 455,
  pontos_prime = 57000,
  pontos_free = 68250
WHERE nome ILIKE '%Empire State%';

-- Burj Khalifa (custo 345 → valor_ref 431.25)
UPDATE experiencias SET
  valor_referencia_reais = 431.25,
  pontos_prime = 54000,
  pontos_free = 64750
WHERE nome ILIKE '%Burj Khalifa%';

-- Safári no deserto (custo 418 → valor_ref 522.5)
UPDATE experiencias SET
  valor_referencia_reais = 522.5,
  pontos_prime = 65250,
  pontos_free = 78500
WHERE nome ILIKE '%Saf%ri%deserto%';

-- Jantar em dhow (custo 272 → valor_ref 340)
UPDATE experiencias SET
  valor_referencia_reais = 340,
  pontos_prime = 42750,
  pontos_free = 51250
WHERE nome ILIKE '%dhow%';

-- Torre Eiffel (custo 256 → valor_ref 320)
UPDATE experiencias SET
  valor_referencia_reais = 320,
  pontos_prime = 40250,
  pontos_free = 48250
WHERE nome ILIKE '%Torre Eiffel%';

-- Louvre (custo 218 → valor_ref 272.5)
UPDATE experiencias SET
  valor_referencia_reais = 272.5,
  pontos_prime = 34000,
  pontos_free = 41000
WHERE nome ILIKE '%Louvre%';

-- Passeio barco Sena (custo 136 → valor_ref 170)
UPDATE experiencias SET
  valor_referencia_reais = 170,
  pontos_prime = 21250,
  pontos_free = 25500
WHERE nome ILIKE '%barco%Sena%';

-- Coliseu (custo 163 → valor_ref 203.75)
UPDATE experiencias SET
  valor_referencia_reais = 203.75,
  pontos_prime = 25500,
  pontos_free = 30750
WHERE nome ILIKE '%Coliseu%';

-- Vaticano (custo 170 → valor_ref 212.5)
UPDATE experiencias SET
  valor_referencia_reais = 212.5,
  pontos_prime = 26750,
  pontos_free = 32000
WHERE nome ILIKE '%Vaticano%';

-- Sagrada Família (custo 245 → valor_ref 306.25)
UPDATE experiencias SET
  valor_referencia_reais = 306.25,
  pontos_prime = 38250,
  pontos_free = 46000
WHERE nome ILIKE '%Sagrada Fam%lia%';

-- Verificação
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM experiencias WHERE destino IS NOT NULL;
  RAISE NOTICE 'Experiências de destino atualizadas: %', v_count;
END $$;
