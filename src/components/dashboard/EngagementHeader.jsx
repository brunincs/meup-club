import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel, rewardsTable } from '@/services/pointsSystem'
import {
  getPointsToNextLevel,
  getPointsToOvertake,
  mockUserEngagement,
  getTimeToWeeklyReset
} from '@/services/engagementData'
import {
  greetings,
  progress,
  buttons,
  consistency,
  position,
  format,
  motivation,
  levels as levelCopy,
  benefits
} from '@/services/copy'

export function EngagementHeader() {
  const { profile } = useAuth()
  const userPoints = profile?.points || 0
  const userName = profile?.name?.split(' ')[0] || ''

  const levelData = calculateLevel(userPoints)
  const nextLevelInfo = getPointsToNextLevel(userPoints)
  const userPosition = mockUserEngagement.weeklyPosition
  const overtakeInfo = getPointsToOvertake(userPoints, userPosition)
  const weeklyReset = getTimeToWeeklyReset()
  const currentStreak = mockUserEngagement.streak.current

  // Calcular experiências desbloqueadas
  const unlockedExperiences = rewardsTable.filter(r => r.requiredLevel <= levelData.current.id).length

  const [motivationText, setMotivationText] = useState('')

  useEffect(() => {
    setMotivationText(motivation.getDashboard())
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="rounded-2xl border border-accent-gold/20 bg-gradient-to-br from-accent-gold/5 via-dark-800/50 to-dark-800/30 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-dark-700/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-neutral-100">
                {greetings.welcome(userName)}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {motivationText}
              </p>
            </div>

            {/* Consistency indicator - mais discreto */}
            {currentStreak >= 2 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700/30 border border-dark-600/30">
                <span className="text-sm text-neutral-400">
                  {consistency.days(currentStreak)}
                </span>
              </div>
            )}
          </div>

          {/* Achievement indicator - novo */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-dark-700/20">
            <div className="flex items-center gap-2">
              <span className="text-accent-gold/60">◆</span>
              <span className="text-xs text-neutral-500">
                {progress.unlockedCount(unlockedExperiences)}
              </span>
            </div>
            <div className="w-px h-3 bg-dark-600" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">
                Nível {levelCopy.names[levelData.current.id]}
              </span>
            </div>
          </div>
        </div>

        {/* Progress cards */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Next level progress */}
          {nextLevelInfo.hasNext && (
            <motion.div
              whileHover={{ scale: 1.005 }}
              className="p-4 rounded-xl bg-dark-800/30 border border-dark-700/20"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">
                    {levelCopy.next}
                  </p>
                  <p className="text-sm font-medium text-neutral-200">
                    {levelCopy.names[levelData.next?.id] || levelData.next?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-mono text-accent-gold/80">
                    {format.pointsShort(nextLevelInfo.pointsNeeded)}
                  </p>
                  <p className="text-[10px] text-neutral-600">créditos</p>
                </div>
              </div>

              <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${nextLevelInfo.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-accent-gold/50 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* Position advancement */}
          {overtakeInfo.hasAbove && (
            <motion.div
              whileHover={{ scale: 1.005 }}
              className="p-4 rounded-xl bg-dark-800/30 border border-dark-700/20"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">
                    Para avançar
                  </p>
                  <p className="text-sm font-medium text-neutral-200">
                    {overtakeInfo.userAbove.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-mono text-neutral-400">
                    {format.pointsShort(overtakeInfo.pointsNeeded)}
                  </p>
                  <p className="text-[10px] text-neutral-600">créditos</p>
                </div>
              </div>

              <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${Math.max(0, 100 - (overtakeInfo.pointsNeeded / 500) * 100)}%` }}
                  className="h-full bg-neutral-600/50 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 pb-5">
          <Link to="/recompensas">
            <motion.button
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-gold to-accent-light text-dark-900 font-medium text-sm flex items-center justify-center gap-2"
            >
              <span>{buttons.unlockExperiences}</span>
              <span className="text-dark-900/60">→</span>
            </motion.button>
          </Link>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-dark-800/20 border-t border-dark-700/20 flex items-center justify-between">
          <span className="text-xs text-neutral-600">
            Atualização em {format.time.daysHours(weeklyReset.days, weeklyReset.hours)}
          </span>
          <Link
            to="/ranking"
            className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
          >
            Ver posição →
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
