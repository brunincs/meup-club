import { motion, AnimatePresence } from 'framer-motion'
import { usePWA } from '@/hooks/usePWA'

/**
 * Update Available Prompt
 * Shows when a new version of the app is available
 */
export function UpdatePrompt() {
  const { showUpdatePrompt, acceptUpdate, dismissUpdate } = usePWA()

  if (!showUpdatePrompt) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-dusty-rose/20 overflow-hidden p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-antique-gold/20 to-antique-gold/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-antique-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-graphite text-sm mb-1">
                Nova versao disponivel
              </h3>
              <p className="text-xs text-dusty-rose leading-relaxed">
                Atualize para ter as ultimas melhorias
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={dismissUpdate}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-dusty-rose hover:bg-ice-white transition-colors"
            >
              Depois
            </button>
            <button
              onClick={acceptUpdate}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-deep-purple text-ice-white hover:bg-bright-purple transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default UpdatePrompt
