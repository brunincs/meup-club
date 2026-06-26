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
      className="rounded-2xl border border-dark-700/30 bg-dark-800/20 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">
              {position.weekly}
            </h3>
            <p className="text-xs text-neutral-500">
              {position.subtitle}
            </p>
          </div>
          <Link
            to="/ranking"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {buttons.seeAll} →
          </Link>
        </div>
      </div>

      {/* Weekly prize info */}
      {weeklyPrize && (
        <div className="px-5 py-3 bg-neutral-100/5 border-b border-dark-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">
                {weeklyPrize.title || `Top ${userPosition}`}
              </p>
              <p className="text-[10px] text-neutral-600">
                +{format.pointsShort(weeklyPrize.points)} benefícios
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-neutral-600">{position.weeklyReset}</p>
              <p className="text-xs font-light text-neutral-400">
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
                  ? 'bg-neutral-100/5 border-l-2 border-neutral-100/30'
                  : ''
              }`}
            >
              {/* Position */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                player.isUser
                  ? 'bg-neutral-100/10 text-neutral-100'
                  : 'bg-dark-700/30 text-neutral-600'
              }`}>
                {player.position}
              </div>

              {/* Avatar and name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-medium ${
                  player.isUser
                    ? 'bg-neutral-100/10 text-neutral-200'
                    : 'bg-dark-700/30 text-neutral-500'
                }`}>
                  {player.isUser ? '◆' : player.avatar}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm truncate ${
                    player.isUser ? 'text-neutral-100' : 'text-neutral-400'
                  }`}>
                    {player.isUser ? 'Você' : player.name}
                  </p>
                  <p className="text-[10px] text-neutral-700">
                    {levelCopy.shortNames[player.levelId]}
                  </p>
                </div>
              </div>

              {/* Points difference */}
              {!player.isUser && (
                <div className="text-right">
                  <p className={`text-xs font-light ${
                    pointsDiff > 0 ? 'text-neutral-600' : 'text-neutral-400'
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
        <div className="px-5 py-4 border-t border-dark-700/30 hover:bg-dark-700/10 transition-colors">
          <p className="text-center text-xs text-neutral-600">
            Ver ranking completo
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
