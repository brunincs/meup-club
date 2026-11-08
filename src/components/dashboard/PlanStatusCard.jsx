import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchMySubscription, formatCiclo } from '@/services/subscriptionService'
import { iniciarUpgradeAnualWhatsApp } from '@/services/paymentAdapter'
import toast from 'react-hot-toast'

/**
 * PlanStatusCard - Exibe status do plano no Dashboard
 *
 * - Free: Card "Assine o Prime" com CTA
 * - Prime Mensal: Nudge "Passe pro anual: 1.5x + 2 meses grátis"
 * - Prime Anual: Badge sem nudge
 */
export function PlanStatusCard() {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function load() {
      const result = await fetchMySubscription()
      if (result.success) {
        setSubscription(result)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleUpgrade = async () => {
    setProcessing(true)
    await iniciarUpgradeAnualWhatsApp()
    toast.success('WhatsApp aberto! Solicite seu upgrade.')
    setProcessing(false)
  }

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-24 mb-2" />
        <div className="h-3 bg-white/5 rounded w-32" />
      </div>
    )
  }

  const isPrime = subscription?.plano === 'prime'
  const isPrimeAnual = isPrime && subscription?.ciclo === 'anual'
  const isPrimeMensal = isPrime && subscription?.ciclo === 'mensal'

  // Prime Anual - Badge compacto
  if (isPrimeAnual) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/10 border border-amber-500/30"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">👑</span>
          <div>
            <p className="text-sm font-heading font-semibold text-amber-200">
              Meup Prime Anual
            </p>
            <p className="text-xs text-dusty-rose/70">
              Multiplicador 1.5x ativo
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Prime Mensal - Nudge para upgrade
  if (isPrimeMensal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">👑</span>
            <div>
              <p className="text-sm font-heading font-semibold text-amber-200">
                Meup Prime Mensal
              </p>
              <p className="text-xs text-dusty-rose/70">
                Desbloqueie o multiplicador 1.5x
              </p>
            </div>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={processing}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-heading font-semibold hover:from-amber-600 hover:to-amber-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {processing ? 'Abrindo...' : 'Upgrade Anual'}
          </button>
        </div>
        <p className="mt-2 text-xs text-amber-300/70">
          2 meses grátis + multiplicador 1.5x em todas as viagens
        </p>
      </motion.div>
    )
  }

  // Free - CTA para assinar
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-r from-deep-purple/80 to-graphite/50 border border-antique-gold/20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-heading font-semibold text-ice-white">
            Acelere sua jornada
          </p>
          <p className="text-xs text-dusty-rose/70">
            Ganhe 3x mais pontos com o Meup Prime
          </p>
        </div>
        <Link
          to="/planos"
          className="px-4 py-2 rounded-lg bg-antique-gold text-deep-purple text-sm font-heading font-semibold hover:bg-accent-light transition-colors text-center"
        >
          Ver planos
        </Link>
      </div>
    </motion.div>
  )
}
