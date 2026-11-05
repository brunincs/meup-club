import { motion } from 'framer-motion'
import { ProgressRing } from '@/components/effects/ProgressRing'
import { GlowBorder } from '@/components/effects/GlowEffect'
import { getMissionAction, isExternalMission } from '@/services/missionActions'

const missionTypeConfig = {
  action: {
    label: 'AÇÃO',
    color: '#a27937',
    bgGradient: 'from-antique-gold/10 to-antique-gold/5',
    bgGradientLight: 'from-antique-gold/15 to-antique-gold/5',
    borderColor: 'border-antique-gold/30',
    pulseClass: ''
  },
  weekly: {
    label: 'SEMANAL',
    color: '#3b82f6',
    bgGradient: 'from-game-blue/10 to-game-blue/5',
    bgGradientLight: 'from-game-blue/15 to-game-blue/5',
    borderColor: 'border-game-blue/20',
    pulseClass: ''
  },
  special: {
    label: 'CONQUISTA',
    color: '#f97316',
    bgGradient: 'from-game-orange/10 to-game-orange/5',
    bgGradientLight: 'from-game-orange/15 to-game-orange/5',
    borderColor: 'border-game-orange/30',
    pulseClass: ''
  }
}

export function MissionCard({
  mission,
  type = 'action',
  variant = 'dark',
  onStart,
  onComplete,
  onClaim,
  isLoading = false
}) {
  const config = missionTypeConfig[type] || missionTypeConfig.action
  const isCompleted = mission.completed || mission.progressPercent >= 100
  const isPending = mission.pending
  const isInProgress = mission.progressPercent > 0 && mission.progressPercent < 100
  const isLight = variant === 'light'

  // Obter ação da missão
  const action = getMissionAction(mission.name)
  const isExternal = isExternalMission(mission.name)

  const CardWrapper = type === 'action' ? GlowBorder : motion.div

  const bgGradient = isLight ? config.bgGradientLight : config.bgGradient

  const wrapperProps = type === 'action'
    ? { color: 'purple', className: 'h-full' }
    : {
        className: `h-full rounded-xl bg-gradient-to-br ${bgGradient} border ${config.borderColor} ${isLight ? 'bg-white shadow-sm' : ''}`,
        whileHover: { scale: 1.01 },
        transition: { type: 'spring', stiffness: 300 }
      }

  // Handler para o botão "Ir Fazer"
  const handleGoClick = (e) => {
    e.stopPropagation()
    onStart?.(mission)
  }

  // Handler para o botão "Concluir" / "Fiz isso"
  const handleCompleteClick = (e) => {
    e.stopPropagation()
    onComplete?.(mission)
  }

  return (
    <CardWrapper {...wrapperProps}>
      <div className={`p-5 h-full flex flex-col ${type === 'action' ? '' : ''} ${isLight && type !== 'daily' ? 'bg-white rounded-xl' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: config.color }}
              >
                {config.label}
              </span>
              {isExternal && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-dusty-rose/20 text-dusty-rose">
                  EXTERNO
                </span>
              )}
            </div>
            <h3 className={`text-base font-heading font-medium ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              {mission.name}
            </h3>
            <p className={`text-xs mt-1 ${isLight ? 'text-graphite/70' : 'text-dusty-rose'}`}>
              {mission.description}
            </p>
          </div>

          {/* Progress Ring */}
          <ProgressRing
            progress={mission.progressPercent || 0}
            size={56}
            strokeWidth={4}
            color={isCompleted ? '#22c55e' : isPending ? '#a27937' : config.color}
            bgColor={isLight ? "rgba(50, 17, 63, 0.1)" : "rgba(163, 150, 149, 0.1)"}
          >
            <span className={`text-xs font-heading font-semibold ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              {isCompleted ? '✓' : isPending ? '⏳' : `${Math.round(mission.progressPercent || 0)}%`}
            </span>
          </ProgressRing>
        </div>

        {/* Progress bar (se tem target > 1) */}
        {mission.target > 1 && !isCompleted && !isPending && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={isLight ? 'text-graphite/60' : 'text-dusty-rose/60'}>Progresso</span>
              <span className={isLight ? 'text-deep-purple font-medium' : 'text-ice-white font-medium'}>
                {mission.progress || 0}/{mission.target}
              </span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-graphite/10' : 'bg-dusty-rose/10'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mission.progressPercent || 0}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-antique-gold/80 to-antique-gold rounded-full"
              />
            </div>
          </div>
        )}

        {/* Status pendente */}
        {isPending && (
          <p className={`text-xs mb-4 ${isLight ? 'text-antique-gold' : 'text-antique-gold/80'}`}>
            Aguardando aprovação do admin...
          </p>
        )}

        {/* Reward & Actions */}
        <div className="flex-1 flex items-end justify-between gap-3">
          <div>
            <span className={`text-lg font-bold ${isCompleted ? 'text-game-green' : isPending ? 'text-antique-gold/60' : 'text-game-green'}`}>
              +{mission.points?.toLocaleString('pt-BR') || 0}
            </span>
            <span className={`text-xs ml-1 ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>pontos</span>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onClaim?.(mission)}
                className="px-4 py-2 rounded-lg text-xs font-heading font-semibold bg-game-green text-deep-purple shadow-lg shadow-game-green/20"
              >
                Concluída ✓
              </motion.button>
            ) : isPending ? (
              <span className={`text-xs px-3 py-2 rounded-lg ${isLight ? 'bg-antique-gold/10 text-antique-gold' : 'bg-antique-gold/20 text-antique-gold'}`}>
                Pendente
              </span>
            ) : isLoading ? (
              <span className={`text-xs px-4 py-2 rounded-lg ${isLight ? 'bg-graphite/10 text-graphite/60' : 'bg-dusty-rose/10 text-dusty-rose'}`}>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-2"
                />
                Enviando...
              </span>
            ) : (
              <>
                {/* Botão "Ir Fazer" */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGoClick}
                  className={`px-3 py-2 rounded-lg text-xs font-heading font-medium transition-colors ${
                    isLight
                      ? 'bg-deep-purple/10 text-deep-purple hover:bg-deep-purple/20'
                      : 'bg-deep-purple/50 text-ice-white border border-dusty-rose/20 hover:bg-deep-purple/70'
                  }`}
                >
                  {action?.label || 'Ir Fazer'} {isExternal ? '↗' : '→'}
                </motion.button>

                {/* Botão "Fiz isso" - SÓ para Instagram e Google (únicas que precisam aprovação) */}
                {mission.needsApproval && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCompleteClick}
                    className={`px-3 py-2 rounded-lg text-xs font-heading font-semibold transition-colors ${
                      isLight
                        ? 'bg-antique-gold text-deep-purple hover:bg-antique-gold/90'
                        : 'bg-antique-gold text-deep-purple hover:bg-accent-light'
                    }`}
                  >
                    Fiz isso
                  </motion.button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </CardWrapper>
  )
}

// Mini version para lista compacta
export function MissionCardMini({ mission, type = 'daily', variant = 'dark', onClick }) {
  const config = missionTypeConfig[type] || missionTypeConfig.action
  const isCompleted = mission.completed || mission.progressPercent >= 100
  const isPending = mission.pending
  const isLight = variant === 'light'

  // Obter ação da missão
  const action = getMissionAction(mission.name)
  const isExternal = isExternalMission(mission.name)

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`p-4 rounded-xl transition-all ${
        isCompleted
          ? 'bg-game-green/10 border border-game-green/20'
          : isPending
            ? 'bg-antique-gold/10 border border-antique-gold/20'
            : isLight
              ? 'bg-ice-white border border-graphite/10 hover:border-graphite/20'
              : 'bg-deep-purple/30 border border-dusty-rose/20 hover:border-dusty-rose/30'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Progress */}
        <ProgressRing
          progress={mission.progressPercent || 0}
          size={40}
          strokeWidth={3}
          color={isCompleted ? '#22c55e' : isPending ? '#a27937' : config.color}
          bgColor={isLight ? "rgba(50, 17, 63, 0.1)" : "rgba(163, 150, 149, 0.1)"}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-heading font-medium truncate ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              {mission.name}
            </h4>
            {isExternal && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-dusty-rose/20 text-dusty-rose flex-shrink-0">
                ↗
              </span>
            )}
          </div>
          <p className={`text-xs truncate ${isLight ? 'text-graphite/70' : 'text-dusty-rose'}`}>
            {isPending ? 'Aguardando aprovação' : mission.description}
          </p>
        </div>

        {/* Action / Points */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <span className={`text-sm font-heading font-semibold ${isCompleted ? 'text-game-green' : isPending ? 'text-antique-gold' : 'text-game-green'}`}>
              +{mission.points}
            </span>
            <span className={`text-[10px] block ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>pontos</span>
          </div>

          {!isCompleted && !isPending && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                onClick?.()
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isLight
                  ? 'bg-deep-purple/10 text-deep-purple hover:bg-deep-purple/20'
                  : 'bg-antique-gold/20 text-antique-gold hover:bg-antique-gold/30'
              }`}
              title={action?.label || 'Ir Fazer'}
            >
              {isExternal ? '↗' : '→'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
