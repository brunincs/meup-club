import { useState } from 'react'
import { motion } from 'framer-motion'
import { usePrimeActivation, useIsInvitee } from '@/hooks/useInvites'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Card para convidado ativar Prime
 * Aparece apenas para membros que entraram via convite e ainda não são Prime
 */
export function PrimeUpgradeCard() {
  const { profile } = useAuth()
  const { isInvitee } = useIsInvitee()
  const {
    canActivate,
    hasEmission,
    daysRemaining,
    price,
    reason,
    loading,
    activate,
    refresh
  } = usePrimeActivation()

  const [activating, setActivating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Não exibe se não é convidado ou já é Prime
  if (!isInvitee || profile?.plano === 'prime') return null

  // Loading
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-deep-purple to-purple-900 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/2 mb-4" />
        <div className="h-4 bg-white/10 rounded w-3/4" />
      </div>
    )
  }

  // Prazo expirado
  if (daysRemaining <= 0 && !canActivate) {
    return null // Não mostra se prazo expirou
  }

  const handleActivate = async () => {
    setActivating(true)
    setError(null)

    const result = await activate()

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error || 'Erro ao ativar')
    }

    setActivating(false)
  }

  // Sucesso
  if (success) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-display font-semibold text-white mb-2">
          Prime Ativado!
        </h3>
        <p className="text-white/80 text-sm">
          Parabéns! Você agora é membro Prime do Me,up Club.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-deep-purple via-purple-900 to-deep-purple rounded-xl overflow-hidden border border-antique-gold/20">
      {/* Header com urgência */}
      <div className="px-5 py-3 bg-antique-gold/10 border-b border-antique-gold/20 flex items-center justify-between">
        <span className="text-antique-gold text-xs font-heading font-medium uppercase tracking-wider">
          Oferta exclusiva para convidados
        </span>
        {daysRemaining > 0 && (
          <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs font-medium">
            {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display font-semibold text-ice-white text-xl mb-2">
          Ative seu Prime
        </h3>

        <p className="text-ice-white/70 text-sm mb-4">
          Como convidado especial, você tem acesso ao plano Prime pelo preço exclusivo de fundador.
        </p>

        {/* Preço */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-display font-bold text-antique-gold">
            R$ {price}
          </span>
          <span className="text-ice-white/50 text-sm">pagamento único</span>
        </div>

        {/* Benefícios */}
        <ul className="space-y-2 mb-5">
          {[
            'Multiplicador 2x em todos os pontos',
            '+5.000 pontos por indicação',
            'Acesso prioritário a experiências',
            '1.000 pontos de boas-vindas'
          ].map((benefit, i) => (
            <li key={i} className="flex items-center gap-2 text-ice-white/80 text-sm">
              <svg className="w-4 h-4 text-antique-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>

        {/* Estado: falta emissão */}
        {!hasEmission && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-400/30">
            <p className="text-amber-200 text-sm">
              <strong>Quase lá!</strong> Para ativar o Prime, você precisa ter pelo menos uma passagem emitida conosco.
            </p>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-400/30">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Botão */}
        <button
          onClick={handleActivate}
          disabled={!canActivate || activating}
          className="w-full py-3.5 rounded-lg bg-antique-gold text-deep-purple font-heading font-semibold text-sm uppercase tracking-wider hover:bg-antique-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {activating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Ativando...
            </span>
          ) : !hasEmission ? (
            'Preciso emitir uma passagem primeiro'
          ) : (
            'Ativar Prime por R$ ' + price
          )}
        </button>

        <p className="text-ice-white/40 text-xs text-center mt-3">
          Oferta válida apenas durante o período de convite
        </p>
      </div>
    </div>
  )
}
