import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { fetchMySubscription, fetchPlanosConfig } from '@/services/subscriptionService'
import { getPrecoFundadorAtual } from '@/services/fundadoresService'
import { getFullSlotsData } from '@/services/slotsService'
import { isPaymentEnabled, garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'
import { formatPrice } from '@/config/contact'
import toast from 'react-hot-toast'

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE PLANOS - Alinhada com PrimeOfferAlternada (landing)
// ══════════════════════════════════════════════════════════════════════════════

export function Plans() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState(null)
  const [planosConfig, setPlanosConfig] = useState(null)
  const [slotsData, setSlotsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function load() {
      const [configResult, slots] = await Promise.all([
        fetchPlanosConfig(),
        getFullSlotsData()
      ])

      if (configResult.success) {
        setPlanosConfig(configResult.planos)
      }
      setSlotsData(slots)

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

  const handleAssinar = async () => {
    // Se não estiver logado, redireciona para login
    if (!user) {
      toast('Faça login para continuar')
      navigate('/login', { state: { from: '/planos' } })
      return
    }

    setProcessing(true)
    garantirVagaFundadorWhatsApp('anual')
    toast.success('WhatsApp aberto! Finalize sua assinatura por lá.')
    setProcessing(false)
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-deep-purple to-graphite flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-white/30 border-t-[#a27937] rounded-full"
        />
      </div>
    )
  }

  // Valores do plano - alinhados com landing
  const primeConfig = planosConfig?.prime || {}
  const freeConfig = planosConfig?.free || {}

  // Dados do modelo exclusivo (fonte: slotsService, igual landing)
  const precoFundador = slotsData?.prime?.preco || 597
  const precoAnualCheio = 997
  const vagasTotal = slotsData?.prime?.vagas || 30
  const vagasRestantes = slotsData?.prime?.restantes || 30
  const esgotado = slotsData?.prime?.esgotado || false

  // Economia
  const economiaFundador = precoAnualCheio - precoFundador
  const descontoPercent = Math.round((1 - precoFundador / precoAnualCheio) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-purple to-graphite py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-medium tracking-wider uppercase bg-[#a27937]/10 border border-[#a27937]/30 text-[#a27937]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a27937] animate-pulse" />
              Acesso exclusivo
            </span>
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Seja um <span className="text-[#a27937]">Fundador</span> do Me,up Club
          </h1>
          <p className="text-dusty-rose/80 font-heading max-w-lg mx-auto">
            {vagasRestantes < vagasTotal && !esgotado
              ? `Restam ${vagasRestantes} de ${vagasTotal} vagas de fundador. Compare os planos.`
              : `Apenas ${vagasTotal} vagas para membros fundadores. Compare os planos.`}
          </p>
        </div>


        {/* Status atual (se logado e Prime) */}
        {isPrime && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-[#a27937]/20 to-[#a27937]/10 border border-[#a27937]/30 text-center"
          >
            <p className="text-[#a27937] font-heading">
              Você é <span className="font-bold">Me,up Prime Fundador</span> ✨
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
            <p className="text-sm text-dusty-rose/60 mb-4">Para clientes Me,up</p>
            <p className="text-4xl font-display font-bold text-white mb-6">
              R$0<span className="text-lg text-dusty-rose/60">/sempre</span>
            </p>

            <ul className="space-y-3 text-sm text-dusty-rose/80 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Pontos por viagem: <strong className="text-white">0,5 pt/R$</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Check-in diário: <strong className="text-white">{freeConfig.pontosCheckin || 10} pts</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Cotação ilimitada
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Pontos válidos por 12 meses
              </li>
              <li className="flex items-center gap-2">
                <span className="text-dusty-rose/40">-</span>
                <span className="text-dusty-rose/40">Lançamento manual da viagem</span>
              </li>
            </ul>

            {!user ? (
              <Link
                to="/cadastro"
                className="block w-full py-3 text-center text-white font-heading font-medium text-sm border border-white/20 rounded-xl hover:bg-white/5 transition-colors"
              >
                Criar conta grátis
              </Link>
            ) : (
              <div className="py-3 text-center text-dusty-rose/60 font-heading text-sm">
                {isPrime ? '' : 'Plano atual'}
              </div>
            )}
          </motion.div>

          {/* Prime Fundador */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`relative p-6 rounded-2xl border-2 ${
              isPrime
                ? 'bg-gradient-to-br from-[#4a2259] via-[#3d1a4a] to-[#2d1237] border-[#a27937]/50'
                : 'bg-gradient-to-br from-[#4a2259] via-[#3d1a4a] to-[#2d1237] border-[#a27937]/70'
            } shadow-2xl shadow-[#a27937]/20`}
          >
            {/* Badge Fundador */}
            {!isPrime && !esgotado && (
              <div className="absolute -top-3 right-6 px-3 py-1 bg-[#a27937] rounded-full text-xs text-deep-purple font-heading font-bold shadow-lg">
                Fundador · {vagasTotal} vagas
              </div>
            )}
            {!isPrime && esgotado && (
              <div className="absolute -top-3 right-6 px-3 py-1 bg-gray-500 rounded-full text-xs text-white font-heading font-bold shadow-lg">
                Esgotado
              </div>
            )}
            {isPrime && (
              <div className="absolute -top-3 left-6 px-3 py-1 bg-[#a27937] rounded-full text-xs text-deep-purple font-heading font-bold">
                Você é Fundador ✨
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#a27937]">👑</span>
              <h2 className="text-2xl font-display font-bold text-white">Me,up Prime</h2>
            </div>

            {/* Preço */}
            <div className="mb-6">
              {!isPrime && (
                <p className="text-dusty-rose/50 line-through text-lg">
                  R${formatPrice(precoAnualCheio, false)}/ano
                </p>
              )}
              <p className="text-4xl font-display font-bold text-white">
                R${formatPrice(precoFundador, false)}<span className="text-lg text-dusty-rose/60">/ano</span>
              </p>
              {!isPrime && (
                <>
                  <p className="text-sm text-[#a27937] mt-1">
                    ou 6x de R$ 99,50 sem juros
                  </p>
                  <p className="text-sm text-[#a27937] mt-1 flex items-center gap-1">
                    Economize R${economiaFundador}
                  </p>
                </>
              )}
            </div>

            {/* Bloco: Mais pontos */}
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-[#a27937]/60 mb-2 font-heading">Mais pontos</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Pontos por viagem: <strong className="text-[#a27937]">1,5 pt/R$</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Resgate mais vantajoso</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Check-in diário: <strong className="text-[#a27937]">{primeConfig.pontosCheckin || 30} pts</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Bônus de boas-vindas: <strong className="text-[#a27937]">2.000 pts</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Bônus aniversário: <strong className="text-[#a27937]">{(primeConfig.pontosAniversario || 5000).toLocaleString('pt-BR')} pts</strong></span>
                </li>
              </ul>
            </div>

            {/* Bloco: Benefícios exclusivos */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-wider text-[#a27937]/60 mb-2 font-heading">Benefícios exclusivos</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Prioridade na cotação</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Viagem lançada pela equipe Me,up</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Acesso antecipado a experiências</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Experiências com desconto</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Selo e número de fundador</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#a27937]">★</span>
                  <span className="text-white">Pontos não expiram</span>
                </li>
              </ul>
            </div>

            {/* CTAs */}
            {isPrime ? (
              <div className="py-3 text-center text-[#a27937] font-heading font-semibold">
                ✓ Você é Prime Fundador
              </div>
            ) : (
              <button
                onClick={handleAssinar}
                disabled={processing || esgotado}
                className={`w-full py-3.5 rounded-xl font-heading font-semibold transition-colors shadow-lg ${
                  esgotado
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-[#a27937] hover:bg-[#8b6830] text-deep-purple'
                }`}
              >
                {processing
                  ? 'Abrindo WhatsApp...'
                  : esgotado
                    ? 'Vagas esgotadas'
                    : 'Garantir minha vaga de fundador'
                }
              </button>
            )}
          </motion.div>
        </div>

        {/* Nota sobre fundador */}
        {!isPrime && !esgotado && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-[#a27937]/80 mt-8 font-heading"
          >
            {vagasRestantes} vagas de Fundador · Preço de lançamento
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
