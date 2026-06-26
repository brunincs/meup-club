import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel } from '@/services/pointsSystem'
import { getUserPosition } from '@/services/mockData'
import { levels as levelCopy, format } from '@/services/copy'

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  })
}

export function StatsCards({ stats }) {
  const { profile } = useAuth()
  const levelData = calculateLevel(profile?.points || 0)
  const level = levelData.current
  const position = getUserPosition(profile?.id)

  const cards = [
    {
      label: 'Indicações',
      value: stats.approvedReferrals,
      suffix: stats.pendingReferrals > 0 ? `+${stats.pendingReferrals} em análise` : 'aprovadas',
      icon: '◇'
    },
    {
      label: 'Benefícios',
      value: format.pointsShort(profile?.points || 0),
      suffix: 'acumulados',
      icon: '✦'
    },
    {
      label: 'Classe',
      value: levelCopy.shortNames[level.id],
      suffix: levelCopy.names[level.id],
      icon: levelCopy.icons[level.id]
    },
    {
      label: 'Ranking',
      value: `#${position}`,
      suffix: 'no clube',
      icon: '▲'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          custom={index}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="p-5 rounded-xl border border-dark-700/30 bg-dark-800/20 hover:bg-dark-800/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <span className="text-[10px] uppercase tracking-wider text-neutral-600">
              {card.label}
            </span>
            <span className="text-neutral-500 text-sm">{card.icon}</span>
          </div>
          <div className="text-2xl font-light text-neutral-100 mb-1">
            {card.value}
          </div>
          {card.suffix && (
            <div className="text-xs text-neutral-500">{card.suffix}</div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
