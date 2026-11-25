SELECT
  teste.vendidas,
  CASE
    WHEN teste.vendidas < 20 THEN 1
    WHEN teste.vendidas < 60 THEN 2
    WHEN teste.vendidas < 100 THEN 3
    ELSE 0
  END as lote,
  CASE
    WHEN teste.vendidas < 20 THEN 497
    WHEN teste.vendidas < 60 THEN 597
    WHEN teste.vendidas < 100 THEN 697
    ELSE 997
  END as preco,
  CASE
    WHEN teste.vendidas < 20 THEN 20 - teste.vendidas
    WHEN teste.vendidas < 60 THEN 60 - teste.vendidas
    WHEN teste.vendidas < 100 THEN 100 - teste.vendidas
    ELSE 0
  END as restantes,
  CASE
    WHEN teste.vendidas < 20 THEN 'Lote 1 (R$497)'
    WHEN teste.vendidas < 60 THEN 'Lote 2 (R$597)'
    WHEN teste.vendidas < 100 THEN 'Lote 3 (R$697)'
    ELSE 'ESGOTADO (R$997)'
  END as status
FROM (VALUES (2), (19), (20), (59), (60), (99), (100)) AS teste(vendidas)
ORDER BY teste.vendidas;
