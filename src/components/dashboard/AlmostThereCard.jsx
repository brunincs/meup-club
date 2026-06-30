import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ProgressBar, ProgressRing } from '@/components/effects/ProgressRing'
import { GlowBorder } from '@/components/effects/GlowEffect'

const typeConfig = {
  reward: {
    color: 'gold',
    icon: '🎁',
    label: 'Próxima Recompensa',
    cta: 'Ver recompensas',
    link: '/recompensas'
  },
  level: {
    color: 'purple',
    icon: '⬆️',
    label: 'Próxima Classe',
    cta: 'Ver progresso',
    link: '/perfil'
  },
  ranking: {
    color: 'blue',
    icon: '🏆',
    label: 'Próxima Posição',
    cta: 'Ver ranking',
    link: '/ranking'
  }
}

export function AlmostThereCard({
  type = 'reward',
  title,
  subtitle,
  progress,
  pointsNeeded,
  targetName,
  className = ''
}) {
  const config = typeConfig[type] || typeConfig.reward

  // Só mostrar se progress >= 60%
  if (progress < 60) return null

  const isVeryClose = progress >= 85
  const urgencyClass = isVeryClose ? 'animate-pulse' : ''

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className={className}
    >
      <GlowBorder color={config.color} className="p-4">
        <div className="flex items-center gap-4">
          {/* Progress Ring */}
          <ProgressRing
            progress={progress}
            size={56}
            strokeWidth={4}
            color={config.color === 'gold' ? '#fbbf24' : config.color === 'purple' ? '#a855f7' : '#3b82f6'}
            bgColor="rgba(255, 255, 255, 0.05)"
          >
            <span className={`text-lg ${urgencyClass}`}>{config.icon}</span>
          </ProgressRing>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                config.color === 'gold' ? 'text-game-gold' :
                config.color === 'purple' ? 'text-purple-400' : 'text-blue-400'
              }`}>
                {isVeryClose ? '🔥 Quase lá!' : config.label}
              </span>
              <span className="text-xs text-neutral-500">{progress}%</span>
            </div>

            <h4 className="text-sm font-medium text-neutral-100 truncate">
              {title}
            </h4>

            {subtitle && (
              <p className="text-xs text-neutral-500 truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Points needed */}
          <div className="text-right">
            <div className={`text-lg font-bold ${
              config.color === 'gold' ? 'text-game-gold' :
              config.color === 'purple' ? 'text-purple-400' : 'text-blue-400'
            }`}>
              {pointsNeeded.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-neutral-500">
              pontos
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link to={config.link}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full mt-4 py-2 rounded-lg text-xs font-medium transition-all ${
              config.color === 'gold'
                ? 'bg-game-gold/20 text-game-gold border border-game-gold/30 hover:bg-game-gold/30'
                : config.color === 'purple'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
            }`}
          >
            {config.cta} →
          </motion.button>
        </Link>
      </GlowBorder>
    </motion.div>
  )
}

// Versão compacta para sidebar
export function AlmostThereMini({
  type = 'reward',
  title,
  progress,
  pointsNeeded,
  onClick
}) {
  const config = typeConfig[type] || typeConfig.reward

  if (progress < 60) return null

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`p-3 rounded-xl cursor-pointer transition-all border ${
        type === 'reward'
          ? 'bg-game-gold/5 border-game-gold/20 hover:border-game-gold/40'
          : type === 'level'
            ? 'bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40'
            : 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-neutral-200 truncate">{title}</p>
          <p className={`text-[10px] ${
            type === 'reward' ? 'text-game-gold' :
            type === 'level' ? 'text-purple-400' : 'text-blue-400'
          }`}>
            {pointsNeeded.toLocaleString('pt-BR')} pontos restantes
          </p>
        </div>
        <div className="text-xs text-neutral-500">{progress}%</div>
      </div>
    </motion.div>
  )
}

// Widget que mostra múltiplos "quase lá"
export function AlmostThereWidget({ items = [] }) {
  const validItems = items.filter(item => item.progress >= 60)

  if (validItems.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-game-gold/20 bg-game-gold/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-game-gold/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <div>
            <h3 className="text-sm font-medium text-neutral-100">Quase Lá!</h3>
            <p className="text-xs text-neutral-500">{validItems.length} objetivos próximos</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {validItems.map((item, index) => (
          <AlmostThereMini
            key={index}
            type={item.type}
            title={item.title}
            progress={item.progress}
            pointsNeeded={item.pointsNeeded}
            onClick={item.onClick}
          />
        ))}
      </div>
    </motion.div>
  )
}
