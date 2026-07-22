import { motion } from 'framer-motion'
import { mockReferrals } from '@/services/mockData'
import { history as historyCopy, format, invites } from '@/services/copy'

const statusConfig = {
  approved: {
    label: 'Aprovada',
    icon: '◆',
    color: 'text-antique-gold',
    bg: 'bg-antique-gold/10 border-antique-gold/20'
  },
  pending: {
    label: 'Em análise',
    icon: '○',
    color: 'text-dusty-rose',
    bg: 'bg-dusty-rose/10 border-dusty-rose/20'
  }
}

function groupByDate(referrals) {
  const groups = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  referrals.forEach(ref => {
    const date = new Date(ref.created_at)
    const refDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    let key
    if (refDate.getTime() === today.getTime()) {
      key = historyCopy.today
    } else if (refDate.getTime() === yesterday.getTime()) {
      key = historyCopy.yesterday
    } else if (refDate >= weekAgo) {
      key = historyCopy.thisWeek
    } else {
      key = historyCopy.earlier
    }

    if (!groups[key]) groups[key] = []
    groups[key].push(ref)
  })

  return groups
}

function TimelineEvent({ referral, index, isLast }) {
  const status = statusConfig[referral.status]

  // Formato completo: "12 jul · 07:30"
  function formatDateTime(dateString) {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${day} ${month} · ${time}`
  }

  function maskName(name) {
    const parts = name.split(' ')
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1].charAt(0)}.`
    }
    return name
  }

  // Obter label de multiplicador
  function getMultiplierLabel(multiplier) {
    if (multiplier === 1.5) return '1.5x (Bônus de classe)'
    if (multiplier === 2) return '2x (Campanha ativa)'
    if (multiplier === 1.3) return '1.3x (Cliente recorrente)'
    if (multiplier > 1) return `${multiplier}x bônus`
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
      className="relative flex gap-4"
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${status.bg} border`}>
          <span className={`text-sm ${status.color}`}>{status.icon}</span>
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-dusty-rose/20 my-2" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ice-white mb-1">
              {maskName(referral.client_name)}
            </p>
            <p className="text-xs text-dusty-rose">
              {referral.status === 'approved' ? historyCopy.referralApproved : status.label}
            </p>
          </div>

          <div className="text-right">
            {referral.status === 'approved' ? (
              <div>
                <p className="text-sm font-heading font-light text-antique-gold">
                  +{format.pointsShort(referral.points_earned)}
                </p>
                {referral.multiplier > 1 && (
                  <span className="text-[10px] text-dusty-rose" title={getMultiplierLabel(referral.multiplier)}>
                    {referral.multiplier}x bônus
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-dusty-rose">
                {referral.statusLabel || status.label}
              </span>
            )}
          </div>
        </div>

        {/* Data completa */}
        <p className="text-[10px] text-dusty-rose/60 mt-2">
          {formatDateTime(referral.created_at)}
        </p>
      </div>
    </motion.div>
  )
}

export function ReferralHistory() {
  const referrals = mockReferrals
  const groupedReferrals = groupByDate(referrals)
  const groups = Object.entries(groupedReferrals)

  const totalApproved = referrals.filter(r => r.status === 'approved').length
  const totalPending = referrals.filter(r => r.status === 'pending').length
  const totalPoints = referrals
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.points_earned, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-dusty-rose/20">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">
              {invites.history}
            </h3>
            <p className="text-sm text-dusty-rose">
              {totalApproved} {totalApproved === 1 ? 'indicação aprovada' : 'indicações aprovadas'}
              {totalPending > 0 && (
                <span className="text-dusty-rose/60"> · {totalPending} em análise</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">
              Pontos gerados
            </p>
            <p className="text-lg font-display font-light text-antique-gold">
              +{format.pointsShort(totalPoints)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        {groups.map(([period, items], groupIndex) => (
          <div key={period} className={groupIndex > 0 ? 'mt-6' : ''}>
            {/* Period Header */}
            <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60 mb-4">
              {period}
            </p>

            {/* Events */}
            {items.map((referral, index) => (
              <TimelineEvent
                key={referral.id}
                referral={referral}
                index={index}
                isLast={index === items.length - 1 && groupIndex === groups.length - 1}
              />
            ))}
          </div>
        ))}

        {/* Empty state */}
        {referrals.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-dusty-rose/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-dusty-rose">○</span>
            </div>
            <p className="text-sm text-dusty-rose">Nenhuma indicação ainda</p>
            <p className="text-xs text-dusty-rose/60 mt-1">
              Compartilhe seu código para começar
            </p>
          </div>
        )}
      </div>

      {/* Footer com legenda de multiplicadores */}
      <div className="px-6 py-4 border-t border-dusty-rose/20 space-y-2">
        <p className="text-[10px] text-dusty-rose/60 flex items-center gap-2">
          <span className="text-dusty-rose/40">○</span>
          Pontos são creditados quando a indicação é confirmada
        </p>
        <div className="text-[10px] text-dusty-rose/40 flex items-center gap-4">
          <span>1.5x = bônus de classe</span>
          <span>2x = campanha ativa</span>
        </div>
      </div>
    </motion.div>
  )
}
