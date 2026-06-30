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
  const todayPoints = 450 // Mock: pontos ganhos hoje

  const userEntry = {
    position: userPosition,
    name: profile?.name || 'Você',
    points: userPoints,
    levelId: levelData.current.id,
    isUser: true,
    todayPoints
  }

  const fullRanking = [
    ...mockNearbyRanking.filter(r => r.position < userPosition),
    userEntry,
    ...mockNearbyRanking.filter(r => r.position > userPosition)
  ].sort((a, b) => a.position - b.position).slice(0, 5)

  // Encontrar quem está acima do usuário
  const aboveUser = fullRanking.find(r => r.position === userPosition - 1)
  const pointsToOvertake = aboveUser ? aboveUser.points - userPoints + 1 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="card-ranking rounded-2xl overflow-hidden"
    >
      {/* Header with blue theme */}
      <div className="p-5 border-b border-game-blue/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-game-blue mb-1 flex items-center gap-2">
              <span>🏆</span>
              {position.weekly}
            </h3>
            <p className="text-xs text-neutral-500">
              {position.subtitle}
            </p>
          </div>
          <Link
            to="/ranking"
            className="text-xs text-game-blue/70 hover:text-game-blue transition-colors"
          >
            {buttons.seeAll} →
          </Link>
        </div>
      </div>

      {/* Points to overtake highlight */}
      {aboveUser && pointsToOvertake > 0 && (
        <div className="px-5 py-3 bg-game-blue/10 border-b border-game-blue/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-300">
              Faltam <span className="font-semibold text-game-blue">{pointsToOvertake.toLocaleString('pt-BR')} pontos</span> para ultrapassar {aboveUser.name.split(' ')[0]}
            </p>
            <motion.div
              animate={{ y: [-2, 2, -2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-game-blue"
            >
              ↑
            </motion.div>
          </div>
        </div>
      )}

      {/* Weekly prize info */}
      {weeklyPrize && (
        <div className="px-5 py-3 bg-dark-800/50 border-b border-dark-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">
                {weeklyPrize.badge} {weeklyPrize.title || `Top ${userPosition}`}
              </p>
              <p className="text-[10px] text-game-green">
                +{format.pointsShort(weeklyPrize.points)} pontos
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
          const isAboveUser = player.position < userPosition
          const isBelowUser = player.position > userPosition

          return (
            <motion.div
              key={player.position}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className={`flex items-center gap-3 px-5 py-3 ${
                player.isUser
                  ? 'bg-game-blue/10 border-l-2 border-game-blue/50'
                  : ''
              }`}
            >
              {/* Position with trend arrow */}
              <div className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold ${
                  player.isUser
                    ? 'bg-game-blue/20 text-game-blue'
                    : player.position <= 3
                      ? 'bg-game-gold/10 text-game-gold'
                      : 'bg-dark-700/30 text-neutral-600'
                }`}>
                  {player.position}
                </div>
                {player.trend && (
                  <motion.span
                    animate={player.trend === 'up' ? { y: [-1, 1, -1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={`text-[10px] ${
                      player.trend === 'up' ? 'text-game-green' :
                      player.trend === 'down' ? 'text-red-400' : 'text-neutral-600'
                    }`}
                  >
                    {player.trend === 'up' ? '↑' : player.trend === 'down' ? '↓' : '–'}
                  </motion.span>
                )}
              </div>

              {/* Avatar and name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-medium ${
                  player.isUser
                    ? 'bg-game-blue/20 text-game-blue'
                    : 'bg-dark-700/30 text-neutral-500'
                }`}>
                  {player.isUser ? '◆' : player.avatar}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm truncate ${
                    player.isUser ? 'text-neutral-100 font-medium' : 'text-neutral-400'
                  }`}>
                    {player.isUser ? 'Você' : player.name}
                  </p>
                  <p className="text-[10px] text-neutral-700">
                    {levelCopy.shortNames[player.levelId]}
                  </p>
                </div>
              </div>

              {/* Points and today's gains */}
              <div className="text-right">
                <p className={`text-sm font-light ${
                  player.isUser ? 'text-neutral-100' : 'text-neutral-400'
                }`}>
                  {format.pointsShort(player.points)}
                </p>
                {player.isUser && player.todayPoints > 0 && (
                  <p className="text-[10px] text-game-green">
                    +{player.todayPoints} hoje
                  </p>
                )}
                {!player.isUser && isAboveUser && (
                  <p className="text-[10px] text-neutral-600">
                    +{format.pointsShort(Math.abs(pointsDiff))}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <Link to="/ranking">
        <div className="px-5 py-4 border-t border-game-blue/10 hover:bg-game-blue/5 transition-colors">
          <p className="text-center text-xs text-game-blue/70">
            Ver ranking completo →
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
