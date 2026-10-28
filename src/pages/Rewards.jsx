import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { DashboardHeader } from '@/components/dashboard'
import {
  rewardsTable,
  calculateRewardsProgress,
  calculateLevel
} from '@/services/pointsSystem'
import { format, levels as levelCopy } from '@/services/copy'
import { getClassIcon, GiftIcon } from '@/components/ui/Icons'

// ============================================
// FOTO A VALIDAR - trocar pela oficial da Me,up depois
// Opções Unsplash de viagem premium:
// - Resort de luxo: photo-1566073771259-6a8506099945
// - Lounge de aeroporto: photo-1583416750470-965b2707b355
// ============================================
const HERO_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=400&fit=crop&crop=center&q=80'

const categoryIcons = {
  travel: '✦',
  experience: '◆',
  premium: '❖',
  lounge: '◈'
}

const badgeConfig = {
  hot: { label: 'Popular', color: 'text-antique-gold bg-antique-gold/10 border-antique-gold/20' },
  limited: { label: 'Limitado', color: 'text-game-orange bg-game-orange/10 border-game-orange/20' },
  recommended: { label: 'Recomendado', color: 'text-ice-white bg-ice-white/5 border-ice-white/10' },
  exclusive: { label: 'Exclusivo', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
}

/**
 * Modal de confirmação de resgate
 *
 * Correções aplicadas:
 * - Bug 1: Modal fecha corretamente após confirmar
 * - Bug 3: Botão desabilitado durante loading com spinner
 * - Bug 4: Tecla Escape fecha o modal
 * - Bug 5: Focus trap - foco fica preso dentro do modal
 */
function RedeemModal({ reward, userPoints, onConfirm, onCancel, isLoading }) {
  const modalRef = useRef(null)
  const confirmButtonRef = useRef(null)
  const cancelButtonRef = useRef(null)
  const remainingPoints = userPoints - reward.points_required

  // Bug 4: Fechar com Escape (mas não durante loading)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !isLoading) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, isLoading])

  // Bug 5: Mover foco para o modal ao abrir
  useEffect(() => {
    // Salvar elemento que tinha foco antes
    const previouslyFocused = document.activeElement

    // Focar no botão de cancelar (mais seguro) ao abrir
    cancelButtonRef.current?.focus()

    // Devolver foco ao fechar
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

  // Bug 5: Focus trap - Tab circula só dentro do modal
  useEffect(() => {
    function handleTab(e) {
      if (e.key !== 'Tab') return

      const focusableElements = modalRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift+Tab no primeiro elemento vai para o último
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
      // Tab no último elemento vai para o primeiro
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [])

  // Bug 4: Clicar no backdrop fecha (mas não durante loading)
  const handleBackdropClick = useCallback(() => {
    if (!isLoading) {
      onCancel()
    }
  }, [isLoading, onCancel])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-deep-purple border border-dusty-rose/20 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div className="p-6">
          <div className="w-14 h-14 rounded-xl bg-antique-gold/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-antique-gold">
              {categoryIcons[reward.category] || '◇'}
            </span>
          </div>

          <h2 id="modal-title" className="text-xl font-heading font-medium text-ice-white text-center mb-2">
            Confirmar Resgate
          </h2>

          <p id="modal-description" className="text-sm text-dusty-rose text-center mb-6">
            Você está prestes a resgatar:
          </p>

          <div className="p-4 rounded-xl bg-dusty-rose/5 border border-dusty-rose/10 mb-6">
            <h3 className="text-lg font-heading font-medium text-ice-white mb-1">
              {reward.name}
            </h3>
            {reward.subtitle && (
              <p className="text-sm text-dusty-rose/80">{reward.subtitle}</p>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dusty-rose">Custo</span>
              <span className="text-antique-gold font-medium">
                -{format.pointsShort(reward.points_required)} pontos
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-dusty-rose">Saldo atual</span>
              <span className="text-ice-white">{format.pointsShort(userPoints)} pontos</span>
            </div>
            <div className="border-t border-dusty-rose/20 pt-3 flex items-center justify-between text-sm">
              <span className="text-dusty-rose">Saldo após resgate</span>
              <span className="text-ice-white font-medium">{format.pointsShort(remainingPoints)} pontos</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-dusty-rose/20 bg-dusty-rose/5">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-heading font-medium text-dusty-rose hover:text-ice-white hover:bg-dusty-rose/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-heading font-medium bg-antique-gold text-deep-purple hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-deep-purple/30 border-t-deep-purple rounded-full inline-block"
                />
                Resgatando...
              </span>
            ) : (
              'Confirmar Resgate'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ExperienceCard({ reward, userPoints, userLevelId, onActivate, isRedeemed, triggerRef }) {
  const canRedeem = reward.canRedeem && !isRedeemed
  const isUnlockedByLevel = reward.isUnlockedByLevel
  const progress = reward.progress

  const getButtonText = () => {
    if (isRedeemed) return 'Resgatada'
    if (canRedeem) return 'Resgatar'
    return `Faltam ${format.pointsShort(reward.pointsNeeded)}`
  }

  // Bug 8: Corrigir gramática do aria-label
  // "Disponível na X" só funciona para feminino. Usar "Requer classe X" é neutro.
  const getLockedAriaLabel = () => {
    return `Requer a classe ${levelCopy.names[reward.requiredLevelId]}`
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`group relative rounded-2xl border transition-all duration-300 ${
        isRedeemed
          ? 'border-game-green/30 bg-game-green/5'
          : !isUnlockedByLevel
          ? 'border-dusty-rose/10 bg-deep-purple/20 opacity-50'
          : canRedeem
          ? 'border-antique-gold/20 bg-antique-gold/5 hover:bg-antique-gold/10'
          : 'border-dusty-rose/20 bg-deep-purple/30 hover:bg-deep-purple/50'
      }`}
    >
      {/* Locked Overlay */}
      {!isUnlockedByLevel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-deep-purple/80 backdrop-blur-sm z-10">
          <span className="text-xs text-dusty-rose mb-1">Disponível em</span>
          <span className="text-sm text-ice-white">{levelCopy.names[reward.requiredLevelId]}</span>
        </div>
      )}

      {/* Redeemed Badge */}
      {isRedeemed && (
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-game-green/20 border border-game-green/30 z-10">
          <span className="text-xs text-game-green font-medium">Resgatada</span>
        </div>
      )}

      <div className={`p-6 ${!isUnlockedByLevel ? 'opacity-30' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isRedeemed ? 'bg-game-green/10' : canRedeem ? 'bg-antique-gold/10' : 'bg-dusty-rose/10'
          }`}>
            <span className={`text-xl ${isRedeemed ? 'text-game-green' : canRedeem ? 'text-antique-gold' : 'text-dusty-rose'}`}>
              {categoryIcons[reward.category] || '◇'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {reward.badge && !isRedeemed && (
              <span className={`text-[10px] px-2 py-1 rounded-lg border ${badgeConfig[reward.badge].color}`}>
                {badgeConfig[reward.badge].label}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-dusty-rose">
              {levelCopy.names[reward.requiredLevelId]}
            </span>
          </div>
        </div>

        {/* Content */}
        <h3 className={`text-lg font-heading font-medium mb-1 ${
          isRedeemed ? 'text-game-green' : canRedeem ? 'text-ice-white' : 'text-dusty-rose'
        }`}>
          {reward.name}
        </h3>
        {reward.subtitle && (
          <p className="text-sm text-dusty-rose/80 mb-2">{reward.subtitle}</p>
        )}
        <p className="text-sm text-dusty-rose/60 mb-6 leading-relaxed line-clamp-2">
          {reward.description}
        </p>

        {/* Progress Bar */}
        {isUnlockedByLevel && !canRedeem && !isRedeemed && (
          <div className="mb-6">
            <div
              className="h-1 bg-dusty-rose/10 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso para ${reward.name}: ${progress}%`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full bg-antique-gold rounded-full"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-dusty-rose/60">{progress}% concluído</span>
              <span className="text-[10px] text-antique-gold">
                {format.pointsShort(reward.pointsNeeded)} restantes
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xl font-display font-light ${
              isRedeemed ? 'text-game-green' : canRedeem ? 'text-antique-gold' : 'text-dusty-rose'
            }`}>
              {format.pointsShort(reward.points_required)}
            </span>
            <span className="text-xs text-dusty-rose/60 ml-1">pontos</span>
          </div>

          {/* Botão para cards desbloqueados */}
          {isUnlockedByLevel && (
            <motion.button
              ref={canRedeem ? triggerRef : undefined}
              whileHover={canRedeem ? { scale: 1.02 } : {}}
              whileTap={canRedeem ? { scale: 0.98 } : {}}
              onClick={() => canRedeem && onActivate(reward)}
              disabled={!canRedeem}
              aria-label={
                isRedeemed
                  ? `${reward.name} já resgatada`
                  : canRedeem
                  ? `Resgatar ${reward.name} por ${format.pointsShort(reward.points_required)} pontos`
                  : `Faltam ${format.pointsShort(reward.pointsNeeded)} pontos para ${reward.name}`
              }
              className={`px-5 py-2.5 rounded-xl text-sm font-heading font-medium transition-all ${
                isRedeemed
                  ? 'bg-game-green/10 text-game-green cursor-default'
                  : canRedeem
                  ? 'bg-antique-gold text-deep-purple hover:bg-accent-light'
                  : 'bg-dusty-rose/10 text-dusty-rose/60 cursor-not-allowed'
              }`}
            >
              {getButtonText()}
            </motion.button>
          )}

          {/* Botão para cards bloqueados por nível (Bug 8 corrigido) */}
          {!isUnlockedByLevel && (
            <button
              disabled
              aria-label={getLockedAriaLabel()}
              className="px-5 py-2.5 rounded-xl text-sm font-heading font-medium bg-dusty-rose/10 text-dusty-rose/60 cursor-not-allowed"
            >
              {levelCopy.names[reward.requiredLevelId]}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ClassSection({ classId, rewards, userPoints, userLevelId, onActivate, redeemedIds }) {
  const classRewards = rewards.filter(r => r.requiredLevelId === classId)
  if (classRewards.length === 0) return null

  const isUnlocked = userLevelId >= classId
  const ClassIcon = getClassIcon(classId)

  return (
    <section className="mb-16" aria-labelledby={`class-heading-${classId}`}>
      {/* Class Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isUnlocked ? 'bg-antique-gold/10' : 'bg-dusty-rose/10'
        }`}>
          <ClassIcon size={24} color={isUnlocked ? '#a27937' : '#a39695'} />
        </div>
        <div>
          <h2
            id={`class-heading-${classId}`}
            className={`text-xl font-heading font-medium ${isUnlocked ? 'text-ice-white' : 'text-dusty-rose'}`}
          >
            {levelCopy.names[classId]}
          </h2>
          <p className="text-sm text-dusty-rose">
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
            isRedeemed={redeemedIds.includes(reward.id)}
          />
        ))}
      </div>
    </section>
  )
}

// Versão para fundo claro
function ClassSectionLight({ classId, rewards, userPoints, userLevelId, onActivate, redeemedIds }) {
  const classRewards = rewards.filter(r => r.requiredLevelId === classId)
  if (classRewards.length === 0) return null

  const isUnlocked = userLevelId >= classId
  const ClassIcon = getClassIcon(classId)

  return (
    <section className="mb-16" aria-labelledby={`class-heading-light-${classId}`}>
      {/* Class Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isUnlocked ? 'bg-antique-gold/15' : 'bg-graphite/10'
        }`}>
          <ClassIcon size={24} color={isUnlocked ? '#a27937' : '#a39695'} />
        </div>
        <div>
          <h2
            id={`class-heading-light-${classId}`}
            className={`text-xl font-heading font-medium ${isUnlocked ? 'text-deep-purple' : 'text-graphite/60'}`}
          >
            {levelCopy.names[classId]}
          </h2>
          <p className="text-sm text-graphite/70">
            {classRewards.length} {classRewards.length === 1 ? 'experiência' : 'experiências'}
            {!isUnlocked && ' • Bloqueado'}
          </p>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classRewards.map(reward => (
          <ExperienceCardLight
            key={reward.id}
            reward={reward}
            userPoints={userPoints}
            userLevelId={userLevelId}
            onActivate={onActivate}
            isRedeemed={redeemedIds.includes(reward.id)}
          />
        ))}
      </div>
    </section>
  )
}

// Card de experiência para fundo claro - COM FOTO
function ExperienceCardLight({ reward, userPoints, userLevelId, onActivate, isRedeemed, triggerRef }) {
  const canRedeem = reward.canRedeem && !isRedeemed
  const isUnlockedByLevel = reward.isUnlockedByLevel
  const progress = reward.progress

  const getButtonText = () => {
    if (isRedeemed) return 'Resgatada'
    if (canRedeem) return 'Resgatar'
    return `Faltam ${format.pointsShort(reward.pointsNeeded)}`
  }

  const getLockedAriaLabel = () => {
    return `Requer a classe ${levelCopy.names[reward.requiredLevelId]}`
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        isRedeemed
          ? 'border-game-green/30 bg-game-green/5'
          : !isUnlockedByLevel
          ? 'border-graphite/20 bg-white'
          : canRedeem
          ? 'border-antique-gold/30 bg-white hover:shadow-lg shadow-sm'
          : 'border-graphite/10 bg-white hover:shadow-md shadow-sm'
      }`}
    >
      {/* Imagem com overlay */}
      <div className={`relative h-36 overflow-hidden ${!isUnlockedByLevel ? 'grayscale' : ''}`}>
        {reward.image && (
          <img
            src={reward.image}
            alt={reward.name}
            className="w-full h-full object-cover"
          />
        )}
        {/* Overlay escuro para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-deep-purple/80 via-deep-purple/40 to-transparent" />

        {/* Badges sobre a imagem */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="flex gap-2">
            {reward.badge && !isRedeemed && (
              <span className={`text-[10px] px-2 py-1 rounded-lg border backdrop-blur-sm ${badgeConfig[reward.badge].color}`}>
                {badgeConfig[reward.badge].label}
              </span>
            )}
            {reward.isDream && (
              <span className="text-[10px] px-2 py-1 rounded-lg bg-antique-gold/90 text-deep-purple font-medium">
                Sonho
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-ice-white/80 bg-deep-purple/60 backdrop-blur-sm px-2 py-1 rounded-lg">
            {levelCopy.names[reward.requiredLevelId]}
          </span>
        </div>

        {/* Redeemed Badge */}
        {isRedeemed && (
          <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-game-green/90 border border-game-green/30">
            <span className="text-xs text-white font-medium">Resgatada</span>
          </div>
        )}
      </div>

      {/* Locked Overlay - mais legível */}
      {!isUnlockedByLevel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm z-10">
          <div className="text-center p-4">
            <span className="text-xs text-graphite mb-1 block">Disponível em</span>
            <span className="text-base font-heading font-semibold text-deep-purple">{levelCopy.names[reward.requiredLevelId]}</span>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Content */}
        <h3 className={`text-lg font-heading font-medium mb-1 ${
          isRedeemed ? 'text-game-green' : canRedeem ? 'text-deep-purple' : 'text-graphite'
        }`}>
          {reward.name}
        </h3>
        {reward.subtitle && (
          <p className="text-sm text-graphite/70 mb-1">{reward.subtitle}</p>
        )}
        <p className="text-sm text-graphite/60 mb-4 leading-relaxed line-clamp-2">
          {reward.description}
        </p>

        {/* Progress Bar */}
        {isUnlockedByLevel && !canRedeem && !isRedeemed && (
          <div className="mb-4">
            <div
              className="h-1.5 bg-graphite/10 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso para ${reward.name}: ${progress}%`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full bg-antique-gold rounded-full"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-graphite/60">{progress}% concluído</span>
              <span className="text-[10px] text-antique-gold">
                {format.pointsShort(reward.pointsNeeded)} restantes
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xl font-display font-light ${
              isRedeemed ? 'text-game-green' : canRedeem ? 'text-antique-gold' : 'text-graphite/70'
            }`}>
              {format.pointsShort(reward.points_required)}
            </span>
            <span className="text-xs text-graphite/60 ml-1">pontos</span>
          </div>

          {/* Botão para cards desbloqueados */}
          {isUnlockedByLevel && (
            <motion.button
              ref={canRedeem ? triggerRef : undefined}
              whileHover={canRedeem ? { scale: 1.02 } : {}}
              whileTap={canRedeem ? { scale: 0.98 } : {}}
              onClick={() => canRedeem && onActivate(reward)}
              disabled={!canRedeem}
              aria-label={
                isRedeemed
                  ? `${reward.name} já resgatada`
                  : canRedeem
                  ? `Resgatar ${reward.name} por ${format.pointsShort(reward.points_required)} pontos`
                  : `Faltam ${format.pointsShort(reward.pointsNeeded)} pontos para ${reward.name}`
              }
              className={`px-5 py-2.5 rounded-xl text-sm font-heading font-medium transition-all ${
                isRedeemed
                  ? 'bg-game-green/10 text-game-green cursor-default'
                  : canRedeem
                  ? 'bg-deep-purple text-ice-white hover:bg-bright-purple'
                  : 'bg-graphite/10 text-graphite/60 cursor-not-allowed'
              }`}
            >
              {getButtonText()}
            </motion.button>
          )}

          {/* Botão para cards bloqueados por nível */}
          {!isUnlockedByLevel && (
            <button
              disabled
              aria-label={getLockedAriaLabel()}
              className="px-5 py-2.5 rounded-xl text-sm font-heading font-medium bg-graphite/10 text-graphite/60 cursor-not-allowed"
            >
              {levelCopy.names[reward.requiredLevelId]}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function Rewards() {
  const { user, loading } = useAuth()
  const { points: userPoints, resgatar, redeemedIds, isLoading: contextLoading } = usePoints()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('all')
  const [selectedReward, setSelectedReward] = useState(null)
  const [isRedeeming, setIsRedeeming] = useState(false)

  // Ref para devolver foco após fechar modal (Bug 5)
  const triggerButtonRef = useRef(null)

  const levelData = calculateLevel(userPoints)
  const userLevelId = levelData.current.id
  const rewardsWithProgress = calculateRewardsProgress(userPoints, userLevelId)

  const availableCount = rewardsWithProgress.filter(r => r.canRedeem && !redeemedIds.includes(r.id)).length
  const ClassIcon = getClassIcon(userLevelId)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  // Handler para iniciar resgate (abre modal)
  const handleActivate = useCallback((reward) => {
    if (!reward.isUnlockedByLevel) {
      toast.error(`Disponível a partir da ${levelCopy.names[reward.requiredLevelId]}`, {
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
    // Abre modal de confirmação
    setSelectedReward(reward)
  }, [userPoints])

  // Handler para fechar modal
  function closeModal() {
    setSelectedReward(null)
    setIsRedeeming(false)
  }

  // Handler para confirmar resgate - INTEGRAÇÃO REAL COM SUPABASE
  async function handleConfirmRedeem() {
    // Prevenir duplo clique
    if (!selectedReward || isRedeeming) return

    // Verificar saldo ANTES de processar (validação extra de segurança)
    if (userPoints < selectedReward.points_required) {
      toast.error('Saldo insuficiente para este resgate.', {
        style: { background: '#32113f', color: '#edf0f1', border: '1px solid rgba(239, 68, 68, 0.3)' }
      })
      return
    }

    setIsRedeeming(true)

    try {
      // Chamar serviço REAL de resgate (debita no Supabase)
      const result = await resgatar(
        selectedReward.id,
        selectedReward.name,
        selectedReward.points_required
      )

      if (!result.success) {
        // Erro do serviço - mostrar mensagem e FECHAR modal
        toast.error(result.error || 'Erro ao resgatar.', {
          style: { background: '#32113f', color: '#edf0f1', border: '1px solid rgba(239, 68, 68, 0.3)' }
        })
        closeModal()
        return
      }

      // Guardar nome antes de fechar
      const rewardName = selectedReward.name

      // FECHAR MODAL PRIMEIRO
      closeModal()

      // Depois mostrar toast de sucesso
      toast.success(
        <div>
          <strong>Experiência resgatada!</strong>
          <div className="text-sm opacity-80">{rewardName}</div>
        </div>,
        {
          duration: 4000,
          style: { background: '#32113f', color: '#edf0f1', border: '1px solid rgba(34, 197, 94, 0.3)' }
        }
      )
    } catch (error) {
      // Em caso de erro de rede/API, mostrar mensagem e FECHAR modal
      console.error('Erro no resgate:', error)
      toast.error('Erro ao resgatar. Tente novamente.', {
        style: { background: '#32113f', color: '#edf0f1', border: '1px solid rgba(239, 68, 68, 0.3)' }
      })
      closeModal()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-purple">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-dusty-rose/30 border-t-antique-gold rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  const displayRewards = viewMode === 'available'
    ? rewardsWithProgress.filter(r => r.canRedeem && !redeemedIds.includes(r.id))
    : rewardsWithProgress

  return (
    <div className="min-h-screen">
      {/* Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-antique-gold focus:text-deep-purple focus:rounded-lg focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>

      <DashboardHeader />

      {/* Modal de confirmação */}
      <AnimatePresence>
        {selectedReward && (
          <RedeemModal
            reward={selectedReward}
            userPoints={userPoints}
            onConfirm={handleConfirmRedeem}
            onCancel={closeModal}
            isLoading={isRedeeming}
          />
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO ESCURA - Hero com imagem (destaque visual)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-deep-purple pt-8 pb-10">
        <div className="container-premium">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-dusty-rose hover:text-antique-gold transition-colors"
            >
              ← Voltar ao clube
            </Link>
          </motion.div>

          {/* Hero Banner com imagem */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-antique-gold/20"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Conteúdo */}
              <div className="relative flex-1 bg-gradient-to-br from-deep-purple to-deep-purple/90 p-6 lg:p-8">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -top-24 -left-24 w-48 h-48 bg-antique-gold/5 rounded-full blur-3xl" />
                </div>

                <div className="relative">
                  <span className="inline-block text-xs font-heading uppercase tracking-[0.2em] text-antique-gold mb-2">
                    Catálogo
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-display font-semibold text-ice-white mb-3">
                    Experiências do Clube
                  </h1>
                  <p className="text-dusty-rose max-w-md mb-6">
                    Privilégios exclusivos selecionados para membros. Resgate com seus pontos.
                  </p>

                  {/* Stats inline */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ClassIcon size={18} color="#a27937" />
                        <span className="text-lg font-heading font-medium text-ice-white">{levelCopy.names[userLevelId]}</span>
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60">sua classe</p>
                    </div>

                    <div className="w-px h-10 bg-dusty-rose/20" aria-hidden="true" />

                    <div>
                      <p className="text-2xl font-display font-bold text-antique-gold">{format.pointsShort(userPoints)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60">pontos</p>
                    </div>

                    <div className="w-px h-10 bg-dusty-rose/20" aria-hidden="true" />

                    <div>
                      <p className="text-2xl font-display font-bold text-game-green">{availableCount}</p>
                      <p className="text-[10px] uppercase tracking-wider text-dusty-rose/60">disponíveis</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imagem (desktop only) */}
              <div className="hidden lg:block relative w-[35%] min-h-[220px]">
                <img
                  src={HERO_IMAGE}
                  alt="Resort de luxo"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-deep-purple via-deep-purple/50 to-transparent" />

                {/* Frase aspiracional */}
                <div className="absolute bottom-6 right-6 left-6 text-right">
                  <p className="text-lg font-display font-light text-ice-white/90 leading-tight">
                    Transforme pontos em{' '}
                    <span className="text-antique-gold">memórias.</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO CLARA - Filtros e catálogo (área de leitura)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-ice-white py-10">
        <main id="main-content" className="container-premium">
          {/* View Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between mb-8"
          >
            <p className="text-sm text-graphite/70">
              {rewardsTable.length} experiências no catálogo
            </p>
            <div
              className="flex items-center gap-1 p-1 rounded-xl bg-white border border-graphite/10 shadow-sm"
              role="group"
              aria-label="Filtrar experiências"
            >
              <button
                onClick={() => setViewMode('all')}
                aria-pressed={viewMode === 'all'}
                className={`px-4 py-2 rounded-lg text-sm font-heading transition-all ${
                  viewMode === 'all'
                    ? 'bg-deep-purple text-ice-white'
                    : 'text-graphite/70 hover:text-deep-purple'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setViewMode('available')}
                aria-pressed={viewMode === 'available'}
                className={`px-4 py-2 rounded-lg text-sm font-heading transition-all ${
                  viewMode === 'available'
                    ? 'bg-deep-purple text-ice-white'
                    : 'text-graphite/70 hover:text-deep-purple'
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
                <ClassSectionLight
                  key={classId}
                  classId={classId}
                  rewards={rewardsWithProgress}
                  userPoints={userPoints}
                  userLevelId={userLevelId}
                  onActivate={handleActivate}
                  redeemedIds={redeemedIds}
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
                      <ExperienceCardLight
                        key={reward.id}
                        reward={reward}
                        userPoints={userPoints}
                        userLevelId={userLevelId}
                        onActivate={handleActivate}
                        isRedeemed={redeemedIds.includes(reward.id)}
                        triggerRef={triggerButtonRef}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-deep-purple/10 flex items-center justify-center mx-auto mb-4">
                    <GiftIcon size={32} color="#a39695" />
                  </div>
                  <h3 className="text-lg font-heading text-deep-purple mb-2">Nenhuma experiência disponível</h3>
                  <p className="text-sm text-graphite/70 mb-6">
                    Continue ganhando pontos para desbloquear experiências.
                  </p>
                  <Link
                    to="/dashboard"
                    className="inline-block px-6 py-3 rounded-xl bg-deep-purple text-ice-white font-heading font-medium text-sm hover:bg-bright-purple transition-colors"
                  >
                    Voltar ao clube
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </main>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO ESCURA - Progresso da jornada (destaque visual)
          ══════════════════════════════════════════════════════════════ */}
      {levelData.next && (
        <section className="bg-deep-purple py-10">
          <div className="container-premium">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-8 rounded-2xl bg-deep-purple/50 border border-dusty-rose/20"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-dusty-rose mb-2">
                    Próxima classe
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    {(() => {
                      const NextIcon = getClassIcon(levelData.next.id)
                      return <NextIcon size={24} color="#a27937" />
                    })()}
                    <span className="text-xl font-heading text-ice-white">{levelCopy.names[levelData.next.id]}</span>
                  </div>
                  <div
                    className="h-1 bg-dusty-rose/10 rounded-full overflow-hidden max-w-md"
                    role="progressbar"
                    aria-valuenow={levelData.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progresso para ${levelCopy.names[levelData.next.id]}: ${levelData.progress}%`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${levelData.progress}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-antique-gold rounded-full"
                    />
                  </div>
                  <p className="text-sm text-dusty-rose mt-3">
                    <span className="text-antique-gold">{format.pointsShort(levelData.pointsToNext)}</span> pontos para desbloquear novas experiências
                  </p>
                </div>

                <div className="lg:text-right">
                  <Link
                    to="/dashboard"
                    className="inline-block px-6 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-medium text-sm hover:bg-accent-light transition-colors"
                  >
                    Continuar jornada
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  )
}
