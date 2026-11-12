import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchMySubscription, formatCiclo } from '@/services/subscriptionService'
import { iniciarUpgradeAnualWhatsApp, iniciarRenovacaoWhatsApp } from '@/services/paymentAdapter'
import toast from 'react-hot-toast'

/**
 * ExpirationBanner - Banner de alerta para renovação
 * Cores: vermelho (<=3 dias), laranja (<=7), amarelo (<=14)
 */
function ExpirationBanner({ daysRemaining, ciclo, onRenew, processing }) {
  const isUrgent = daysRemaining <= 3
  const isWarning = daysRemaining <= 7

  const bgColor = isUrgent
    ? 'from-red-500/20 to-red-600/10 border-red-500/40'
    : isWarning
      ? 'from-orange-500/20 to-orange-600/10 border-orange-500/40'
      : 'from-yellow-500/15 to-yellow-600/10 border-yellow-500/30'

  const textColor = isUrgent
    ? 'text-red-200'
    : isWarning
      ? 'text-orange-200'
      : 'text-yellow-200'

  const subtextColor = isUrgent
    ? 'text-red-300/70'
    : isWarning
      ? 'text-orange-300/70'
      : 'text-yellow-300/70'

  const buttonBg = isUrgent
    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
    : isWarning
      ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
      : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'

  const title = isUrgent
    ? `Sua assinatura expira em ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''}!`
    : isWarning
      ? 'Renove e não perca seus benefícios'
      : 'Lembrete: renovação em breve'

  const subtitle = isUrgent
    ? 'Renove agora para continuar aproveitando o Meup Prime'
    : `Sua assinatura ${ciclo === 'anual' ? 'anual' : 'mensal'} expira em ${daysRemaining} dias`

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-gradient-to-r ${bgColor} border mb-3`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{isUrgent ? '⚠️' : isWarning ? '🔔' : '📅'}</span>
          <div>
            <p className={`text-sm font-heading font-semibold ${textColor}`}>
              {title}
            </p>
            <p className={`text-xs ${subtextColor}`}>
              {subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={onRenew}
          disabled={processing}
          className={`px-4 py-2 rounded-lg ${buttonBg} text-white text-sm font-heading font-semibold transition-colors disabled:opacity-50 whitespace-nowrap`}
        >
          {processing ? 'Abrindo...' : 'Renovar agora'}
        </button>
      </div>
    </motion.div>
  )
}

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

  const handleRenovar = async () => {
    setProcessing(true)
    await iniciarRenovacaoWhatsApp(subscription?.ciclo, subscription?.daysRemaining)
    toast.success('WhatsApp aberto! Solicite sua renovação.')
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
  const daysRemaining = subscription?.daysRemaining ?? null
  const isExpiringSoon = isPrime && daysRemaining !== null && daysRemaining <= 14

  // Prime Anual - Badge compacto (com banner se expirando)
  if (isPrime) {
    return (
      <div>
        {isExpiringSoon && (
          <ExpirationBanner
            daysRemaining={daysRemaining}
            ciclo={subscription.ciclo}
            onRenew={handleRenovar}
            processing={processing}
          />
        )}
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
      </div>
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
            1,5x nas viagens no Prime anual + check-in triplo
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
