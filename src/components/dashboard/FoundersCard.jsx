// ============================================
// CARD AÇÃO FUNDADORES - Dashboard
// Mostra diferentes estados: Free, Prime Mensal, Fundador
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { getMyFundadorData, getFundadoresCount, getRegulamentoUrl } from '@/services/fundadoresService'
import { SubscribeButton } from '@/components/ui/SubscribeButton'

export function FoundersCard({ variant = 'default', showAfterPositiveAction = false }) {
  const { profile } = useAuth()
  const [fundadorData, setFundadorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regulamentoUrl, setRegulamentoUrl] = useState('')

  const planoEfetivo = profile?.plano_efetivo || profile?.plano || 'free'
  const ciclo = profile?.ciclo || 'mensal'
  const isPrime = planoEfetivo === 'prime'
  const isAnual = ciclo === 'anual'

  useEffect(() => {
    async function loadData() {
      const [fundador, url] = await Promise.all([
        getMyFundadorData(),
        getRegulamentoUrl()
      ])
      setFundadorData(fundador)
      setRegulamentoUrl(url)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 p-6 animate-pulse">
        <div className="h-6 w-32 bg-dusty-rose/20 rounded mb-4" />
        <div className="h-4 w-48 bg-dusty-rose/10 rounded" />
      </div>
    )
  }

  // Se vagas esgotadas e não é fundador, não mostra nada
  if (fundadorData?.vagas_disponiveis === 0 && !fundadorData?.is_fundador) {
    return null
  }

  // FUNDADOR - Mostra selo e número da sorte
  if (fundadorData?.is_fundador) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-900/30 to-amber-800/20 p-6 relative overflow-hidden"
      >
        {/* Selo */}
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-deep-purple text-xs font-heading font-bold">
            🏆 Fundador #{fundadorData.vaga_numero}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🎫</span>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-display font-bold text-amber-400 mb-1">
              Seu número da sorte
            </h3>
            <p className="text-3xl font-display font-bold text-ice-white tracking-wider mb-2">
              {fundadorData.numero_sorte}
            </p>
            <p className="text-sm text-amber-200/70 mb-3">
              Concorrendo a 500 mil pontos na Ação Fundadores
            </p>
            <a
              href={regulamentoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Ver regulamento
            </a>
          </div>
        </div>

        {fundadorData.ganhador && (
          <div className="mt-4 p-4 rounded-xl bg-green-500/20 border border-green-400/30">
            <p className="text-sm font-heading font-bold text-green-400">
              🎉 Parabéns! Você foi o ganhador!
            </p>
            {fundadorData.premio_creditado && (
              <p className="text-xs text-green-300 mt-1">
                500.000 pontos creditados na sua conta
              </p>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  // PRIME MENSAL - Incentivo para mudar para anual
  if (isPrime && !isAnual) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-900/20 to-deep-purple/40 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">👑</span>
          </div>

          <div className="flex-1">
            <h3 className="text-base font-display font-bold text-amber-400 mb-1">
              Mude para o Anual e vire Fundador
            </h3>
            <p className="text-sm text-dusty-rose mb-3">
              Garanta sua vaga entre os 100 primeiros e concorra a 500 mil pontos!
            </p>

            {(() => {
              const vagasRestantes = fundadorData?.vagas_disponiveis || 0
              const isUltimas = vagasRestantes <= 20 && vagasRestantes > 0
              return (
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs px-2 py-1 rounded-lg ${
                    isUltimas
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                      : 'bg-ice-white/10 text-ice-white/60'
                  }`}>
                    {isUltimas ? `Últimas ${vagasRestantes} vagas` : `Restam ${vagasRestantes} vagas`}
                  </span>
                </div>
              )
            })()}

            <SubscribeButton
              plan="anual"
              label="Quero ser Fundador"
              className="w-full"
            />
          </div>
        </div>
      </motion.div>
    )
  }

  // FREE - Card de destaque
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-6 ${
        variant === 'highlight' || showAfterPositiveAction
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-900/30 to-deep-purple/50'
          : 'border-dusty-rose/20 bg-deep-purple/30'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🏆</span>
        </div>

        <div className="flex-1">
          <h3 className="text-base font-display font-bold text-amber-400 mb-1">
            Torne-se Fundador
          </h3>
          <p className="text-sm text-dusty-rose mb-2">
            Prime Anual por <span className="line-through text-dusty-rose/60">R$ 997</span>{' '}
            <span className="text-amber-400 font-semibold">R$ 497</span> e concorra a 500 mil pontos
          </p>

          {(() => {
            const vagasRestantes = fundadorData?.vagas_disponiveis || 0
            const isUltimas = vagasRestantes <= 20 && vagasRestantes > 0
            return (
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-lg ${
                  isUltimas
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    : 'bg-ice-white/10 text-ice-white/60'
                }`}>
                  {isUltimas ? `Últimas ${vagasRestantes} vagas` : `Restam ${vagasRestantes} vagas`}
                </span>
                <span className="text-xs text-amber-400">
                  Pix ou 6x R$ 82,83
                </span>
              </div>
            )
          })()}

          <div className="flex items-center gap-3">
            <SubscribeButton
              plan="anual"
              label="Quero ser Fundador"
              className="flex-1"
            />
            <a
              href={regulamentoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-dusty-rose hover:text-ice-white underline"
            >
              Regulamento
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
