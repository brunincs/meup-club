import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { mockRanking } from '@/services/mockData'
import { format, levels as levelCopy, position } from '@/services/copy'
import { TrophyIcon, getClassIcon } from '@/components/ui/Icons'

export function RankingWidget() {
  const ranking = mockRanking.slice(0, 10)
  const currentUserIndex = ranking.findIndex(r => r.isCurrentUser)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-dusty-rose/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-dusty-rose mb-1 flex items-center gap-2">
              <TrophyIcon size={14} color="#a27937" />
              {position.title}
            </h3>
            <p className="text-xs text-dusty-rose">Top 10 do clube</p>
          </div>
          <Link
            to="/ranking"
            className="text-xs text-dusty-rose hover:text-antique-gold transition-colors"
          >
            Ver todos →
          </Link>
        </div>
      </div>

      {/* Ranking list */}
      <div className="divide-y divide-dusty-rose/10">
        {ranking.map((user, index) => (
          <motion.div
            key={user.position}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.03 * index }}
            className={`flex items-center gap-3 px-5 py-3 transition-colors ${
              user.isCurrentUser
                ? 'bg-antique-gold/10 border-l-2 border-antique-gold/50'
                : 'hover:bg-deep-purple/50'
            }`}
          >
            {/* Position */}
            <div className="w-6 text-center">
              <span className={`text-sm font-display font-light ${
                index < 3 ? 'text-antique-gold' : 'text-dusty-rose/60'
              }`}>
                {index + 1}
              </span>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-heading font-medium ${
                user.isCurrentUser
                  ? 'bg-antique-gold/20 text-antique-gold'
                  : 'bg-dusty-rose/10 text-dusty-rose'
              }`}>
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className={`text-sm truncate ${
                  user.isCurrentUser ? 'text-ice-white font-heading font-medium' : 'text-dusty-rose'
                }`}>
                  {user.name}
                  {user.isCurrentUser && <span className="text-xs text-antique-gold ml-1">(você)</span>}
                </div>
                <div className="text-[10px] text-dusty-rose/60">
                  {levelCopy.shortNames[user.levelId] || user.level}
                </div>
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <div className={`text-sm font-display font-light ${
                user.isCurrentUser ? 'text-ice-white' : 'text-dusty-rose'
              }`}>
                {format.pointsShort(user.points)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      {currentUserIndex >= 0 && (
        <div className="px-5 py-4 border-t border-dusty-rose/20">
          <div className="text-center text-xs text-dusty-rose">
            Você está em <span className="text-antique-gold">#{currentUserIndex + 1}</span>
            {currentUserIndex > 0 && (
              <span className="text-dusty-rose/60">
                {' '}· {format.pointsShort(ranking[currentUserIndex - 1].points - ranking[currentUserIndex].points)} para avançar
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
