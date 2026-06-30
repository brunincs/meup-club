import { motion } from 'framer-motion'
import { ProgressRing } from '@/components/effects/ProgressRing'
import { GlowBorder } from '@/components/effects/GlowEffect'

const missionTypeConfig = {
  daily: {
    label: 'MISSÃO DO DIA',
    color: '#a855f7',
    bgGradient: 'from-purple-500/10 to-purple-600/5',
    borderColor: 'border-purple-500/30',
    pulseClass: 'animate-pulse-border'
  },
  weekly: {
    label: 'MISSÃO DA SEMANA',
    color: '#3b82f6',
    bgGradient: 'from-blue-500/10 to-blue-600/5',
    borderColor: 'border-blue-500/20',
    pulseClass: ''
  },
  special: {
    label: 'MISSÃO ESPECIAL',
    color: '#f59e0b',
    bgGradient: 'from-amber-500/10 to-amber-600/5',
    borderColor: 'border-amber-500/30',
    pulseClass: ''
  }
}

export function MissionCard({
  mission,
  type = 'daily',
  onStart,
  onClaim
}) {
  const config = missionTypeConfig[type] || missionTypeConfig.daily
  const isCompleted = mission.progress >= 100
  const isInProgress = mission.progress > 0 && mission.progress < 100

  const CardWrapper = type === 'daily' ? GlowBorder : motion.div

  const wrapperProps = type === 'daily'
    ? { color: 'purple', className: 'h-full' }
    : {
        className: `h-full rounded-xl bg-gradient-to-br ${config.bgGradient} border ${config.borderColor}`,
        whileHover: { scale: 1.01 },
        transition: { type: 'spring', stiffness: 300 }
      }

  return (
    <CardWrapper {...wrapperProps}>
      <div className={`p-5 h-full flex flex-col ${type === 'daily' ? '' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: config.color }}
              >
                {config.label}
              </span>
              {mission.rarity === 'rare' && (
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  RARO
                </span>
              )}
            </div>
            <h3 className="text-base font-medium text-neutral-100">
              {mission.name}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              {mission.description}
            </p>
          </div>

          {/* Progress Ring */}
          <ProgressRing
            progress={mission.progress}
            size={56}
            strokeWidth={4}
            color={config.color}
            bgColor="rgba(255, 255, 255, 0.05)"
          >
            <span className="text-xs font-semibold text-neutral-200">
              {Math.round(mission.progress)}%
            </span>
          </ProgressRing>
        </div>

        {/* Reward */}
        <div className="flex-1 flex items-end justify-between">
          <div>
            <span className="text-lg font-bold text-game-green">
              +{mission.points.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-neutral-500 ml-1">pontos</span>
          </div>

          {/* Timer / Action */}
          <div className="flex items-center gap-3">
            {mission.resetIn && !isCompleted && (
              <span className="text-[10px] text-neutral-600">
                Reset em {mission.resetIn}
              </span>
            )}

            {isCompleted ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onClaim?.(mission)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-game-green text-dark-900 shadow-lg shadow-game-green/20"
              >
                Resgatar
              </motion.button>
            ) : isInProgress ? (
              <span className="text-xs text-neutral-400">Em progresso...</span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onStart?.(mission)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-dark-600 text-neutral-200 border border-dark-500 hover:bg-dark-500 transition-colors"
              >
                Iniciar
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </CardWrapper>
  )
}

// Mini version para lista compacta
export function MissionCardMini({ mission, type = 'daily', onClick }) {
  const config = missionTypeConfig[type] || missionTypeConfig.daily
  const isCompleted = mission.progress >= 100

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all ${
        isCompleted
          ? 'bg-game-green/10 border border-game-green/20'
          : `bg-gradient-to-br ${config.bgGradient} border ${config.borderColor}`
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Progress */}
        <ProgressRing
          progress={mission.progress}
          size={40}
          strokeWidth={3}
          color={isCompleted ? '#22c55e' : config.color}
          bgColor="rgba(255, 255, 255, 0.05)"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-neutral-200 truncate">
              {mission.name}
            </h4>
            {mission.rarity === 'rare' && (
              <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-bold rounded bg-blue-500/20 text-blue-400">
                RARO
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 truncate">{mission.description}</p>
        </div>

        {/* Points */}
        <div className="text-right">
          <span className="text-sm font-semibold text-game-green">
            +{mission.points}
          </span>
          <span className="text-[10px] text-neutral-600 block">pontos</span>
        </div>
      </div>
    </motion.div>
  )
}
