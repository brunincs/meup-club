import { motion } from 'framer-motion'
import { mockReferrals } from '@/services/mockData'
import { history as historyCopy, format, invites } from '@/services/copy'

const statusConfig = {
  approved: {
    label: 'Aprovada',
    icon: '◆',
    color: 'text-neutral-300',
    bg: 'bg-neutral-100/5 border-neutral-100/10'
  },
  pending: {
    label: 'Aguardando',
    icon: '○',
    color: 'text-neutral-600',
    bg: 'bg-dark-700/20 border-dark-700/30'
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

  function formatTime(dateString) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function maskName(name) {
    const parts = name.split(' ')
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1].charAt(0)}.`
    }
    return name
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
          <div className="w-px flex-1 bg-dark-700/30 my-2" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-200 mb-1">
              {maskName(referral.client_name)}
            </p>
            <p className="text-xs text-neutral-600">
              {historyCopy.referralApproved}
            </p>
          </div>

          <div className="text-right">
            {referral.status === 'approved' ? (
              <div>
                <p className="text-sm font-light text-neutral-200">
                  +{format.pointsShort(referral.points_earned)}
                </p>
                {referral.multiplier > 1 && (
                  <span className="text-[10px] text-neutral-500">
                    {referral.multiplier}x bônus
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-neutral-600">
                {status.label}
              </span>
            )}
          </div>
        </div>

        <p className="text-[10px] text-neutral-700 mt-2">
          {formatTime(referral.created_at)}
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
      className="rounded-2xl border border-dark-700/30 bg-dark-800/20 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-dark-700/30">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">
              {invites.history}
            </h3>
            <p className="text-sm text-neutral-400">
              {totalApproved} {totalApproved === 1 ? 'indicação aprovada' : 'indicações aprovadas'}
              {totalPending > 0 && (
                <span className="text-neutral-600"> · {totalPending} aguardando</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">
              {invites.benefits}
            </p>
            <p className="text-lg font-light text-neutral-100">
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
            <p className="text-[10px] uppercase tracking-wider text-neutral-700 mb-4">
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
            <div className="w-12 h-12 rounded-xl bg-dark-700/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-neutral-600">○</span>
            </div>
            <p className="text-sm text-neutral-500">Nenhuma indicação ainda</p>
            <p className="text-xs text-neutral-700 mt-1">
              Compartilhe seu código para começar
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-dark-700/30">
        <p className="text-[10px] text-neutral-700 flex items-center gap-2">
          <span className="text-neutral-600">○</span>
          Benefícios são creditados quando a indicação é confirmada
        </p>
      </div>
    </motion.div>
  )
}
