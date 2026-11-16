import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useUserLevel } from '@/hooks/useUserLevel'
import { DashboardHeader } from '@/components/dashboard'
import { getClassIcon, PlaneIcon, UsersIcon, CheckIcon, TargetIcon } from '@/components/ui/Icons'
import { levels as levelCopy, format } from '@/services/copy'
import { levels as levelData } from '@/services/pointsSystem'
import { fetchUserBenefits } from '@/services/subscriptionService'
import { supabase } from '@/lib/supabase'

// ============================================
// DADOS DAS CLASSES (alinhado com pointsSystem)
// ============================================
const CLASSES = levelData.map(level => ({
  id: level.id,
  name: level.name,
  minPoints: level.minPoints,
  bonus: level.id === 1 ? 0 : level.id === 2 ? 1000 : level.id === 3 ? 3000 : level.id === 4 ? 5000 : 10000
}))

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
          <div className={`h-full ${isAchieved && !isCurrent ? 'bg-antique-gold/50' : 'bg-graphite/20'}`} />
        </div>
      )}

      {/* Ícone circular */}
      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isAchieved && !isCurrent
          ? 'bg-antique-gold text-deep-purple'
          : isCurrent
            ? 'bg-deep-purple text-white ring-4 ring-deep-purple/30'
            : 'bg-graphite/10 text-graphite/40'
      } ${isExclusive && isFuture ? 'ring-2 ring-antique-gold/50' : ''}`}>
        {isAchieved && !isCurrent ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <ClassIcon size={20} color={isCurrent ? '#fff' : isAchieved ? '#32113f' : '#a39695'} />
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
                ? 'bg-antique-gold/10 border border-antique-gold/30'
                : 'bg-graphite/5 border border-graphite/10'
        }`}>
          {/* Nome e pontos */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className={`font-heading font-semibold ${
                isCurrent || isExclusive ? 'text-ice-white' : isAchieved ? 'text-antique-gold' : 'text-graphite/60'
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
              isCurrent ? 'text-dusty-rose' : isAchieved ? 'text-antique-gold/70' : 'text-graphite/40'
            }`}>
              {classe.minPoints > 0 ? `a partir de ${format.pointsShort(classe.minPoints)} pts` : 'Inicial'}
            </span>
          </div>

          {/* Status da classe */}
          {isAchieved && !isCurrent && (
            <p className="text-sm text-antique-gold flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {classe.bonus > 0 ? `Bônus de +${format.pointsShort(classe.bonus)} pts recebido` : 'Início'}
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
                  Você alcançou o nível máximo!
                </p>
              )}
            </div>
          )}

          {isFuture && classe.bonus > 0 && (
            <p className={`text-sm ${isExclusive ? 'text-antique-gold' : 'text-graphite/50'}`}>
              Bônus de +{format.pointsShort(classe.bonus)} pts ao chegar
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export function Jornada() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { current: currentLevel, totalPointsEarned, isLoading: levelLoading } = useUserLevel()

  // Dados do plano (para valores dinâmicos)
  const [benefits, setBenefits] = useState(null)
  const [missoesPendentes, setMissoesPendentes] = useState({ total: 0, pontosTotal: 0 })

  // Buscar benefícios do plano
  useEffect(() => {
    async function loadBenefits() {
      if (!user?.id) return
      const result = await fetchUserBenefits(user.id)
      if (result.success) {
        setBenefits(result.benefits)
      }
    }
    loadBenefits()
  }, [user?.id])

  // Buscar missões pendentes para mostrar "Até X pts em missões"
  useEffect(() => {
    async function loadMissoes() {
      if (!user?.id) return
      try {
        // Buscar tarefas ativas que o usuário ainda não completou
        const { data: tarefas } = await supabase
          .from('tarefas')
          .select('id, pontos')
          .eq('ativa', true)

        if (!tarefas || tarefas.length === 0) {
          setMissoesPendentes({ total: 0, pontosTotal: 0 })
          return
        }

        // Buscar quais o usuário já completou
        const { data: completadas } = await supabase
          .from('solicitacoes_tarefa')
          .select('tarefa_id')
          .eq('cliente_id', user.id)
          .eq('status', 'aprovada')

        const completadasIds = new Set(completadas?.map(c => c.tarefa_id) || [])
        const pendentes = tarefas.filter(t => !completadasIds.has(t.id))
        const pontosTotal = pendentes.reduce((sum, t) => sum + (t.pontos || 0), 0)

        setMissoesPendentes({ total: pendentes.length, pontosTotal })
      } catch (e) {
        console.error('Erro ao buscar missões:', e)
      }
    }
    loadMissoes()
  }, [user?.id])

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

  // Valores do plano (com fallback)
  const isPrime = benefits?.isPrime || false
  const multiplicadorViagem = benefits?.multiplicadorViagem || 1.0
  const pontosIndicacao = benefits?.pontosIndicacao || 3000
  const pontosCheckin = benefits?.pontosCheckin || 10

  // Texto para indicação com bonus Prime
  const textoIndicacao = isPrime
    ? `+${format.pointsShort(pontosIndicacao)} pts quando comprar`
    : `+${format.pointsShort(pontosIndicacao)} pts (${format.pointsShort(5000)} se Prime)`

  // Texto para viagem
  const textoViagem = isPrime
    ? `${multiplicadorViagem} ponto por real`
    : `1 ponto por real · ${1.5} no Prime`

  // Texto para check-in
  const textoCheckin = `+${pontosCheckin} pts por dia`

  // Texto para missões
  const textoMissoes = missoesPendentes.pontosTotal > 0
    ? `Até ${format.pointsShort(missoesPendentes.pontosTotal)} pts disponíveis`
    : 'Várias missões disponíveis'

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

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-graphite mb-2">
            Sua jornada no clube
          </h1>
          <p className="text-graphite/70">
            Sua classe sobe sozinha com os pontos que você ganha. Cada nova classe dá um bônus.
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

        {/* Como subir mais rápido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <div className="rounded-2xl bg-deep-purple p-6">
            <h2 className="text-lg font-heading font-semibold text-ice-white mb-4">
              Como subir mais rápido
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/minhas-viagens"
                className="p-4 rounded-xl bg-ice-white/5 border border-dusty-rose/20 hover:border-antique-gold/40 transition-colors"
              >
                <div className="mb-2">
                  <PlaneIcon size={24} color="#a27937" />
                </div>
                <span className="text-sm text-ice-white font-medium">Viajar com a Me,up</span>
                <p className="text-xs text-dusty-rose mt-1">{textoViagem}</p>
              </Link>
              <Link
                to="/perfil"
                className="p-4 rounded-xl bg-ice-white/5 border border-dusty-rose/20 hover:border-antique-gold/40 transition-colors"
              >
                <div className="mb-2">
                  <UsersIcon size={24} color="#a27937" />
                </div>
                <span className="text-sm text-ice-white font-medium">Indicar amigos</span>
                <p className="text-xs text-dusty-rose mt-1">{textoIndicacao}</p>
              </Link>
              <Link
                to="/dashboard"
                className="p-4 rounded-xl bg-ice-white/5 border border-dusty-rose/20 hover:border-antique-gold/40 transition-colors"
              >
                <div className="mb-2">
                  <CheckIcon size={24} color="#a27937" />
                </div>
                <span className="text-sm text-ice-white font-medium">Check-in diário</span>
                <p className="text-xs text-dusty-rose mt-1">{textoCheckin}</p>
              </Link>
              <Link
                to="/missoes"
                className="p-4 rounded-xl bg-ice-white/5 border border-dusty-rose/20 hover:border-antique-gold/40 transition-colors"
              >
                <div className="mb-2">
                  <TargetIcon size={24} color="#a27937" />
                </div>
                <span className="text-sm text-ice-white font-medium">Missões</span>
                <p className="text-xs text-dusty-rose mt-1">{textoMissoes}</p>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
