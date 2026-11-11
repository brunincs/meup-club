// ============================================
// BOTÃO DE ASSINAR - Centralizado
// Fácil trocar para checkout Asaas depois
// ============================================

import { getWhatsAppUrl } from '@/config/contact'

/**
 * Botão centralizado para assinar Prime
 * Atualmente abre WhatsApp, depois será checkout Asaas
 *
 * @param {string} plan - 'mensal' ou 'anual'
 * @param {string} label - Texto do botão
 * @param {string} className - Classes adicionais
 * @param {string} variant - 'primary' (default) ou 'secondary'
 */
export function SubscribeButton({
  plan = 'anual',
  label = 'Assinar Prime',
  className = '',
  variant = 'primary',
  onClick
}) {
  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }

    // Por enquanto, abre WhatsApp
    // TODO: Substituir por checkout Asaas
    const planLabel = plan === 'anual' ? 'Prime Anual (Fundador)' : 'Prime Mensal'
    const message = `Olá! Quero assinar o Meup ${planLabel}. Pode me ajudar?`
    const url = getWhatsAppUrl(message)
    window.open(url, '_blank')
  }

  const baseClasses = 'px-4 py-3 rounded-xl font-heading font-semibold transition-all text-sm'

  const variantClasses = {
    primary: 'bg-antique-gold text-deep-purple hover:bg-accent-light shadow-sm',
    secondary: 'bg-deep-purple/50 text-ice-white border border-dusty-rose/30 hover:bg-deep-purple/70'
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {label}
    </button>
  )
}

/**
 * Link para página de planos
 */
export function PlansLink({ className = '', children = 'Ver planos' }) {
  return (
    <a
      href="/planos"
      className={`text-sm text-antique-gold hover:text-accent-light underline transition-colors ${className}`}
    >
      {children}
    </a>
  )
}
