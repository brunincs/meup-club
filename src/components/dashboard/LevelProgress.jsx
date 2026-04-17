import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel, levels } from '@/services/pointsSystem'
import { getNextReward, getAveragePointsPerReferral, mockReferrals } from '@/services/mockData'

const levelIcons = {
  'Iniciante': '🌱',
  'Explorador': '🧭',
  'Navegador': '🚀',
  'Elite': '⭐',
  'Aristocrata': '👑'
}

export function LevelProgress() {
  const { profile } = useAuth()
  const points = profile?.points || 0
  const levelData = calculateLevel(points)
  const nextReward = getNextReward(points)
  const avgPoints = getAveragePointsPerReferral(mockReferrals)

  const { current, next, progress, pointsToNext } = levelData

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-100">Seu Progresso</h3>
          <span className="text-2xl">{levelIcons[current.name]}</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Current Level */}
        <div>
          <div className="text-2xl font-display font-bold text-accent-gold mb-1">
            {current.name}
          </div>
          <div className="text-sm text-neutral-500">
            {points.toLocaleString('pt-BR')} pontos acumulados
          </div>
        </div>

        {/* Progress bar */}
        {next && (
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
              <span>{current.name}</span>
              <span>{next.name}</span>
            </div>
            <div className="h-2.5 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-accent-gold to-accent-light rounded-full"
              />
            </div>
            <div className="text-xs text-neutral-600 mt-2">
              Faltam <span className="text-accent-gold font-medium">{pointsToNext.toLocaleString('pt-BR')}</span> pontos para {next.name}
            </div>
          </div>
        )}

        {!next && (
          <div className="text-sm text-accent-gold flex items-center gap-2">
            <span>🎉</span>
            <span>Você alcançou o nível máximo!</span>
          </div>
        )}

        {/* Level bonus */}
        <div className="p-3 rounded-xl bg-accent-gold/5 border border-accent-gold/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-accent-gold">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Bônus de nível</p>
              <p className="text-sm font-semibold text-accent-gold">
                +{Math.round((current.bonusMultiplier - 1) * 100)}% em cada indicação
              </p>
            </div>
          </div>
        </div>

        {/* Next reward preview */}
        {nextReward && (
          <div className="p-4 rounded-xl bg-dark-700/30 border border-dark-600/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🎁</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Próxima recompensa</p>
                <p className="text-sm font-medium text-neutral-100 truncate">{nextReward.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${nextReward.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500">{nextReward.progress}%</span>
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">
                  ~{Math.ceil(nextReward.pointsNeeded / avgPoints)} indicações restantes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* All levels */}
        <div className="pt-4 border-t border-dark-700/50">
          <div className="text-xs text-neutral-600 mb-3">Todos os níveis</div>
          <div className="space-y-1.5">
            {levels.map((level) => {
              const isActive = level.name === current.name
              const isPast = points >= level.maxPoints
              const isFuture = points < level.minPoints

              return (
                <div
                  key={level.name}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                    isActive ? 'bg-accent-gold/10 border border-accent-gold/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isFuture ? 'opacity-40' : ''}`}>
                      {levelIcons[level.name]}
                    </span>
                    <span className={`text-sm ${
                      isActive ? 'text-accent-gold font-medium' :
                      isPast ? 'text-neutral-400' :
                      'text-neutral-600'
                    }`}>
                      {level.name}
                    </span>
                  </div>
                  <span className={`text-xs font-mono ${
                    isActive ? 'text-accent-gold' :
                    isPast ? 'text-neutral-500' :
                    'text-neutral-700'
                  }`}>
                    {level.minPoints.toLocaleString('pt-BR')}+
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
