import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MissionCard, MissionCardMini } from './MissionCard'
import { ProgressRing } from '@/components/effects/ProgressRing'
import { useConfetti } from '@/components/effects/ConfettiEffect'
import { TargetIcon } from '@/components/ui/Icons'
import toast from 'react-hot-toast'

// Importa da fonte única de dados
import {
  tasksConfig,
  mockUserTasksProgress
} from '@/services/tasksData'

// Seleciona missões em destaque para o dashboard
// (uma de cada categoria para mostrar variedade)
function getFeaturedMissions() {
  const featured = {
    // Ação rápida: compartilhar código
    share: {
      ...tasksConfig.daily.find(t => t.id === 'daily_share'),
      progress: mockUserTasksProgress.daily_share?.completed ? 100 : 0
    },
    // Meta semanal: indicar 2 pessoas
    referral: {
      ...tasksConfig.weekly.find(t => t.id === 'weekly_2_referrals'),
      progress: mockUserTasksProgress.weekly_2_referrals?.completed
        ? 100
        : ((mockUserTasksProgress.weekly_2_referrals?.progress || 0) / 2) * 100
    },
    // Conquista: primeira venda
    convert: {
      ...tasksConfig.oneTime.find(t => t.id === 'onetime_first_sale'),
      progress: mockUserTasksProgress.onetime_first_sale?.completed ? 100 : 75
    }
  }
  return featured
}

// Tarefas rápidas para o widget
function getQuickTasks() {
  return [
    {
      ...tasksConfig.daily.find(t => t.id === 'daily_view_rewards'),
      progress: mockUserTasksProgress.daily_view_rewards?.completed ? 100 : 0
    },
    {
      ...tasksConfig.oneTime.find(t => t.id === 'onetime_complete_profile'),
      progress: mockUserTasksProgress.onetime_complete_profile?.completed ? 100 : 0
    }
  ]
}

export function MissionsSection({ variant = 'dark' }) {
  const [missions, setMissions] = useState(getFeaturedMissions)
  const [tasks, setTasks] = useState(getQuickTasks)
  const { fire: fireConfetti, ConfettiComponent } = useConfetti()

  const isLight = variant === 'light'

  // Calcula progresso total
  const allMissions = Object.values(missions)
  const completedMissions = allMissions.filter(m => m.progress >= 100).length
  const totalMissions = allMissions.length
  const missionsProgress = (completedMissions / totalMissions) * 100

  // Pontos disponíveis/ganhos
  const totalPoints = allMissions.reduce((sum, m) => sum + m.points, 0) + tasks.reduce((sum, t) => sum + t.points, 0)
  const earnedPoints = allMissions.filter(m => m.progress >= 100).reduce((sum, m) => sum + m.points, 0) +
    tasks.filter(t => t.progress >= 100).reduce((sum, t) => sum + t.points, 0)

  const handleStartMission = (mission) => {
    toast.success(`Missão "${mission.name}" iniciada!`, {
      style: {
        background: '#32113f',
        color: '#edf0f1',
        border: '1px solid rgba(162, 121, 55, 0.3)'
      }
    })
  }

  const handleClaimMission = (mission) => {
    fireConfetti({ x: '50%', y: '50%' })
    toast.success(`+${mission.points} pontos resgatados!`, {
      style: {
        background: '#32113f',
        color: '#edf0f1',
        border: '1px solid rgba(34, 197, 94, 0.3)'
      }
    })

    setMissions(prev => {
      const key = Object.keys(prev).find(k => prev[k].id === mission.id)
      if (key) {
        return { ...prev, [key]: { ...prev[key], progress: 0 } }
      }
      return prev
    })
  }

  const handleTaskClick = (task) => {
    if (task.progress < 100) {
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id ? { ...t, progress: 100 } : t
        )
      )
      toast.success(`+${task.points} pontos!`, {
        style: {
          background: '#32113f',
          color: '#edf0f1',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      <ConfettiComponent />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-display font-semibold flex items-center gap-2 ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
            <TargetIcon size={20} color="#a27937" />
            Missões
          </h2>
          <p className={`text-sm ${isLight ? 'text-graphite/70' : 'text-dusty-rose'}`}>
            Ganhe pontos completando desafios
          </p>
        </div>

        {/* Progress Ring */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-xs ${isLight ? 'text-graphite/60' : 'text-dusty-rose'}`}>Progresso</p>
            <p className="text-sm font-heading font-semibold text-game-green">
              +{earnedPoints}/{totalPoints}
            </p>
          </div>
          <ProgressRing
            progress={missionsProgress}
            size={48}
            strokeWidth={4}
            color="#22c55e"
            bgColor={isLight ? "rgba(50, 17, 63, 0.1)" : "rgba(163, 150, 149, 0.1)"}
          >
            <span className={`text-[10px] font-heading font-semibold ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
              {completedMissions}/{totalMissions}
            </span>
          </ProgressRing>
        </div>
      </div>

      {/* Main Missions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compartilhar */}
        <div className="lg:col-span-1">
          <MissionCard
            mission={missions.share}
            type="action"
            variant={variant}
            onStart={handleStartMission}
            onClaim={handleClaimMission}
          />
        </div>

        {/* Indicar */}
        <div className="lg:col-span-1">
          <MissionCard
            mission={missions.referral}
            type="weekly"
            variant={variant}
            onStart={handleStartMission}
            onClaim={handleClaimMission}
          />
        </div>

        {/* Converter */}
        <div className="lg:col-span-1">
          <MissionCard
            mission={missions.convert}
            type="special"
            variant={variant}
            onStart={handleStartMission}
            onClaim={handleClaimMission}
          />
        </div>
      </div>

      {/* Quick Tasks */}
      <div className={`p-5 rounded-xl border ${isLight ? 'bg-white border-graphite/10 shadow-sm' : 'bg-deep-purple/30 border-dusty-rose/20'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-heading font-medium ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
            Tarefas Rápidas
          </h3>
          <Link
            to="/missoes"
            className={`text-xs ${isLight ? 'text-antique-gold hover:text-deep-purple' : 'text-antique-gold hover:text-ice-white'} transition-colors`}
          >
            Ver todas →
          </Link>
        </div>

        <div className="space-y-2">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <MissionCardMini
                mission={task}
                variant={variant}
                onClick={() => handleTaskClick(task)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
