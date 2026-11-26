// ============================================
// CARD DE INDICAÇÃO - "Indique e ganhe"
// Mostra link de indicação, botão copiar e compartilhar
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { getMyReferralCode, getMyReferrals, getConfigIndicacao } from '@/services/referralService'
import toast from 'react-hot-toast'

export function ReferralCard() {
  const { profile } = useAuth()
  const [referralCode, setReferralCode] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)

  // Pontos baseado no plano
  const isPrime = profile?.plano === 'prime'
  const pontosIndicacao = config
    ? (isPrime ? config.pontos_indicacao_prime : config.pontos_indicacao_free)
    : (isPrime ? 5000 : 2000)

  useEffect(() => {
    async function loadData() {
      if (!profile?.id) return

      setLoading(true)
      const [codeResult, referralsResult, configResult] = await Promise.all([
        getMyReferralCode(profile.id),
        getMyReferrals(profile.id),
        getConfigIndicacao()
      ])

      if (codeResult.success) {
        setReferralCode(codeResult.code)
        setReferralLink(codeResult.link)
      }

      if (referralsResult.success) {
        setReferrals(referralsResult.referrals)
      }

      if (configResult.success) {
        setConfig(configResult.config)
      }

      setLoading(false)
    }

    loadData()
  }, [profile?.id])

  // Copiar link
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      toast.success('Link copiado!')
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  // Compartilhar WhatsApp
  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Entrei no Me,up Club, o clube de vantagens da Me,up Viagens. Use meu link para entrar: ${referralLink}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-dusty-rose/10 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-dusty-rose/20 rounded w-1/2" />
          <div className="h-10 bg-dusty-rose/10 rounded" />
        </div>
      </div>
    )
  }

  if (!referralCode) return null

  // Contagem de indicados
  const totalIndicados = referrals.length
  const aprovados = referrals.filter(r => r.status === 'approved').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-dusty-rose/10 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-display font-semibold text-graphite">
            Indique e ganhe
          </h3>
          <p className="text-xs text-graphite/60 font-heading">
            {pontosIndicacao.toLocaleString('pt-BR')} pts por indicação
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-antique-gold/20 to-antique-gold/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-antique-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
      </div>

      {/* Link */}
      <div className="bg-ice-white rounded-xl p-3 mb-4">
        <p className="text-[10px] text-graphite/50 font-heading mb-1">Seu link:</p>
        <p className="text-xs font-mono text-graphite truncate">{referralLink}</p>
      </div>

      {/* Botões */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-deep-purple text-ice-white text-xs font-heading font-medium hover:bg-bright-purple transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copiar
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-xs font-heading font-medium hover:bg-green-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </button>
      </div>

      {/* Indicados */}
      {totalIndicados > 0 && (
        <div className="pt-4 border-t border-dusty-rose/10">
          <p className="text-xs text-graphite/60 font-heading mb-2">
            {totalIndicados} indicado{totalIndicados > 1 ? 's' : ''} · {aprovados} viajou
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {referrals.slice(0, 5).map((ref) => (
              <div key={ref.id} className="flex items-center justify-between text-xs">
                <span className="text-graphite font-heading truncate">
                  {ref.referred?.name?.split(' ')[0] || 'Indicado'}
                </span>
                <span className={`font-heading ${
                  ref.status === 'approved' ? 'text-green-600' :
                  ref.status === 'pending' || ref.status === 'cadastrado' ? 'text-amber-600' :
                  'text-gray-400'
                }`}>
                  {ref.status === 'approved' ? 'Viajou ✓' :
                   ref.status === 'pending' || ref.status === 'cadastrado' ? 'Cadastrado' :
                   'Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
