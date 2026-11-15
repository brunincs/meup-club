import { motion, AnimatePresence } from 'framer-motion'
import { usePWA } from '@/hooks/usePWA'
import { trackPWAEvent } from '@/services/pwaAnalytics'
import { useEffect } from 'react'

/**
 * PWA Install Prompt Component
 * Shows appropriate install instructions based on device/browser
 *
 * Variants:
 * - standard: Android/Chrome/Desktop with native install prompt
 * - ios-safari: iOS Safari with step-by-step guide
 * - ios-chrome: iOS Chrome (16.4+) with Chrome-specific step-by-step guide
 * - ios-non-safari: iOS in-app browser with "open in Safari" instructions
 */
export function InstallPrompt() {
  const {
    showInstallPrompt,
    install,
    dismissInstall,
    getInstallVariant,
    copyLinkToClipboard,
    isIOSNonSafari,
    isIOSSafari
  } = usePWA()

  const variant = getInstallVariant()

  // Track when prompt is shown
  useEffect(() => {
    if (showInstallPrompt) {
      trackPWAEvent('pwa_install_prompt_shown', {
        variant
      })
    }
  }, [showInstallPrompt, variant])

  if (!showInstallPrompt) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-dusty-rose/20 overflow-hidden">
          {variant === 'standard' && (
            <StandardPrompt onInstall={install} onDismiss={dismissInstall} />
          )}
          {variant === 'ios-safari' && (
            <IOSSafariPrompt onDismiss={dismissInstall} />
          )}
          {variant === 'ios-chrome' && (
            <IOSChromePrompt onDismiss={dismissInstall} />
          )}
          {variant === 'ios-non-safari' && (
            <IOSNonSafariPrompt
              onCopyLink={copyLinkToClipboard}
              onDismiss={dismissInstall}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Standard install prompt for Android/Chrome/Desktop
 */
function StandardPrompt({ onInstall, onDismiss }) {
  return (
    <div className="p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-deep-purple to-bright-purple flex items-center justify-center flex-shrink-0">
          <img
            src="/brand/meup-club-icon.svg"
            alt=""
            className="w-8 h-8"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-graphite text-base mb-1">
            Instalar Me,up Club
          </h3>
          <p className="text-sm text-dusty-rose leading-relaxed">
            Acesse suas viagens e pontos direto da tela inicial
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onDismiss}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-dusty-rose hover:bg-ice-white transition-colors"
        >
          Agora não
        </button>
        <button
          onClick={onInstall}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-antique-gold text-graphite hover:bg-antique-gold/90 transition-colors"
        >
          Instalar
        </button>
      </div>
    </div>
  )
}

/**
 * iOS Safari install instructions
 */
function IOSSafariPrompt({ onDismiss }) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-graphite text-base">
          Adicionar a Tela de Início
        </h3>
        <button
          onClick={onDismiss}
          className="w-8 h-8 rounded-full hover:bg-ice-white flex items-center justify-center text-dusty-rose transition-colors"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-deep-purple text-ice-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            1
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm text-graphite">
              Toque no ícone{' '}
              <span className="inline-flex items-center justify-center w-6 h-6 bg-ice-white rounded border border-dusty-rose/30 mx-1">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </span>
              {' '}na barra do Safari
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-deep-purple text-ice-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            2
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm text-graphite">
              Role e toque em{' '}
              <span className="font-medium">"Adicionar a Tela de Início"</span>
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-deep-purple text-ice-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            3
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm text-graphite">
              Toque em{' '}
              <span className="font-medium">"Adicionar"</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-dusty-rose/20">
        <button
          onClick={onDismiss}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-dusty-rose hover:bg-ice-white transition-colors"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}

/**
 * iOS Chrome install instructions (iOS 16.4+)
 * Chrome on iOS 16.4+ supports PWA installation
 */
function IOSChromePrompt({ onDismiss }) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-graphite text-base">
          Adicionar à Tela de Início
        </h3>
        <button
          onClick={onDismiss}
          className="w-8 h-8 rounded-full hover:bg-ice-white flex items-center justify-center text-dusty-rose transition-colors"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-deep-purple text-ice-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            1
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm text-graphite">
              Toque no ícone{' '}
              <span className="inline-flex items-center justify-center w-6 h-6 bg-ice-white rounded border border-dusty-rose/30 mx-1">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </span>
              {' '}na barra do Chrome
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-deep-purple text-ice-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            2
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm text-graphite">
              Toque em{' '}
              <span className="font-medium">"Adicionar à Tela de Início"</span>
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-deep-purple text-ice-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            3
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm text-graphite">
              Toque em{' '}
              <span className="font-medium">"Adicionar"</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-dusty-rose/20">
        <button
          onClick={onDismiss}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-dusty-rose hover:bg-ice-white transition-colors"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}

/**
 * iOS Non-Safari prompt (in-app browsers like Instagram, WhatsApp, etc.)
 */
function IOSNonSafariPrompt({ onCopyLink, onDismiss }) {
  const handleCopyLink = async () => {
    const success = await onCopyLink()
    if (success) {
      // Show feedback (could use toast)
      const button = document.getElementById('copy-link-btn')
      if (button) {
        button.textContent = 'Link copiado!'
        setTimeout(() => {
          button.textContent = 'Copiar link'
        }, 2000)
      }
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-graphite text-base">
          Abra no Safari
        </h3>
        <button
          onClick={onDismiss}
          className="w-8 h-8 rounded-full hover:bg-ice-white flex items-center justify-center text-dusty-rose transition-colors"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-dusty-rose mb-4 leading-relaxed">
        Para instalar o app, abra esta página no Safari do seu iPhone.
      </p>

      <div className="space-y-3">
        <button
          id="copy-link-btn"
          onClick={handleCopyLink}
          className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-antique-gold text-graphite hover:bg-antique-gold/90 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copiar link
        </button>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-ice-white">
          <span className="text-lg">...</span>
          <p className="text-xs text-dusty-rose leading-relaxed">
            Toque nos três pontinhos do navegador e selecione "Abrir no Safari" ou "Abrir no navegador"
          </p>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={onDismiss}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-dusty-rose hover:bg-ice-white transition-colors"
        >
          Agora não
        </button>
      </div>
    </div>
  )
}

export default InstallPrompt
