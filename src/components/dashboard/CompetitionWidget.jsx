import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel } from '@/services/pointsSystem'
import {
  mockUserEngagement,
  mockNearbyRanking,
  getWeeklyPrize,
  getTimeToWeeklyReset
} from '@/services/engagementData'
import { position, format, buttons, levels as levelCopy } from '@/services/copy'

export function CompetitionWidget() {
  const { profile } = useAuth()
  const userPoints = profile?.points || 0
  const levelData = calculateLevel(userPoints)
  const userPosition = mockUserEngagement.weeklyPosition
  const weeklyReset = getTimeToWeeklyReset()
  const weeklyPrize = getWeeklyPrize(userPosition)

  const userEntry = {
    position: userPosition,
    name: profile?.name || 'Você',
    points: userPoints,
    levelId: levelData.current.id,
    isUser: true
  }

  const fullRanking = [
    ...mockNearbyRanking.filter(r => r.position < userPosition),
    userEntry,
    ...mockNearbyRanking.filter(r => r.position > userPosition)
  ].sort((a, b) => a.position - b.position).slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              {position.title}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              {position.subtitle}
            </p>
          </div>
          <Link
            to="/ranking"
            className="text-xs text-accent-gold/80 hover:text-accent-gold transition-colors"
          >
            {buttons.seeAll} →
          </Link>
        </div>
      </div>

      {/* Weekly prize info */}
      {weeklyPrize && (
        <div className="px-5 py-3 bg-accent-gold/5 border-b border-dark-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-accent-gold/80">
                {weeklyPrize.title || `Top ${userPosition}`}
              </p>
              <p className="text-[10px] text-neutral-500">
                +{weeklyPrize.points} benefícios
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-neutral-500">{position.weeklyReset}</p>
              <p className="text-xs font-mono text-neutral-400">
                {format.time.daysHours(weeklyReset.days, weeklyReset.hours)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ranking list */}
      <div className="divide-y divide-dark-700/20">
        {fullRanking.map((player, index) => {
          const pointsDiff = player.points - userPoints

          return (
            <motion.div
              key={player.position}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className={`flex items-center gap-3 px-5 py-3 ${
                player.isUser
                  ? 'bg-accent-gold/5 border-l-2 border-accent-gold'
                  : ''
              }`}
            >
              {/* Position */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium ${
                player.isUser
                  ? 'bg-accent-gold text-dark-900'
                  : 'bg-dark-700 text-neutral-500'
              }`}>
                {player.position}
              </div>

              {/* Avatar and name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  player.isUser
                    ? 'bg-accent-gold/20 text-accent-gold'
                    : 'bg-dark-700 text-neutral-500'
                }`}>
                  {player.isUser ? '◆' : player.avatar}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm truncate ${
                    player.isUser ? 'text-accent-gold font-medium' : 'text-neutral-300'
                  }`}>
                    {player.isUser ? 'Você' : player.name}
                  </p>
                  <p className="text-[10px] text-neutral-600">
                    {levelCopy.names[player.levelId] || `Nível ${player.levelId}`}
                  </p>
                </div>
              </div>

              {/* Points difference */}
              {!player.isUser && (
                <div className="text-right">
                  <p className={`text-xs font-mono ${
                    pointsDiff > 0 ? 'text-neutral-500' : 'text-green-400/80'
                  }`}>
                    {pointsDiff > 0 ? '+' : ''}{format.pointsShort(pointsDiff)}
                  </p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <Link to="/ranking">
        <div className="p-3 border-t border-dark-700/30 bg-dark-800/30 hover:bg-dark-700/20 transition-colors">
          <p className="text-center text-xs text-neutral-500">
            {buttons.exploreMore}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
