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
  avatarColor: 'neutral',

  // Status do perfil
  profileComplete: true,
  emailVerified: true,
  phoneVerified: false
}

// Breakdown de pontuação
export function getPointsBreakdown(userPoints = 10940) {
  const tasksPoints = calculateTasksPoints()

  // Distribuição de benefícios
  const referralPoints = Math.floor(userPoints * 0.75) // 75% indicações
  const missionsPoints = tasksPoints.earned
  const classBonus = Math.floor(userPoints * 0.10) // 10% bônus de classe
  const rankingBonus = Math.floor(userPoints * 0.05) // 5% bônus de posição

  // Ajustar para o total bater
  const calculated = referralPoints + missionsPoints + classBonus + rankingBonus
  const adjustment = userPoints - calculated

  return {
    total: userPoints,
    breakdown: [
      {
        id: 'referrals',
        label: 'Indicações',
        description: 'Indicações aprovadas',
        points: referralPoints + adjustment,
        percentage: Math.round(((referralPoints + adjustment) / userPoints) * 100),
        icon: '◆'
      },
      {
        id: 'missions',
        label: 'Missões',
        description: 'Missões concluídas',
        points: missionsPoints,
        percentage: Math.round((missionsPoints / userPoints) * 100),
        icon: '◇'
      },
      {
        id: 'classBonus',
        label: 'Bônus de Classe',
        description: 'Multiplicador da sua classe',
        points: classBonus,
        percentage: Math.round((classBonus / userPoints) * 100),
        icon: '✦'
      },
      {
        id: 'rankingBonus',
        label: 'Bônus de Posição',
        description: 'Benefício por posição no clube',
        points: rankingBonus,
        percentage: Math.round((rankingBonus / userPoints) * 100),
        icon: '▲'
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
      missionsCompleted: 12
    },
    ranking: {
      currentPosition: getCurrentUserPosition('allTime'),
      weeklyPosition: getCurrentUserPosition('weekly'),
      bestPosition: 5,
      bestPositionDate: '2024-01-20'
    }
  }
}

// Conquistas/Marcos da Jornada
export const mockAchievements = [
  {
    id: 'first_steps',
    name: 'Embarque',
    description: 'Primeiro acesso ao clube',
    icon: '✈',
    earnedAt: '2024-01-01T10:00:00Z',
    unlocked: true
  },
  {
    id: 'first_referral',
    name: 'Primeira Indicação',
    description: 'Convidou um viajante',
    icon: '◇',
    earnedAt: '2024-01-15T10:30:00Z',
    unlocked: true
  },
  {
    id: 'first_sale',
    name: 'Conexão',
    description: 'Primeira indicação aprovada',
    icon: '◆',
    earnedAt: '2024-01-15T14:00:00Z',
    unlocked: true
  },
  {
    id: 'streak_7',
    name: 'Consistência',
    description: '7 dias consecutivos',
    icon: '○',
    earnedAt: '2024-01-22T10:00:00Z',
    unlocked: true
  },
  {
    id: 'level_business',
    name: 'Executiva',
    description: 'Alcançou Classe Executiva',
    icon: '✦',
    earnedAt: '2024-01-28T10:00:00Z',
    unlocked: true
  },
  {
    id: 'top_10',
    name: 'Destaque',
    description: 'Top 10 do clube',
    icon: '▲',
    earnedAt: '2024-01-25T16:00:00Z',
    unlocked: true
  },
  {
    id: 'referrals_10',
    name: 'Influência',
    description: '10 indicações totais',
    icon: '◈',
    unlocked: false,
    progress: 6,
    target: 10
  },
  {
    id: 'streak_30',
    name: 'Dedicação',
    description: '30 dias consecutivos',
    icon: '❖',
    unlocked: false,
    progress: 7,
    target: 30
  },
  {
    id: 'level_exclusive',
    name: 'Exclusive',
    description: 'Meup Exclusive',
    icon: '◆',
    unlocked: false
  }
]

// Histórico de atividades recentes (Timeline da jornada)
export const mockActivityHistory = [
  { type: 'mission', description: 'Acesso ao clube', points: 10, date: new Date().toISOString() },
  { type: 'referral', description: 'Indicação: Fernanda L.', points: 20, date: '2024-01-30T08:30:00Z' },
  { type: 'approved', description: 'Aprovada: Carlos M.', points: 3600, date: '2024-01-28T11:00:00Z' },
  { type: 'levelUp', description: 'Classe Executiva', points: 0, date: '2024-01-28T10:00:00Z' },
  { type: 'achievement', description: 'Marco: Destaque', points: 0, date: '2024-01-25T16:00:00Z' },
  { type: 'mission', description: '5 indicações concluídas', points: 250, date: '2024-01-25T16:00:00Z' },
  { type: 'approved', description: 'Aprovada: Ana O.', points: 2210, date: '2024-01-25T16:45:00Z' },
]
