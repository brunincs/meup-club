// Serviço de Dados Administrativos - Meup Club
// Gerenciamento completo do sistema

import { levels, rewardsTable } from './pointsSystem'

// ============================================
// MOCK DE USUÁRIOS
// ============================================
export const mockUsers = [
  { id: '1', name: 'Marina Silva', email: 'marina@email.com', points: 2850, levelId: 3, referrals: 12, joinDate: '2024-01-15', status: 'active' },
  { id: '2', name: 'Pedro Lima', email: 'pedro@email.com', points: 2720, levelId: 3, referrals: 10, joinDate: '2024-02-01', status: 'active' },
  { id: '3', name: 'Ana Costa', email: 'ana@email.com', points: 2650, levelId: 2, referrals: 8, joinDate: '2024-01-20', status: 'active' },
  { id: '4', name: 'Lucas Martins', email: 'lucas@email.com', points: 2480, levelId: 2, referrals: 9, joinDate: '2024-02-10', status: 'active' },
  { id: '5', name: 'Julia Rocha', email: 'julia@email.com', points: 2350, levelId: 2, referrals: 7, joinDate: '2024-01-25', status: 'active' },
  { id: '6', name: 'Carlos Souza', email: 'carlos@email.com', points: 1800, levelId: 2, referrals: 5, joinDate: '2024-03-01', status: 'active' },
  { id: '7', name: 'Fernanda Oliveira', email: 'fernanda@email.com', points: 1200, levelId: 2, referrals: 4, joinDate: '2024-03-10', status: 'active' },
  { id: '8', name: 'Ricardo Santos', email: 'ricardo@email.com', points: 800, levelId: 1, referrals: 3, joinDate: '2024-03-15', status: 'blocked' },
  { id: '9', name: 'Beatriz Mendes', email: 'beatriz@email.com', points: 450, levelId: 1, referrals: 2, joinDate: '2024-03-20', status: 'active' },
  { id: '10', name: 'Gabriel Alves', email: 'gabriel@email.com', points: 200, levelId: 1, referrals: 1, joinDate: '2024-04-01', status: 'active' }
]

// ============================================
// MOCK DE INDICAÇÕES
// ============================================
export const mockReferralsAdmin = [
  { id: '1', clientName: 'João Paulo Silva', referrerId: '1', referrerName: 'Marina Silva', status: 'pending', date: '2024-04-10', value: null, profit: null },
  { id: '2', clientName: 'Maria Fernanda Costa', referrerId: '2', referrerName: 'Pedro Lima', status: 'pending', date: '2024-04-09', value: null, profit: null },
  { id: '3', clientName: 'Roberto Almeida', referrerId: '1', referrerName: 'Marina Silva', status: 'approved', date: '2024-04-05', value: 5000, profit: 500 },
  { id: '4', clientName: 'Camila Santos', referrerId: '3', referrerName: 'Ana Costa', status: 'approved', date: '2024-04-03', value: 3500, profit: 350 },
  { id: '5', clientName: 'Felipe Rodrigues', referrerId: '4', referrerName: 'Lucas Martins', status: 'rejected', date: '2024-04-01', value: null, profit: null },
  { id: '6', clientName: 'Larissa Mendes', referrerId: '2', referrerName: 'Pedro Lima', status: 'approved', date: '2024-03-28', value: 8000, profit: 800 },
  { id: '7', clientName: 'Bruno Oliveira', referrerId: '5', referrerName: 'Julia Rocha', status: 'pending', date: '2024-04-11', value: null, profit: null },
  { id: '8', clientName: 'Patrícia Lima', referrerId: '1', referrerName: 'Marina Silva', status: 'approved', date: '2024-03-25', value: 4500, profit: 450 }
]

// ============================================
// MOCK DE VENDAS
// ============================================
export const mockSales = [
  { id: '1', clientName: 'Roberto Almeida', referralId: '3', referrerId: '1', referrerName: 'Marina Silva', value: 5000, profit: 500, pointsGenerated: 500, date: '2024-04-05' },
  { id: '2', clientName: 'Camila Santos', referralId: '4', referrerId: '3', referrerName: 'Ana Costa', value: 3500, profit: 350, pointsGenerated: 350, date: '2024-04-03' },
  { id: '3', clientName: 'Larissa Mendes', referralId: '6', referrerId: '2', referrerName: 'Pedro Lima', value: 8000, profit: 800, pointsGenerated: 800, date: '2024-03-28' },
  { id: '4', clientName: 'Patrícia Lima', referralId: '8', referrerId: '1', referrerName: 'Marina Silva', value: 4500, profit: 450, pointsGenerated: 450, date: '2024-03-25' }
]

// ============================================
// MOCK DE TASKS PENDENTES
// ============================================
export const mockPendingTasks = [
  { id: '1', userId: '1', userName: 'Marina Silva', taskType: 'share_social', taskName: 'Compartilhar nas redes', points: 30, date: '2024-04-10', status: 'pending' },
  { id: '2', userId: '3', userName: 'Ana Costa', taskType: 'review_trip', taskName: 'Avaliar viagem', points: 75, date: '2024-04-09', status: 'pending' },
  { id: '3', userId: '5', userName: 'Julia Rocha', taskType: 'share_social', taskName: 'Compartilhar nas redes', points: 30, date: '2024-04-08', status: 'pending' },
  { id: '4', userId: '2', userName: 'Pedro Lima', taskType: 'review_trip', taskName: 'Avaliar viagem', points: 75, date: '2024-04-07', status: 'approved' },
  { id: '5', userId: '4', userName: 'Lucas Martins', taskType: 'share_social', taskName: 'Compartilhar nas redes', points: 30, date: '2024-04-06', status: 'rejected' }
]

// ============================================
// MOCK DE RECOMPENSAS (editável)
// ============================================
export const mockRewardsAdmin = rewardsTable.map(r => ({
  ...r,
  isActive: true,
  redemptions: Math.floor(Math.random() * 20),
  lastEdited: '2024-04-01'
}))

// ============================================
// ESTATÍSTICAS GERAIS
// ============================================
export function getAdminStats() {
  const totalUsers = mockUsers.length
  const activeUsers = mockUsers.filter(u => u.status === 'active').length
  const totalReferrals = mockReferralsAdmin.length
  const pendingReferrals = mockReferralsAdmin.filter(r => r.status === 'pending').length
  const approvedReferrals = mockReferralsAdmin.filter(r => r.status === 'approved').length
  const totalSales = mockSales.length
  const totalSalesValue = mockSales.reduce((sum, s) => sum + s.value, 0)
  const totalProfit = mockSales.reduce((sum, s) => sum + s.profit, 0)
  const totalPointsDistributed = mockUsers.reduce((sum, u) => sum + u.points, 0)
  const pendingTasks = mockPendingTasks.filter(t => t.status === 'pending').length

  return {
    totalUsers,
    activeUsers,
    totalReferrals,
    pendingReferrals,
    approvedReferrals,
    totalSales,
    totalSalesValue,
    totalProfit,
    totalPointsDistributed,
    pendingTasks
  }
}

// ============================================
// TOP USUÁRIOS
// ============================================
export function getTopUsers(limit = 5) {
  return [...mockUsers]
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map(u => ({
      ...u,
      levelName: levels.find(l => l.id === u.levelId)?.name || 'Iniciante'
    }))
}

// ============================================
// FUNÇÕES DE INDICAÇÕES
// ============================================
export function getPendingReferrals() {
  return mockReferralsAdmin.filter(r => r.status === 'pending')
}

export function getAllReferrals() {
  return mockReferralsAdmin
}

export function approveReferral(referralId, saleValue, profit) {
  const referral = mockReferralsAdmin.find(r => r.id === referralId)
  if (referral) {
    referral.status = 'approved'
    referral.value = saleValue
    referral.profit = profit

    // Adicionar pontos ao usuário
    const user = mockUsers.find(u => u.id === referral.referrerId)
    if (user) {
      user.points += profit // 1 real de lucro = 1 ponto
    }

    // Registrar venda
    mockSales.push({
      id: String(mockSales.length + 1),
      clientName: referral.clientName,
      referralId: referral.id,
      referrerId: referral.referrerId,
      referrerName: referral.referrerName,
      value: saleValue,
      profit: profit,
      pointsGenerated: profit,
      date: new Date().toISOString().split('T')[0]
    })

    return true
  }
  return false
}

export function rejectReferral(referralId) {
  const referral = mockReferralsAdmin.find(r => r.id === referralId)
  if (referral) {
    referral.status = 'rejected'
    return true
  }
  return false
}

// ============================================
// FUNÇÕES DE VENDAS
// ============================================
export function getAllSales() {
  return mockSales
}

export function registerSale(clientName, referralCode, saleValue, profit) {
  // Encontrar usuário pelo código (simplificado - usando nome)
  const user = mockUsers.find(u => u.name.toLowerCase().includes(referralCode.toLowerCase()))

  if (!user) {
    return { success: false, message: 'Código de indicação não encontrado' }
  }

  // Criar indicação
  const newReferral = {
    id: String(mockReferralsAdmin.length + 1),
    clientName,
    referrerId: user.id,
    referrerName: user.name,
    status: 'approved',
    date: new Date().toISOString().split('T')[0],
    value: saleValue,
    profit: profit
  }
  mockReferralsAdmin.push(newReferral)

  // Adicionar pontos
  user.points += profit
  user.referrals += 1

  // Registrar venda
  mockSales.push({
    id: String(mockSales.length + 1),
    clientName,
    referralId: newReferral.id,
    referrerId: user.id,
    referrerName: user.name,
    value: saleValue,
    profit: profit,
    pointsGenerated: profit,
    date: new Date().toISOString().split('T')[0]
  })

  return { success: true, message: 'Venda registrada com sucesso', pointsAdded: profit }
}

// ============================================
// FUNÇÕES DE USUÁRIOS
// ============================================
export function getAllUsers() {
  return mockUsers.map(u => ({
    ...u,
    levelName: levels.find(l => l.id === u.levelId)?.name || 'Iniciante'
  }))
}

export function updateUserPoints(userId, newPoints) {
  const user = mockUsers.find(u => u.id === userId)
  if (user) {
    const diff = newPoints - user.points
    user.points = newPoints
    // Recalcular nível
    for (let i = levels.length - 1; i >= 0; i--) {
      if (newPoints >= levels[i].minPoints) {
        user.levelId = levels[i].id
        break
      }
    }
    return { success: true, diff }
  }
  return { success: false }
}

export function toggleUserStatus(userId) {
  const user = mockUsers.find(u => u.id === userId)
  if (user) {
    user.status = user.status === 'active' ? 'blocked' : 'active'
    return true
  }
  return false
}

// ============================================
// FUNÇÕES DE TASKS
// ============================================
export function getPendingTasksAdmin() {
  return mockPendingTasks.filter(t => t.status === 'pending')
}

export function getAllTasksAdmin() {
  return mockPendingTasks
}

export function approveTask(taskId) {
  const task = mockPendingTasks.find(t => t.id === taskId)
  if (task) {
    task.status = 'approved'
    // Adicionar pontos ao usuário
    const user = mockUsers.find(u => u.id === task.userId)
    if (user) {
      user.points += task.points
    }
    return true
  }
  return false
}

export function rejectTask(taskId) {
  const task = mockPendingTasks.find(t => t.id === taskId)
  if (task) {
    task.status = 'rejected'
    return true
  }
  return false
}

// ============================================
// FUNÇÕES DE RECOMPENSAS
// ============================================
export function getAllRewardsAdmin() {
  return mockRewardsAdmin
}

export function toggleRewardStatus(rewardId) {
  const reward = mockRewardsAdmin.find(r => r.id === rewardId)
  if (reward) {
    reward.isActive = !reward.isActive
    reward.lastEdited = new Date().toISOString().split('T')[0]
    return true
  }
  return false
}

export function updateReward(rewardId, updates) {
  const reward = mockRewardsAdmin.find(r => r.id === rewardId)
  if (reward) {
    Object.assign(reward, updates)
    reward.lastEdited = new Date().toISOString().split('T')[0]
    return true
  }
  return false
}
