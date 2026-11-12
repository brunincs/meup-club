// ============================================
// COMPONENTE: Visão Lista de Viagens
// Com abas Próximas/Realizadas
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ViagemCard } from './ViagemCard'
import { ViagemEmptyState } from './ViagemEmptyState'
import { getMinhasViagens } from '@/services/minhasViagensService'

export function ViagemListView() {
  const [tab, setTab] = useState('proximas')
  const [viagens, setViagens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadViagens()
  }, [tab])

  const loadViagens = async () => {
    setLoading(true)
    const result = await getMinhasViagens(tab)
    if (result.success) {
      setViagens(result.viagens)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Abas */}
      <div className="flex gap-1 p-1 rounded-xl bg-dusty-rose/10">
        <button
          onClick={() => setTab('proximas')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-heading font-medium transition-all ${
            tab === 'proximas'
              ? 'bg-white text-deep-purple shadow-sm'
              : 'text-graphite/60 hover:text-graphite'
          }`}
        >
          Próximas
        </button>
        <button
          onClick={() => setTab('realizadas')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-heading font-medium transition-all ${
            tab === 'realizadas'
              ? 'bg-white text-deep-purple shadow-sm'
              : 'text-graphite/60 hover:text-graphite'
          }`}
        >
          Realizadas
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
          />
        </div>
      ) : viagens.length === 0 ? (
        <ViagemEmptyState tipo={tab} />
      ) : (
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {viagens.map((viagem, idx) => (
            <ViagemCard
              key={viagem.id}
              viagem={viagem}
              defaultOpen={idx === 0 && tab === 'proximas'}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}
