// ══════════════════════════════════════════════════════════════════════════════
// Prime Upsell Service - Meup Club
// ══════════════════════════════════════════════════════════════════════════════
// Controla chamadas contextuais para o Prime (só para usuários Free)
// ══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'meup_prime_upsell'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Verifica se pode mostrar comparação de check-in (1x por semana)
 */
export function canShowCheckinComparison(userId) {
  if (!userId) return false

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return true

    const parsed = JSON.parse(data)
    const lastShown = parsed[`checkin_${userId}`]

    if (!lastShown) return true

    const now = Date.now()
    return (now - lastShown) >= WEEK_MS
  } catch {
    return true
  }
}

/**
 * Registra que a comparação de check-in foi mostrada
 */
export function markCheckinComparisonShown(userId) {
  if (!userId) return

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    const parsed = data ? JSON.parse(data) : {}
    parsed[`checkin_${userId}`] = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // Ignora erros de localStorage
  }
}

/**
 * Calcula pontos que o usuário ganharia no Prime
 * @param {number} pontosBase - Pontos base da ação
 * @param {string} tipo - Tipo de ação: 'checkin', 'emissao'
 * @param {object} planosConfig - Config dos planos do banco
 * @returns {{ pontosPrime: number, diferenca: number, temDiferenca: boolean, soAnual: boolean }}
 */
export function calcularComparacaoPrime(pontosBase, tipo, planosConfig) {
  if (!planosConfig?.prime) {
    return { pontosPrime: 0, diferenca: 0, temDiferenca: false, soAnual: false }
  }

  const configPrime = planosConfig.prime
  let pontosPrime = pontosBase
  let soAnual = false

  if (tipo === 'checkin') {
    // Check-in usa pontos fixos do plano
    pontosPrime = configPrime.pontosCheckin || 30
  } else if (tipo === 'emissao') {
    // Emissão usa multiplicador (1.5x só no anual)
    const multiplicador = configPrime.multiplicadorViagem || 1.5
    pontosPrime = Math.floor(pontosBase * multiplicador)
    soAnual = configPrime.multiplicadorSoAnual === true
  }

  const diferenca = pontosPrime - pontosBase

  return {
    pontosPrime,
    diferenca,
    temDiferenca: diferenca > 0,
    soAnual
  }
}

/**
 * Retorna o texto do CTA baseado na oferta de fundador
 * @param {boolean} ofertaFundadorAtiva - Se a oferta está ativa
 * @returns {string}
 */
export function getCtaText(ofertaFundadorAtiva) {
  return ofertaFundadorAtiva
    ? 'Garantir preço de fundador →'
    : 'Conhecer o Prime →'
}
