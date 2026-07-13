import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel } from '@/services/pointsSystem'
import { getUserPosition, demoUser } from '@/services/mockData'
import { levels as levelCopy, format } from '@/services/copy'
import { getClassIcon, TrophyIcon, StarIcon } from '@/components/ui/Icons'

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
  // Usar demoUser como fonte única
  const points = demoUser.points
  const levelData = calculateLevel(points)
  const level = levelData.current
  const position = demoUser.position

  const ClassIcon = getClassIcon(level.id)

  const cards = [
    {
      label: 'Indicações',
      value: stats.approvedReferrals,
      suffix: stats.pendingReferrals > 0 ? `+${stats.pendingReferrals} em análise` : 'aprovadas',
      icon: <span className="text-ouro-antigo">◇</span>
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
    },
    {
      label: 'Ranking',
      value: `#${position}`,
      suffix: 'no clube',
      icon: <TrophyIcon size={16} color="#a27937" />
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
          className="p-5 rounded-xl border border-cinza-rosado/20 bg-roxo-profundo/30 hover:bg-roxo-profundo/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <span className="text-[10px] uppercase tracking-wider text-cinza-rosado">
              {card.label}
            </span>
            {card.icon}
          </div>
          <div className="text-2xl font-display font-light text-branco-gelo mb-1">
            {card.value}
          </div>
          {card.suffix && (
            <div className="text-xs text-cinza-rosado">{card.suffix}</div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
