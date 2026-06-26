import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import {
  rewardsTable,
  calculateRewardsProgress,
  calculateLevel,
  levels,
  getNextLevelRewards
} from '@/services/pointsSystem'
import { format, levels as levelCopy } from '@/services/copy'

const categoryIcons = {
  cash: '◇',
  travel: '✦',
  experience: '◆',
  premium: '❖',
  lounge: '◈'
}

const badgeConfig = {
  hot: { label: 'Popular', color: 'text-neutral-400 bg-neutral-100/5 border-neutral-100/10' },
  limited: { label: 'Limitado', color: 'text-amber-400/80 bg-amber-500/5 border-amber-500/10' },
  recommended: { label: 'Recomendado', color: 'text-neutral-300 bg-neutral-100/5 border-neutral-100/10' },
  exclusive: { label: 'Exclusivo', color: 'text-violet-400/80 bg-violet-500/5 border-violet-500/10' }
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
          ? 'border-dark-700/20 bg-dark-800/10 opacity-50'
          : canRedeem
          ? 'border-neutral-100/10 bg-neutral-100/5 hover:bg-neutral-100/10'
          : 'border-dark-700/30 bg-dark-800/20 hover:bg-dark-800/30'
      }`}
    >
      {/* Locked Overlay */}
      {!isUnlockedByLevel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-dark-900/60 backdrop-blur-sm z-10">
          <span className="text-xs text-neutral-500 mb-1">Disponível em</span>
          <span className="text-sm text-neutral-400">{levelCopy.names[reward.requiredLevelId]}</span>
        </div>
      )}

      <div className={`p-6 ${!isUnlockedByLevel ? 'opacity-30' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            canRedeem ? 'bg-neutral-100/10' : 'bg-dark-700/30'
          }`}>
            <span className={`text-xl ${canRedeem ? 'text-neutral-200' : 'text-neutral-600'}`}>
              {categoryIcons[reward.category] || '◇'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {reward.badge && (
              <span className={`text-[10px] px-2 py-1 rounded-lg border ${badgeConfig[reward.badge].color}`}>
                {badgeConfig[reward.badge].label}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-neutral-600">
              {levelCopy.shortNames[reward.requiredLevelId]}
            </span>
          </div>
        </div>

        {/* Content */}
        <h3 className={`text-lg font-medium mb-1 ${canRedeem ? 'text-neutral-100' : 'text-neutral-400'}`}>
          {reward.name}
        </h3>
        {reward.subtitle && (
          <p className="text-sm text-neutral-500 mb-2">{reward.subtitle}</p>
        )}
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed line-clamp-2">
          {reward.description}
        </p>

        {/* Progress */}
        {isUnlockedByLevel && !canRedeem && (
          <div className="mb-6">
            <div className="h-0.5 bg-dark-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full bg-neutral-500 rounded-full"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-neutral-600">{progress}% concluído</span>
              <span className="text-[10px] text-neutral-500">
                {format.pointsShort(reward.pointsNeeded)} restantes
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xl font-light ${canRedeem ? 'text-neutral-100' : 'text-neutral-500'}`}>
              {format.pointsShort(reward.points_required)}
            </span>
            <span className="text-xs text-neutral-600 ml-1">benefícios</span>
          </div>

          {isUnlockedByLevel && (
            <motion.button
              whileHover={canRedeem ? { scale: 1.02 } : {}}
              whileTap={canRedeem ? { scale: 0.98 } : {}}
              onClick={() => onActivate(reward)}
              disabled={!canRedeem}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                canRedeem
                  ? 'bg-neutral-100 text-dark-900 hover:bg-neutral-200'
                  : 'bg-dark-700/30 text-neutral-600 cursor-not-allowed'
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

  return (
    <div className="mb-16">
      {/* Class Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isUnlocked ? 'bg-neutral-100/10' : 'bg-dark-700/30'
        }`}>
          <span className={`text-xl ${isUnlocked ? 'text-neutral-200' : 'text-neutral-600'}`}>
            {levelCopy.icons[classId]}
          </span>
        </div>
        <div>
          <h2 className={`text-xl font-medium ${isUnlocked ? 'text-neutral-100' : 'text-neutral-500'}`}>
            {levelCopy.names[classId]}
          </h2>
          <p className="text-sm text-neutral-600">
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

  const userPoints = profile?.points || 0
  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData.current.id
  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId)

  const availableCount = rewardsWithProgress.filter(r => r.canRedeem).length
  const unlockedCount = rewardsWithProgress.filter(r => r.isUnlockedByLevel).length

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-neutral-600 border-t-neutral-300 rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  function handleActivate(reward) {
    if (!reward.isUnlockedByLevel) {
      toast.error(`Disponível a partir de ${levelCopy.names[reward.requiredLevelId]}`)
      return
    }
    if (userPoints < reward.points_required) {
      toast.error(`Faltam ${format.pointsShort(reward.pointsNeeded)} benefícios`)
      return
    }
    toast.success(`Experiência ativada: ${reward.name}`, { duration: 4000 })
  }

  const displayRewards = viewMode === 'available'
    ? rewardsWithProgress.filter(r => r.canRedeem)
    : rewardsWithProgress

  return (
    <div className="min-h-screen bg-dark-900">
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
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-400 transition-colors"
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
          <h1 className="text-4xl md:text-5xl font-display font-light text-neutral-100 mb-4">
            Catálogo de Experiências
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl">
            Privilégios exclusivos selecionados para membros do clube.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-8 mb-12 pb-12 border-b border-dark-700/30"
        >
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Sua Classe</p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{levelCopy.icons[userLevelId]}</span>
              <span className="text-lg text-neutral-200">{levelCopy.names[userLevelId]}</span>
            </div>
          </div>

          <div className="w-px h-10 bg-dark-700/50" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Benefícios</p>
            <p className="text-2xl font-light text-neutral-100">{format.pointsShort(userPoints)}</p>
          </div>

          <div className="w-px h-10 bg-dark-700/50" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">Disponíveis</p>
            <p className="text-2xl font-light text-neutral-100">
              {availableCount}
              <span className="text-neutral-600 text-lg ml-1">/ {rewardsTable.length}</span>
            </p>
          </div>

          {/* View Toggle */}
          <div className="ml-auto flex items-center gap-1 p-1 rounded-xl bg-dark-800/30 border border-dark-700/30">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                viewMode === 'all'
                  ? 'bg-neutral-100/10 text-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setViewMode('available')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                viewMode === 'available'
                  ? 'bg-neutral-100/10 text-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-300'
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
                <div className="w-16 h-16 rounded-2xl bg-dark-800/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-neutral-600">◇</span>
                </div>
                <h3 className="text-lg text-neutral-300 mb-2">Nenhuma experiência disponível</h3>
                <p className="text-sm text-neutral-600 mb-6">
                  Continue acumulando benefícios para desbloquear experiências.
                </p>
                <Link to="/dashboard">
                  <button className="px-6 py-3 rounded-xl bg-neutral-100 text-dark-900 font-medium text-sm">
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
            className="mt-16 p-8 rounded-2xl bg-dark-800/20 border border-dark-700/30"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                  Próxima classe
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{levelCopy.icons[levelData.next.id]}</span>
                  <span className="text-xl text-neutral-200">{levelCopy.names[levelData.next.id]}</span>
                </div>
                <div className="h-1 bg-dark-700/50 rounded-full overflow-hidden max-w-md">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelData.progress}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-neutral-400 rounded-full"
                  />
                </div>
                <p className="text-sm text-neutral-500 mt-3">
                  {format.pointsShort(levelData.pointsToNext)} benefícios para desbloquear novas experiências
                </p>
              </div>

              <div className="lg:text-right">
                <Link to="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 rounded-xl bg-neutral-100 text-dark-900 font-medium text-sm"
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
