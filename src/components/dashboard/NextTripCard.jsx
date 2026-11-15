// ============================================
// COMPONENTE: Widget Próxima Viagem (Dashboard)
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getProximaViagem, formatDiasParaViagem } from '@/services/minhasViagensService'
import { usePWA } from '@/hooks/usePWA'
import { PushPrompt } from '@/components/pwa'

export function NextTripCard() {
  const [viagem, setViagem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const { shouldShowPushPrompt, pushEnabled } = usePWA()

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
      <div className="p-6 rounded-2xl bg-white/5 border border-dusty-rose/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-dusty-rose/10 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-dusty-rose/10 rounded animate-pulse" />
            <div className="h-3 w-32 bg-dusty-rose/10 rounded animate-pulse" />
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
        className="block p-6 rounded-2xl bg-gradient-to-br from-deep-purple/50 to-deep-purple/30 border border-dusty-rose/10 hover:border-antique-gold/30 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-antique-gold/10 flex items-center justify-center group-hover:bg-antique-gold/20 transition-colors">
            <span className="text-2xl">✈</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-heading font-semibold text-ice-white mb-0.5">
              Suas Viagens
            </h4>
            <p className="text-xs text-dusty-rose">
              Veja suas viagens confirmadas
            </p>
          </div>
          <svg className="w-5 h-5 text-dusty-rose/50 group-hover:text-antique-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      </Link>

      {/* Push notification prompt - outside the Link */}
      <AnimatePresence>
        {showPushPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <PushPrompt context="trip" onClose={handleClosePushPrompt} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NextTripCard
