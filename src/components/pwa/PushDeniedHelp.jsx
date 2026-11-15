import { motion } from 'framer-motion'
import { useState } from 'react'
import { usePWA } from '@/hooks/usePWA'

/**
 * Help component for users who denied push notifications
 * Shows step-by-step instructions to re-enable in browser settings
 */
export function PushDeniedHelp() {
  const { isIOS, isAndroid, pushDenied } = usePWA()
  const [expanded, setExpanded] = useState(false)

  if (!pushDenied) return null

  return (
    <div className="rounded-xl border border-dusty-rose/20 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-dusty-rose/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-dusty-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-graphite">
              Notificacoes desativadas
            </p>
            <p className="text-xs text-dusty-rose">
              Toque para ver como reativar
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-dusty-rose transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4 border-t border-dusty-rose/10"
        >
          <div className="pt-4 space-y-3">
            {isIOS ? (
              <IOSInstructions />
            ) : isAndroid ? (
              <AndroidInstructions />
            ) : (
              <DesktopInstructions />
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function IOSInstructions() {
  const steps = [
    'Abra os Ajustes do iPhone',
    'Role e toque em Safari (ou no navegador usado)',
    'Toque em "Notificacoes"',
    'Encontre "Me,up Club" e ative as notificacoes'
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs text-dusty-rose mb-3">
        Para reativar as notificacoes no iPhone:
      </p>
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-deep-purple/10 text-deep-purple flex items-center justify-center text-xs font-medium flex-shrink-0">
            {index + 1}
          </div>
          <p className="text-sm text-graphite pt-0.5">{step}</p>
        </div>
      ))}
    </div>
  )
}

function AndroidInstructions() {
  const steps = [
    'Toque no icone de cadeado na barra de endereco',
    'Toque em "Configuracoes do site"',
    'Toque em "Notificacoes"',
    'Selecione "Permitir"'
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs text-dusty-rose mb-3">
        Para reativar as notificacoes no Android:
      </p>
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-deep-purple/10 text-deep-purple flex items-center justify-center text-xs font-medium flex-shrink-0">
            {index + 1}
          </div>
          <p className="text-sm text-graphite pt-0.5">{step}</p>
        </div>
      ))}
    </div>
  )
}

function DesktopInstructions() {
  const steps = [
    'Clique no icone de cadeado na barra de endereco',
    'Encontre "Notificacoes" nas permissoes',
    'Mude de "Bloquear" para "Permitir"',
    'Atualize a pagina'
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs text-dusty-rose mb-3">
        Para reativar as notificacoes no navegador:
      </p>
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-deep-purple/10 text-deep-purple flex items-center justify-center text-xs font-medium flex-shrink-0">
            {index + 1}
          </div>
          <p className="text-sm text-graphite pt-0.5">{step}</p>
        </div>
      ))}
    </div>
  )
}

export default PushDeniedHelp
