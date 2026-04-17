// Sistema de Leaderboard Avançado - Meup Club
// Ranking semanal e geral com dinâmicas

// Ranking Geral (All-time)
export const mockLeaderboardAllTime = [
  {
    id: '1',
    name: 'Marina Silva',
    avatar: 'M',
    points: 48750,
    level: 'Aristocrata',
    referrals: 89,
    trend: 'stable', // hot, up, down, stable
    weeklyChange: 0
  },
  {
    id: '2',
    name: 'Ricardo Lima',
    avatar: 'R',
    points: 42300,
    level: 'Aristocrata',
    referrals: 76,
    trend: 'up',
    weeklyChange: 2
  },
  {
    id: '3',
    name: 'Fernanda Costa',
    avatar: 'F',
    points: 38920,
    level: 'Aristocrata',
    referrals: 71,
    trend: 'down',
    weeklyChange: -1
  },
  {
    id: '4',
    name: 'Bruno Martins',
    avatar: 'B',
    points: 31450,
    level: 'Aristocrata',
    referrals: 58,
    trend: 'up',
    weeklyChange: 3
  },
  {
    id: '5',
    name: 'Carolina Torres',
    avatar: 'C',
    points: 28100,
    level: 'Aristocrata',
    referrals: 52,
    trend: 'stable',
    weeklyChange: 0
  },
  {
    id: '6',
    name: 'Lucas Pereira',
    avatar: 'L',
    points: 24500,
    level: 'Elite',
    referrals: 45,
    trend: 'hot',
    weeklyChange: 5
  },
  {
    id: '7',
    name: 'Juliana Rocha',
    avatar: 'J',
    points: 19800,
    level: 'Elite',
    referrals: 36,
    trend: 'down',
    weeklyChange: -2
  },
  {
    id: '8',
    name: 'André Fernandes',
    avatar: 'A',
    points: 15200,
    level: 'Elite',
    referrals: 28,
    trend: 'up',
    weeklyChange: 1
  },
  {
    id: 'current',
    name: 'Você',
    avatar: 'V',
    points: 10940,
    level: 'Elite',
    referrals: 20,
    trend: 'hot',
    weeklyChange: 4,
    isCurrentUser: true
  },
  {
    id: '10',
    name: 'Patrícia Gomes',
    avatar: 'P',
    points: 9900,
    level: 'Elite',
    referrals: 18,
    trend: 'down',
    weeklyChange: -1
  },
  {
    id: '11',
    name: 'Marcos Oliveira',
    avatar: 'M',
    points: 8500,
    level: 'Elite',
    referrals: 16,
    trend: 'stable',
    weeklyChange: 0
  },
  {
    id: '12',
    name: 'Camila Santos',
    avatar: 'C',
    points: 7200,
    level: 'Navegador',
    referrals: 14,
    trend: 'up',
    weeklyChange: 2
  },
  {
    id: '13',
    name: 'Diego Almeida',
    avatar: 'D',
    points: 6100,
    level: 'Navegador',
    referrals: 12,
    trend: 'stable',
    weeklyChange: 0
  },
  {
    id: '14',
    name: 'Beatriz Nunes',
    avatar: 'B',
    points: 5400,
    level: 'Navegador',
    referrals: 10,
    trend: 'down',
    weeklyChange: -3
  },
  {
    id: '15',
    name: 'Thiago Ribeiro',
    avatar: 'T',
    points: 4800,
    level: 'Navegador',
    referrals: 9,
    trend: 'up',
    weeklyChange: 1
  }
]

// Ranking Semanal (Reseta toda segunda)
export const mockLeaderboardWeekly = [
  {
    id: '6',
    name: 'Lucas Pereira',
    avatar: 'L',
    points: 2450,
    level: 'Elite',
    referrals: 8,
    trend: 'hot',
    weeklyChange: 0
  },
  {
    id: 'current',
    name: 'Você',
    avatar: 'V',
    points: 1890,
    level: 'Elite',
    referrals: 6,
    trend: 'hot',
    weeklyChange: 0,
    isCurrentUser: true
  },
  {
    id: '4',
    name: 'Bruno Martins',
    avatar: 'B',
    points: 1650,
    level: 'Aristocrata',
    referrals: 5,
    trend: 'up',
    weeklyChange: 0
  },
  {
    id: '2',
    name: 'Ricardo Lima',
    avatar: 'R',
    points: 1420,
    level: 'Aristocrata',
    referrals: 4,
    trend: 'stable',
    weeklyChange: 0
  },
  {
    id: '8',
    name: 'André Fernandes',
    avatar: 'A',
    points: 1180,
    level: 'Elite',
    referrals: 4,
    trend: 'up',
    weeklyChange: 0
  },
  {
    id: '12',
    name: 'Camila Santos',
    avatar: 'C',
    points: 980,
    level: 'Navegador',
    referrals: 3,
    trend: 'hot',
    weeklyChange: 0
  },
  {
    id: '1',
    name: 'Marina Silva',
    avatar: 'M',
    points: 850,
    level: 'Aristocrata',
    referrals: 3,
    trend: 'down',
    weeklyChange: 0
  },
  {
    id: '15',
    name: 'Thiago Ribeiro',
    avatar: 'T',
    points: 720,
    level: 'Navegador',
    referrals: 2,
    trend: 'up',
    weeklyChange: 0
  },
  {
    id: '5',
    name: 'Carolina Torres',
    avatar: 'C',
    points: 650,
    level: 'Aristocrata',
    referrals: 2,
    trend: 'stable',
    weeklyChange: 0
  },
  {
    id: '3',
    name: 'Fernanda Costa',
    avatar: 'F',
    points: 580,
    level: 'Aristocrata',
    referrals: 2,
    trend: 'down',
    weeklyChange: 0
  }
]

// Configuração de trends
export const trendConfig = {
  hot: { label: 'Em alta', icon: '🔥', color: 'text-orange-400' },
  up: { label: 'Subindo', icon: '⬆️', color: 'text-green-400' },
  down: { label: 'Caiu', icon: '⬇️', color: 'text-red-400' },
  stable: { label: 'Estável', icon: '➡️', color: 'text-neutral-400' }
}

// Obter ranking com posição do usuário
export function getLeaderboard(type = 'allTime') {
  const data = type === 'weekly' ? mockLeaderboardWeekly : mockLeaderboardAllTime

  return data.map((user, index) => ({
    ...user,
    position: index + 1
  }))
}

// Obter posição do usuário atual
export function getCurrentUserPosition(type = 'allTime') {
  const data = type === 'weekly' ? mockLeaderboardWeekly : mockLeaderboardAllTime
  const index = data.findIndex(u => u.isCurrentUser)
  return index !== -1 ? index + 1 : null
}

// Obter top 3 para pódio
export function getTopThree(type = 'allTime') {
  const data = getLeaderboard(type)
  return data.slice(0, 3)
}

// Obter usuários após top 3
export function getRankingList(type = 'allTime') {
  const data = getLeaderboard(type)
  return data.slice(3)
}

// Estatísticas do leaderboard
export function getLeaderboardStats(type = 'allTime') {
  const data = getLeaderboard(type)
  const currentUser = data.find(u => u.isCurrentUser)

  return {
    totalUsers: 2847, // Total de membros
    currentPosition: currentUser?.position || 0,
    pointsToNextRank: currentUser ? (data[currentUser.position - 2]?.points || 0) - currentUser.points : 0,
    weeklyReset: getNextMondayDate()
  }
}

function getNextMondayDate() {
  const now = new Date()
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)
  return nextMonday.toISOString()
}
