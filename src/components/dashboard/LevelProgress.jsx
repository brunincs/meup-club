import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel, levels, getNextRewards } from '@/services/pointsSystem'
import { levels as levelCopy, format } from '@/services/copy'

export function LevelProgress() {
  const { profile } = useAuth()
  const points = profile?.points || 0
  const levelData = calculateLevel(points)
  const nextRewards = getNextRewards(points, 1)
  const nextExperience = nextRewards[0]

  const { current, next, progress, pointsToNext } = levelData

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-dark-700/30 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-dark-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Sua Jornada</h3>
            <div className="flex items-center gap-2">
              <span className="text-xl">{levelCopy.icons[current.id]}</span>
              <span className="text-lg font-medium text-neutral-100">
                {levelCopy.names[current.id]}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Pontos</div>
            <div className="text-lg font-light text-neutral-200">
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
              <span className="text-xs text-neutral-500">
                Próxima classe
              </span>
              <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                <span>{levelCopy.icons[next.id]}</span>
                <span>{levelCopy.names[next.id]}</span>
              </span>
            </div>
            <div className="h-1.5 bg-dark-700/50 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-neutral-400 to-neutral-200 rounded-full"
              />
            </div>
            <div className="text-xs text-neutral-600">
              <span className="text-neutral-300">{format.pointsShort(pointsToNext)}</span> pontos restantes
            </div>
          </div>
        )}

        {!next && (
          <div className="p-4 rounded-xl bg-dark-700/20 border border-dark-600/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <div>
                <p className="text-sm font-medium text-neutral-200">Classe Máxima</p>
                <p className="text-xs text-neutral-500">Você alcançou o ápice do privilégio</p>
              </div>
            </div>
          </div>
        )}

        {/* Level bonus */}
        {current.bonusMultiplier > 1 && (
          <div className="p-4 rounded-xl bg-dark-700/20 border border-dark-600/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-dark-600/30 flex items-center justify-center">
                <span className="text-neutral-400">✦</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-600">Bônus de classe</p>
                <p className="text-sm font-medium text-neutral-200">
                  +{Math.round((current.bonusMultiplier - 1) * 100)}% em cada indicação
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next experience preview */}
        {nextExperience && (
          <div className="p-4 rounded-xl bg-dark-700/20 border border-dark-600/10">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-dark-600/30 flex items-center justify-center flex-shrink-0">
                <span className="text-neutral-400">◇</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Próxima experiência</p>
                <p className="text-sm font-medium text-neutral-200 truncate">{nextExperience.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 bg-dark-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-500 rounded-full transition-all"
                      style={{ width: `${nextExperience.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500">{nextExperience.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Journey visualization */}
        <div className="pt-4 border-t border-dark-700/30">
          <div className="text-[10px] uppercase tracking-wider text-neutral-600 mb-4">Jornada de Classes</div>
          <div className="space-y-2">
            {levels.map((level, index) => {
              const isActive = level.id === current.id
              const isPast = points >= level.maxPoints
              const isFuture = points < level.minPoints

              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-neutral-100/5 border border-neutral-100/10'
                      : 'hover:bg-dark-700/20'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-neutral-100/10' :
                    isPast ? 'bg-dark-700/30' :
                    'bg-dark-700/20'
                  }`}>
                    <span className={`text-sm ${isFuture ? 'opacity-30' : ''}`}>
                      {levelCopy.icons[level.id]}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <span className={`text-sm ${
                      isActive ? 'text-neutral-100 font-medium' :
                      isPast ? 'text-neutral-400' :
                      'text-neutral-600'
                    }`}>
                      {levelCopy.names[level.id]}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-neutral-500 ml-2">atual</span>
                    )}
                  </div>

                  {/* Points */}
                  <span className={`text-xs font-mono ${
                    isActive ? 'text-neutral-300' :
                    isPast ? 'text-neutral-600' :
                    'text-neutral-700'
                  }`}>
                    {format.pointsShort(level.minPoints)}+
                  </span>

                  {/* Status indicator */}
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-neutral-100' :
                    isPast ? 'bg-neutral-600' :
                    'bg-dark-600'
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
