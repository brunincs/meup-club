// Sistema de Tasks - Meup Club
// Tasks diárias, semanais e únicas para engajamento

export const tasksConfig = {
  // Tasks Diárias - Resetam todo dia
  daily: [
    {
      id: 'daily_login',
      name: 'Check-in diário',
      description: 'Acesse o dashboard hoje',
      points: 10,
      icon: '📱',
      autoComplete: true // Completa ao acessar
    },
    {
      id: 'daily_share',
      name: 'Compartilhar código',
      description: 'Compartilhe seu código de indicação',
      points: 20,
      icon: '📤',
      action: 'share'
    },
    {
      id: 'daily_view_rewards',
      name: 'Explorar recompensas',
      description: 'Visite a vitrine de recompensas',
      points: 5,
      icon: '🎁',
      action: 'visit_rewards'
    }
  ],

  // Tasks Semanais - Resetam toda segunda
  weekly: [
    {
      id: 'weekly_2_referrals',
      name: 'Indicar 2 pessoas',
      description: 'Faça 2 novas indicações esta semana',
      points: 150,
      icon: '👥',
      target: 2,
      type: 'referral'
    },
    {
      id: 'weekly_1_sale',
      name: 'Converter 1 venda',
      description: 'Tenha 1 indicação aprovada',
      points: 300,
      icon: '✅',
      target: 1,
      type: 'sale'
    },
    {
      id: 'weekly_streak',
      name: 'Sequência de 5 dias',
      description: 'Acesse o app por 5 dias seguidos',
      points: 100,
      icon: '🔥',
      target: 5,
      type: 'streak'
    },
    {
      id: 'weekly_share_3',
      name: 'Compartilhar 3 vezes',
      description: 'Compartilhe seu código 3 vezes',
      points: 75,
      icon: '📣',
      target: 3,
      type: 'share'
    }
  ],

  // Tasks Únicas - Completar apenas uma vez
  oneTime: [
    {
      id: 'onetime_complete_profile',
      name: 'Completar perfil',
      description: 'Preencha todas as informações do perfil',
      points: 50,
      icon: '👤'
    },
    {
      id: 'onetime_google_review',
      name: 'Avaliar no Google',
      description: 'Deixe uma avaliação 5 estrelas',
      points: 100,
      icon: '⭐'
    },
    {
      id: 'onetime_first_referral',
      name: 'Primeira indicação',
      description: 'Faça sua primeira indicação',
      points: 100,
      icon: '🎯'
    },
    {
      id: 'onetime_first_sale',
      name: 'Primeira venda',
      description: 'Tenha sua primeira indicação aprovada',
      points: 200,
      icon: '🏆'
    },
    {
      id: 'onetime_5_referrals',
      name: '5 indicações',
      description: 'Alcance 5 indicações totais',
      points: 250,
      icon: '🚀'
    },
    {
      id: 'onetime_10_referrals',
      name: '10 indicações',
      description: 'Alcance 10 indicações totais',
      points: 500,
      icon: '💎'
    },
    {
      id: 'onetime_level_explorer',
      name: 'Nível Explorador',
      description: 'Alcance o nível Explorador',
      points: 100,
      icon: '🧭'
    },
    {
      id: 'onetime_level_navigator',
      name: 'Nível Navegador',
      description: 'Alcance o nível Navegador',
      points: 200,
      icon: '🚀'
    },
    {
      id: 'onetime_level_elite',
      name: 'Nível Elite',
      description: 'Alcance o nível Elite',
      points: 500,
      icon: '⭐'
    }
  ]
}

// Mock do progresso do usuário nas tasks
export const mockUserTasksProgress = {
  // Diárias
  daily_login: { completed: true, completedAt: new Date().toISOString() },
  daily_share: { completed: false },
  daily_view_rewards: { completed: true, completedAt: new Date().toISOString() },

  // Semanais
  weekly_2_referrals: { completed: false, progress: 1 },
  weekly_1_sale: { completed: true, progress: 1, completedAt: '2024-01-28T10:00:00Z' },
  weekly_streak: { completed: false, progress: 3 },
  weekly_share_3: { completed: false, progress: 2 },

  // Únicas
  onetime_complete_profile: { completed: true, completedAt: '2024-01-10T10:00:00Z' },
  onetime_google_review: { completed: false },
  onetime_first_referral: { completed: true, completedAt: '2024-01-15T10:30:00Z' },
  onetime_first_sale: { completed: true, completedAt: '2024-01-15T14:00:00Z' },
  onetime_5_referrals: { completed: true, completedAt: '2024-01-25T16:00:00Z' },
  onetime_10_referrals: { completed: false, progress: 6 },
  onetime_level_explorer: { completed: true, completedAt: '2024-01-12T10:00:00Z' },
  onetime_level_navigator: { completed: true, completedAt: '2024-01-20T10:00:00Z' },
  onetime_level_elite: { completed: true, completedAt: '2024-01-28T10:00:00Z' }
}

// Calcular tasks com status
export function getTasksWithStatus(category) {
  const tasks = tasksConfig[category] || []

  return tasks.map(task => {
    const progress = mockUserTasksProgress[task.id] || { completed: false }

    return {
      ...task,
      category,
      completed: progress.completed,
      completedAt: progress.completedAt,
      progress: progress.progress || 0,
      target: task.target || 1
    }
  })
}

// Calcular total de pontos de tasks
export function calculateTasksPoints() {
  let earned = 0
  let available = 0

  Object.entries(tasksConfig).forEach(([category, tasks]) => {
    tasks.forEach(task => {
      const progress = mockUserTasksProgress[task.id]
      if (progress?.completed) {
        earned += task.points
      } else {
        available += task.points
      }
    })
  })

  return { earned, available, total: earned + available }
}

// Obter resumo de tasks
export function getTasksSummary() {
  const daily = getTasksWithStatus('daily')
  const weekly = getTasksWithStatus('weekly')
  const oneTime = getTasksWithStatus('oneTime')

  return {
    daily: {
      total: daily.length,
      completed: daily.filter(t => t.completed).length,
      points: daily.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
    },
    weekly: {
      total: weekly.length,
      completed: weekly.filter(t => t.completed).length,
      points: weekly.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
    },
    oneTime: {
      total: oneTime.length,
      completed: oneTime.filter(t => t.completed).length,
      points: oneTime.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0)
    }
  }
}
