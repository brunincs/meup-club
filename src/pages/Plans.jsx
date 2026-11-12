import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { fetchMySubscription, fetchPlanosConfig } from '@/services/subscriptionService'
import { getPrecoFundadorAtual } from '@/services/fundadoresService'
import { isPaymentEnabled, iniciarAssinaturaWhatsApp } from '@/services/paymentAdapter'
import { formatPrice } from '@/config/contact'
import toast from 'react-hot-toast'

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE PLANOS - Pública e Protegida
// ══════════════════════════════════════════════════════════════════════════════

export function Plans() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState(null)
  const [planosConfig, setPlanosConfig] = useState(null)
  const [loteData, setLoteData] = useState({ lote_numero: 1, preco: 497, vagas_restantes: 100 })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  // Apenas plano anual disponível
  const cicloSelecionado = 'anual'

  useEffect(() => {
    async function load() {
      const [configResult, loteResult] = await Promise.all([
        fetchPlanosConfig(),
        getPrecoFundadorAtual()
      ])

      if (configResult.success) {
        setPlanosConfig(configResult.planos)
      }
      if (loteResult.success) {
        setLoteData(loteResult)
      }

      // Só busca subscription se estiver logado
      if (user) {
        const subResult = await fetchMySubscription()
        if (subResult.success) {
          setSubscription(subResult)
        }
      }
      setLoading(false)
    }
    load()
  }, [user])

  const isPrime = subscription?.plano === 'prime'
  const paymentEnabled = isPaymentEnabled()

  const handleAssinar = async (ciclo) => {
    // Se não estiver logado, redireciona para login
    if (!user) {
      toast('Faça login para continuar')
      navigate('/login', { state: { from: '/planos' } })
      return
    }

    setProcessing(true)

    if (paymentEnabled) {
      // SEAM: Quando gateway integrar, usar criarAssinatura()
      toast('Redirecionando para pagamento...')
      // const result = await criarAssinatura(user.id, ciclo)
      // if (result.success) window.location.href = result.checkoutUrl
    } else {
      // Abre WhatsApp com mensagem pré-preenchida
      await iniciarAssinaturaWhatsApp(ciclo)
      toast.success('WhatsApp aberto! Finalize sua assinatura por lá.')
    }

    setProcessing(false)
  }

  if (loading || authLoading) {
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

  // Valores do plano (apenas anual) - preço vem do lote atual
  const primeConfig = planosConfig?.prime || {}
  const freeConfig = planosConfig?.free || {}
  const precoAnual = loteData.preco || 497
  const precoAnualCheio = 997
  const loteAtual = loteData.lote_numero || 1
  const ofertaFundador = loteAtual > 0 && loteData.vagas_restantes > 0
  const economiaFundadorAnual = (precoAnualCheio - precoAnual).toFixed(0)
  const descontoPercent = Math.round((1 - precoAnual / precoAnualCheio) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-purple to-graphite py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Meup Prime
          </h1>
          <p className="text-dusty-rose/80 font-heading max-w-lg mx-auto">
            Multiplique seus pontos, desbloqueie benefícios exclusivos e acelere sua jornada.
          </p>
        </div>


        {/* Status atual (se logado e Prime) */}
        {isPrime && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-center"
          >
            <p className="text-amber-200 font-heading">
              Você é <span className="font-bold">Meup Prime Anual</span>
            </p>
          </motion.div>
        )}

        {/* Comparativo de planos */}
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
            {!user && (
              <div className="absolute -top-3 left-6 px-3 py-1 bg-white/20 rounded-full text-xs text-white font-heading">
                Plano gratuito
              </div>
            )}
            {user && !isPrime && (
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
                Check-in: {freeConfig.pontosCheckin || 10} pts/dia
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Indicação: {(freeConfig.pontosIndicacao || 3000).toLocaleString('pt-BR')} pts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">-</span>
                <span className="text-dusty-rose/40">Bônus aniversário: 0 pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">-</span>
                <span className="text-dusty-rose/40">Multiplicador: 1x</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">-</span>
                <span className="text-dusty-rose/40">Lançamento manual</span>
              </li>
            </ul>

            <div className="py-3 text-center text-dusty-rose/60 font-heading text-sm">
              {!user ? 'Crie sua conta gratuitamente' : (isPrime ? '' : 'Plano atual')}
            </div>
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
            {/* Badge Fundador ou Recomendado */}
            {!isPrime && ofertaFundador && (
              <div className="absolute -top-3 right-6 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full text-xs text-white font-heading font-bold shadow-lg">
                {descontoPercent}% OFF · Lote {loteAtual}
              </div>
            )}
            {!isPrime && !ofertaFundador && cicloSelecionado === 'anual' && (
              <div className="absolute -top-3 right-6 px-3 py-1 bg-amber-500 rounded-full text-xs text-white font-heading font-bold">
                Recomendado
              </div>
            )}
            {isPrime && (
              <div className="absolute -top-3 left-6 px-3 py-1 bg-amber-500 rounded-full text-xs text-white font-heading font-bold">
                Seu plano atual
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-display font-bold text-white">Meup Prime</h2>
            </div>

            {/* Preço anual */}
            <div className="mb-6">
              {ofertaFundador && !isPrime && (
                <p className="text-dusty-rose/50 line-through text-lg">
                  R${formatPrice(precoAnualCheio, false)}/ano
                </p>
              )}
              <p className="text-4xl font-display font-bold text-white">
                R${formatPrice(precoAnual, false)}<span className="text-lg text-dusty-rose/60">/ano</span>
              </p>
              <p className="text-sm text-amber-300 mt-1">
                {ofertaFundador && !isPrime
                  ? `Economize R$${economiaFundadorAnual} + multiplicador 1.5x`
                  : 'Multiplicador 1.5x em viagens'
                }
              </p>
            </div>

            <ul className="space-y-3 text-sm text-dusty-rose/80 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Check-in: <span className="text-white font-semibold">{primeConfig.pontosCheckin || 30} pts/dia</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Indicação: <span className="text-white font-semibold">{(primeConfig.pontosIndicacao || 5000).toLocaleString('pt-BR')} pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Bônus aniversário: <span className="text-white font-semibold">{(primeConfig.pontosAniversario || 5000).toLocaleString('pt-BR')} pts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                Multiplicador viagem:{' '}
                <span className="text-white font-semibold">1.5x</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                <span className="text-white font-semibold">Viagem lançada pela equipe</span>
              </li>
            </ul>

            {/* CTAs */}
            {isPrime ? (
              <div className="py-3 text-center text-amber-300 font-heading font-semibold">
                ✓ Você é Prime Anual
              </div>
            ) : (
              <button
                onClick={() => handleAssinar(cicloSelecionado)}
                disabled={processing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-heading font-semibold hover:from-amber-600 hover:to-amber-700 transition-colors disabled:opacity-50"
              >
                {processing
                  ? 'Abrindo WhatsApp...'
                  : ofertaFundador
                    ? 'Garantir vaga de fundador'
                    : 'Assinar Anual'
                }
              </button>
            )}
          </motion.div>
        </div>

        {/* Benefícios do anual em destaque */}
        {!isPrime && cicloSelecionado === 'anual' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
          >
            <h3 className="text-amber-300 font-heading font-semibold mb-3 text-center">
              Exclusivo no plano Anual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-3">
                <div className="text-2xl mb-1">1.5x</div>
                <div className="text-xs text-dusty-rose/80">Multiplicador em viagens</div>
              </div>
              <div className="p-3">
                <div className="text-2xl mb-1">2 meses</div>
                <div className="text-xs text-dusty-rose/80">Grátis (12 pelo preço de 10)</div>
              </div>
              <div className="p-3">
                <div className="text-2xl mb-1">R${ofertaFundador ? economiaFundadorAnual : '100'}</div>
                <div className="text-xs text-dusty-rose/80">{ofertaFundador ? 'Economia de fundador' : 'Economia garantida'}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Nota sobre fundador */}
        {ofertaFundador && !isPrime && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-amber-300/80 mt-8 font-heading"
          >
            {loteData.vagas_restantes} vagas no Lote {loteAtual} · Preço de lançamento limitado
          </motion.p>
        )}

        {/* Nota */}
        <p className="text-center text-xs text-dusty-rose/40 mt-4 font-heading">
          Plano é diferente de classe. Sua classe é determinada pelos pontos acumulados.
        </p>
      </div>
    </div>
  )
}
