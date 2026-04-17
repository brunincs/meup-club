// Sistema de Engajamento - Meup Club
// Loop viciante de retorno diário e competição

import { levels, calculateLevel } from './pointsSystem'

// ============================================
// CONFIGURAÇÃO DE STREAK
// ============================================
export const streakConfig = {
  // Bônus por dias consecutivos
  bonuses: [
    { days: 3, points: 50, label: '3 dias', icon: '🔥' },
    { days: 7, points: 150, label: '1 semana', icon: '⚡' },
    { days: 14, points: 350, label: '2 semanas', icon: '💫' },
    { days: 30, points: 1000, label: '1 mês', icon: '👑' },
    { days: 60, points: 2500, label: '2 meses', icon: '💎' },
    { days: 90, points: 5000, label: '3 meses', icon: '🏆' }
  ],
  // Pontos diários por acesso
  dailyAccessPoints: 10,
  // Multiplicador de streak (% extra por dia)
  streakMultiplier: 0.02 // 2% por dia de streak
}

// ============================================
// TASKS DE ENGAJAMENTO DIÁRIO
// ============================================
export const dailyEngagementTasks = [
  {
    id: 'daily_access',
    name: 'Acesso diário',
    description: 'Entre no dashboard todos os dias',
    points: 10,
    icon: '📱',
    autoComplete: true // Completa automaticamente ao acessar
  },
  {
    id: 'share_code',
    name: 'Compartilhar código',
    description: 'Compartilhe seu código de indicação',
    points: 20,
    icon: '📤',
    autoComplete: false
  },
  {
    id: 'check_rewards',
    name: 'Ver recompensas',
    description: 'Confira a vitrine de recompensas',
    points: 5,
    icon: '🎁',
    autoComplete: false
  },
  {
    id: 'check_ranking',
    name: 'Ver ranking',
    description: 'Confira sua posição no ranking',
    points: 5,
    icon: '🏆',
    autoComplete: false
  }
]

// ============================================
// PRÊMIOS DO RANKING SEMANAL
// ============================================
export const weeklyRankingPrizes = [
  { position: 1, points: 500, badge: '🥇', title: 'Campeão da Semana' },
  { position: 2, points: 300, badge: '🥈', title: 'Vice-Campeão' },
  { position: 3, points: 150, badge: '🥉', title: 'Terceiro Lugar' },
  { position: 4, points: 75, title: 'Top 5' },
  { position: 5, points: 75, title: 'Top 5' },
  { position: 10, points: 50, title: 'Top 10' } // posições 6-10
]

// ============================================
// NOTIFICAÇÕES DE PROVA SOCIAL
// ============================================
export const socialProofTypes = [
  { type: 'redeem', template: '{name} resgatou {reward}', icon: '🎁' },
  { type: 'level_up', template: '{name} subiu para {level}', icon: '⬆️' },
  { type: 'streak', template: '{name} completou {days} dias de streak', icon: '🔥' },
  { type: 'ranking', template: '{name} entrou no Top 10', icon: '🏆' },
  { type: 'referral', template: '{name} fez uma nova indicação', icon: '👥' }
]

// Mock de notificações sociais recentes
export const recentSocialProof = [
  { type: 'redeem', name: 'Marina S.', reward: 'Crédito Prata', time: '2 min' },
  { type: 'level_up', name: 'Pedro L.', level: 'Explorador', time: '5 min' },
  { type: 'streak', name: 'Ana C.', days: 7, time: '10 min' },
  { type: 'ranking', name: 'Lucas M.', time: '15 min' },
  { type: 'referral', name: 'Julia R.', time: '20 min' },
  { type: 'redeem', name: 'Carlos B.', reward: 'Upgrade de Assento', time: '25 min' },
  { type: 'level_up', name: 'Fernanda P.', level: 'Navegador', time: '30 min' },
  { type: 'streak', name: 'Ricardo S.', days: 14, time: '35 min' },
  { type: 'redeem', name: 'Beatriz M.', reward: 'Jantar Premium', time: '40 min' },
  { type: 'ranking', name: 'Gabriel O.', time: '45 min' }
]

// ============================================
// MOCK DE DADOS DO USUÁRIO
// ============================================
export const mockUserEngagement = {
  streak: {
    current: 5,
    best: 12,
    lastAccess: new Date().toISOString(),
    todayAccessed: true
  },
  dailyTasksCompleted: ['daily_access'],
  weeklyPoints: 450,
  weeklyPosition: 8,
  totalDaysActive: 23
}

// ============================================
// MOCK DO RANKING (posições próximas)
// ============================================
export const mockNearbyRanking = [
  { position: 5, name: 'Marina Silva', points: 2850, levelId: 3, trend: 'up', avatar: 'M' },
  { position: 6, name: 'Pedro Lima', points: 2720, levelId: 3, trend: 'same', avatar: 'P' },
  { position: 7, name: 'Ana Costa', points: 2650, levelId: 2, trend: 'down', avatar: 'A' },
  // Usuário atual seria aqui (posição 8)
  { position: 9, name: 'Lucas Martins', points: 2480, levelId: 2, trend: 'up', avatar: 'L' },
  { position: 10, name: 'Julia Rocha', points: 2350, levelId: 2, trend: 'same', avatar: 'J' }
]

// ============================================
// FUNÇÕES DE CÁLCULO
// ============================================

/**
 * Calcula pontos necessários para próximo nível
 */
export function getPointsToNextLevel(userPoints) {
  const levelData = calculateLevel(userPoints)
  if (!levelData.next) {
    return { hasNext: false, pointsNeeded: 0, nextLevel: null }
  }
  return {
    hasNext: true,
    pointsNeeded: levelData.pointsToNext,
    nextLevel: levelData.next,
    progress: levelData.progress
  }
}

/**
 * Calcula pontos necessários para ultrapassar próximo no ranking
 */
export function getPointsToOvertake(userPoints, userPosition) {
  // Encontrar quem está acima
  const aboveUser = mockNearbyRanking.find(r => r.position === userPosition - 1)

  if (!aboveUser || userPosition <= 1) {
    return { hasAbove: false, pointsNeeded: 0, userAbove: null }
  }

  return {
    hasAbove: true,
    pointsNeeded: aboveUser.points - userPoints + 1, // +1 para ultrapassar
    userAbove: aboveUser
  }
}

/**
 * Calcula bônus de streak atual
 */
export function getStreakBonus(streakDays) {
  let totalBonus = 0
  let nextMilestone = null

  for (const bonus of streakConfig.bonuses) {
    if (streakDays >= bonus.days) {
      totalBonus += bonus.points
    } else if (!nextMilestone) {
      nextMilestone = {
        ...bonus,
        daysRemaining: bonus.days - streakDays
      }
    }
  }

  // Multiplicador de pontos pelo streak
  const multiplier = 1 + (streakDays * streakConfig.streakMultiplier)

  return {
    totalBonus,
    multiplier: Math.min(multiplier, 2), // Max 2x
    nextMilestone,
    currentStreak: streakDays
  }
}

/**
 * Verifica e atualiza streak do usuário
 */
export function checkAndUpdateStreak(lastAccess, currentStreak) {
  const now = new Date()
  const last = new Date(lastAccess)

  // Reset para meia-noite
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate())

  const diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Mesmo dia, mantém streak
    return { streak: currentStreak, broken: false, newDay: false }
  } else if (diffDays === 1) {
    // Dia seguinte, incrementa streak
    return { streak: currentStreak + 1, broken: false, newDay: true }
  } else {
    // Mais de 1 dia, quebra streak
    return { streak: 1, broken: true, newDay: true }
  }
}

/**
 * Obtém tasks diárias com status
 */
export function getDailyEngagementTasksWithStatus(completedIds = []) {
  return dailyEngagementTasks.map(task => ({
    ...task,
    completed: completedIds.includes(task.id)
  }))
}

/**
 * Calcula pontos totais das tasks diárias
 */
export function calculateDailyTasksPoints(completedIds = []) {
  const tasks = getDailyEngagementTasksWithStatus(completedIds)
  const earned = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.points, 0)
  const total = tasks.reduce((sum, t) => sum + t.points, 0)

  return {
    earned,
    total,
    remaining: total - earned,
    progress: Math.round((earned / total) * 100)
  }
}

/**
 * Obtém prêmio do ranking semanal por posição
 */
export function getWeeklyPrize(position) {
  if (position <= 3) {
    return weeklyRankingPrizes.find(p => p.position === position)
  } else if (position <= 5) {
    return weeklyRankingPrizes.find(p => p.position === 4)
  } else if (position <= 10) {
    return weeklyRankingPrizes.find(p => p.position === 10)
  }
  return null
}

/**
 * Calcula tempo até reset semanal
 */
export function getTimeToWeeklyReset() {
  const now = new Date()
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7))
  nextMonday.setHours(0, 0, 0, 0)

  const diff = nextMonday.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  return { days, hours, total: diff }
}

/**
 * Gera notificação social aleatória
 */
export function getRandomSocialProof() {
  const index = Math.floor(Math.random() * recentSocialProof.length)
  const proof = recentSocialProof[index]
  const type = socialProofTypes.find(t => t.type === proof.type)

  let message = type.template
  message = message.replace('{name}', proof.name)
  if (proof.reward) message = message.replace('{reward}', proof.reward)
  if (proof.level) message = message.replace('{level}', proof.level)
  if (proof.days) message = message.replace('{days}', proof.days)

  return {
    ...proof,
    message,
    icon: type.icon
  }
}

/**
 * Obtém motivação baseada no contexto
 */
export function getMotivationalMessage(context) {
  const messages = {
    closeToLevel: [
      'Você está quase lá! 💪',
      'Só mais um pouco para o próximo nível!',
      'Continue assim, você consegue!'
    ],
    closeToOvertake: [
      'Você pode ultrapassar agora!',
      'Uma indicação e você sobe no ranking!',
      'Está muito próximo do próximo lugar!'
    ],
    streak: [
      'Mantenha sua sequência! 🔥',
      'Não quebre seu streak!',
      'Você está arrasando!'
    ],
    general: [
      'Cada ponto conta!',
      'Suba no ranking hoje!',
      'Novas recompensas te esperam!'
    ]
  }

  const contextMessages = messages[context] || messages.general
  return contextMessages[Math.floor(Math.random() * contextMessages.length)]
}
