// ============================================
// HOOK: Body Scroll Lock
// Trava/destrava scroll do body de forma segura
// Usa contador para permitir múltiplos modais
// ============================================

import { useEffect, useRef } from 'react'

// Contador global de locks ativos
let lockCount = 0
let originalStyles = null

/**
 * Salva estilos originais do body antes do primeiro lock
 */
function saveOriginalStyles() {
  if (originalStyles === null) {
    originalStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight
    }
  }
}

/**
 * Restaura estilos originais do body
 */
function restoreOriginalStyles() {
  if (originalStyles !== null) {
    document.body.style.overflow = originalStyles.overflow
    document.body.style.paddingRight = originalStyles.paddingRight
    originalStyles = null
  }
}

/**
 * Calcula largura da scrollbar
 */
function getScrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth
}

/**
 * Hook para travar scroll do body enquanto componente está montado
 * Suporta múltiplos componentes usando lock simultaneamente
 *
 * @param {boolean} enabled - Se o lock deve estar ativo (default: true)
 */
export function useBodyScrollLock(enabled = true) {
  const isLocked = useRef(false)

  useEffect(() => {
    if (!enabled) return

    // Evitar lock duplicado no mesmo componente (StrictMode)
    if (isLocked.current) return

    // Primeiro lock: salvar estilos e aplicar
    if (lockCount === 0) {
      saveOriginalStyles()
      const scrollbarWidth = getScrollbarWidth()
      document.body.style.overflow = 'hidden'
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
    }

    lockCount++
    isLocked.current = true

    return () => {
      if (!isLocked.current) return

      lockCount--
      isLocked.current = false

      // Último unlock: restaurar estilos
      if (lockCount === 0) {
        restoreOriginalStyles()
      }
    }
  }, [enabled])
}

/**
 * Função utilitária para forçar unlock (uso em emergências)
 * Útil para debug ou reset de estado
 */
export function forceUnlockBodyScroll() {
  lockCount = 0
  restoreOriginalStyles()
}

export default useBodyScrollLock
