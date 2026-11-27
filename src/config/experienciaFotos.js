/**
 * Fotos curadas das experiências (Unsplash, licença livre).
 * Cada foto foi conferida visualmente para bater com o nome da experiência.
 * Ordem importa: termos mais específicos primeiro.
 */
const U = (id) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&crop=center&q=80`

export const FOTOS_EXPERIENCIAS = [
  // Destinos
  ['estátua da liberdade', U('photo-1550837725-3018e30a18cb')],   // estátua vista da água
  ['empire state', U('photo-1555109307-f7d9da25c244')],           // Empire State no pôr do sol
  ['burj khalifa', U('photo-1582672060674-bc2bd808a8b5')],        // Burj Khalifa de perto
  ['safári', U('photo-1624062999726-083e5268525d')],              // 4x4 nas dunas
  ['dhow', U('photo-1722502831583-b4e93ecc6027')],                // Dubai Marina com barcos
  ['torre eiffel', U('photo-1570097703229-b195d6dd291f')],        // Torre Eiffel
  ['louvre', U('photo-1680449049533-69586f3ced53')],              // pirâmide do Louvre
  ['sena', U('photo-1566922847100-0f9ae24fd2ac')],                // barco de passeio no Sena
  ['coliseu', U('photo-1622796912525-7d2740696745')],             // arena e subterrâneo do Coliseu
  ['vaticano', U('photo-1576016770956-debb63d92058')],            // teto da Capela Sistina
  ['sagrada', U('photo-1568797473991-0e59d131ec5b')],             // Sagrada Família
  // Voo
  ['executiva', U('photo-1718948740023-ebb6e6f9cf6e')],           // poltrona executiva
  ['assento à frente', U('photo-1730916336146-1dad0a82642d')],    // poltronas com janela
  ['assento · voo internacional', U('photo-1641447093043-241f064568fb')], // cabine longa
  ['assento padrão', U('photo-1622967752036-9e4fd162725f')],      // fileira de poltronas
  ['assento', U('photo-1622967752036-9e4fd162725f')],
  ['bagagem despachada · voo internacional', U('photo-1762965119363-af950b523dca')], // esteira com mala
  ['bagagem', U('photo-1757865579170-8d64d9aab467')],             // mala no aeroporto
  ['embarque', U('photo-1687585612334-b35b1cbd22fd')],            // fila de embarque no portão
  ['sala vip', U('photo-1759038086545-a905cb519ae8')],            // lounge
  // Serviços
  ['seguro', U('photo-1504150558240-0b4fd8946624')],              // viajante com mala no aeroporto
  ['crédito', U('photo-1586441133374-ed1cb4007a47')],             // passaporte e cartão de embarque
  ['transfer', U('photo-1503376780353-7e6692767b70')],            // carro preto executivo
  ['kit', U('photo-1778855023837-706db4df5d6f')],                 // organizador de viagem em couro
  ['roteiro', U('photo-1524850011238-e3d235c7d4c9')],             // mapa e planejamento
  ['esim', U('photo-1566137178917-285684132085')],                // celular em viagem
  ['chip', U('photo-1566137178917-285684132085')],
  ['check-in', U('photo-1611892440504-42a792e24d32')],            // quarto de hotel
  ['checkout', U('photo-1611892440504-42a792e24d32')],
]

export function getFotoExperiencia(nome) {
  const lower = (nome || '').toLowerCase()
  const hit = FOTOS_EXPERIENCIAS.find(([k]) => lower.includes(k))
  return hit ? hit[1] : null
}
