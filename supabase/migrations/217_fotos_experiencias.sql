-- 217: Fotos curadas das experiências (batem com o nome). Espelha src/config/experienciaFotos.js
CREATE OR REPLACE FUNCTION pg_temp.u(id TEXT) RETURNS TEXT LANGUAGE sql AS
$$ SELECT 'https://images.unsplash.com/' || id || '?w=600&h=400&fit=crop&crop=center&q=80' $$;

UPDATE experiencias SET imagem_url = pg_temp.u(v.id)
FROM (VALUES
  ('Ferry da Estátua da Liberdade + Ellis Island', 'photo-1550837725-3018e30a18cb'),
  ('Empire State Building · mirante do 86º andar', 'photo-1555109307-f7d9da25c244'),
  ('Burj Khalifa · At the Top (níveis 124 e 125)', 'photo-1582672060674-bc2bd808a8b5'),
  ('Safári no deserto com jantar (compartilhado)', 'photo-1624062999726-083e5268525d'),
  ('Jantar em barco dhow · Dubai Marina', 'photo-1722502831583-b4e93ecc6027'),
  ('Torre Eiffel · topo por elevador', 'photo-1570097703229-b195d6dd291f'),
  ('Museu do Louvre (ingresso não europeu)', 'photo-1680449049533-69586f3ced53'),
  ('Passeio de barco no Sena', 'photo-1566922847100-0f9ae24fd2ac'),
  ('Coliseu · Full Experience (arena e subterrâneo)', 'photo-1622796912525-7d2740696745'),
  ('Museus do Vaticano + Capela Sistina', 'photo-1576016770956-debb63d92058'),
  ('Sagrada Família com subida à torre', 'photo-1568797473991-0e59d131ec5b'),
  ('Upgrade para Executiva', 'photo-1718948740023-ebb6e6f9cf6e'),
  ('Assento à frente · voo nacional', 'photo-1730916336146-1dad0a82642d'),
  ('Assento padrão · voo nacional', 'photo-1622967752036-9e4fd162725f'),
  ('Escolha de assento · voo internacional', 'photo-1641447093043-241f064568fb'),
  ('1ª bagagem despachada · voo nacional', 'photo-1757865579170-8d64d9aab467'),
  ('1ª bagagem despachada · voo internacional', 'photo-1762965119363-af950b523dca'),
  ('Embarque prioritário', 'photo-1687585612334-b35b1cbd22fd'),
  ('Sala VIP · 1 acesso por pessoa', 'photo-1759038086545-a905cb519ae8'),
  ('Seguro viagem', 'photo-1504150558240-0b4fd8946624'),
  ('Transfer VIP (1 trecho)', 'photo-1503376780353-7e6692767b70'),
  ('Kit viagem Me,up', 'photo-1778855023837-706db4df5d6f'),
  ('Roteiro de viagem personalizado', 'photo-1524850011238-e3d235c7d4c9'),
  ('Chip internacional (eSIM) · 10 GB · 30 dias', 'photo-1566137178917-285684132085'),
  ('Early check-in ou late checkout no hotel', 'photo-1611892440504-42a792e24d32')
) AS v(nome, id)
WHERE experiencias.nome = v.nome;

-- Créditos de viagem (R$ 100 / 300 / 500)
UPDATE experiencias SET imagem_url = pg_temp.u('photo-1586441133374-ed1cb4007a47')
WHERE nome ILIKE 'Crédito de viagem%';
