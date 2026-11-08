// ══════════════════════════════════════════════════════════════════════════════
// Contato Me,up Viagens - Constantes Centralizadas
// ══════════════════════════════════════════════════════════════════════════════

export const WHATSAPP_NUMBER = '5516988126568'
export const WHATSAPP_DISPLAY = '(16) 98812-6568'

/**
 * Gera URL do WhatsApp com mensagem pré-preenchida
 * @param {string} message - Mensagem a ser enviada
 * @returns {string} URL do WhatsApp
 */
export function getWhatsAppUrl(message = '') {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`
}

/**
 * Formata preço em reais (R$49,90)
 * @param {number} value - Valor numérico
 * @param {boolean} showCents - Mostrar centavos mesmo se .00
 * @returns {string} Preço formatado
 */
export function formatPrice(value, showCents = true) {
  const num = Number(value) || 0
  if (showCents || num % 1 !== 0) {
    return num.toFixed(2).replace('.', ',')
  }
  return String(Math.floor(num))
}
