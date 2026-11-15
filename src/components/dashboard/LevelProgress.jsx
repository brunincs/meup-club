import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { levels, getNextRewards } from '@/services/pointsSystem'
import { levels as levelCopy, format } from '@/services/copy'
import { getClassIcon } from '@/components/ui/Icons'

// Bônus ÚNICO ao subir de classe (valores do plano_config)
// NÃO é multiplicador - é pago uma vez só quando atinge o nível
const CLASS_BONUS = {
  2: 1000,   // Econômica Premium (5.000 pts)
  3: 3000,   // Executiva (20.000 pts)
  4: 5000,   // Primeira Classe (50.000 pts)
  5: 10000   // Meup Exclusive (100.000 pts)
}

function getClassBonus(levelId) {
  return CLASS_BONUS[levelId] || 0
}

export function LevelProgress({ variant = 'dark' }) {
  const { profile } = useAuth()
  const { totalPointsEarned, levelId, points } = usePoints()
  const isLight = variant === 'light'

  // Usar levelId do banco (calculado por total_points_earned)
  const currentLevel = levels.find(l => l.id === levelId) || levels[0]
  const nextLevel = levels.find(l => l.id === levelId + 1) || null

  // Calcular progresso baseado em total_points_earned
  const pointsInLevel = totalPointsEarned - currentLevel.minPoints
  const pointsForLevel = nextLevel ? (nextLevel.minPoints - currentLevel.minPoints) : 0
  const progress = nextLevel ? Math.min(100, Math.round((pointsInLevel / pointsForLevel) * 100)) : 100
  const pointsToNext = nextLevel ? (nextLevel.minPoints - totalPointsEarned) : 0

  const nextRewards = getNextRewards(totalPointsEarned, 1)
  const nextExperience = nextRewards[0]

  const current = currentLevel
  const next = nextLevel
  const ClassIcon = getClassIcon(current.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`rounded-2xl border overflow-hidden ${
        isLight
          ? 'border-nude-rose bg-white shadow-sm'
          : 'border-dusty-rose/20 bg-deep-purple/30'
      }`}
    >
      {/* Header */}
      <div className={`p-6 border-b ${isLight ? 'border-nude-rose' : 'border-dusty-rose/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-[10px] uppercase tracking-wider mb-1 ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>Sua Jornada</h3>
            <div className="flex items-center gap-2">
              <ClassIcon size={20} color="#a27937" />
              <span className={`text-lg font-heading font-medium ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
                {levelCopy.names[current.id]}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-[10px] uppercase tracking-wider mb-1 ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>Pontos</div>
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
              <span className={`text-xs ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>
                Próxima classe
              </span>
              <span className={`text-xs flex items-center gap-1.5 ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
                {(() => {
                  const NextIcon = getClassIcon(next.id)
                  return <NextIcon size={14} color="#a27937" />
                })()}
                <span>{levelCopy.names[next.id]}</span>
              </span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden mb-2 ${isLight ? 'bg-nude-rose' : 'bg-dusty-rose/10'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-antique-gold/70 to-antique-gold rounded-full"
              />
            </div>
            <div className={`text-xs ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>
              <span className="text-antique-gold">{format.pointsShort(pointsToNext)}</span> pontos restantes
            </div>
          </div>
        )}

        {!next && (
          <div className={`p-4 rounded-xl border ${
            isLight
              ? 'bg-antique-gold/10 border-antique-gold/30'
              : 'bg-antique-gold/10 border-antique-gold/20'
          }`}>
            <div className="flex items-center gap-3">
              {(() => {
                const MaxIcon = getClassIcon(1)
                return <MaxIcon size={24} color="#a27937" />
              })()}
              <div>
                <p className={`text-sm font-heading font-medium ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>Classe Máxima</p>
                <p className={`text-xs ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>Você alcançou o ápice do privilégio</p>
              </div>
            </div>
          </div>
        )}

        {/* Bônus ao subir de classe (só mostra se tem próxima classe) */}
        {next && (
          <div className={`p-4 rounded-xl border ${
            isLight
              ? 'bg-antique-gold/10 border-antique-gold/30'
              : 'bg-antique-gold/10 border-antique-gold/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-antique-gold/20 flex items-center justify-center">
                <span className="text-antique-gold">✦</span>
              </div>
              <div>
                <p className={`text-[10px] uppercase tracking-wider ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>Bônus único</p>
                <p className={`text-sm font-heading font-medium ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
                  Ao chegar em {levelCopy.names[next.id]}: +{format.pointsShort(getClassBonus(next.id))} pontos
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next experience preview */}
        {nextExperience && (
          <div className={`p-4 rounded-xl border ${
            isLight
              ? 'bg-ice-white border-nude-rose'
              : 'bg-deep-purple/50 border-dusty-rose/20'
          }`}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-antique-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="text-antique-gold">◇</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] uppercase tracking-wider mb-1 ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>Próxima experiência</p>
                <p className={`text-sm font-heading font-medium truncate ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>{nextExperience.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`flex-1 h-1 rounded-full overflow-hidden ${isLight ? 'bg-nude-rose' : 'bg-dusty-rose/10'}`}>
                    <div
                      className="h-full bg-antique-gold rounded-full transition-all"
                      style={{ width: `${nextExperience.progress}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${isLight ? 'text-graphite/50' : 'text-dusty-rose'}`}>{nextExperience.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Journey visualization */}
        <div className={`pt-4 border-t ${isLight ? 'border-nude-rose' : 'border-dusty-rose/20'}`}>
          <div className={`text-[10px] uppercase tracking-wider mb-4 ${isLight ? 'text-graphite/50' : 'text-dusty-rose/60'}`}>Jornada de Classes</div>
          <div className="space-y-2">
            {levels.map((level, index) => {
              const isActive = level.id === levelId
              const isPast = level.id < levelId
              const isFuture = level.id > levelId
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
                      : isLight
                        ? 'hover:bg-ice-white'
                        : 'hover:bg-deep-purple/50'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-antique-gold/20' :
                    isPast ? isLight ? 'bg-graphite/10' : 'bg-dusty-rose/10' :
                    isLight ? 'bg-graphite/5' : 'bg-dusty-rose/5'
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
                      isActive ? isLight ? 'text-deep-purple font-heading font-medium' : 'text-ice-white font-heading font-medium' :
                      isPast ? isLight ? 'text-graphite/70' : 'text-dusty-rose' :
                      isLight ? 'text-graphite/40' : 'text-dusty-rose/60'
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
                    isPast ? isLight ? 'text-graphite/50' : 'text-dusty-rose/60' :
                    isLight ? 'text-graphite/30' : 'text-dusty-rose/40'
                  }`}>
                    {format.pointsShort(level.minPoints)}
                  </span>

                  {/* Status indicator */}
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-antique-gold' :
                    isPast ? isLight ? 'bg-graphite/50' : 'bg-dusty-rose/60' :
                    isLight ? 'bg-graphite/20' : 'bg-dusty-rose/20'
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
