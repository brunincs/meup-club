import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { calculateLevel } from '@/services/pointsSystem'
import { demoUser } from '@/services/mockData'
import {
  mockUserEngagement,
  mockNearbyRanking,
  getWeeklyPrize,
  getTimeToWeeklyReset
} from '@/services/engagementData'
import { position, format, buttons, levels as levelCopy } from '@/services/copy'
import { TrophyIcon, TrendingUpIcon } from '@/components/ui/Icons'

export function CompetitionWidget() {
  const { profile } = useAuth()
  // Usar demoUser como fonte única
  const userPoints = demoUser.points
  const levelData = calculateLevel(userPoints)
  const userPosition = mockUserEngagement.weeklyPosition
  const weeklyReset = getTimeToWeeklyReset()
  const weeklyPrize = getWeeklyPrize(userPosition)
  const todayPoints = mockUserEngagement.today.pointsEarned

  const userEntry = {
    position: userPosition,
    name: profile?.name || demoUser.name,
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
      className="rounded-2xl border border-game-blue/20 bg-gradient-to-br from-game-blue/10 to-game-blue/5 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-game-blue/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-game-blue mb-1 flex items-center gap-2">
              <TrophyIcon size={14} color="#3b82f6" />
              {position.weekly}
            </h3>
            <p className="text-xs text-dusty-rose">
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
            <p className="text-xs text-ice-white">
              Faltam <span className="font-heading font-semibold text-game-blue">{pointsToOvertake.toLocaleString('pt-BR')} pontos</span> para ultrapassar {aboveUser.name.split(' ')[0]}
            </p>
            <TrendingUpIcon size={16} color="#3b82f6" />
          </div>
        </div>
      )}

      {/* Weekly prize info */}
      {weeklyPrize && (
        <div className="px-5 py-3 bg-deep-purple/30 border-b border-dusty-rose/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-dusty-rose">
                {weeklyPrize.title || `Top ${userPosition}`}
              </p>
              <p className="text-[10px] text-game-green">
                +{format.pointsShort(weeklyPrize.points)} pontos
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-dusty-rose/60">{position.weeklyReset}</p>
              <p className="text-xs font-heading font-light text-dusty-rose">
                {format.time.daysHours(weeklyReset.days, weeklyReset.hours)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ranking list */}
      <div className="divide-y divide-dusty-rose/10">
        {fullRanking.map((player, index) => {
          const pointsDiff = player.points - userPoints
          const isAboveUser = player.position < userPosition

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
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-heading font-semibold ${
                  player.isUser
                    ? 'bg-game-blue/20 text-game-blue'
                    : player.position <= 3
                      ? 'bg-antique-gold/10 text-antique-gold'
                      : 'bg-dusty-rose/10 text-dusty-rose'
                }`}>
                  {player.position}
                </div>
                {player.trend && (
                  <span className={`text-[10px] ${
                    player.trend === 'up' ? 'text-game-green' :
                    player.trend === 'down' ? 'text-red-400' : 'text-dusty-rose/60'
                  }`}>
                    {player.trend === 'up' ? '↑' : player.trend === 'down' ? '↓' : '–'}
                  </span>
                )}
              </div>

              {/* Avatar and name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-heading font-medium ${
                  player.isUser
                    ? 'bg-game-blue/20 text-game-blue'
                    : 'bg-dusty-rose/10 text-dusty-rose'
                }`}>
                  {player.isUser ? '◆' : player.avatar}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm truncate ${
                    player.isUser ? 'text-ice-white font-heading font-medium' : 'text-dusty-rose'
                  }`}>
                    {player.isUser ? 'Você' : player.name}
                  </p>
                  <p className="text-[10px] text-dusty-rose/60">
                    {levelCopy.shortNames[player.levelId]}
                  </p>
                </div>
              </div>

              {/* Points and today's gains */}
              <div className="text-right">
                <p className={`text-sm font-display font-light ${
                  player.isUser ? 'text-ice-white' : 'text-dusty-rose'
                }`}>
                  {format.pointsShort(player.points)}
                </p>
                {player.isUser && player.todayPoints > 0 && (
                  <p className="text-[10px] text-game-green">
                    +{player.todayPoints} hoje
                  </p>
                )}
                {!player.isUser && isAboveUser && (
                  <p className="text-[10px] text-dusty-rose/60">
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
