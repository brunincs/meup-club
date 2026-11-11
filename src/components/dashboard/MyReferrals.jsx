// ============================================
// MINHAS INDICAÇÕES - Portal do Cliente
// Mostra as indicações com etapas por amigo
// ============================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { getReferralSteps, getMissedEarnings, getTotalMissedEarnings } from '@/services/referralService'
import { getMyReferralCode } from '@/services/referralService'
import { format } from '@/services/copy'

// Etapas do funil de indicação
const STEPS = [
  { key: 'cadastrou', label: 'Cadastrou', icon: '👤' },
  { key: 'primeira_emissao', label: 'Comprou', icon: '✈️' },
  { key: 'prime_anual', label: 'Assinou Prime', icon: '👑', primeOnly: true }
]

export function MyReferrals({ variant = 'dark' }) {
  const { user, useMock, profile } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [missedEarnings, setMissedEarnings] = useState([])
  const [totalMissed, setTotalMissed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showMissed, setShowMissed] = useState(false)
  const isLight = variant === 'light'

  const planoEfetivo = profile?.plano_efetivo || profile?.plano || 'free'
  const isPrime = planoEfetivo === 'prime'

  useEffect(() => {
    async function loadData() {
      if (!user?.id || useMock) {
        // Mock data
        setReferrals([
          {
            referral_id: '1',
            referred_name: 'Maria Silva',
            cadastrou: true,
            cotacao_validada: true,
            cotacao_pontos: 500,
            primeira_emissao: true,
            emissao_pontos: 5000,
            prime_anual: false,
            prime_anual_pontos: 0
          },
          {
            referral_id: '2',
            referred_name: 'João Santos',
            cadastrou: true,
            cotacao_validada: false,
            cotacao_pontos: 0,
            primeira_emissao: false,
            emissao_pontos: 0,
            prime_anual: false,
            prime_anual_pontos: 0
          }
        ])
        setLoading(false)
        return
      }

      // Load referral steps
      const stepsResult = await getReferralSteps()
      if (stepsResult.success) {
        setReferrals(stepsResult.steps)
      }

      // Load missed earnings for Free users
      if (!isPrime) {
        const missedResult = await getMissedEarnings()
        if (missedResult.success) {
          setMissedEarnings(missedResult.earnings.filter(e => !e.visualizado))
        }
        const totalResult = await getTotalMissedEarnings()
        if (totalResult.success) {
          setTotalMissed(totalResult.total)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [user?.id, useMock, isPrime])

  if (loading) {
    return (
      <div className={`rounded-2xl border p-6 ${
        isLight ? 'border-deep-purple/10 bg-white' : 'border-dusty-rose/20 bg-deep-purple/30'
      }`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-4 w-32 rounded ${isLight ? 'bg-deep-purple/10' : 'bg-dusty-rose/20'}`} />
          <div className={`h-20 rounded-xl ${isLight ? 'bg-deep-purple/5' : 'bg-dusty-rose/10'}`} />
        </div>
      </div>
    )
  }

  // Calculate totals
  const totalPontos = referrals.reduce((sum, r) =>
    sum + (r.emissao_pontos || 0) + (r.prime_anual_pontos || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`rounded-2xl border overflow-hidden ${
        isLight
          ? 'border-deep-purple/10 bg-white shadow-lg'
          : 'border-dusty-rose/20 bg-deep-purple/30'
      }`}
    >
      {/* Header */}
      <div className={`p-6 border-b ${isLight ? 'border-deep-purple/10' : 'border-dusty-rose/20'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`text-[10px] uppercase tracking-wider mb-1 ${
              isLight ? 'text-deep-purple/60' : 'text-dusty-rose/60'
            }`}>
              Suas Indicações
            </h3>
            <p className={`text-sm ${isLight ? 'text-deep-purple/70' : 'text-dusty-rose'}`}>
              {referrals.length === 0
                ? 'Nenhuma indicação ainda'
                : `${referrals.length} amigo${referrals.length === 1 ? '' : 's'} indicado${referrals.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {totalPontos > 0 && (
            <div className="text-right">
              <p className="text-xs text-green-600 font-heading font-semibold">
                +{format.pointsShort(totalPontos)} ganhos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Missed earnings banner for Free users */}
      {!isPrime && totalMissed > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-sm font-heading font-semibold text-amber-800">
                  Você deixou de ganhar +{format.pointsShort(totalMissed)} pts
                </p>
                <p className="text-xs text-amber-700">
                  Com o Prime, você ganha mais em cada indicação
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowMissed(!showMissed)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-heading font-semibold hover:bg-amber-700 transition-colors"
            >
              Ver detalhes
            </button>
          </div>

          {/* Missed earnings details */}
          <AnimatePresence>
            {showMissed && missedEarnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-amber-200 space-y-2"
              >
                {missedEarnings.slice(0, 3).map((earning) => (
                  <div key={earning.id} className="text-xs text-amber-800 font-heading">
                    {earning.mensagem}
                  </div>
                ))}
                <a
                  href="/planos"
                  className="inline-flex items-center gap-1 text-xs text-amber-700 font-heading font-semibold hover:text-amber-900 mt-2"
                >
                  Assine o Prime →
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Lista de indicações com etapas */}
      <div className="p-6">
        {referrals.length === 0 ? (
          <div className={`text-center py-8 ${isLight ? 'text-deep-purple/50' : 'text-dusty-rose/60'}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-antique-gold/10 flex items-center justify-center">
              <span className="text-antique-gold text-xl">◇</span>
            </div>
            <p className="text-sm">Compartilhe seu código e ganhe pontos!</p>
            <p className="text-xs mt-2 text-graphite/50">
              Primeira viagem: até +5.000 pts · Prime Anual: +3.000 pts
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral, index) => (
              <motion.div
                key={referral.referral_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl ${
                  isLight
                    ? 'bg-ice-white border border-deep-purple/10'
                    : 'bg-deep-purple/50 border border-dusty-rose/20'
                }`}
              >
                {/* Nome e pontos */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      isLight
                        ? 'bg-deep-purple/10 text-deep-purple'
                        : 'bg-dusty-rose/20 text-ice-white'
                    }`}>
                      {referral.referred_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${
                        isLight ? 'text-deep-purple' : 'text-ice-white'
                      }`}>
                        {referral.referred_name || 'Amigo'}
                      </p>
                      <p className={`text-xs ${isLight ? 'text-deep-purple/50' : 'text-dusty-rose/60'}`}>
                        {referral.referred_email}
                      </p>
                    </div>
                  </div>

                  {/* Total de pontos */}
                  {(referral.emissao_pontos + referral.prime_anual_pontos) > 0 && (
                    <span className="text-xs text-green-600 font-heading font-semibold">
                      +{format.pointsShort(referral.emissao_pontos + referral.prime_anual_pontos)}
                    </span>
                  )}
                </div>

                {/* Etapas */}
                <div className="flex items-center gap-1">
                  {STEPS.map((step, stepIndex) => {
                    const completed = referral[step.key]
                    const isPrimeStep = step.primeOnly
                    const points = step.key === 'primeira_emissao' ? referral.emissao_pontos
                      : step.key === 'prime_anual' ? referral.prime_anual_pontos : 0
                    const isPending = step.key === 'prime_anual' && referral.prime_anual_pendente

                    return (
                      <div key={step.key} className="flex items-center">
                        {/* Step */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                              completed
                                ? isPending
                                  ? 'bg-amber-100 text-amber-600 border-2 border-amber-300'
                                  : 'bg-green-100 text-green-600 border-2 border-green-300'
                                : isPrimeStep && !isPrime
                                  ? 'bg-gray-100 text-gray-400 border border-gray-200'
                                  : isLight
                                    ? 'bg-gray-100 text-gray-400 border border-gray-200'
                                    : 'bg-dusty-rose/10 text-dusty-rose/40 border border-dusty-rose/20'
                            }`}
                            title={`${step.label}${isPrimeStep && !isPrime ? ' (Prime)' : ''}`}
                          >
                            {completed ? (isPending ? '⏳' : '✓') : step.icon}
                          </div>
                          <span className={`text-[10px] mt-1 ${
                            completed
                              ? 'text-green-600 font-semibold'
                              : isPrimeStep && !isPrime
                                ? 'text-gray-400'
                                : isLight ? 'text-graphite/50' : 'text-dusty-rose/50'
                          }`}>
                            {step.label}
                            {isPrimeStep && !isPrime && (
                              <span className="text-amber-500 ml-0.5">🔒</span>
                            )}
                          </span>
                          {points > 0 && (
                            <span className="text-[9px] text-green-600 font-semibold">
                              +{format.pointsShort(points)}
                            </span>
                          )}
                        </div>

                        {/* Connector line */}
                        {stepIndex < STEPS.length - 1 && (
                          <div className={`w-4 h-0.5 mx-0.5 mt-[-14px] ${
                            completed ? 'bg-green-300' : isLight ? 'bg-gray-200' : 'bg-dusty-rose/20'
                          }`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Prime CTA for Free users */}
      {!isPrime && (
        <div className={`px-6 py-4 border-t ${isLight ? 'border-deep-purple/10 bg-deep-purple/5' : 'border-dusty-rose/20 bg-deep-purple/50'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs flex items-center gap-2 ${isLight ? 'text-deep-purple/70' : 'text-dusty-rose'}`}>
              <span className="text-amber-500">🔒</span>
              Assine o Prime para ganhar mais na viagem e no Prime Anual
            </p>
            <a
              href="/planos"
              className="px-3 py-1.5 rounded-lg bg-antique-gold text-deep-purple text-xs font-heading font-semibold hover:bg-accent-light transition-colors"
            >
              Ver planos
            </a>
          </div>
        </div>
      )}

      {/* Footer - info for Prime users */}
      {isPrime && (
        <div className={`px-6 py-4 border-t ${isLight ? 'border-deep-purple/10' : 'border-dusty-rose/20'}`}>
          <p className={`text-[10px] flex items-center gap-2 ${isLight ? 'text-deep-purple/50' : 'text-dusty-rose/60'}`}>
            <span className="text-antique-gold">◇</span>
            Primeira viagem +5.000 pts · Prime Anual +3.000 pts (indicador) +1.000 pts (indicado)
          </p>
        </div>
      )}
    </motion.div>
  )
}
