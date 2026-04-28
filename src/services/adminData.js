// Serviço de Dados Administrativos - Meup Club
// Gerenciamento completo do sistema

import { levels, rewardsTable, calculateSaleCredits, creditsConfig, validateMonthlyWithdrawal } from './pointsSystem'

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
// MOCK DE VENDAS (com novo sistema de créditos)
// ============================================
export const mockSales = [
  { id: '1', clientName: 'Roberto Almeida', clientId: null, referralId: '3', referrerId: '1', referrerName: 'Marina Silva', value: 5000, profit: 500, referrerCredits: 500, buyerCredits: 150, totalCredits: 650, estimatedCost: 32.50, costPercentage: 6.5, date: '2024-04-05' },
  { id: '2', clientName: 'Camila Santos', clientId: null, referralId: '4', referrerId: '3', referrerName: 'Ana Costa', value: 3500, profit: 350, referrerCredits: 350, buyerCredits: 105, totalCredits: 455, estimatedCost: 22.75, costPercentage: 6.5, date: '2024-04-03' },
  { id: '3', clientName: 'Larissa Mendes', clientId: null, referralId: '6', referrerId: '2', referrerName: 'Pedro Lima', value: 8000, profit: 800, referrerCredits: 800, buyerCredits: 240, totalCredits: 1040, estimatedCost: 52.00, costPercentage: 6.5, date: '2024-03-28' },
  { id: '4', clientName: 'Patrícia Lima', clientId: null, referralId: '8', referrerId: '1', referrerName: 'Marina Silva', value: 4500, profit: 450, referrerCredits: 450, buyerCredits: 135, totalCredits: 585, estimatedCost: 29.25, costPercentage: 6.5, date: '2024-03-25' }
]

// ============================================
// MOCK DE SAQUES MENSAIS (controle de limite)
// ============================================
export const mockWithdrawals = []

export function getUserMonthlyWithdrawals(userId, month = new Date().getMonth(), year = new Date().getFullYear()) {
  return mockWithdrawals
    .filter(w => {
      const date = new Date(w.createdAt)
      return w.userId === userId && date.getMonth() === month && date.getFullYear() === year
    })
    .reduce((sum, w) => sum + w.amount, 0)
}

export function requestWithdrawal(userId, amount, type = 'cash') {
  const user = mockUsers.find(u => u.id === userId)
  if (!user) {
    return { success: false, message: 'Usuário não encontrado' }
  }

  // Verificar saldo
  if (user.points < amount) {
    return { success: false, message: 'Saldo insuficiente' }
  }

  // Verificar limite mensal
  const currentMonthWithdrawals = getUserMonthlyWithdrawals(userId)
  const validation = validateMonthlyWithdrawal(currentMonthWithdrawals, amount)

  if (!validation.canWithdraw) {
    return {
      success: false,
      message: `Limite mensal excedido. Disponível: R$ ${validation.remainingLimit.toFixed(2)} de R$ ${validation.monthlyLimit.toFixed(2)}`,
      validation
    }
  }

  // Registrar saque
  const withdrawal = {
    id: String(mockWithdrawals.length + 1),
    userId,
    userName: user.name,
    amount: validation.allowedAmount,
    type,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  mockWithdrawals.push(withdrawal)

  return {
    success: true,
    message: 'Solicitação de saque registrada',
    withdrawal,
    validation
  }
}

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

  // Novos campos: créditos detalhados
  const totalReferrerCredits = mockSales.reduce((sum, s) => sum + (s.referrerCredits || s.profit || 0), 0)
  const totalBuyerCredits = mockSales.reduce((sum, s) => sum + (s.buyerCredits || 0), 0)
  const totalCreditsDistributed = totalReferrerCredits + totalBuyerCredits
  const totalEstimatedCost = mockSales.reduce((sum, s) => sum + (s.estimatedCost || 0), 0)
  const avgCostPercentage = totalProfit > 0 ? (totalEstimatedCost / totalProfit) * 100 : 0

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
    pendingTasks,
    // Novos campos
    totalReferrerCredits,
    totalBuyerCredits,
    totalCreditsDistributed,
    totalEstimatedCost,
    avgCostPercentage: Math.round(avgCostPercentage * 10) / 10,
    // Configurações atuais
    config: {
      referrerPercentage: creditsConfig.referrerPercentage * 100,
      buyerPercentage: creditsConfig.buyerPercentage * 100,
      minProfit: creditsConfig.minProfitToGenerateCredits,
      monthlyWithdrawalLimit: creditsConfig.monthlyWithdrawalLimit,
      maxExtraBonusPercentage: creditsConfig.maxExtraBonusPercentage * 100
    }
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

export function approveReferral(referralId, saleValue, profit, clientId = null) {
  const referral = mockReferralsAdmin.find(r => r.id === referralId)
  if (!referral) {
    return { success: false, message: 'Indicação não encontrada' }
  }

  // Calcular créditos usando o novo sistema
  const creditsCalc = calculateSaleCredits(profit)

  // Verificar se lucro atinge o mínimo
  if (!creditsCalc.eligible) {
    return {
      success: false,
      message: creditsCalc.reason,
      minProfit: creditsConfig.minProfitToGenerateCredits
    }
  }

  referral.status = 'approved'
  referral.value = saleValue
  referral.profit = profit

  // Adicionar créditos ao indicador (100% do lucro)
  const user = mockUsers.find(u => u.id === referral.referrerId)
  if (user) {
    user.points += creditsCalc.referrerCredits
  }

  // Adicionar créditos ao comprador (30% do lucro) - se tiver clientId
  let buyer = null
  if (clientId) {
    buyer = mockUsers.find(u => u.id === clientId)
    if (buyer) {
      buyer.points += creditsCalc.buyerCredits
    }
  }

  // Registrar venda com detalhamento de créditos
  const sale = {
    id: String(mockSales.length + 1),
    clientName: referral.clientName,
    clientId,
    referralId: referral.id,
    referrerId: referral.referrerId,
    referrerName: referral.referrerName,
    value: saleValue,
    profit: profit,
    referrerCredits: creditsCalc.referrerCredits,
    buyerCredits: creditsCalc.buyerCredits,
    totalCredits: creditsCalc.totalCredits,
    estimatedCost: creditsCalc.estimatedCost,
    costPercentage: creditsCalc.costPercentage,
    date: new Date().toISOString().split('T')[0]
  }
  mockSales.push(sale)

  // Registrar no audit log
  logAdminAction({
    actionType: 'approve',
    resourceType: 'referral',
    resourceId: referralId,
    affectedUserId: referral.referrerId,
    affectedUserName: referral.referrerName,
    newValue: {
      saleValue,
      profit,
      referrerCredits: creditsCalc.referrerCredits,
      buyerCredits: creditsCalc.buyerCredits,
      costPercentage: creditsCalc.costPercentage
    },
    description: `Indicação aprovada: ${referral.clientName} - R$${saleValue} | Indicador: +${creditsCalc.referrerCredits} | Comprador: +${creditsCalc.buyerCredits}`
  })

  return {
    success: true,
    sale,
    credits: creditsCalc
  }
}

export function rejectReferral(referralId) {
  const referral = mockReferralsAdmin.find(r => r.id === referralId)
  if (referral) {
    referral.status = 'rejected'

    // Registrar no audit log
    logAdminAction({
      actionType: 'reject',
      resourceType: 'referral',
      resourceId: referralId,
      affectedUserId: referral.referrerId,
      affectedUserName: referral.referrerName,
      description: `Indicação rejeitada: ${referral.clientName}`
    })

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

export function registerSale(clientName, referralCode, saleValue, profit, existingReferralId = null, clientId = null) {
  let user = null
  let referral = null

  // Calcular créditos usando o novo sistema
  const creditsCalc = calculateSaleCredits(profit)

  // Verificar se lucro atinge o mínimo
  if (!creditsCalc.eligible) {
    return {
      success: false,
      message: creditsCalc.reason,
      minProfit: creditsConfig.minProfitToGenerateCredits
    }
  }

  // Se um ID de indicação existente foi fornecido, usar ele
  if (existingReferralId) {
    referral = mockReferralsAdmin.find(r => r.id === existingReferralId)
    if (!referral) {
      return { success: false, message: 'Indicação não encontrada' }
    }
    user = mockUsers.find(u => u.id === referral.referrerId)
    if (!user) {
      return { success: false, message: 'Usuário indicador não encontrado' }
    }

    // Atualizar a indicação existente
    referral.status = 'approved'
    referral.value = saleValue
    referral.profit = profit

    // Usar o nome do cliente da indicação original se não foi informado
    if (!clientName || clientName.trim() === '') {
      clientName = referral.clientName
    }
  } else {
    // Encontrar usuário pelo código (simplificado - usando nome)
    user = mockUsers.find(u => u.name.toLowerCase().includes(referralCode.toLowerCase()))

    if (!user) {
      return { success: false, message: 'Código de indicação não encontrado' }
    }

    // Criar indicação
    referral = {
      id: String(mockReferralsAdmin.length + 1),
      clientName,
      referrerId: user.id,
      referrerName: user.name,
      status: 'approved',
      date: new Date().toISOString().split('T')[0],
      value: saleValue,
      profit: profit
    }
    mockReferralsAdmin.push(referral)
    user.referrals += 1
  }

  // Adicionar créditos ao indicador (100% do lucro)
  user.points += creditsCalc.referrerCredits

  // Adicionar créditos ao comprador (30% do lucro) - se tiver clientId
  let buyer = null
  if (clientId) {
    buyer = mockUsers.find(u => u.id === clientId)
    if (buyer) {
      buyer.points += creditsCalc.buyerCredits
    }
  }

  // Registrar venda com detalhamento de créditos
  const sale = {
    id: String(mockSales.length + 1),
    clientName,
    clientId,
    referralId: referral.id,
    referrerId: user.id,
    referrerName: user.name,
    value: saleValue,
    profit: profit,
    referrerCredits: creditsCalc.referrerCredits,
    buyerCredits: creditsCalc.buyerCredits,
    totalCredits: creditsCalc.totalCredits,
    estimatedCost: creditsCalc.estimatedCost,
    costPercentage: creditsCalc.costPercentage,
    date: new Date().toISOString().split('T')[0]
  }
  mockSales.push(sale)

  // Atualizar a indicação com o sale_id (vínculo bidirecional)
  referral.saleId = sale.id

  // Registrar no audit log
  logAdminAction({
    actionType: 'approve',
    resourceType: 'sale',
    resourceId: sale.id,
    affectedUserId: user.id,
    affectedUserName: user.name,
    newValue: {
      saleValue,
      profit,
      referrerCredits: creditsCalc.referrerCredits,
      buyerCredits: creditsCalc.buyerCredits,
      totalCredits: creditsCalc.totalCredits,
      costPercentage: creditsCalc.costPercentage
    },
    description: `Venda registrada: ${clientName} - R$${saleValue} | Indicador: +${creditsCalc.referrerCredits} | Comprador: +${creditsCalc.buyerCredits}`
  })

  return {
    success: true,
    message: 'Venda registrada com sucesso',
    sale,
    credits: creditsCalc
  }
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
    const oldStatus = user.status
    user.status = user.status === 'active' ? 'blocked' : 'active'

    // Registrar no audit log
    logAdminAction({
      actionType: 'edit',
      resourceType: 'user',
      resourceId: userId,
      affectedUserId: userId,
      affectedUserName: user.name,
      oldValue: { status: oldStatus },
      newValue: { status: user.status },
      description: `Status alterado: ${oldStatus} → ${user.status}`
    })

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

    // Registrar no audit log
    logAdminAction({
      actionType: 'approve',
      resourceType: 'task',
      resourceId: taskId,
      affectedUserId: task.userId,
      affectedUserName: task.userName,
      newValue: { points: task.points },
      description: `Tarefa aprovada: ${task.taskName} (+${task.points} créditos)`
    })

    return true
  }
  return false
}

export function rejectTask(taskId) {
  const task = mockPendingTasks.find(t => t.id === taskId)
  if (task) {
    task.status = 'rejected'

    // Registrar no audit log
    logAdminAction({
      actionType: 'reject',
      resourceType: 'task',
      resourceId: taskId,
      affectedUserId: task.userId,
      affectedUserName: task.userName,
      description: `Tarefa rejeitada: ${task.taskName}`
    })

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
    const oldStatus = reward.isActive
    reward.isActive = !reward.isActive
    reward.lastEdited = new Date().toISOString().split('T')[0]

    // Registrar no audit log
    logAdminAction({
      actionType: 'edit',
      resourceType: 'reward',
      resourceId: rewardId,
      oldValue: { isActive: oldStatus },
      newValue: { isActive: reward.isActive },
      description: `Recompensa ${reward.name}: ${oldStatus ? 'desativada' : 'ativada'}`
    })

    return true
  }
  return false
}

export function updateReward(rewardId, updates) {
  const reward = mockRewardsAdmin.find(r => r.id === rewardId)
  if (reward) {
    const oldValues = { name: reward.name, description: reward.description, points_required: reward.points_required }
    Object.assign(reward, updates)
    reward.lastEdited = new Date().toISOString().split('T')[0]

    // Registrar no audit log
    logAdminAction({
      actionType: 'edit',
      resourceType: 'reward',
      resourceId: rewardId,
      oldValue: oldValues,
      newValue: updates,
      description: `Recompensa editada: ${reward.name}`
    })

    return true
  }
  return false
}

// ============================================
// AJUSTE MANUAL DE CRÉDITOS
// ============================================
export const mockCreditAdjustments = []

export function adjustUserCredits(userId, amount, reason, adminName = 'Admin') {
  const user = mockUsers.find(u => u.id === userId)
  if (!user) {
    return { success: false, message: 'Usuário não encontrado' }
  }

  const oldPoints = user.points
  const newPoints = Math.max(0, user.points + amount)
  user.points = newPoints

  // Recalcular nível
  for (let i = levels.length - 1; i >= 0; i--) {
    if (newPoints >= levels[i].minPoints) {
      user.levelId = levels[i].id
      break
    }
  }

  // Registrar ajuste
  const adjustment = {
    id: String(mockCreditAdjustments.length + 1),
    userId,
    userName: user.name,
    adminName,
    amount,
    oldBalance: oldPoints,
    newBalance: newPoints,
    reason,
    createdAt: new Date().toISOString()
  }
  mockCreditAdjustments.push(adjustment)

  // Registrar no audit log
  logAdminAction({
    actionType: 'credit_adjust',
    resourceType: 'user',
    resourceId: userId,
    affectedUserId: userId,
    affectedUserName: user.name,
    oldValue: { points: oldPoints },
    newValue: { points: newPoints },
    description: `Ajuste de ${amount > 0 ? '+' : ''}${amount} créditos. Motivo: ${reason}`
  })

  return {
    success: true,
    message: `Créditos ajustados com sucesso`,
    oldBalance: oldPoints,
    newBalance: newPoints,
    adjustment
  }
}

export function getCreditAdjustments(userId = null) {
  if (userId) {
    return mockCreditAdjustments.filter(a => a.userId === userId)
  }
  return mockCreditAdjustments
}

// ============================================
// HISTÓRICO DE AÇÕES (Audit Log)
// ============================================
export const mockAuditLogs = []

export function logAdminAction({
  adminId = 'admin-1',
  adminName = 'Admin',
  actionType,
  resourceType,
  resourceId,
  affectedUserId,
  affectedUserName,
  oldValue = null,
  newValue = null,
  description
}) {
  const log = {
    id: String(mockAuditLogs.length + 1),
    adminId,
    adminName,
    actionType,
    resourceType,
    resourceId,
    affectedUserId,
    affectedUserName,
    oldValue,
    newValue,
    description,
    createdAt: new Date().toISOString()
  }
  mockAuditLogs.unshift(log) // Adiciona no início para ordenar por mais recente
  return log
}

export function getAuditLogs(filters = {}) {
  let logs = [...mockAuditLogs]

  if (filters.actionType) {
    logs = logs.filter(l => l.actionType === filters.actionType)
  }
  if (filters.resourceType) {
    logs = logs.filter(l => l.resourceType === filters.resourceType)
  }
  if (filters.dateFrom) {
    logs = logs.filter(l => new Date(l.createdAt) >= new Date(filters.dateFrom))
  }
  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo)
    endDate.setHours(23, 59, 59, 999)
    logs = logs.filter(l => new Date(l.createdAt) <= endDate)
  }

  return logs
}
