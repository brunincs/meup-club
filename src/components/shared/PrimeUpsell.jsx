// ══════════════════════════════════════════════════════════════════════════════
// PrimeUpsell - Chamadas contextuais para o Prime (só para Free)
// Variantes: card | banner | inline
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { fetchPlanosConfig, fetchUserBenefits } from '@/services/subscriptionService'
import { getFundadoresCount } from '@/services/fundadoresService'
import { CrownIcon } from '@/components/ui/Icons'

const STORAGE_KEY = 'meup_prime_dismiss'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export function PrimeUpsell({
  variant = 'card', // 'card' | 'banner' | 'inline'
  context = 'default', // 'dashboard' | 'trip-submit' | 'rewards' | 'viagens' | 'perfil'
  valorEmissao = null, // Para calcular comparação de pontos (trip-submit)
  pontosNecessarios = null, // Para rewards quando não tem pontos suficientes
  isDark = true,
  className = ''
}) {
  const { user, profile } = useAuth()
  const [isPrime, setIsPrime] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [planosConfig, setPlanosConfig] = useState(null)
  const [vagasRestantes, setVagasRestantes] = useState(null)
  const [ofertaFundador, setOfertaFundador] = useState(false)

  // Verificar se foi dispensado recentemente
  useEffect(() => {
    if (variant === 'card' && context === 'dashboard') {
      try {
        const data = localStorage.getItem(STORAGE_KEY)
        if (data) {
          const parsed = JSON.parse(data)
          const lastDismiss = parsed[`${user?.id}_dashboard`]
          if (lastDismiss && (Date.now() - lastDismiss) < WEEK_MS) {
            setDismissed(true)
          }
        }
      } catch {
        // Ignora erros
      }
    }
  }, [user?.id, variant, context])

  // Carregar dados
  useEffect(() => {
    async function load() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      // Verificar se é Prime
      const benefitsResult = await fetchUserBenefits(user.id)
      if (benefitsResult.benefits?.isPrime) {
        setIsPrime(true)
        setLoading(false)
        return
      }

      // Buscar config dos planos
      const planosResult = await fetchPlanosConfig()
      if (planosResult.success) {
        setPlanosConfig(planosResult.planos)
        setOfertaFundador(planosResult.planos?.prime?.ofertaFundadorAtiva || false)
      }

      // Buscar vagas restantes
      const vagasResult = await getFundadoresCount()
      if (vagasResult.success) {
        setVagasRestantes(vagasResult.vagas_disponiveis)
      }

      setLoading(false)
    }
    load()
  }, [user?.id])

  // Não mostrar para Prime
  if (isPrime || loading) return null

  // Não mostrar se dispensado
  if (dismissed && variant === 'card' && context === 'dashboard') return null

  // Não mostrar se não estiver logado
  if (!user) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      const parsed = data ? JSON.parse(data) : {}
      parsed[`${user?.id}_dashboard`] = Date.now()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    } catch {
      // Ignora erros
    }
  }

  // Calcular comparação de pontos se tiver valor de emissão
  const calcComparacao = () => {
    if (!valorEmissao || !planosConfig?.prime) return null
    const multFree = planosConfig.free?.multiplicadorViagem || 0.5
    const multPrime = planosConfig.prime?.multiplicadorViagem || 1.5
    const pontosFree = Math.floor(valorEmissao * multFree)
    const pontosPrime = Math.floor(valorEmissao * multPrime)
    return { pontosFree, pontosPrime, diferenca: pontosPrime - pontosFree }
  }

  const comparacao = calcComparacao()

  // ══════════════════════════════════════════════════════════════════════════════
  // VARIANTE: CARD (Dashboard)
  // ══════════════════════════════════════════════════════════════════════════════
  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-deep-purple/80 to-purple-900/60 border-antique-gold/30'
            : 'bg-gradient-to-br from-deep-purple/10 to-purple-100 border-deep-purple/20'
        } ${className}`}
      >
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-antique-gold/20' : 'bg-antique-gold/10'
            }`}>
              <CrownIcon size={20} color="#a27937" />
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-display font-semibold mb-1 ${
                isDark ? 'text-ice-white' : 'text-graphite'
              }`}>
                Ganhe 3x mais pontos
              </h3>
              <p className={`text-xs leading-relaxed ${
                isDark ? 'text-dusty-rose' : 'text-graphite/60'
              }`}>
                Com o Prime você ganharia 3x mais pontos nas suas viagens.
              </p>
            </div>
          </div>

          {/* Info do Fundador */}
          {ofertaFundador && vagasRestantes !== null && vagasRestantes > 0 && (
            <div className={`mb-4 p-3 rounded-xl ${
              isDark ? 'bg-antique-gold/10' : 'bg-antique-gold/5'
            }`}>
              <p className={`text-xs ${isDark ? 'text-antique-gold' : 'text-deep-purple'}`}>
                <span className="font-semibold">Fundador:</span> R$ 597/ano (6x R$ 99,50) + 5.000 pts de boas-vindas
              </p>
              <p className={`text-[10px] mt-1 ${isDark ? 'text-dusty-rose/70' : 'text-graphite/50'}`}>
                {vagasRestantes} {vagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Link
              to="/planos#prime"
              className={`flex-1 py-2.5 rounded-xl text-center text-sm font-heading font-semibold transition-all ${
                isDark
                  ? 'bg-antique-gold text-deep-purple hover:bg-accent-light'
                  : 'bg-deep-purple text-ice-white hover:bg-bright-purple'
              }`}
            >
              {ofertaFundador && vagasRestantes > 0 ? 'Garantir vaga' : 'Conhecer o Prime'}
            </Link>
            <button
              onClick={handleDismiss}
              className={`px-3 py-2.5 rounded-xl text-xs font-heading transition-colors ${
                isDark
                  ? 'text-dusty-rose hover:text-ice-white hover:bg-white/5'
                  : 'text-graphite/60 hover:text-graphite hover:bg-dusty-rose/10'
              }`}
            >
              Agora não
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VARIANTE: BANNER (Minhas Viagens)
  // ══════════════════════════════════════════════════════════════════════════════
  if (variant === 'banner') {
    return (
      <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
        isDark
          ? 'bg-antique-gold/10 border border-antique-gold/20'
          : 'bg-deep-purple/5 border border-deep-purple/10'
      } ${className}`}>
        <div className="flex items-center gap-2">
          <CrownIcon size={16} color="#a27937" />
          <p className={`text-xs ${isDark ? 'text-dusty-rose' : 'text-graphite/70'}`}>
            <span className={`font-semibold ${isDark ? 'text-ice-white' : 'text-graphite'}`}>Prime:</span>
            {' '}pontos que não expiram e a equipe lança suas viagens.
          </p>
        </div>
        <Link
          to="/planos#prime"
          className={`text-xs font-heading font-semibold whitespace-nowrap ${
            isDark ? 'text-antique-gold hover:text-accent-light' : 'text-deep-purple hover:text-bright-purple'
          }`}
        >
          Conhecer →
        </Link>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VARIANTE: INLINE (Trip Submit, Rewards)
  // ══════════════════════════════════════════════════════════════════════════════
  if (variant === 'inline') {
    // Para Trip Submit - mostrar comparação de pontos
    if (context === 'trip-submit' && comparacao) {
      return (
        <div className={`text-center ${className}`}>
          <p className={`text-xs leading-relaxed mb-1 ${
            isDark ? 'text-dusty-rose/80' : 'text-graphite/60'
          }`}>
            Essa viagem de R$ {valorEmissao?.toLocaleString('pt-BR')} rende{' '}
            <span className={`font-semibold ${isDark ? 'text-ice-white' : 'text-graphite'}`}>
              {comparacao.pontosFree} pts
            </span>{' '}
            no Free. No Prime renderia{' '}
            <span className={`font-semibold ${isDark ? 'text-antique-gold' : 'text-deep-purple'}`}>
              {comparacao.pontosPrime} pts
            </span>.
          </p>
          <Link
            to="/planos#prime"
            className={`text-xs font-heading font-semibold transition-colors ${
              isDark ? 'text-antique-gold hover:text-accent-light' : 'text-deep-purple hover:text-bright-purple'
            }`}
          >
            {ofertaFundador && vagasRestantes > 0 ? 'Garantir preço de fundador →' : 'Conhecer o Prime →'}
          </Link>
        </div>
      )
    }

    // Para Rewards - quando não tem pontos suficientes
    if (context === 'rewards' && pontosNecessarios) {
      return (
        <p className={`text-xs text-center ${
          isDark ? 'text-dusty-rose/80' : 'text-graphite/60'
        } ${className}`}>
          No Prime você chega lá 3x mais rápido.{' '}
          <Link
            to="/planos#prime"
            className={`font-heading font-semibold ${
              isDark ? 'text-antique-gold hover:text-accent-light' : 'text-deep-purple hover:text-bright-purple'
            }`}
          >
            Conhecer →
          </Link>
        </p>
      )
    }

    // Genérico
    return (
      <p className={`text-xs text-center ${
        isDark ? 'text-dusty-rose/80' : 'text-graphite/60'
      } ${className}`}>
        No Prime, ganhe 3x mais pontos.{' '}
        <Link
          to="/planos#prime"
          className={`font-heading font-semibold ${
            isDark ? 'text-antique-gold hover:text-accent-light' : 'text-deep-purple hover:text-bright-purple'
          }`}
        >
          Conhecer →
        </Link>
      </p>
    )
  }

  return null
}

export default PrimeUpsell
