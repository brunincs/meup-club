import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useUserLevel } from '@/hooks/useUserLevel'
import { DashboardHeader } from '@/components/dashboard'
import { getClassIcon } from '@/components/ui/Icons'
import { levels as levelCopy, format } from '@/services/copy'

// ============================================
// DADOS DAS CLASSES
// ============================================
const CLASSES = [
  { id: 1, name: 'Economica', minPoints: 0, bonus: 0 },
  { id: 2, name: 'Economica Premium', minPoints: 5000, bonus: 1000 },
  { id: 3, name: 'Executiva', minPoints: 20000, bonus: 3000 },
  { id: 4, name: 'Primeira Classe', minPoints: 50000, bonus: 5000 },
  { id: 5, name: 'Me,up Exclusive', minPoints: 100000, bonus: 10000 }
]

// ============================================
// COMPONENTE: ITEM DA TIMELINE
// ============================================
function TimelineItem({ classe, index, currentLevelId, totalPointsEarned, isLast }) {
  const ClassIcon = getClassIcon(classe.id)
  const isAchieved = totalPointsEarned >= classe.minPoints
  const isCurrent = classe.id === currentLevelId
  const isFuture = classe.id > currentLevelId
  const isExclusive = classe.id === 5

  // Calcular progresso para a classe atual
  const nextClass = CLASSES.find(c => c.id === currentLevelId + 1)
  const currentClass = CLASSES.find(c => c.id === currentLevelId)
  const pointsInCurrentLevel = totalPointsEarned - (currentClass?.minPoints || 0)
  const pointsToNextLevel = nextClass ? nextClass.minPoints - (currentClass?.minPoints || 0) : 0
  const progress = pointsToNextLevel > 0 ? Math.min(100, (pointsInCurrentLevel / pointsToNextLevel) * 100) : 100
  const pointsNeeded = nextClass ? nextClass.minPoints - totalPointsEarned : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      className="relative flex gap-4"
    >
      {/* Linha vertical */}
      {!isLast && (
        <div className="absolute left-5 top-12 w-0.5 h-full -translate-x-1/2">
          <div className={`h-full ${isAchieved && !isCurrent ? 'bg-game-green' : 'bg-graphite/20'}`} />
        </div>
      )}

      {/* Ícone circular */}
      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isAchieved && !isCurrent
          ? 'bg-game-green text-white'
          : isCurrent
            ? 'bg-antique-gold text-white ring-4 ring-antique-gold/30'
            : 'bg-graphite/10 text-graphite/40'
      } ${isExclusive && isFuture ? 'ring-2 ring-antique-gold/50' : ''}`}>
        {isAchieved && !isCurrent ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <ClassIcon size={20} color={isCurrent ? '#fff' : isAchieved ? '#fff' : '#a39695'} />
        )}
      </div>

      {/* Conteúdo */}
      <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
        {/* Card da classe */}
        <div className={`rounded-2xl p-4 ${
          isExclusive && (isCurrent || isFuture)
            ? 'bg-gradient-to-br from-[#32113f] to-[#5c005a] border-2 border-antique-gold/50'
            : isCurrent
              ? 'bg-deep-purple text-ice-white'
              : isAchieved
                ? 'bg-game-green/10 border border-game-green/30'
                : 'bg-graphite/5 border border-graphite/10'
        }`}>
          {/* Nome e pontos */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className={`font-heading font-semibold ${
                isCurrent || isExclusive ? 'text-ice-white' : isAchieved ? 'text-game-green' : 'text-graphite/60'
              }`}>
                {levelCopy.names[classe.id] || classe.name}
              </h3>
              {isExclusive && (
                <span className="px-2 py-0.5 rounded-full bg-antique-gold text-deep-purple text-[10px] font-bold uppercase">
                  Topo
                </span>
              )}
            </div>
            <span className={`text-sm ${
              isCurrent ? 'text-dusty-rose' : isAchieved ? 'text-game-green/70' : 'text-graphite/40'
            }`}>
              {classe.minPoints > 0 ? `${format.pointsShort(classe.minPoints)} pts` : 'Inicial'}
            </span>
          </div>

          {/* Status da classe */}
          {isAchieved && !isCurrent && classe.bonus > 0 && (
            <p className="text-sm text-game-green flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Bonus de +{format.pointsShort(classe.bonus)} pts recebido
            </p>
          )}

          {isCurrent && (
            <div className="mt-3">
              {nextClass ? (
                <>
                  {/* Barra de progresso */}
                  <div className="h-2 bg-dusty-rose/20 rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-antique-gold rounded-full"
                    />
                  </div>
                  <p className="text-sm text-dusty-rose">
                    Faltam <span className="text-antique-gold font-semibold">{format.pointsShort(pointsNeeded)}</span> pts para {levelCopy.names[nextClass.id]}
                  </p>
                </>
              ) : (
                <p className="text-sm text-antique-gold font-semibold">
                  Voce alcancou o nivel maximo!
                </p>
              )}
            </div>
          )}

          {isFuture && classe.bonus > 0 && (
            <p className={`text-sm ${isExclusive ? 'text-antique-gold' : 'text-graphite/50'}`}>
              Bonus de +{format.pointsShort(classe.bonus)} pts ao chegar
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// PAGINA PRINCIPAL
// ============================================
export function Jornada() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { current: currentLevel, totalPointsEarned, isLoading: levelLoading } = useUserLevel()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading || levelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  // Inverter a ordem para mostrar Me,up Exclusive no topo
  const classesInvertidas = [...CLASSES].reverse()

  return (
    <div className="min-h-screen bg-ice-white pb-20 md:pb-0">
      <DashboardHeader />

      <main className="container-premium py-8 md:py-12">
        {/* Voltar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-deep-purple hover:text-bright-purple transition-colors"
          >
            ← Voltar ao clube
          </Link>
        </motion.div>

        {/* Titulo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-graphite mb-2">
            Sua jornada no clube
          </h1>
          <p className="text-graphite/70">
            Sua classe sobe sozinha com os pontos que voce ganha. Cada nova classe da um bonus.
          </p>
          <p className="text-sm text-graphite/50 mt-2">
            Pontos acumulados: <span className="font-semibold text-antique-gold">{format.pointsShort(totalPointsEarned)}</span>
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="max-w-xl mx-auto mb-12">
          {classesInvertidas.map((classe, index) => (
            <TimelineItem
              key={classe.id}
              classe={classe}
              index={index}
              currentLevelId={currentLevel?.id || 1}
              totalPointsEarned={totalPointsEarned}
              isLast={index === classesInvertidas.length - 1}
            />
          ))}
        </div>

        {/* Como subir mais rapido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <div className="rounded-2xl bg-deep-purple p-6">
            <h2 className="text-lg font-heading font-semibold text-ice-white mb-4">
              Como subir mais rapido
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/viagens"
                className="p-4 rounded-xl bg-ice-white/5 border border-dusty-rose/20 hover:border-antique-gold/40 transition-colors"
              >
                <span className="text-2xl mb-2 block">✈️</span>
                <span className="text-sm text-ice-white font-medium">Viajar com a Me,up</span>
                <p className="text-xs text-dusty-rose mt-1">1 pt por real (1,5 se Prime)</p>
              </Link>
              <Link
                to="/indicar"
                className="p-4 rounded-xl bg-ice-white/5 border border-dusty-rose/20 hover:border-antique-gold/40 transition-colors"
              >
                <span className="text-2xl mb-2 block">👥</span>
                <span className="text-sm text-ice-white font-medium">Indicar amigos</span>
                <p className="text-xs text-dusty-rose mt-1">+500 pts por indicacao</p>
              </Link>
              <Link
                to="/dashboard"
                className="p-4 rounded-xl bg-ice-white/5 border border-dusty-rose/20 hover:border-antique-gold/40 transition-colors"
              >
                <span className="text-2xl mb-2 block">📱</span>
                <span className="text-sm text-ice-white font-medium">Check-in diario</span>
                <p className="text-xs text-dusty-rose mt-1">+10 pts por dia</p>
              </Link>
              <Link
                to="/missoes"
                className="p-4 rounded-xl bg-ice-white/5 border border-dusty-rose/20 hover:border-antique-gold/40 transition-colors"
              >
                <span className="text-2xl mb-2 block">🎯</span>
                <span className="text-sm text-ice-white font-medium">Missoes</span>
                <p className="text-xs text-dusty-rose mt-1">Varias missoes disponiveis</p>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
