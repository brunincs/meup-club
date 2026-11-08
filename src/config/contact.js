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
