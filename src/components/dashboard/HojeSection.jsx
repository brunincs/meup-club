// ============================================
// SEÇÃO "HOJE" - O que eu faço hoje?
// Check-in + até 2 missões pendentes
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePoints } from '@/contexts/PointsContext'
import { useConfetti } from '@/components/effects/ConfettiEffect'
import { CalendarIcon, TargetIcon, UserIcon, MessageIcon, InstagramIcon, StarIcon, GiftIcon, CheckIcon, DiamondIcon } from '@/components/ui/Icons'

// Mapeia emojis de missões para ícones SVG
function getMissionIcon(emoji) {
  const iconMap = {
    '👤': UserIcon,
    '💬': MessageIcon,
    '📷': InstagramIcon,
    '📸': InstagramIcon,
    '🌟': StarIcon,
    '⭐': StarIcon,
    '🎁': GiftIcon,
    '✓': CheckIcon,
    '✅': CheckIcon,
    '💎': DiamondIcon,
    '◇': DiamondIcon
  }
  return iconMap[emoji] || null
}
import {
  fetchTarefas,
  fetchStatusSolicitacoes,
  solicitarTarefa,
  verificarSolicitacaoPendente
} from '@/services/experienciasService'
import {
  fazerCheckin,
  podeFazerCheckin,
  registrarVisitaExperiencias
} from '@/services/supabaseData'
import { fetchUserBenefits } from '@/services/subscriptionService'
import { getMissionAction, requiresApproval, shouldHideFromList } from '@/services/missionActions'
import toast from 'react-hot-toast'

export function HojeSection({ variant = 'dark' }) {
  const { user, profile } = useAuth()
  const { refreshPoints } = usePoints()
  const navigate = useNavigate()
  const { fire: fireConfetti, ConfettiComponent } = useConfetti()

  const isDark = variant === 'dark'

  // Estados
  const [tarefas, setTarefas] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadingTaskId, setLoadingTaskId] = useState(null)

  // Check-in
  const [checkinStatus, setCheckinStatus] = useState({
    podeFazer: true,
    isLoading: false
  })
  const [pontosCheckin, setPontosCheckin] = useState(10)
  const [isPrime, setIsPrime] = useState(false)

  // Carregar dados
  useEffect(() => {
    async function loadData() {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const [tarefasResult, statusResult, checkinResult, benefitsResult] = await Promise.all([
          fetchTarefas(false),
          fetchStatusSolicitacoes(user.id),
          podeFazerCheckin(),
          fetchUserBenefits(user.id)
        ])

        if (tarefasResult.success) setTarefas(tarefasResult.tarefas)
        if (statusResult.success) setStatusMap(statusResult.statusMap)

        setCheckinStatus({
          podeFazer: checkinResult.pode_fazer,
          isLoading: false
        })

        if (benefitsResult.success) {
          setPontosCheckin(benefitsResult.benefits.pontosCheckin || 10)
          setIsPrime(benefitsResult.benefits.isPrime || false)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  // Missões pendentes (máximo 2)
  const pendingMissions = useMemo(() => {
    return tarefas
      .filter(t => {
        const nomeLower = t.nome.toLowerCase()
        if (t.tipo === 'semanal') return false
        if (nomeLower.includes('check-in') || nomeLower.includes('checkin')) return false
        if (shouldHideFromList(t.nome)) return false
        const status = statusMap[t.id]
        // Não mostrar concluídas nem em análise
        if (status === 'aprovada' || status === 'pendente') return false
        return true
      })
      .slice(0, 2)
  }, [tarefas, statusMap])

  // Handler check-in
  const handleCheckin = useCallback(async () => {
    if (!user?.id || !checkinStatus.podeFazer || checkinStatus.isLoading) return

    setCheckinStatus(prev => ({ ...prev, isLoading: true }))

    try {
      const result = await fazerCheckin()

      if (result.success) {
        await refreshPoints()
        fireConfetti({ x: '50%', y: '30%' })
        toast.success(`Check-in feito: +${result.pontos} pontos!`, {
          duration: 3000,
          style: { background: '#32113f', color: '#edf0f1' }
        })
        setCheckinStatus({ podeFazer: false, isLoading: false })
      } else if (result.error === 'already_checked_in') {
        setCheckinStatus({ podeFazer: false, isLoading: false })
        toast('Volte amanhã!', { icon: '⏰', style: { background: '#32113f', color: '#edf0f1' } })
      } else {
        setCheckinStatus(prev => ({ ...prev, isLoading: false }))
        toast.error(result.message || 'Erro ao fazer check-in')
      }
    } catch (error) {
      console.error('Erro no check-in:', error)
      toast.error('Erro ao fazer check-in')
      setCheckinStatus(prev => ({ ...prev, isLoading: false }))
    }
  }, [user, checkinStatus, fireConfetti, refreshPoints])

  // Handler missão
  const handleMission = useCallback(async (mission) => {
    const action = getMissionAction(mission.nome)

    if (requiresApproval(mission.nome)) {
      // Solicitar aprovação
      setLoadingTaskId(mission.id)
      try {
        const check = await verificarSolicitacaoPendente(user.id, mission.id)
        if (check.pendente) {
          toast('Já está em análise', { icon: '⏳', style: { background: '#32113f', color: '#edf0f1' } })
          setStatusMap(prev => ({ ...prev, [mission.id]: 'pendente' }))
          return
        }

        const result = await solicitarTarefa(user.id, mission.id)
        if (result.success) {
          setStatusMap(prev => ({ ...prev, [mission.id]: 'pendente' }))
          toast.success('Solicitação enviada!', { style: { background: '#32113f', color: '#edf0f1' } })
        }
      } finally {
        setLoadingTaskId(null)
      }
    } else if (action?.type === 'external') {
      window.open(action.route, '_blank', 'noopener,noreferrer')
    } else if (action?.route === '/recompensas') {
      // Explorar experiências
      if (user?.id) {
        const result = await registrarVisitaExperiencias(user.id)
        if (result.creditou) {
          await refreshPoints()
          fireConfetti({ x: '50%', y: '50%' })
          toast.success(`+${result.pontos} pontos!`, { style: { background: '#32113f', color: '#edf0f1' } })
        }
      }
      navigate(action.route)
    } else if (action?.route) {
      navigate(action.route)
    } else {
      navigate('/tarefas')
    }
  }, [user, navigate, fireConfetti, refreshPoints])

  if (isLoading) {
    return (
      <div className={`rounded-2xl p-6 ${isDark ? 'bg-deep-purple' : 'bg-white border border-nude-rose'}`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-12 rounded-lg ${isDark ? 'bg-dusty-rose/20' : 'bg-graphite/10'}`} />
          <div className={`h-10 rounded-lg ${isDark ? 'bg-dusty-rose/20' : 'bg-graphite/10'}`} />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden ${
        isDark
          ? 'bg-deep-purple border border-antique-gold/20'
          : 'bg-white border border-nude-rose shadow-sm'
      }`}
    >
      <ConfettiComponent />

      {/* Header */}
      <div className={`px-5 py-4 border-b ${isDark ? 'border-dusty-rose/20' : 'border-nude-rose'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TargetIcon size={18} color="#a27937" />
            <h3 className={`text-sm font-heading font-semibold uppercase tracking-wider ${isDark ? 'text-dusty-rose' : 'text-graphite/60'}`}>
              Hoje
            </h3>
          </div>
          <Link
            to="/tarefas"
            className="text-xs text-antique-gold hover:underline"
          >
            Ver todas →
          </Link>
        </div>
      </div>

      {/* Check-in em UMA linha */}
      <div className={`px-5 py-4 border-b ${isDark ? 'border-dusty-rose/20' : 'border-nude-rose'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              checkinStatus.podeFazer
                ? 'bg-antique-gold/20'
                : isDark ? 'bg-dusty-rose/10' : 'bg-graphite/5'
            }`}>
              <CalendarIcon size={20} color={checkinStatus.podeFazer ? '#a27937' : '#a39695'} />
            </div>
            <div>
              <span className={`text-sm font-heading font-medium ${isDark ? 'text-ice-white' : 'text-deep-purple'}`}>
                Check-in
              </span>
              <span className={`text-xs ml-2 ${checkinStatus.podeFazer ? 'text-game-green' : isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}`}>
                +{pontosCheckin} pts
              </span>
            </div>
          </div>

          <button
            onClick={handleCheckin}
            disabled={!checkinStatus.podeFazer || checkinStatus.isLoading}
            className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold transition-all ${
              checkinStatus.podeFazer
                ? 'bg-antique-gold text-deep-purple hover:bg-accent-light'
                : isDark
                  ? 'bg-dusty-rose/10 text-dusty-rose/40 cursor-not-allowed'
                  : 'bg-graphite/5 text-graphite/40 cursor-not-allowed'
            }`}
          >
            {checkinStatus.isLoading ? '...' : checkinStatus.podeFazer ? 'Fazer check-in' : 'Volte amanhã'}
          </button>
        </div>
      </div>

      {/* Missões pendentes (máx 2) */}
      {pendingMissions.length > 0 && (
        <div className="divide-y divide-dusty-rose/10">
          {pendingMissions.map((mission) => (
            <div
              key={mission.id}
              className={`px-5 py-4 flex items-center justify-between cursor-pointer transition-colors ${
                isDark ? 'hover:bg-dusty-rose/5' : 'hover:bg-ice-white'
              }`}
              onClick={() => handleMission(mission)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  isDark ? 'bg-antique-gold/10 text-antique-gold' : 'bg-antique-gold/10 text-antique-gold'
                }`}>
                  {(() => {
                    const IconComponent = getMissionIcon(mission.icone)
                    if (IconComponent) {
                      return <IconComponent size={16} color="#a27937" />
                    }
                    return <DiamondIcon size={16} color="#a27937" />
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-heading truncate block ${isDark ? 'text-ice-white' : 'text-deep-purple'}`}>
                    {mission.nome}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-heading text-game-green">+{mission.pontos}</span>
                {loadingTaskId === mission.id ? (
                  <div className="w-4 h-4 border-2 border-antique-gold border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className={`text-xs ${isDark ? 'text-dusty-rose' : 'text-graphite/50'}`}>→</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Se não houver missões pendentes */}
      {pendingMissions.length === 0 && (
        <div className={`px-5 py-4 text-center ${isDark ? 'text-dusty-rose/60' : 'text-graphite/50'}`}>
          <p className="text-xs">Nenhuma missão pendente</p>
        </div>
      )}
    </motion.div>
  )
}
