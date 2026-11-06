import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from '@/services/copy'

/**
 * Modal de detalhe da experiência
 * Exibe informações completas antes do resgate:
 * - Foto grande
 * - Nome + descrição completa
 * - O que inclui
 * - Regras e condições
 * - Custo + saldo do usuário
 * - Botão para iniciar resgate
 */
export function ExperienceDetailModal({
  experience,
  userPoints,
  onRedeem,
  onClose,
  canRedeem
}) {
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Fechar com Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focar no modal ao abrir
  useEffect(() => {
    const previouslyFocused = document.activeElement
    closeButtonRef.current?.focus()
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

  // Focus trap
  useEffect(() => {
    function handleTab(e) {
      if (e.key !== 'Tab') return

      const focusableElements = modalRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [])

  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  const pointsNeeded = experience.points - userPoints
  const hasEnoughPoints = userPoints >= experience.points

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        {/* Header com imagem */}
        <div className="relative h-56 md:h-72 overflow-hidden">
          {experience.image && (
            <img
              src={experience.image}
              alt={experience.name}
              className="w-full h-full object-cover"
            />
          )}
          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-deep-purple/90 via-deep-purple/40 to-transparent" />

          {/* Botão fechar */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Categoria badge */}
          {experience.categoria && (
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
              <span className="text-xs text-white font-medium uppercase tracking-wider">
                {experience.categoria === 'credito' ? 'Crédito' : 'Serviço'}
              </span>
            </div>
          )}

          {/* Nome sobre a imagem */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2
              id="detail-modal-title"
              className="text-2xl md:text-3xl font-display font-semibold text-white leading-tight"
            >
              {experience.name}
            </h2>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Descrição */}
          <p className="text-graphite/80 leading-relaxed mb-6">
            {experience.description}
          </p>

          {/* O que inclui */}
          {experience.oQueInclui && (
            <div className="mb-6">
              <h3 className="text-sm font-heading font-semibold text-deep-purple uppercase tracking-wider mb-3">
                O que inclui
              </h3>
              <div className="p-4 rounded-xl bg-antique-gold/5 border border-antique-gold/20">
                <div className="text-sm text-graphite/80 whitespace-pre-line leading-relaxed">
                  {experience.oQueInclui}
                </div>
              </div>
            </div>
          )}

          {/* Regras */}
          {experience.regras && (
            <div className="mb-6">
              <h3 className="text-sm font-heading font-semibold text-deep-purple uppercase tracking-wider mb-3">
                Regras e condições
              </h3>
              <div className="p-4 rounded-xl bg-graphite/5 border border-graphite/10">
                <div className="text-sm text-graphite/70 whitespace-pre-line leading-relaxed">
                  {experience.regras}
                </div>
              </div>
            </div>
          )}

          {/* Custo e saldo */}
          <div className="p-4 rounded-xl bg-deep-purple/5 border border-deep-purple/20 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-graphite/70">Custo</span>
              <span className="text-xl font-display font-semibold text-antique-gold">
                {format.pointsShort(experience.points)} pontos
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-graphite/70">Seu saldo</span>
              <span className={`text-lg font-heading font-medium ${hasEnoughPoints ? 'text-game-green' : 'text-graphite'}`}>
                {format.pointsShort(userPoints)} pontos
              </span>
            </div>
            {!hasEnoughPoints && (
              <div className="mt-3 pt-3 border-t border-deep-purple/10">
                <p className="text-sm text-center text-graphite/60">
                  Faltam <span className="text-antique-gold font-medium">{format.pointsShort(pointsNeeded)}</span> pontos
                </p>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-heading font-medium text-graphite/70 hover:text-deep-purple hover:bg-graphite/5 transition-colors border border-graphite/20"
            >
              Voltar
            </button>
            <motion.button
              whileHover={canRedeem ? { scale: 1.02 } : {}}
              whileTap={canRedeem ? { scale: 0.98 } : {}}
              onClick={() => canRedeem && onRedeem(experience)}
              disabled={!canRedeem}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-heading font-medium transition-all ${
                canRedeem
                  ? 'bg-deep-purple text-white hover:bg-bright-purple'
                  : 'bg-graphite/10 text-graphite/40 cursor-not-allowed'
              }`}
            >
              {canRedeem ? 'Resgatar experiência' : 'Pontos insuficientes'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
