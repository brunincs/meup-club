import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel } from '@/services/pointsSystem'
import { getUserPosition } from '@/services/mockData'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  })
}

export function StatsCards({ stats }) {
  const { profile } = useAuth()
  const levelData = calculateLevel(profile?.points || 0)
  const level = levelData.current
  const position = getUserPosition(profile?.id)

  const cards = [
    {
      label: 'Pontos Acumulados',
      value: (profile?.points || 0).toLocaleString('pt-BR'),
      suffix: 'pts',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      color: 'gold'
    },
    {
      label: 'Indicações Aprovadas',
      value: stats.approvedReferrals,
      suffix: stats.pendingReferrals > 0 ? `+${stats.pendingReferrals} pendentes` : 'confirmadas',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      color: 'blue'
    },
    {
      label: 'Posição no Ranking',
      value: `#${position}`,
      suffix: 'de 2.847 membros',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: 'purple'
    },
    {
      label: 'Nível Atual',
      value: level.name,
      suffix: 'Continue subindo!',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      color: 'green'
    }
  ]

  const colorClasses = {
    gold: 'text-accent-gold bg-accent-gold/10 border-accent-gold/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          custom={index}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className="p-5 rounded-xl border border-dark-700/50 bg-dark-800/30"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 border ${colorClasses[card.color]}`}>
            {card.icon}
          </div>
          <div className="text-2xl font-display font-bold text-neutral-100 mb-1">
            {card.value}
          </div>
          <div className="text-xs text-neutral-500">{card.label}</div>
          {card.suffix && (
            <div className="text-[10px] text-neutral-600 mt-1">{card.suffix}</div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
