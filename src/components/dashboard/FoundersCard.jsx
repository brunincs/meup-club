// ============================================
// CARD AÇÃO FUNDADORES - Dashboard
// Mostra diferentes estados: Free, Fundador
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { getMyFundadorData, getFundadoresCount, getRegulamentoUrl } from '@/services/fundadoresService'
import { SubscribeButton } from '@/components/ui/SubscribeButton'
import { SeloFundador } from '@/components/ui/SeloFundador'

export function FoundersCard({ variant = 'dark', showAfterPositiveAction = false, foundersOnly = false }) {
  const { profile } = useAuth()
  const [fundadorData, setFundadorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regulamentoUrl, setRegulamentoUrl] = useState('')

  const isLight = variant === 'light'
  const planoEfetivo = profile?.plano_efetivo || profile?.plano || 'free'
  const isPrime = planoEfetivo === 'prime'

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
      <div className={`rounded-2xl border p-6 animate-pulse ${
        isLight
          ? 'border-nude-rose bg-white'
          : 'border-dusty-rose/20 bg-deep-purple/30'
      }`}>
        <div className={`h-6 w-32 rounded mb-4 ${isLight ? 'bg-graphite/10' : 'bg-dusty-rose/20'}`} />
        <div className={`h-4 w-48 rounded ${isLight ? 'bg-graphite/5' : 'bg-dusty-rose/10'}`} />
      </div>
    )
  }

  // Se vagas esgotadas e não é fundador, não mostra nada
  if (fundadorData?.vagas_disponiveis === 0 && !fundadorData?.is_fundador) {
    return null
  }

  // Se foundersOnly=true e não é fundador, não mostra nada (usado no dashboard)
  if (foundersOnly && !fundadorData?.is_fundador) {
    return null
  }

  // FUNDADOR - Mostra selo e número da sorte
  // Layout empilhado no mobile: selo no topo, depois título, número, texto e link
  if (fundadorData?.is_fundador) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 relative overflow-hidden bg-white shadow-sm"
        style={{ border: '1px solid #ddd1d0' }}
      >
        {/* Layout Mobile: empilhado */}
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          {/* Selo Fundador compacto no topo */}
          <div className="mb-4">
            <img
              src="/brand/selo-fundador-sm.svg"
              alt="Fundador"
              className="h-10 w-auto"
              onError={(e) => {
                // Fallback para o SeloFundador se imagem não existir
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <div style={{ display: 'none' }}>
              <SeloFundador size="sm" />
            </div>
          </div>

          {/* Título */}
          <h3 className="text-lg font-display font-bold mb-2 text-antique-gold">
            Seu número da sorte
          </h3>

          {/* Número grande */}
          <p className="text-4xl sm:text-3xl font-display font-bold tracking-wider mb-3 text-deep-purple">
            {fundadorData.numero_sorte}
          </p>

          {/* Texto explicativo */}
          <p className="text-sm mb-4 max-w-xs text-graphite/70">
            Concorrendo a 500 mil pontos na Ação Fundadores
          </p>

          {/* Link do regulamento */}
          <a
            href={regulamentoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline text-antique-gold hover:text-deep-purple"
          >
            Ver regulamento
          </a>
        </div>

        {fundadorData.ganhador && (
          <div className="mt-4 p-4 rounded-xl bg-green-500/20 border border-green-400/30 text-center sm:text-left">
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

  // FREE - Card de destaque (Prime mensal removido - todo Prime é anual)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-6 ${
        isLight
          ? showAfterPositiveAction
            ? 'border-antique-gold/40 bg-gradient-to-br from-antique-gold/10 to-white'
            : 'border-nude-rose bg-white shadow-sm'
          : showAfterPositiveAction
            ? 'border-amber-400/50 bg-gradient-to-br from-amber-900/30 to-deep-purple/50'
            : 'border-dusty-rose/20 bg-deep-purple/30'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${
          isLight
            ? 'bg-antique-gold/10 border-antique-gold/30'
            : 'bg-amber-400/20 border-amber-400/30'
        }`}>
          <span className="text-xl">🏆</span>
        </div>

        <div className="flex-1">
          <h3 className={`text-base font-display font-bold mb-1 ${isLight ? 'text-antique-gold' : 'text-amber-400'}`}>
            Torne-se Fundador
          </h3>
          <p className={`text-sm mb-2 ${isLight ? 'text-graphite/70' : 'text-dusty-rose'}`}>
            Prime por <span className={`line-through ${isLight ? 'text-graphite/40' : 'text-dusty-rose/60'}`}>R$ 997</span>{' '}
            <span className={`font-semibold ${isLight ? 'text-antique-gold' : 'text-amber-400'}`}>R$ 497/ano</span> e concorra a 500 mil pontos
          </p>

          {(() => {
            const vagasRestantes = fundadorData?.vagas_disponiveis || 0
            const isUltimas = vagasRestantes <= 20 && vagasRestantes > 0
            return (
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-lg ${
                  isUltimas
                    ? isLight
                      ? 'bg-antique-gold/10 text-antique-gold border border-antique-gold/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    : isLight
                      ? 'bg-graphite/5 text-graphite/60'
                      : 'bg-ice-white/10 text-ice-white/60'
                }`}>
                  {isUltimas ? `Últimas ${vagasRestantes} vagas` : `Restam ${vagasRestantes} vagas`}
                </span>
                <span className={`text-xs ${isLight ? 'text-antique-gold' : 'text-amber-400'}`}>
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
              className={`text-xs underline ${isLight ? 'text-graphite/60 hover:text-deep-purple' : 'text-dusty-rose hover:text-ice-white'}`}
            >
              Regulamento
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
