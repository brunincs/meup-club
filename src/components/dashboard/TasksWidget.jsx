import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchTarefas, fetchStatusSolicitacoes } from '@/services/experienciasService'
import { getMissionAction, shouldHideFromList } from '@/services/missionActions'
import { format } from '@/services/copy'
import { TargetIcon, CheckIcon } from '@/components/ui/Icons'

export function TasksWidget() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tarefas, setTarefas] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  // Carregar tarefas reais do banco
  useEffect(() => {
    async function loadData() {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const tarefasResult = await fetchTarefas(false)
        if (tarefasResult.success) {
          setTarefas(tarefasResult.tarefas)
        }

        const statusResult = await fetchStatusSolicitacoes(user.id)
        if (statusResult.success) {
          setStatusMap(statusResult.statusMap)
        }
      } catch (error) {
        console.error('Erro ao carregar tarefas:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  // Processar tarefas
  const processedTasks = useMemo(() => {
    return tarefas
      .filter(tarefa => {
        const nomeLower = tarefa.nome.toLowerCase()
        // Esconder check-in, semanais e missões marcadas
        if (tarefa.tipo === 'semanal') return false
        if (nomeLower.includes('check-in') || nomeLower.includes('checkin')) return false
        if (shouldHideFromList(tarefa.nome)) return false
        return true
      })
      .map(tarefa => ({
        ...tarefa,
        name: tarefa.nome,
        description: tarefa.descricao,
        points: tarefa.pontos,
        completed: statusMap[tarefa.id] === 'aprovada'
      }))
  }, [tarefas, statusMap])

  // Calcular totais
  const stats = useMemo(() => {
    const completed = processedTasks.filter(t => t.completed).length
    const total = processedTasks.length
    const earnedPoints = processedTasks.filter(t => t.completed).reduce((sum, t) => sum + t.points, 0)
    return { completed, total, earnedPoints }
  }, [processedTasks])

  function handleTaskClick(task) {
    const action = getMissionAction(task.name)
    if (action?.route) {
      navigate(action.route)
    } else {
      navigate('/tarefas')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-dusty-rose/20 bg-deep-purple/30 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-dusty-rose/10 rounded w-24" />
          <div className="h-8 bg-dusty-rose/10 rounded" />
          <div className="h-8 bg-dusty-rose/10 rounded" />
        </div>
      </div>
    )
  }

  // Se não há tarefas, não mostra o widget
  if (processedTasks.length === 0) {
    return null
  }

  // Filtrar apenas tarefas únicas NÃO concluídas para mostrar
  const tasksToShow = processedTasks
    .filter(t => !t.completed && t.tipo === 'unica')
    .slice(0, 3)

  // Se todas foram concluídas, não mostra
  if (tasksToShow.length === 0) {
    return null
  }

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
              <TargetIcon size={14} color="#a27937" />
              Missões
            </h3>
            <p className="text-sm text-dusty-rose">
              {stats.completed}/{stats.total} concluídas
            </p>
          </div>
          <Link
            to="/tarefas"
            className="text-xs text-dusty-rose hover:text-antique-gold transition-colors"
          >
            Ver todas →
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 py-3 border-b border-dusty-rose/20">
        <div className="h-1 bg-dusty-rose/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-antique-gold rounded-full"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-dusty-rose/60">Progresso</span>
          <span className="text-[10px] text-game-green">
            +{format.pointsShort(stats.earnedPoints)} pontos
          </span>
        </div>
      </div>

      {/* Missions list */}
      <div className="divide-y divide-dusty-rose/10">
        {tasksToShow.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 * index }}
            onClick={() => handleTaskClick(task)}
            className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-deep-purple/30 transition-colors"
          >
            {/* Status */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-deep-purple/50 flex items-center justify-center text-sm text-antique-gold border border-antique-gold/20">
                ◇
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-heading text-ice-white">
                {task.name}
              </div>
              <p className="text-xs text-dusty-rose/60 truncate">{task.description}</p>
            </div>

            {/* Points */}
            <div className="text-xs font-display font-light text-antique-gold">
              +{task.points}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <Link to="/tarefas">
        <div className="px-5 py-4 border-t border-dusty-rose/20 hover:bg-deep-purple/50 transition-colors">
          <p className="text-center text-xs text-dusty-rose">
            Ver todas as conquistas
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
