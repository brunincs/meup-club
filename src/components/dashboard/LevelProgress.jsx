import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel, levels, getNextRewards } from '@/services/pointsSystem'
import { levels as levelCopy, format } from '@/services/copy'
import { demoUser } from '@/services/mockData'
import { getClassIcon } from '@/components/ui/Icons'

export function LevelProgress() {
  const { profile } = useAuth()
  // Usar demoUser como fonte única
  const points = demoUser.points
  const levelData = calculateLevel(points)
  const nextRewards = getNextRewards(points, 1)
  const nextExperience = nextRewards[0]

  const { current, next, progress, pointsToNext } = levelData
  const ClassIcon = getClassIcon(current.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-dusty-rose/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">Sua Jornada</h3>
            <div className="flex items-center gap-2">
              <ClassIcon size={20} color="#a27937" />
              <span className="text-lg font-heading font-medium text-ice-white">
                {levelCopy.names[current.id]}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">Pontos</div>
            <div className="text-lg font-display font-light text-antique-gold">
              {format.pointsShort(points)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Progress to next level */}
        {next && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-dusty-rose">
                Próxima classe
              </span>
              <span className="text-xs text-ice-white flex items-center gap-1.5">
                {(() => {
                  const NextIcon = getClassIcon(next.id)
                  return <NextIcon size={14} color="#a27937" />
                })()}
                <span>{levelCopy.names[next.id]}</span>
              </span>
            </div>
            <div className="h-1.5 bg-dusty-rose/10 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-antique-gold/70 to-antique-gold rounded-full"
              />
            </div>
            <div className="text-xs text-dusty-rose/60">
              <span className="text-antique-gold">{format.pointsShort(pointsToNext)}</span> pontos restantes
            </div>
          </div>
        )}

        {!next && (
          <div className="p-4 rounded-xl bg-antique-gold/10 border border-antique-gold/20">
            <div className="flex items-center gap-3">
              {(() => {
                const MaxIcon = getClassIcon(1)
                return <MaxIcon size={24} color="#a27937" />
              })()}
              <div>
                <p className="text-sm font-heading font-medium text-ice-white">Classe Máxima</p>
                <p className="text-xs text-dusty-rose">Você alcançou o ápice do privilégio</p>
              </div>
            </div>
          </div>
        )}

        {/* Level bonus */}
        {current.bonusMultiplier > 1 && (
          <div className="p-4 rounded-xl bg-game-green/10 border border-game-green/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-game-green/20 flex items-center justify-center">
                <span className="text-game-green">✦</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-dusty-rose">Bônus de classe</p>
                <p className="text-sm font-heading font-medium text-ice-white">
                  +{Math.round((current.bonusMultiplier - 1) * 100)}% em cada indicação
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next experience preview */}
        {nextExperience && (
          <div className="p-4 rounded-xl bg-deep-purple/50 border border-dusty-rose/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-antique-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="text-antique-gold">◇</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1">Próxima experiência</p>
                <p className="text-sm font-heading font-medium text-ice-white truncate">{nextExperience.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 bg-dusty-rose/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-antique-gold rounded-full transition-all"
                      style={{ width: `${nextExperience.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-dusty-rose">{nextExperience.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Journey visualization */}
        <div className="pt-4 border-t border-dusty-rose/20">
          <div className="text-[10px] uppercase tracking-wider text-dusty-rose/60 mb-4">Jornada de Classes</div>
          <div className="space-y-2">
            {levels.map((level, index) => {
              const isActive = level.id === current.id
              const isPast = points >= level.maxPoints
              const isFuture = points < level.minPoints
              const LevelIcon = getClassIcon(level.id)

              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-antique-gold/10 border border-antique-gold/20'
                      : 'hover:bg-deep-purple/50'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-antique-gold/20' :
                    isPast ? 'bg-dusty-rose/10' :
                    'bg-dusty-rose/5'
                  }`}>
                    <LevelIcon
                      size={16}
                      color={isActive ? '#a27937' : isPast ? '#a39695' : '#a39695'}
                      style={isFuture ? { opacity: 0.3 } : {}}
                    />
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <span className={`text-sm ${
                      isActive ? 'text-ice-white font-heading font-medium' :
                      isPast ? 'text-dusty-rose' :
                      'text-dusty-rose/60'
                    }`}>
                      {levelCopy.names[level.id]}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-antique-gold ml-2">atual</span>
                    )}
                  </div>

                  {/* Points */}
                  <span className={`text-xs font-mono ${
                    isActive ? 'text-antique-gold' :
                    isPast ? 'text-dusty-rose/60' :
                    'text-dusty-rose/40'
                  }`}>
                    {format.pointsShort(level.minPoints)}+
                  </span>

                  {/* Status indicator */}
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-antique-gold' :
                    isPast ? 'bg-dusty-rose/60' :
                    'bg-dusty-rose/20'
                  }`} />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
