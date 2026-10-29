import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { calculateLevel } from '@/services/pointsSystem'
import { levels as levelCopy, format } from '@/services/copy'
import { getClassIcon, StarIcon } from '@/components/ui/Icons'

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
  const { points } = usePoints() // Pontos reais do usuário logado
  const levelData = calculateLevel(points)
  const level = levelData?.current || { id: 1, shortName: 'Econômica', bonusMultiplier: 1 }

  const ClassIcon = getClassIcon(level.id)

  const cards = [
    {
      label: 'Indicações',
      value: stats.approvedReferrals,
      suffix: stats.pendingReferrals > 0 ? `+${stats.pendingReferrals} em análise` : 'aprovadas',
      icon: <span className="text-antique-gold">◇</span>
    },
    {
      label: 'Pontos',
      value: format.pointsShort(points),
      suffix: 'acumulados',
      icon: <StarIcon size={16} color="#a27937" />
    },
    {
      label: 'Classe',
      value: levelCopy.shortNames[level.id],
      suffix: levelCopy.names[level.id],
      icon: <ClassIcon size={16} color="#a27937" />
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          custom={index}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="relative overflow-hidden p-6 rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 hover:border-antique-gold/20 transition-all"
        >
          {/* Decorativo */}
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-antique-gold/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] uppercase tracking-wider text-dusty-rose">
                {card.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-antique-gold/10 flex items-center justify-center">
                {card.icon}
              </div>
            </div>
            <div className="text-2xl font-display font-bold text-ice-white mb-1">
              {card.value}
            </div>
            {card.suffix && (
              <div className="text-xs text-dusty-rose">{card.suffix}</div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
