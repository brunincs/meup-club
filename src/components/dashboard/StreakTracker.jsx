import { motion } from 'framer-motion'
import {
  streakConfig,
  getStreakBonus,
  mockUserEngagement
} from '@/services/engagementData'
import { consistency, format } from '@/services/copy'
import { ProgressBar } from '@/components/effects/ProgressRing'

export function StreakTracker() {
  const currentStreak = mockUserEngagement.streak.current
  const bestStreak = mockUserEngagement.streak.best
  const streakInfo = getStreakBonus(currentStreak)

  const milestoneLabels = {
    3: '3 dias',
    7: '1 semana',
    14: '2 semanas',
    30: '1 mês',
    60: '2 meses',
    90: '3 meses'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card-streak rounded-2xl overflow-hidden"
    >
      {/* Header with orange theme */}
      <div className="p-5 border-b border-game-orange/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-game-orange mb-1 flex items-center gap-2">
              <span>🔥</span>
              {consistency.title}
            </h3>
            <p className="text-xs text-neutral-500">
              {consistency.keepIt}
            </p>
          </div>

          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center px-4 py-2 rounded-xl bg-game-orange/10 border border-game-orange/20"
          >
            <p className="text-3xl font-bold text-game-orange">
              {currentStreak}
            </p>
            <p className="text-[10px] text-game-orange/70">
              dias
            </p>
          </motion.div>
        </div>
      </div>

      {/* Milestones */}
      <div className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-neutral-700 mb-4">
          {consistency.milestone}
        </p>

        <div className="space-y-3">
          {streakConfig.bonuses.slice(0, 4).map((bonus, index) => {
            const isAchieved = currentStreak >= bonus.days
            const isNext = !isAchieved && (index === 0 || currentStreak >= streakConfig.bonuses[index - 1]?.days)
            const progress = isAchieved ? 100 : Math.min((currentStreak / bonus.days) * 100, 100)

            return (
              <motion.div
                key={bonus.days}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className={`relative p-3 rounded-xl border transition-all ${
                  isAchieved
                    ? 'bg-game-orange/10 border-game-orange/20'
                    : isNext
                    ? 'bg-dark-700/20 border-game-orange/30'
                    : 'bg-dark-700/10 border-dark-700/20 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    isAchieved
                      ? 'bg-game-orange/20 text-game-orange'
                      : 'bg-dark-700/30 text-neutral-600'
                  }`}>
                    {isAchieved ? '✓' : bonus.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${
                        isAchieved ? 'text-neutral-200' : 'text-neutral-500'
                      }`}>
                        {milestoneLabels[bonus.days] || `${bonus.days} dias`}
                      </span>
                      {isNext && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-game-orange/20 text-game-orange border border-game-orange/30">
                          Próximo
                        </span>
                      )}
                    </div>

                    {isNext && (
                      <div className="mt-2">
                        <ProgressBar
                          progress={progress}
                          height={4}
                          color="#f97316"
                          bgColor="rgba(255, 255, 255, 0.05)"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-semibold ${
                      isAchieved ? 'text-game-green' : 'text-neutral-600'
                    }`}>
                      +{format.pointsShort(bonus.points)}
                    </span>
                    <span className="text-[10px] text-neutral-600 block">pontos</span>
                  </div>
                </div>

                {isNext && (
                  <p className="text-[10px] text-game-orange mt-2 pl-11">
                    Faltam {bonus.days - currentStreak} dias
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Bonus multiplier */}
        {streakInfo.multiplier > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 rounded-xl bg-game-green/10 border border-game-green/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">
                {consistency.bonus}
              </span>
              <span className="text-sm font-bold text-game-green">
                +{Math.round((streakInfo.multiplier - 1) * 100)}% em todos os pontos
              </span>
            </div>
          </motion.div>
        )}

        {/* Record */}
        <div className="mt-4 pt-4 border-t border-dark-700/30 flex items-center justify-between">
          <span className="text-[10px] text-neutral-600">
            {consistency.record}
          </span>
          <span className="text-sm text-game-orange">
            🏆 {bestStreak} dias
          </span>
        </div>
      </div>
    </motion.div>
  )
}
