// ============================================
// PÁGINA: Minhas Viagens - Área do Cliente
// Visões: Lista e Calendário
// ============================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DashboardHeader } from '@/components/dashboard'
import { ViagemListView } from '@/components/viagens/ViagemListView'
import { ViagemCalendar } from '@/components/viagens/ViagemCalendar'
import { ViagemCard } from '@/components/viagens/ViagemCard'

export function MinhasViagens() {
  const [view, setView] = useState('lista') // 'lista' | 'calendario'
  const [viagemCalendario, setViagemCalendario] = useState(null)

  return (
    <div className="min-h-screen bg-ice-white">
      {/* Header */}
      <DashboardHeader />

      {/* Hero */}
      <section className="bg-deep-purple py-8">
        <div className="container-premium">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-ice-white">
                Minhas Viagens
              </h1>
              <p className="text-sm text-dusty-rose mt-1 font-heading">
                Acompanhe suas viagens confirmadas e realizadas
              </p>
            </div>

            {/* Toggle de visualização */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/10">
              <button
                onClick={() => setView('lista')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all ${
                  view === 'lista'
                    ? 'bg-white text-deep-purple shadow-sm'
                    : 'text-dusty-rose hover:text-ice-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Lista
              </button>
              <button
                onClick={() => setView('calendario')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all ${
                  view === 'calendario'
                    ? 'bg-white text-deep-purple shadow-sm'
                    : 'text-dusty-rose hover:text-ice-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendário
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="py-8">
        <div className="container-premium">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'lista' ? (
              <ViagemListView />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendário */}
                <div className="relative">
                  <ViagemCalendar onSelectViagem={setViagemCalendario} />
                </div>

                {/* Card da viagem selecionada ou instrução */}
                <div>
                  {viagemCalendario ? (
                    <div className="sticky top-24">
                      <h3 className="text-sm font-heading font-medium text-graphite/60 mb-3">
                        Viagem selecionada
                      </h3>
                      <ViagemCard viagem={viagemCalendario} defaultOpen />
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-dusty-rose/5 border border-dusty-rose/10 text-center">
                      <div className="w-16 h-16 rounded-full bg-dusty-rose/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl opacity-50">📅</span>
                      </div>
                      <p className="text-sm text-graphite/60 font-heading">
                        Selecione um dia com viagem no calendário para ver os detalhes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default MinhasViagens
