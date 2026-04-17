// Sistema de Perfil - Meup Club
// Breakdown de pontuação e estatísticas

import { calculateTasksPoints } from './tasksData'
import { getCurrentUserPosition } from './leaderboardData'
import { mockReferrals } from './mockData'

// Mock de dados do perfil expandido
export const mockProfileData = {
  // Informações básicas
  name: 'Usuário Demo',
  email: 'demo@meupclub.com',
  phone: '(11) 99999-9999',
  joinedAt: '2024-01-01T10:00:00Z',
  referralCode: 'MEUP1234',

  // Foto/Avatar
  avatar: null,
  avatarColor: 'gold',

  // Status do perfil
  profileComplete: true,
  emailVerified: true,
  phoneVerified: false
}

// Breakdown de pontuação
export function getPointsBreakdown(userPoints = 10940) {
  const tasksPoints = calculateTasksPoints()

  // Simulação de distribuição de pontos
  const salesPoints = Math.floor(userPoints * 0.75) // 75% de vendas
  const tasksPointsEarned = tasksPoints.earned
  const bonusPoints = Math.floor(userPoints * 0.10) // 10% bônus de nível
  const rankingPoints = Math.floor(userPoints * 0.05) // 5% bônus de ranking

  // Ajustar para o total bater
  const calculated = salesPoints + tasksPointsEarned + bonusPoints + rankingPoints
  const adjustment = userPoints - calculated

  return {
    total: userPoints,
    breakdown: [
      {
        id: 'sales',
        label: 'Pontos por Vendas',
        description: 'Indicações aprovadas',
        points: salesPoints + adjustment,
        percentage: Math.round(((salesPoints + adjustment) / userPoints) * 100),
        icon: '💰',
        color: 'text-green-400'
      },
      {
        id: 'tasks',
        label: 'Pontos por Tasks',
        description: 'Missões completadas',
        points: tasksPointsEarned,
        percentage: Math.round((tasksPointsEarned / userPoints) * 100),
        icon: '✅',
        color: 'text-blue-400'
      },
      {
        id: 'bonus',
        label: 'Bônus de Nível',
        description: 'Multiplicador do seu nível',
        points: bonusPoints,
        percentage: Math.round((bonusPoints / userPoints) * 100),
        icon: '⭐',
        color: 'text-accent-gold'
      },
      {
        id: 'ranking',
        label: 'Bônus de Ranking',
        description: 'Recompensa por posição',
        points: rankingPoints,
        percentage: Math.round((rankingPoints / userPoints) * 100),
        icon: '🏆',
        color: 'text-purple-400'
      }
    ]
  }
}

// Estatísticas do usuário
export function getUserStatistics() {
  const approvedReferrals = mockReferrals.filter(r => r.status === 'approved')
  const pendingReferrals = mockReferrals.filter(r => r.status === 'pending')

  // Calcular melhor semana (mock)
  const bestWeekPoints = 3600
  const bestWeekDate = '2024-01-22'

  // Clientes únicos
  const uniqueClients = new Set(mockReferrals.map(r => r.client_name)).size

  // Streak atual
  const currentStreak = 7
  const longestStreak = 14

  // Taxa de conversão
  const conversionRate = approvedReferrals.length / mockReferrals.length * 100

  return {
    referrals: {
      total: mockReferrals.length,
      approved: approvedReferrals.length,
      pending: pendingReferrals.length,
      conversionRate: Math.round(conversionRate)
    },
    performance: {
      bestWeekPoints,
      bestWeekDate,
      averagePointsPerReferral: Math.round(
        approvedReferrals.reduce((sum, r) => sum + r.points_earned, 0) / approvedReferrals.length
      ),
      totalClients: uniqueClients
    },
    engagement: {
      currentStreak,
      longestStreak,
      daysActive: 30,
      tasksCompleted: 12
    },
    ranking: {
      currentPosition: getCurrentUserPosition('allTime'),
      weeklyPosition: getCurrentUserPosition('weekly'),
      bestPosition: 5,
      bestPositionDate: '2024-01-20'
    }
  }
}

// Conquistas/Badges
export const mockAchievements = [
  {
    id: 'first_steps',
    name: 'Primeiros Passos',
    description: 'Completou o cadastro',
    icon: '🎯',
    earnedAt: '2024-01-01T10:00:00Z',
    unlocked: true
  },
  {
    id: 'first_referral',
    name: 'Indicador',
    description: 'Fez sua primeira indicação',
    icon: '👥',
    earnedAt: '2024-01-15T10:30:00Z',
    unlocked: true
  },
  {
    id: 'first_sale',
    name: 'Vendedor',
    description: 'Primeira venda aprovada',
    icon: '💰',
    earnedAt: '2024-01-15T14:00:00Z',
    unlocked: true
  },
  {
    id: 'streak_7',
    name: 'Dedicado',
    description: '7 dias seguidos de acesso',
    icon: '🔥',
    earnedAt: '2024-01-22T10:00:00Z',
    unlocked: true
  },
  {
    id: 'level_elite',
    name: 'Elite',
    description: 'Alcançou o nível Elite',
    icon: '⭐',
    earnedAt: '2024-01-28T10:00:00Z',
    unlocked: true
  },
  {
    id: 'top_10',
    name: 'Top 10',
    description: 'Entrou no top 10 do ranking',
    icon: '🏆',
    earnedAt: '2024-01-25T16:00:00Z',
    unlocked: true
  },
  {
    id: 'referrals_10',
    name: 'Influenciador',
    description: '10 indicações totais',
    icon: '📣',
    unlocked: false,
    progress: 6,
    target: 10
  },
  {
    id: 'streak_30',
    name: 'Fanático',
    description: '30 dias seguidos de acesso',
    icon: '💎',
    unlocked: false,
    progress: 7,
    target: 30
  },
  {
    id: 'level_aristocrat',
    name: 'Aristocrata',
    description: 'Alcançou o nível máximo',
    icon: '👑',
    unlocked: false
  }
]

// Histórico de atividades recentes
export const mockActivityHistory = [
  { type: 'task', description: 'Check-in diário', points: 10, date: new Date().toISOString() },
  { type: 'referral', description: 'Nova indicação: Fernanda L.', points: 20, date: '2024-01-30T08:30:00Z' },
  { type: 'sale', description: 'Venda aprovada: Carlos M.', points: 3600, date: '2024-01-28T11:00:00Z' },
  { type: 'level', description: 'Subiu para Elite', points: 0, date: '2024-01-28T10:00:00Z' },
  { type: 'achievement', description: 'Conquistou "Top 10"', points: 0, date: '2024-01-25T16:00:00Z' },
  { type: 'task', description: 'Completou 5 indicações', points: 250, date: '2024-01-25T16:00:00Z' },
  { type: 'sale', description: 'Venda aprovada: Ana O.', points: 2210, date: '2024-01-25T16:45:00Z' },
]
