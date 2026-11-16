// ============================================
// COMPONENTE: Widget Próxima Viagem (Dashboard)
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getProximaViagem, formatDiasParaViagem } from '@/services/minhasViagensService'
import { usePWA } from '@/hooks/usePWA'

export function NextTripCard({ variant = 'dark' }) {
  const [viagem, setViagem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const { shouldShowPushPrompt, pushEnabled } = usePWA()
  const isLight = variant === 'light'

  useEffect(() => {
    loadViagem()
  }, [])

  // Show push prompt after loading if user has a trip and hasn't enabled push
  useEffect(() => {
    if (viagem && !loading && shouldShowPushPrompt() && !pushEnabled) {
      // Check if we've shown this prompt recently (localStorage)
      const lastShown = localStorage.getItem('trip_push_prompt_shown')
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      if (!lastShown || parseInt(lastShown, 10) < oneDayAgo) {
        setShowPushPrompt(true)
      }
    }
  }, [viagem, loading, shouldShowPushPrompt, pushEnabled])

  const loadViagem = async () => {
    const result = await getProximaViagem()
    if (result.success && result.viagem) {
      setViagem(result.viagem)
    }
    setLoading(false)
  }

  const handleClosePushPrompt = () => {
    setShowPushPrompt(false)
    localStorage.setItem('trip_push_prompt_shown', String(Date.now()))
  }

  // Loading state
  if (loading) {
    return (
      <div className={`p-6 rounded-2xl border ${
        isLight
          ? 'bg-white border-nude-rose shadow-sm'
          : 'bg-white/5 border-dusty-rose/10 backdrop-blur-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl animate-pulse ${isLight ? 'bg-graphite/10' : 'bg-dusty-rose/10'}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-24 rounded animate-pulse ${isLight ? 'bg-graphite/10' : 'bg-dusty-rose/10'}`} />
            <div className={`h-3 w-32 rounded animate-pulse ${isLight ? 'bg-graphite/5' : 'bg-dusty-rose/10'}`} />
          </div>
        </div>
      </div>
    )
  }

  // Sem viagem próxima
  if (!viagem) {
    return (
      <Link
        to="/minhas-viagens"
        className={`block p-6 rounded-2xl border transition-colors group ${
          isLight
            ? 'bg-white border-nude-rose shadow-sm hover:border-antique-gold/30'
            : 'bg-gradient-to-br from-deep-purple/50 to-deep-purple/30 border-dusty-rose/10 hover:border-antique-gold/30'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-antique-gold/10 flex items-center justify-center group-hover:bg-antique-gold/20 transition-colors">
            <span className="text-2xl">✈</span>
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-heading font-semibold mb-0.5 ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              Suas Viagens
            </h4>
            <p className={`text-xs ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>
              Veja suas viagens confirmadas
            </p>
          </div>
          <svg className={`w-5 h-5 transition-colors ${isLight ? 'text-graphite/30 group-hover:text-antique-gold' : 'text-dusty-rose/50 group-hover:text-antique-gold'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    )
  }

  // Com viagem próxima
  const dias = viagem.dias_para_viagem
  const isHoje = dias === 0
  const isAmanha = dias === 1

  return (
    <div className="space-y-4">
      <Link
        to="/minhas-viagens"
        className="block p-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group"
        style={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#ddd1d0'
        }}
      >
        {/* Badge de contagem */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="px-3 py-1 rounded-full text-xs font-heading font-bold"
            style={{
              backgroundColor: isHoje ? '#a27937' : '#32113f',
              color: '#edf0f1'
            }}
          >
            {isHoje ? '🎉 Hoje!' : isAmanha ? '⏰ Amanhã!' : formatDiasParaViagem(dias, viagem.data_ida)}
          </div>

          {/* Ícone animado */}
          <motion.div
            animate={isHoje || isAmanha ? { y: [0, -3, 0] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ color: '#a27937' }}
          >
            <span className="text-2xl">✈</span>
          </motion.div>
        </div>

        {/* Título da viagem */}
        <h4
          className="text-lg font-display font-bold mb-1 truncate transition-colors"
          style={{ color: '#32113f' }}
        >
          {viagem.titulo}
        </h4>

        {/* Datas */}
        <p className="text-sm font-heading mb-3" style={{ color: '#1f1f1f' }}>
          {viagem.data_ida && new Date(viagem.data_ida + 'T12:00:00').toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long'
          })}
          {viagem.data_volta && viagem.data_volta !== viagem.data_ida && (
            <> – {new Date(viagem.data_volta + 'T12:00:00').toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long'
            })}</>
          )}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs font-heading" style={{ color: '#5c5c5c' }}>
          {/* Companhia */}
          {viagem.companhia && (
            <span className="flex items-center gap-1">
              <span style={{ color: '#a27937' }}>•</span>
              {viagem.companhia}
            </span>
          )}

          {/* Passageiros */}
          {viagem.total_passageiros > 0 && (
            <span className="flex items-center gap-1">
              <span style={{ color: '#a27937' }}>•</span>
              {viagem.total_passageiros} passageiro{viagem.total_passageiros > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Call to action */}
        <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid #ddd1d0' }}>
          <span className="text-xs font-heading" style={{ color: '#a27937' }}>
            Ver detalhes
          </span>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: '#a27937' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Linha discreta de notificação - dentro do card */}
        <AnimatePresence>
          {showPushPrompt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3"
              style={{ borderTop: '1px dashed #ddd1d0' }}
              onClick={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs" style={{ color: '#5c005a' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span>Quer ser avisado do check-in?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Trigger push subscription
                      import('@/services/pushService').then(({ subscribeToPush }) => subscribeToPush())
                      handleClosePushPrompt()
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-heading font-semibold transition-colors"
                    style={{ backgroundColor: '#a27937', color: '#edf0f1' }}
                  >
                    Ativar
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleClosePushPrompt()
                    }}
                    className="text-xs"
                    style={{ color: '#a39695' }}
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>
    </div>
  )
}

export default NextTripCard
