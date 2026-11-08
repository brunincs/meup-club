import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { fetchMySubscription, fetchPlanosConfig, formatCiclo } from '@/services/subscriptionService'
import { isPaymentEnabled, isTestMode, PRICES, ativarPrimeTest, cancelarPrimeTest } from '@/services/paymentAdapter'
import toast from 'react-hot-toast'

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE PLANOS
// ══════════════════════════════════════════════════════════════════════════════

export function Plans() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [planosConfig, setPlanosConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function load() {
      const [subResult, configResult] = await Promise.all([
        fetchMySubscription(),
        fetchPlanosConfig(),
      ])

      if (subResult.success) {
        setSubscription(subResult)
      }
      if (configResult.success) {
        setPlanosConfig(configResult.planos)
      }
      setLoading(false)
    }
    load()
  }, [])

  const isPrime = subscription?.plano === 'prime'
  const paymentEnabled = isPaymentEnabled()
  const testMode = isTestMode()

  const handleAssinar = async (ciclo) => {
    if (!user) {
      toast.error('Faça login para assinar')
      return
    }

    setProcessing(true)

    if (paymentEnabled) {
      // TODO: Redirecionar para checkout do gateway
      toast('Redirecionando para pagamento...')
      // const result = await criarAssinatura(user.id, ciclo)
      // if (result.success) {
      //   window.location.href = result.checkoutUrl
      // }
    } else if (testMode) {
      // Modo de teste: ativar direto
      const result = await ativarPrimeTest(user.id, ciclo)
      if (result.success) {
        toast.success(`Prime ${formatCiclo(ciclo)} ativado! (modo teste)`)
        // Recarregar
        const subResult = await fetchMySubscription()
        if (subResult.success) setSubscription(subResult)
      } else {
        toast.error(result.error || 'Erro ao ativar')
      }
    } else {
      toast('Em breve! Pagamento ainda não disponível.')
    }

    setProcessing(false)
  }

  const handleCancelar = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar sua assinatura Prime?')) return

    setProcessing(true)

    if (testMode) {
      const result = await cancelarPrimeTest(user.id)
      if (result.success) {
        toast.success('Assinatura cancelada (modo teste)')
        const subResult = await fetchMySubscription()
        if (subResult.success) setSubscription(subResult)
      } else {
        toast.error(result.error || 'Erro ao cancelar')
      }
    } else {
      toast('Entre em contato para cancelar sua assinatura.')
    }

    setProcessing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-deep-purple to-graphite flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-white/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-purple to-graphite py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Escolha seu plano
          </h1>
          <p className="text-dusty-rose/80 font-heading max-w-lg mx-auto">
            Ganhe mais pontos, multiplicadores exclusivos e benefícios premium com o Meup Prime.
          </p>
        </div>

        {/* Status atual */}
        {isPrime && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-center"
          >
            <p className="text-amber-200 font-heading">
              👑 Você é <span className="font-bold">Meup Prime {formatCiclo(subscription?.ciclo)}</span>
            </p>
          </motion.div>
        )}

        {/* Cards de planos */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`relative p-6 rounded-2xl border ${
              !isPrime
                ? 'bg-white/10 border-white/20'
                : 'bg-white/5 border-white/10 opacity-60'
            }`}
          >
            {!isPrime && (
              <div className="absolute -top-3 left-6 px-3 py-1 bg-white/20 rounded-full text-xs text-white font-heading">
                Seu plano atual
              </div>
            )}

            <h2 className="text-2xl font-display font-bold text-white mb-2">Free</h2>
            <p className="text-4xl font-display font-bold text-white mb-6">
              R$0<span className="text-lg text-dusty-rose/60">/sempre</span>
            </p>

            <ul className="space-y-3 text-sm text-dusty-rose/80 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Check-in: {planosConfig?.free?.pontosCheckin || 10} pts/dia
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Indicação: {(planosConfig?.free?.pontosIndicacao || 3000).toLocaleString('pt-BR')} pts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">−</span>
                <span className="text-dusty-rose/40">Bônus aniversário: 0 pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">−</span>
                <span className="text-dusty-rose/40">Multiplicador: 1x</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">−</span>
                <span className="text-dusty-rose/40">Lançamento manual</span>
              </li>
            </ul>

            {!isPrime ? (
              <div className="py-3 text-center text-dusty-rose/60 font-heading text-sm">
                Plano atual
              </div>
            ) : (
              <button
                onClick={handleCancelar}
                disabled={processing}
                className="w-full py-3 rounded-xl border border-white/20 text-white/60 font-heading hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processando...' : 'Voltar para Free'}
              </button>
            )}
          </motion.div>

          {/* Prime */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`relative p-6 rounded-2xl border-2 ${
              isPrime
                ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/50'
                : 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30'
            }`}
          >
            {isPrime && (
              <div className="absolute -top-3 left-6 px-3 py-1 bg-amber-500 rounded-full text-xs text-white font-heading font-bold">
                👑 Seu plano atual
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-display font-bold text-white">Meup Prime</h2>
              <span className="text-2xl">👑</span>
            </div>

            <div className="mb-6">
              <p className="text-4xl font-display font-bold text-white">
                R$49,90<span className="text-lg text-dusty-rose/60">/mês</span>
              </p>
              <p className="text-sm text-amber-300 mt-1">
                ou R$497/ano (economize R$101,80 + multiplicador 1.5x)
              </p>
            </div>

            <ul className="space-y-3 text-sm text-dusty-rose/80 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Check-in: <span className="text-white font-semibold">{planosConfig?.prime?.pontosCheckin || 30} pts/dia</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Indicação: <span className="text-white font-semibold">{(planosConfig?.prime?.pontosIndicacao || 5000).toLocaleString('pt-BR')} pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Bônus aniversário: <span className="text-white font-semibold">{(planosConfig?.prime?.pontosAniversario || 5000).toLocaleString('pt-BR')} pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Multiplicador viagem: <span className="text-white font-semibold">1.5x (anual)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                <span className="text-white font-semibold">Lançamento automático</span>
              </li>
            </ul>

            {isPrime ? (
              <div className="py-3 text-center text-amber-300 font-heading font-semibold">
                ✓ Você é Prime {formatCiclo(subscription?.ciclo)}
              </div>
            ) : (
              <div className="space-y-3">
                {!paymentEnabled && (
                  <p className="text-xs text-center text-amber-300/60 font-heading">
                    {testMode ? '🧪 Modo de teste ativo' : 'Em breve!'}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAssinar('mensal')}
                    disabled={processing}
                    className="py-3 rounded-xl bg-white/10 text-white font-heading font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    {processing ? '...' : 'Mensal'}
                  </button>
                  <button
                    onClick={() => handleAssinar('anual')}
                    disabled={processing}
                    className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-heading font-semibold hover:from-amber-600 hover:to-amber-700 transition-colors disabled:opacity-50"
                  >
                    {processing ? '...' : 'Anual (1.5x)'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Nota */}
        <p className="text-center text-xs text-dusty-rose/40 mt-8 font-heading">
          Plano é diferente de classe. Sua classe é determinada pelos pontos acumulados.
        </p>
      </div>
    </div>
  )
}
