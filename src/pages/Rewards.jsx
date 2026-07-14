import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import { demoUser } from '@/services/mockData'
import {
  rewardsTable,
  calculateRewardsProgress,
  calculateLevel,
  levels,
  getNextLevelRewards
} from '@/services/pointsSystem'
import { format, levels as levelCopy } from '@/services/copy'
import { getClassIcon, GiftIcon } from '@/components/ui/Icons'

const categoryIcons = {
  cash: '◇',
  travel: '✦',
  experience: '◆',
  premium: '❖',
  lounge: '◈'
}

const badgeConfig = {
  hot: { label: 'Popular', color: 'text-ouro-antigo bg-ouro-antigo/10 border-ouro-antigo/20' },
  limited: { label: 'Limitado', color: 'text-game-orange bg-game-orange/10 border-game-orange/20' },
  recommended: { label: 'Recomendado', color: 'text-branco-gelo bg-branco-gelo/5 border-branco-gelo/10' },
  exclusive: { label: 'Exclusivo', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
}

function ExperienceCard({ reward, userPoints, userLevelId, onActivate }) {
  const canRedeem = reward.canRedeem
  const isUnlockedByLevel = reward.isUnlockedByLevel
  const progress = reward.progress

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`group relative rounded-2xl border transition-all duration-300 ${
        !isUnlockedByLevel
          ? 'border-cinza-rosado/10 bg-roxo-profundo/20 opacity-50'
          : canRedeem
          ? 'border-ouro-antigo/20 bg-ouro-antigo/5 hover:bg-ouro-antigo/10'
          : 'border-cinza-rosado/20 bg-roxo-profundo/30 hover:bg-roxo-profundo/50'
      }`}
    >
      {/* Locked Overlay */}
      {!isUnlockedByLevel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-roxo-profundo/80 backdrop-blur-sm z-10">
          <span className="text-xs text-cinza-rosado mb-1">Disponível em</span>
          <span className="text-sm text-branco-gelo">{levelCopy.names[reward.requiredLevelId]}</span>
        </div>
      )}

      <div className={`p-6 ${!isUnlockedByLevel ? 'opacity-30' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            canRedeem ? 'bg-ouro-antigo/10' : 'bg-cinza-rosado/10'
          }`}>
            <span className={`text-xl ${canRedeem ? 'text-ouro-antigo' : 'text-cinza-rosado'}`}>
              {categoryIcons[reward.category] || '◇'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {reward.badge && (
              <span className={`text-[10px] px-2 py-1 rounded-lg border ${badgeConfig[reward.badge].color}`}>
                {badgeConfig[reward.badge].label}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-cinza-rosado">
              {levelCopy.shortNames[reward.requiredLevelId]}
            </span>
          </div>
        </div>

        {/* Content */}
        <h3 className={`text-lg font-heading font-medium mb-1 ${canRedeem ? 'text-branco-gelo' : 'text-cinza-rosado'}`}>
          {reward.name}
        </h3>
        {reward.subtitle && (
          <p className="text-sm text-cinza-rosado/80 mb-2">{reward.subtitle}</p>
        )}
        <p className="text-sm text-cinza-rosado/60 mb-6 leading-relaxed line-clamp-2">
          {reward.description}
        </p>

        {/* Progress */}
        {isUnlockedByLevel && !canRedeem && (
          <div className="mb-6">
            <div className="h-1 bg-cinza-rosado/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full bg-ouro-antigo rounded-full"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-cinza-rosado/60">{progress}% concluído</span>
              <span className="text-[10px] text-ouro-antigo">
                {format.pointsShort(reward.pointsNeeded)} restantes
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xl font-display font-light ${canRedeem ? 'text-ouro-antigo' : 'text-cinza-rosado'}`}>
              {format.pointsShort(reward.points_required)}
            </span>
            <span className="text-xs text-cinza-rosado/60 ml-1">pontos</span>
          </div>

          {isUnlockedByLevel && (
            <motion.button
              whileHover={canRedeem ? { scale: 1.02 } : {}}
              whileTap={canRedeem ? { scale: 0.98 } : {}}
              onClick={() => onActivate(reward)}
              disabled={!canRedeem}
              className={`px-5 py-2.5 rounded-xl text-sm font-heading font-medium transition-all ${
                canRedeem
                  ? 'bg-ouro-antigo text-roxo-profundo hover:bg-accent-light'
                  : 'bg-cinza-rosado/10 text-cinza-rosado/60 cursor-not-allowed'
              }`}
            >
              {canRedeem ? 'Ativar' : `${progress}%`}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ClassSection({ classId, rewards, userPoints, userLevelId, onActivate }) {
  const classRewards = rewards.filter(r => r.requiredLevelId === classId)
  if (classRewards.length === 0) return null

  const isUnlocked = userLevelId >= classId
  const ClassIcon = getClassIcon(classId)

  return (
    <div className="mb-16">
      {/* Class Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isUnlocked ? 'bg-ouro-antigo/10' : 'bg-cinza-rosado/10'
        }`}>
          <ClassIcon size={24} color={isUnlocked ? '#a27937' : '#a39695'} />
        </div>
        <div>
          <h2 className={`text-xl font-heading font-medium ${isUnlocked ? 'text-branco-gelo' : 'text-cinza-rosado'}`}>
            {levelCopy.names[classId]}
          </h2>
          <p className="text-sm text-cinza-rosado">
            {classRewards.length} {classRewards.length === 1 ? 'experiência' : 'experiências'}
            {!isUnlocked && ' • Bloqueado'}
          </p>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classRewards.map(reward => (
          <ExperienceCard
            key={reward.id}
            reward={reward}
            userPoints={userPoints}
            userLevelId={userLevelId}
            onActivate={onActivate}
          />
        ))}
      </div>
    </div>
  )
}

export function Rewards() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('all') // 'all' or 'available'

  // Usar demoUser como fonte única
  const userPoints = demoUser.points
  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData.current.id
  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId)

  const availableCount = rewardsWithProgress.filter(r => r.canRedeem).length
  const unlockedCount = rewardsWithProgress.filter(r => r.isUnlockedByLevel).length
  const ClassIcon = getClassIcon(userLevelId)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-roxo-profundo">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-cinza-rosado/30 border-t-ouro-antigo rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  function handleActivate(reward) {
    if (!reward.isUnlockedByLevel) {
      toast.error(`Disponível a partir de ${levelCopy.names[reward.requiredLevelId]}`, {
        style: { background: '#32113f', color: '#edf0f1', border: '1px solid rgba(163, 150, 149, 0.3)' }
      })
      return
    }
    if (userPoints < reward.points_required) {
      toast.error(`Faltam ${format.pointsShort(reward.pointsNeeded)} pontos`, {
        style: { background: '#32113f', color: '#edf0f1', border: '1px solid rgba(163, 150, 149, 0.3)' }
      })
      return
    }
    toast.success(`Experiência ativada: ${reward.name}`, {
      duration: 4000,
      style: { background: '#32113f', color: '#edf0f1', border: '1px solid rgba(162, 121, 55, 0.3)' }
    })
  }

  const displayRewards = viewMode === 'available'
    ? rewardsWithProgress.filter(r => r.canRedeem)
    : rewardsWithProgress

  return (
    <div className="min-h-screen bg-roxo-profundo">
      <DashboardHeader />

      <main className="container-premium py-12">
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-cinza-rosado hover:text-ouro-antigo transition-colors"
          >
            ← Voltar ao clube
          </Link>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-display font-light text-branco-gelo mb-4">
            Catálogo de Experiências
          </h1>
          <p className="text-lg text-cinza-rosado max-w-2xl">
            Privilégios exclusivos selecionados para membros do clube.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-8 mb-12 pb-12 border-b border-cinza-rosado/20"
        >
          <div>
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado mb-1">Sua Classe</p>
            <div className="flex items-center gap-2">
              <ClassIcon size={20} color="#a27937" />
              <span className="text-lg text-branco-gelo">{levelCopy.names[userLevelId]}</span>
            </div>
          </div>

          <div className="w-px h-10 bg-cinza-rosado/20" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado mb-1">Pontos</p>
            <p className="text-2xl font-display font-light text-ouro-antigo">{format.pointsShort(userPoints)}</p>
          </div>

          <div className="w-px h-10 bg-cinza-rosado/20" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-cinza-rosado mb-1">Disponíveis</p>
            <p className="text-2xl font-display font-light text-branco-gelo">
              {availableCount}
              <span className="text-cinza-rosado text-lg ml-1">/ {rewardsTable.length}</span>
            </p>
          </div>

          {/* View Toggle */}
          <div className="ml-auto flex items-center gap-1 p-1 rounded-xl bg-roxo-profundo/50 border border-cinza-rosado/20">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-heading transition-all ${
                viewMode === 'all'
                  ? 'bg-ouro-antigo/20 text-ouro-antigo'
                  : 'text-cinza-rosado hover:text-branco-gelo'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setViewMode('available')}
              className={`px-4 py-2 rounded-lg text-sm font-heading transition-all ${
                viewMode === 'available'
                  ? 'bg-ouro-antigo/20 text-ouro-antigo'
                  : 'text-cinza-rosado hover:text-branco-gelo'
              }`}
            >
              Disponíveis ({availableCount})
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {viewMode === 'all' ? (
          // Group by Class
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {[1, 2, 3, 4, 5].map(classId => (
              <ClassSection
                key={classId}
                classId={classId}
                rewards={rewardsWithProgress}
                userPoints={userPoints}
                userLevelId={userLevelId}
                onActivate={handleActivate}
              />
            ))}
          </motion.div>
        ) : (
          // Available Only
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {displayRewards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {displayRewards.map(reward => (
                    <ExperienceCard
                      key={reward.id}
                      reward={reward}
                      userPoints={userPoints}
                      userLevelId={userLevelId}
                      onActivate={handleActivate}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-cinza-rosado/10 flex items-center justify-center mx-auto mb-4">
                  <GiftIcon size={32} color="#a39695" />
                </div>
                <h3 className="text-lg font-heading text-branco-gelo mb-2">Nenhuma experiência disponível</h3>
                <p className="text-sm text-cinza-rosado mb-6">
                  Continue ganhando pontos para desbloquear experiências.
                </p>
                <Link to="/dashboard">
                  <button className="px-6 py-3 rounded-xl bg-ouro-antigo text-roxo-profundo font-heading font-medium text-sm">
                    Voltar ao clube
                  </button>
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* Journey Progress */}
        {levelData.next && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 p-8 rounded-2xl bg-roxo-profundo/50 border border-cinza-rosado/20"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-cinza-rosado mb-2">
                  Próxima classe
                </p>
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const NextIcon = getClassIcon(levelData.next.id)
                    return <NextIcon size={24} color="#a27937" />
                  })()}
                  <span className="text-xl font-heading text-branco-gelo">{levelCopy.names[levelData.next.id]}</span>
                </div>
                <div className="h-1 bg-cinza-rosado/10 rounded-full overflow-hidden max-w-md">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelData.progress}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-ouro-antigo rounded-full"
                  />
                </div>
                <p className="text-sm text-cinza-rosado mt-3">
                  <span className="text-ouro-antigo">{format.pointsShort(levelData.pointsToNext)}</span> pontos para desbloquear novas experiências
                </p>
              </div>

              <div className="lg:text-right">
                <Link to="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 rounded-xl bg-ouro-antigo text-roxo-profundo font-heading font-medium text-sm"
                  >
                    Continuar jornada
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
