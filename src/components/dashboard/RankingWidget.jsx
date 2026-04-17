import { motion } from 'framer-motion'
import { mockRanking } from '@/services/mockData'

const medalColors = {
  1: 'from-amber-400 to-yellow-600',
  2: 'from-neutral-300 to-neutral-500',
  3: 'from-amber-600 to-orange-700'
}

export function RankingWidget() {
  const ranking = mockRanking.slice(0, 10)
  const currentUserIndex = ranking.findIndex(r => r.isCurrentUser)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-100">Ranking Top 10</h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-green-500"
            />
            Ao vivo
          </div>
        </div>
      </div>

      {/* Ranking list */}
      <div className="divide-y divide-dark-700/30">
        {ranking.map((user, index) => (
          <motion.div
            key={user.position}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index }}
            className={`flex items-center gap-4 px-5 py-3 transition-colors ${
              user.isCurrentUser
                ? 'bg-accent-gold/5 border-l-2 border-accent-gold'
                : 'hover:bg-dark-700/20'
            }`}
          >
            {/* Position */}
            <div className="w-8 flex justify-center">
              {index < 3 ? (
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${medalColors[index + 1]} flex items-center justify-center text-dark-900 text-xs font-bold`}>
                  {index + 1}
                </div>
              ) : (
                <span className="text-sm font-mono text-neutral-600">{index + 1}</span>
              )}
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                user.isCurrentUser
                  ? 'bg-accent-gold text-dark-900'
                  : 'bg-dark-600 text-neutral-400'
              }`}>
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-medium truncate ${
                  user.isCurrentUser ? 'text-accent-gold' : 'text-neutral-200'
                }`}>
                  {user.name}
                  {user.isCurrentUser && <span className="text-xs ml-1">(você)</span>}
                </div>
                <div className="text-[10px] text-neutral-600">{user.level}</div>
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <div className={`text-sm font-mono font-medium ${
                user.isCurrentUser ? 'text-accent-gold' : 'text-neutral-300'
              }`}>
                {user.points.toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] text-neutral-600">pts</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      {currentUserIndex >= 0 && (
        <div className="p-4 border-t border-dark-700/50 bg-dark-800/50">
          <div className="text-center text-xs text-neutral-500">
            Você está em <span className="text-accent-gold font-semibold">#{currentUserIndex + 1}</span>
            {currentUserIndex > 0 && (
              <span className="text-neutral-600">
                {' '}• Faltam {(ranking[currentUserIndex - 1].points - ranking[currentUserIndex].points).toLocaleString('pt-BR')} pts para subir
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
