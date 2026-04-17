// Dados mock para desenvolvimento
// Integrado com o sistema de pontuação equilibrado

import {
  calculateSalePoints,
  calculateLevel,
  validateExtraPoints,
  calculateRewardsProgress,
  rewardsTable,
  levels,
  extraPointsConfig
} from './pointsSystem'

// Re-exportar para manter compatibilidade
export { levels, rewardsTable as mockRewards }
export { multipliers } from './pointsSystem'

// ============================================
// INDICAÇÕES MOCK (Sem valores financeiros visíveis)
// ============================================
export const mockReferrals = [
  {
    id: '1',
    client_name: 'João Silva',
    points_earned: 890,
    multiplier: 1,
    type: 'padrao',
    status: 'approved',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    client_name: 'Maria Santos',
    points_earned: 3600,
    multiplier: 1.5,
    type: 'internacional',
    status: 'approved',
    created_at: '2024-01-18T14:20:00Z'
  },
  {
    id: '3',
    client_name: 'Pedro Costa',
    points_earned: 640,
    multiplier: 1,
    type: 'padrao',
    status: 'approved',
    created_at: '2024-01-22T09:15:00Z'
  },
  {
    id: '4',
    client_name: 'Ana Oliveira',
    points_earned: 2210,
    multiplier: 1.3,
    type: 'recorrente',
    status: 'approved',
    created_at: '2024-01-25T16:45:00Z'
  },
  {
    id: '5',
    client_name: 'Carlos Mendes',
    points_earned: 3600,
    multiplier: 2,
    type: 'alta_margem',
    status: 'approved',
    created_at: '2024-01-28T11:00:00Z'
  },
  {
    id: '6',
    client_name: 'Fernanda Lima',
    points_earned: 20, // CPA pendente
    multiplier: 1,
    type: 'padrao',
    status: 'pending',
    isPendingCPA: true,
    created_at: '2024-01-30T08:30:00Z'
  }
]

// ============================================
// RANKING MOCK
// ============================================
export const mockRanking = [
  { position: 1, name: 'Marina S.', points: 48750, level: 'Aristocrata' },
  { position: 2, name: 'Ricardo L.', points: 42300, level: 'Aristocrata' },
  { position: 3, name: 'Fernanda C.', points: 28920, level: 'Aristocrata' },
  { position: 4, name: 'Bruno M.', points: 21450, level: 'Aristocrata' },
  { position: 5, name: 'Carolina T.', points: 18100, level: 'Aristocrata' },
  { position: 6, name: 'Lucas P.', points: 14500, level: 'Elite' },
  { position: 7, name: 'Juliana R.', points: 9800, level: 'Elite' },
  { position: 8, name: 'André F.', points: 7200, level: 'Elite' },
  { position: 9, name: 'Usuário Demo', points: 10940, level: 'Elite', isCurrentUser: true },
  { position: 10, name: 'Patrícia G.', points: 5900, level: 'Navegador' },
]

// ============================================
// TASKS DO USUÁRIO
// ============================================
export const mockUserTasks = [
  {
    id: 'complete_profile',
    name: 'Completar perfil',
    points: 50,
    completed: true,
    completedAt: '2024-01-10T10:00:00Z'
  },
  {
    id: 'first_referral',
    name: 'Primeira indicação',
    points: 100,
    completed: true,
    completedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'share_social',
    name: 'Compartilhar nas redes',
    points: 30,
    completed: false,
    available: true
  },
  {
    id: 'invite_5',
    name: 'Convidar 5 amigos',
    points: 150,
    completed: false,
    progress: 3, // 3 de 5
    available: true
  },
  {
    id: 'monthly_active',
    name: 'Ativo no mês',
    points: 50,
    completed: true,
    completedAt: '2024-01-31T23:59:59Z'
  }
]

// ============================================
// HISTÓRICO DE RESGATES
// ============================================
export const mockRedemptions = [
  {
    id: '1',
    reward_id: '1',
    reward_name: 'Crédito Inicial',
    points_used: 600,
    status: 'completed',
    created_at: '2024-01-10T12:00:00Z'
  }
]

// ============================================
// PROVA SOCIAL
// ============================================
export const mockSocialProof = [
  { name: 'Maria S.', action: 'resgatou', reward: 'Crédito Ouro', time: '2 min' },
  { name: 'Carlos M.', action: 'subiu para', reward: 'Nível Elite', time: '5 min' },
  { name: 'Ana L.', action: 'resgatou', reward: 'Upgrade de Assento', time: '12 min' },
  { name: 'Pedro F.', action: 'desbloqueou', reward: 'Jantar Premium', time: '18 min' },
  { name: 'Juliana R.', action: 'resgatou', reward: 'Crédito Bronze', time: '25 min' },
  { name: 'Bruno C.', action: 'subiu para', reward: 'Nível Navegador', time: '32 min' },
  { name: 'Fernanda M.', action: 'completou', reward: '5 indicações', time: '45 min' },
  { name: 'Lucas P.', action: 'resgatou', reward: 'VIP Lounge', time: '1 hora' },
]

// ============================================
// FUNÇÕES DE CÁLCULO
// ============================================

/**
 * Calcula nível baseado em pontos (wrapper para compatibilidade)
 */
export function calculateLevelLegacy(points) {
  const levelData = calculateLevel(points)
  return levelData.current
}

/**
 * Calcula progresso do nível (wrapper para compatibilidade)
 */
export function calculateProgress(points) {
  const levelData = calculateLevel(points)
  return {
    progress: levelData.progress,
    nextLevel: levelData.next,
    pointsToNext: levelData.pointsToNext
  }
}

/**
 * Retorna posição do usuário no ranking
 */
export function getUserPosition(userId) {
  const index = mockRanking.findIndex(r => r.isCurrentUser)
  return index !== -1 ? index + 1 : 9
}

/**
 * Calcula estatísticas do usuário
 */
export function getStats(referrals) {
  const approved = referrals.filter(r => r.status === 'approved')
  const pending = referrals.filter(r => r.status === 'pending')

  // Pontos de vendas (aprovados)
  const salePoints = approved.reduce((sum, r) => sum + r.points_earned, 0)

  // Pontos extras (tasks completadas)
  const completedTasks = mockUserTasks.filter(t => t.completed)
  const taskPoints = completedTasks.reduce((sum, t) => sum + t.points, 0)

  // CPA pendente
  const pendingCPA = pending.filter(r => r.isPendingCPA).length * extraPointsConfig.cpa.points

  // Validar limite de pontos extras
  const extraValidation = validateExtraPoints(salePoints, taskPoints)

  return {
    totalReferrals: referrals.length,
    approvedReferrals: approved.length,
    pendingReferrals: pending.length,
    salePoints,
    taskPoints: extraValidation.adjustedExtra,
    pendingCPA,
    totalPoints: salePoints + extraValidation.adjustedExtra,
    extraPointsExcess: extraValidation.excess,
    isExtraWithinLimit: extraValidation.isValid
  }
}

/**
 * Retorna recompensas com progresso calculado
 */
export function getRewardsWithProgress(userPoints) {
  return calculateRewardsProgress(userPoints)
}

/**
 * Retorna próxima recompensa alcançável
 */
export function getNextReward(userPoints) {
  const rewards = rewardsTable
    .filter(r => r.points_required > userPoints && r.available)
    .sort((a, b) => a.points_required - b.points_required)

  if (rewards.length === 0) return null

  const next = rewards[0]
  return {
    ...next,
    pointsNeeded: next.points_required - userPoints,
    progress: Math.round((userPoints / next.points_required) * 100)
  }
}

/**
 * Calcula média de pontos por indicação
 */
export function getAveragePointsPerReferral(referrals) {
  const approved = referrals.filter(r => r.status === 'approved')
  if (approved.length === 0) return 300 // Default

  const total = approved.reduce((sum, r) => sum + r.points_earned, 0)
  return Math.round(total / approved.length)
}
