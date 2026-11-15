import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useUserLevel } from '@/hooks/useUserLevel'
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

export function StatsCards({ stats, variant = 'dark' }) {
  const { profile } = useAuth()
  const { current: level, balance: points } = useUserLevel()
  const isLight = variant === 'light'

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
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all ${
            isLight
              ? 'border-nude-rose bg-white shadow-sm hover:border-antique-gold/30'
              : 'border-dusty-rose/20 bg-deep-purple/30 hover:border-antique-gold/20'
          }`}
        >
          {/* Decorativo */}
          <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
            isLight ? 'bg-antique-gold/10' : 'bg-antique-gold/5'
          }`} />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <span className={`text-[10px] uppercase tracking-wider ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>
                {card.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-antique-gold/10 flex items-center justify-center">
                {card.icon}
              </div>
            </div>
            <div className={`text-2xl font-display font-bold mb-1 ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              {card.value}
            </div>
            {card.suffix && (
              <div className={`text-xs ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>{card.suffix}</div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
