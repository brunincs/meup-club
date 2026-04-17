import { motion } from 'framer-motion'
import {
  streakConfig,
  getStreakBonus,
  mockUserEngagement
} from '@/services/engagementData'
import { consistency, format, actions } from '@/services/copy'

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
      className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              {consistency.title}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              {consistency.keepIt}
            </p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-display font-bold text-accent-gold">
              {currentStreak}
            </p>
            <p className="text-[10px] text-neutral-500">
              dias
            </p>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="p-5">
        <p className="text-xs text-neutral-500 mb-4">
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`relative p-3 rounded-xl border transition-all ${
                  isAchieved
                    ? 'bg-accent-gold/5 border-accent-gold/20'
                    : isNext
                    ? 'bg-dark-800/50 border-dark-600/50'
                    : 'bg-dark-800/20 border-dark-700/20 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    isAchieved
                      ? 'bg-accent-gold/20 text-accent-gold'
                      : 'bg-dark-700 text-neutral-500'
                  }`}>
                    {isAchieved ? '✓' : bonus.days}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isAchieved ? 'text-accent-gold' : 'text-neutral-400'
                      }`}>
                        {milestoneLabels[bonus.days] || `${bonus.days} dias`}
                      </span>
                      {isNext && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-700 text-neutral-500">
                          Próximo
                        </span>
                      )}
                    </div>

                    {isNext && (
                      <div className="mt-2 h-1 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-accent-gold/50 rounded-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-mono ${
                      isAchieved ? 'text-accent-gold' : 'text-neutral-600'
                    }`}>
                      +{bonus.points}
                    </span>
                    <p className="text-[10px] text-neutral-600">benefícios</p>
                  </div>
                </div>

                {isNext && (
                  <p className="text-xs text-neutral-500 mt-2 pl-11">
                    Faltam {bonus.days - currentStreak} dias
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Bonus multiplier */}
        {streakInfo.multiplier > 1 && (
          <div className="mt-4 p-3 rounded-xl bg-accent-gold/5 border border-accent-gold/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">
                {consistency.bonus}
              </span>
              <span className="text-sm font-medium text-accent-gold">
                +{Math.round((streakInfo.multiplier - 1) * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Record */}
        <div className="mt-4 pt-4 border-t border-dark-700/30 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {consistency.record}
          </span>
          <span className="text-sm text-neutral-400">
            {bestStreak} dias
          </span>
        </div>
      </div>
    </motion.div>
  )
}
