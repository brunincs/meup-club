// Funções utilitárias

/**
 * Combina classes condicionalmente (similar ao clsx)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Formata número com separadores de milhar
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('pt-BR').format(num)
}

/**
 * Formata pontos para exibição
 */
export function formatPoints(points) {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`
  }
  return formatNumber(points)
}

/**
 * Delay helper para animações
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Debounce function
 */
export function debounce(fn, ms) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), ms)
  }
}

/**
 * Throttle function
 */
export function throttle(fn, ms) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= ms) {
      lastCall = now
      fn.apply(this, args)
    }
  }
}
