/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CONFIGURAÇÃO CENTRAL DE EXPERIÊNCIAS E PONTOS                             ║
 * ║                                                                            ║
 * ║  Este é o ÚNICO arquivo onde os preços das experiências são definidos.     ║
 * ║  Tanto o catálogo de experiências quanto o simulador leem daqui.           ║
 * ║                                                                            ║
 * ║  Para alterar preços: edite os valores de `points` abaixo.                 ║
 * ║                                                                            ║
 * ║  SELO "POR TEMPO LIMITADO":                                                ║
 * ║  Para marcar uma experiência como limitada, adicione `tempoLimitado: true` ║
 * ║  Ex: { id: 'dinner', title: '...', points: 10000, tempoLimitado: true }    ║
 * ║  Remova o campo ou mude para `false` para tirar o selo.                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE PONTOS - ÚNICA FONTE DE VERDADE
// ══════════════════════════════════════════════════════════════════════════════
// Quantos pontos o cliente ganha por cada R$ 1 gasto em viagens.
// Se mudar a taxa, mude APENAS aqui.
export const PONTOS_POR_REAL = 1

// Quantos pontos o cliente ganha por cada indicação que fecha viagem.
// Valor fixo por indicação convertida (não é percentual).
export const PONTOS_POR_INDICACAO = 3000

// ══════════════════════════════════════════════════════════════════════════════
// IMAGENS PLACEHOLDER (Unsplash)
// ══════════════════════════════════════════════════════════════════════════════
const PLACEHOLDER_IMAGES = {
  upgrade: 'https://images.unsplash.com/photo-1540339832862-474599807836?w=600&h=400&fit=crop&crop=center',
  lounge: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&h=400&fit=crop&crop=center',
  dinner: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&crop=center',
  stopover: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop&crop=center',
  pernoite: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&crop=center',
  transfer: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop&crop=center',
  dolphins: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=600&h=400&fit=crop&crop=center',
  balloon: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=600&h=400&fit=crop&crop=center',
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPERIÊNCIAS REGULARES
// ══════════════════════════════════════════════════════════════════════════════
// `points` é o valor NUMÉRICO em pontos (sem pontos, sem formatação).
// A formatação (ex: "8.000") é feita na hora de exibir.
export const EXPERIENCES = [
  {
    id: 'transfer',
    title: 'Transfer VIP',
    description: 'Do aeroporto ao hotel, com conforto e pontualidade.',
    image: PLACEHOLDER_IMAGES.transfer,
    points: 6000,
  },
  {
    id: 'lounge',
    title: 'Acesso a Lounge',
    description: 'Espere seu voo com conforto e exclusividade.',
    image: PLACEHOLDER_IMAGES.lounge,
    points: 8000,
  },
  {
    id: 'dinner',
    title: 'Jantar exclusivo',
    description: 'Restaurantes premium. Conta por nossa conta.',
    image: PLACEHOLDER_IMAGES.dinner,
    points: 10000,
    tempoLimitado: true, // ← Mude para false ou remova para tirar o selo
  },
  {
    id: 'upgrade',
    title: 'Upgrade de voo',
    description: 'Saia da econômica. Entre na executiva.',
    image: PLACEHOLDER_IMAGES.upgrade,
    points: 12000,
    featured: true,
  },
  {
    id: 'stopover',
    title: 'Stopover exclusivo',
    description: 'Uma viagem, dois destinos.',
    image: PLACEHOLDER_IMAGES.stopover,
    points: 15000,
  },
  {
    id: 'pernoite',
    title: 'Pernoite extra',
    description: 'Uma noite a mais no destino, por nossa conta.',
    image: PLACEHOLDER_IMAGES.pernoite,
    points: 18000,
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// EXPERIÊNCIAS DOS SONHOS (topo do clube)
// ══════════════════════════════════════════════════════════════════════════════
export const DREAM_EXPERIENCES = [
  {
    id: 'balloon',
    title: 'Passeio de balão',
    description: 'Veja o mundo de cima, ao nascer do sol.',
    image: PLACEHOLDER_IMAGES.balloon,
    points: 45000, // CUSTO A DEFINIR
    isDream: true,
  },
  {
    id: 'dolphins',
    title: 'Nadar com golfinhos',
    description: 'Uma experiência única em águas cristalinas.',
    image: PLACEHOLDER_IMAGES.dolphins,
    points: 50000, // CUSTO A DEFINIR
    isDream: true,
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// TODAS AS EXPERIÊNCIAS (ordenadas por pontos, para o simulador)
// ══════════════════════════════════════════════════════════════════════════════
export const ALL_EXPERIENCES = [...EXPERIENCES, ...DREAM_EXPERIENCES].sort(
  (a, b) => a.points - b.points
)

// ══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Formata número de pontos para exibição (ex: 8000 → "8.000")
 */
export function formatPoints(points) {
  return new Intl.NumberFormat('pt-BR').format(points)
}

/**
 * Calcula quantos pontos o cliente ganha com um valor em reais
 */
export function calculatePoints(valorEmReais) {
  return valorEmReais * PONTOS_POR_REAL
}

/**
 * Retorna experiências que o cliente JÁ pode resgatar com X pontos
 */
export function getUnlockedExperiences(pontos) {
  return ALL_EXPERIENCES.filter(exp => exp.points <= pontos)
}

/**
 * Retorna a PRÓXIMA experiência que o cliente quase alcança
 */
export function getNextExperience(pontos) {
  return ALL_EXPERIENCES.find(exp => exp.points > pontos) || null
}
