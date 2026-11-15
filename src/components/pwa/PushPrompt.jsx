import { motion, AnimatePresence } from 'framer-motion'
import { usePWA } from '@/hooks/usePWA'
import { trackPWAEvent } from '@/services/pwaAnalytics'
import { useEffect } from 'react'

/**
 * Push Notification Permission Prompt
 * Shown in context (after install, on trip card, etc.)
 */
export function PushPrompt({ context = 'general', onClose }) {
  const {
    showPushPrompt,
    enablePush,
    dismissPush,
    needsIOSInstallFirst,
    openInstallPrompt
  } = usePWA()

  const isVisible = showPushPrompt || context !== 'general'

  // Track when prompt is shown
  useEffect(() => {
    if (isVisible) {
      trackPWAEvent('push_prompt_shown', { context })
    }
  }, [isVisible, context])

  const handleEnable = async () => {
    const result = await enablePush()
    if (result.success) {
      handleClose()
    }
  }

  const handleClose = () => {
    dismissPush()
    onClose?.()
  }

  const handleInstallFirst = () => {
    handleClose()
    openInstallPrompt()
  }

  if (!isVisible) return null

  // iOS not installed - show install first message
  if (needsIOSInstallFirst) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="p-4 rounded-xl bg-gradient-to-br from-deep-purple to-bright-purple border border-antique-gold/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-antique-gold/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-antique-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-heading font-semibold text-ice-white text-sm mb-1">
                Receba avisos das suas viagens
              </h4>
              <p className="text-xs text-dusty-rose leading-relaxed mb-3">
                Instale o app para receber notificações de check-in e atualizações
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-dusty-rose hover:text-ice-white transition-colors"
                >
                  Agora não
                </button>
                <button
                  onClick={handleInstallFirst}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-antique-gold text-graphite hover:bg-antique-gold/90 transition-colors"
                >
                  Instalar app
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Standard push prompt
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="p-4 rounded-xl bg-gradient-to-br from-deep-purple to-bright-purple border border-antique-gold/20"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-antique-gold/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-antique-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-heading font-semibold text-ice-white text-sm mb-1">
              {context === 'trip'
                ? 'Quer ser avisado?'
                : 'Ative as notificações'}
            </h4>
            <p className="text-xs text-dusty-rose leading-relaxed mb-3">
              {context === 'trip'
                ? 'A gente avisa quando o check-in abrir e cuida de tudo pra você'
                : 'Receba avisos de viagens, pontos e novidades'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-dusty-rose hover:text-ice-white transition-colors"
              >
                Agora não
              </button>
              <button
                onClick={handleEnable}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-antique-gold text-graphite hover:bg-antique-gold/90 transition-colors"
              >
                Ativar avisos
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PushPrompt
