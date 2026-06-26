import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { mockRanking } from '@/services/mockData'
import { format, levels as levelCopy, position } from '@/services/copy'

export function RankingWidget() {
  const ranking = mockRanking.slice(0, 10)
  const currentUserIndex = ranking.findIndex(r => r.isCurrentUser)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl border border-dark-700/30 bg-dark-800/20 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">
              {position.title}
            </h3>
            <p className="text-xs text-neutral-500">Top 10 do clube</p>
          </div>
          <Link
            to="/ranking"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Ver todos →
          </Link>
        </div>
      </div>

      {/* Ranking list */}
      <div className="divide-y divide-dark-700/20">
        {ranking.map((user, index) => (
          <motion.div
            key={user.position}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.03 * index }}
            className={`flex items-center gap-3 px-5 py-3 transition-colors ${
              user.isCurrentUser
                ? 'bg-neutral-100/5 border-l-2 border-neutral-100/30'
                : 'hover:bg-dark-700/10'
            }`}
          >
            {/* Position */}
            <div className="w-6 text-center">
              <span className={`text-sm font-light ${
                index < 3 ? 'text-neutral-300' : 'text-neutral-600'
              }`}>
                {index + 1}
              </span>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-medium ${
                user.isCurrentUser
                  ? 'bg-neutral-100/10 text-neutral-100'
                  : 'bg-dark-700/30 text-neutral-500'
              }`}>
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className={`text-sm truncate ${
                  user.isCurrentUser ? 'text-neutral-100' : 'text-neutral-300'
                }`}>
                  {user.name}
                  {user.isCurrentUser && <span className="text-xs text-neutral-500 ml-1">(você)</span>}
                </div>
                <div className="text-[10px] text-neutral-700">
                  {levelCopy.shortNames[user.levelId] || user.level}
                </div>
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <div className={`text-sm font-light ${
                user.isCurrentUser ? 'text-neutral-100' : 'text-neutral-400'
              }`}>
                {format.pointsShort(user.points)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      {currentUserIndex >= 0 && (
        <div className="px-5 py-4 border-t border-dark-700/30">
          <div className="text-center text-xs text-neutral-600">
            Você está em <span className="text-neutral-300">#{currentUserIndex + 1}</span>
            {currentUserIndex > 0 && (
              <span className="text-neutral-700">
                {' '}· {format.pointsShort(ranking[currentUserIndex - 1].points - ranking[currentUserIndex].points)} para avançar
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
