// ============================================
// COMPONENTE: Widget Próxima Viagem (Dashboard)
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getProximaViagem, formatDiasParaViagem } from '@/services/minhasViagensService'

export function NextTripCard() {
  const [viagem, setViagem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadViagem()
  }, [])

  const loadViagem = async () => {
    const result = await getProximaViagem()
    if (result.success && result.viagem) {
      setViagem(result.viagem)
    }
    setLoading(false)
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
    <Link
      to="/minhas-viagens"
      className="block p-6 rounded-2xl bg-gradient-to-br from-antique-gold/20 to-antique-gold/5 border border-antique-gold/20 hover:border-antique-gold/40 transition-all group"
    >
      {/* Badge de contagem */}
      <div className="flex items-start justify-between mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-heading font-bold ${
          isHoje
            ? 'bg-antique-gold text-deep-purple'
            : isAmanha
              ? 'bg-blue-500 text-white'
              : 'bg-deep-purple/20 text-antique-gold'
        }`}>
          {isHoje ? '🎉 Hoje!' : isAmanha ? '⏰ Amanhã!' : formatDiasParaViagem(dias)}
        </div>

        {/* Ícone animado */}
        <motion.div
          animate={isHoje || isAmanha ? { y: [0, -3, 0] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-2xl">✈</span>
        </motion.div>
      </div>

      {/* Título da viagem */}
      <h4 className="text-lg font-display font-semibold text-ice-white mb-1 truncate group-hover:text-antique-gold transition-colors">
        {viagem.titulo}
      </h4>

      {/* Datas */}
      <p className="text-sm text-dusty-rose font-heading mb-3">
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
      <div className="flex items-center gap-3 text-xs text-dusty-rose/70 font-heading">
        {/* Companhia */}
        {viagem.companhia && (
          <span className="flex items-center gap-1">
            <span className="text-antique-gold/60">•</span>
            {viagem.companhia}
          </span>
        )}

        {/* Passageiros */}
        {viagem.total_passageiros > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-antique-gold/60">•</span>
            {viagem.total_passageiros} passageiro{viagem.total_passageiros > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Call to action */}
      <div className="mt-4 pt-3 border-t border-antique-gold/10 flex items-center justify-between">
        <span className="text-xs text-antique-gold/70 font-heading">
          Ver detalhes
        </span>
        <svg className="w-4 h-4 text-antique-gold/50 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

export default NextTripCard
