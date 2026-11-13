-- Tabela de aeroportos com coordenadas para cálculo de distância
CREATE TABLE IF NOT EXISTS aeroportos (
  iata CHAR(3) PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  pais TEXT NOT NULL DEFAULT 'Brasil',
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_aeroportos_cidade ON aeroportos(cidade);
CREATE INDEX IF NOT EXISTS idx_aeroportos_pais ON aeroportos(pais);

-- Função Haversine para calcular distância em km
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r CONSTANT DECIMAL := 6371; -- Raio da Terra em km
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  a := SIN(dlat/2)^2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2)^2;
  c := 2 * ASIN(SQRT(a));
  RETURN r * c;
END;
$$;

-- Seed: principais aeroportos brasileiros + internacionais comuns
INSERT INTO aeroportos (iata, nome, cidade, pais, latitude, longitude) VALUES
-- Brasil - Principais
('GRU', 'Guarulhos', 'São Paulo', 'Brasil', -23.4356, -46.4731),
('CGH', 'Congonhas', 'São Paulo', 'Brasil', -23.6261, -46.6564),
('VCP', 'Viracopos', 'Campinas', 'Brasil', -23.0074, -47.1345),
('GIG', 'Galeão', 'Rio de Janeiro', 'Brasil', -22.8090, -43.2436),
('SDU', 'Santos Dumont', 'Rio de Janeiro', 'Brasil', -22.9105, -43.1631),
('BSB', 'Brasília', 'Brasília', 'Brasil', -15.8697, -47.9172),
('CNF', 'Confins', 'Belo Horizonte', 'Brasil', -19.6244, -43.9719),
('SSA', 'Salvador', 'Salvador', 'Brasil', -12.9086, -38.3225),
('REC', 'Recife', 'Recife', 'Brasil', -8.1264, -34.9236),
('FOR', 'Fortaleza', 'Fortaleza', 'Brasil', -3.7763, -38.5326),
('POA', 'Salgado Filho', 'Porto Alegre', 'Brasil', -29.9944, -51.1714),
('CWB', 'Curitiba', 'Curitiba', 'Brasil', -25.5285, -49.1758),
('FLN', 'Florianópolis', 'Florianópolis', 'Brasil', -27.6703, -48.5525),
('MAO', 'Manaus', 'Manaus', 'Brasil', -3.0386, -60.0497),
('BEL', 'Belém', 'Belém', 'Brasil', -1.3792, -48.4764),
('NAT', 'Natal', 'Natal', 'Brasil', -5.9111, -35.2478),
('CGB', 'Cuiabá', 'Cuiabá', 'Brasil', -15.6529, -56.1167),
('VIX', 'Vitória', 'Vitória', 'Brasil', -20.2581, -40.2864),
('GYN', 'Goiânia', 'Goiânia', 'Brasil', -16.6320, -49.2206),
('MCZ', 'Maceió', 'Maceió', 'Brasil', -9.5108, -35.7917),
('SLZ', 'São Luís', 'São Luís', 'Brasil', -2.5853, -44.2341),
('THE', 'Teresina', 'Teresina', 'Brasil', -5.0594, -42.8235),
('AJU', 'Aracaju', 'Aracaju', 'Brasil', -10.9840, -37.0703),
('JPA', 'João Pessoa', 'João Pessoa', 'Brasil', -7.1464, -34.9486),
('IGU', 'Foz do Iguaçu', 'Foz do Iguaçu', 'Brasil', -25.5972, -54.4897),
('NVT', 'Navegantes', 'Navegantes', 'Brasil', -26.8792, -48.6514),
('JOI', 'Joinville', 'Joinville', 'Brasil', -26.2244, -48.7975),
('LDB', 'Londrina', 'Londrina', 'Brasil', -23.3336, -51.1301),
('MGF', 'Maringá', 'Maringá', 'Brasil', -23.4764, -52.0122),
('UDI', 'Uberlândia', 'Uberlândia', 'Brasil', -18.8836, -48.2253),
('OPS', 'Sinop', 'Sinop', 'Brasil', -11.8850, -55.5861),
('RAO', 'Ribeirão Preto', 'Ribeirão Preto', 'Brasil', -21.1364, -47.7767),
('SJP', 'São José do Rio Preto', 'São José do Rio Preto', 'Brasil', -20.8167, -49.4056),
('PNZ', 'Petrolina', 'Petrolina', 'Brasil', -9.3624, -40.5691),
('BPS', 'Porto Seguro', 'Porto Seguro', 'Brasil', -16.4386, -39.0808),
('IOS', 'Ilhéus', 'Ilhéus', 'Brasil', -14.8159, -39.0332),
('PMW', 'Palmas', 'Palmas', 'Brasil', -10.2915, -48.3570),
('PVH', 'Porto Velho', 'Porto Velho', 'Brasil', -8.7093, -63.9023),
('RBR', 'Rio Branco', 'Rio Branco', 'Brasil', -9.8689, -67.8981),
('MCP', 'Macapá', 'Macapá', 'Brasil', 0.0507, -51.0722),
('BVB', 'Boa Vista', 'Boa Vista', 'Brasil', 2.8414, -60.6922),
('CGR', 'Campo Grande', 'Campo Grande', 'Brasil', -20.4686, -54.6725),
-- Internacional - Principais destinos
('MIA', 'Miami', 'Miami', 'Estados Unidos', 25.7959, -80.2870),
('JFK', 'John F. Kennedy', 'Nova York', 'Estados Unidos', 40.6413, -73.7781),
('EWR', 'Newark', 'Nova York', 'Estados Unidos', 40.6895, -74.1745),
('MCO', 'Orlando', 'Orlando', 'Estados Unidos', 28.4312, -81.3081),
('LAX', 'Los Angeles', 'Los Angeles', 'Estados Unidos', 33.9416, -118.4085),
('LIS', 'Lisboa', 'Lisboa', 'Portugal', 38.7742, -9.1342),
('OPO', 'Porto', 'Porto', 'Portugal', 41.2481, -8.6814),
('MAD', 'Madrid', 'Madrid', 'Espanha', 40.4983, -3.5676),
('CDG', 'Charles de Gaulle', 'Paris', 'França', 49.0097, 2.5479),
('FCO', 'Fiumicino', 'Roma', 'Itália', 41.8003, 12.2389),
('LHR', 'Heathrow', 'Londres', 'Reino Unido', 51.4700, -0.4543),
('FRA', 'Frankfurt', 'Frankfurt', 'Alemanha', 50.0379, 8.5622),
('AMS', 'Schiphol', 'Amsterdam', 'Países Baixos', 52.3105, 4.7683),
('DXB', 'Dubai', 'Dubai', 'Emirados Árabes', 25.2532, 55.3657),
('DOH', 'Hamad', 'Doha', 'Catar', 25.2609, 51.6138),
('EZE', 'Ezeiza', 'Buenos Aires', 'Argentina', -34.8222, -58.5358),
('SCL', 'Santiago', 'Santiago', 'Chile', -33.3930, -70.7858),
('LIM', 'Lima', 'Lima', 'Peru', -12.0219, -77.1143),
('BOG', 'Bogotá', 'Bogotá', 'Colômbia', 4.7016, -74.1469),
('MEX', 'Cidade do México', 'Cidade do México', 'México', 19.4363, -99.0721),
('CUN', 'Cancún', 'Cancún', 'México', 21.0365, -86.8771),
('PTY', 'Panamá', 'Cidade do Panamá', 'Panamá', 9.0714, -79.3835)
ON CONFLICT (iata) DO NOTHING;
