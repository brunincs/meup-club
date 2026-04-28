// Serviço de Dados com Supabase - Meup Club
// Substitui os dados mock por operações reais no banco

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { calculateSaleCredits, creditsConfig, validateMonthlyWithdrawal } from './pointsSystem'

// ============================================
// VERIFICAÇÃO DE CONEXÃO
// ============================================
export const isConnected = isSupabaseConfigured

// ============================================
// FUNÇÕES DE PERFIL/USUÁRIO
// ============================================

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('points', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateUserPoints(userId, newPoints) {
  const { data: user } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single()

  if (!user) return { success: false, message: 'Usuário não encontrado' }

  const oldPoints = user.points
  const diff = newPoints - oldPoints

  const { error } = await supabase
    .from('profiles')
    .update({ points: newPoints })
    .eq('id', userId)

  if (error) return { success: false, message: error.message }
  return { success: true, diff, oldPoints, newPoints }
}

export async function toggleUserStatus(userId) {
  const { data: user } = await supabase
    .from('profiles')
    .select('status, name')
    .eq('id', userId)
    .single()

  if (!user) return { success: false }

  const newStatus = user.status === 'active' ? 'blocked' : 'active'

  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', userId)

  if (error) return { success: false }

  // Log da ação
  await logAdminAction({
    actionType: 'status_change',
    resourceType: 'user',
    resourceId: userId,
    affectedUserId: userId,
    affectedUserName: user.name,
    oldValue: { status: user.status },
    newValue: { status: newStatus },
    description: `Status alterado: ${user.status} → ${newStatus}`
  })

  return { success: true, newStatus }
}

export async function getTopUsers(limit = 5) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('points', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// ============================================
// FUNÇÕES DE INDICAÇÕES
// ============================================

export async function getAllReferrals() {
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      *,
      referrer:profiles!referrer_id(id, name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPendingReferrals() {
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      *,
      referrer:profiles!referrer_id(id, name, email)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createReferral(referrerId, clientName, clientEmail, clientPhone, notes) {
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      notes
    })
    .select()
    .single()

  if (error) throw error

  // Incrementar contador de indicações do usuário
  await supabase.rpc('increment_referrals', { user_id: referrerId })

  return data
}

export async function approveReferral(referralId, saleValue, profit, clientId = null) {
  // Calcular créditos
  const creditsCalc = calculateSaleCredits(profit)

  if (!creditsCalc.eligible) {
    return {
      success: false,
      message: creditsCalc.reason,
      minProfit: creditsConfig.minProfitToGenerateCredits
    }
  }

  // Buscar indicação
  const { data: referral } = await supabase
    .from('referrals')
    .select('*, referrer:profiles!referrer_id(id, name, points)')
    .eq('id', referralId)
    .single()

  if (!referral) {
    return { success: false, message: 'Indicação não encontrada' }
  }

  // Atualizar indicação
  await supabase
    .from('referrals')
    .update({
      status: 'approved',
      converted_at: new Date().toISOString()
    })
    .eq('id', referralId)

  // Adicionar créditos ao indicador
  await supabase
    .from('profiles')
    .update({
      points: referral.referrer.points + creditsCalc.referrerCredits
    })
    .eq('id', referral.referrer_id)

  // Adicionar créditos ao comprador (se existir)
  if (clientId) {
    const { data: buyer } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', clientId)
      .single()

    if (buyer) {
      await supabase
        .from('profiles')
        .update({ points: buyer.points + creditsCalc.buyerCredits })
        .eq('id', clientId)
    }
  }

  // Registrar venda
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      referral_id: referralId,
      referrer_id: referral.referrer_id,
      client_id: clientId,
      client_name: referral.client_name,
      client_email: referral.client_email,
      sale_value: saleValue,
      profit: profit,
      referrer_credits: creditsCalc.referrerCredits,
      buyer_credits: creditsCalc.buyerCredits,
      total_credits: creditsCalc.totalCredits,
      estimated_cost: creditsCalc.estimatedCost,
      cost_percentage: creditsCalc.costPercentage
    })
    .select()
    .single()

  if (saleError) throw saleError

  // Log da ação
  await logAdminAction({
    actionType: 'approve',
    resourceType: 'referral',
    resourceId: referralId,
    affectedUserId: referral.referrer_id,
    affectedUserName: referral.referrer.name,
    newValue: {
      saleValue,
      profit,
      referrerCredits: creditsCalc.referrerCredits,
      buyerCredits: creditsCalc.buyerCredits,
      costPercentage: creditsCalc.costPercentage
    },
    description: `Indicação aprovada: ${referral.client_name} - R$${saleValue}`
  })

  return { success: true, sale, credits: creditsCalc }
}

export async function rejectReferral(referralId, reason) {
  const { data: referral } = await supabase
    .from('referrals')
    .select('*, referrer:profiles!referrer_id(id, name)')
    .eq('id', referralId)
    .single()

  if (!referral) return { success: false, message: 'Indicação não encontrada' }

  await supabase
    .from('referrals')
    .update({
      status: 'rejected',
      rejection_reason: reason
    })
    .eq('id', referralId)

  await logAdminAction({
    actionType: 'reject',
    resourceType: 'referral',
    resourceId: referralId,
    affectedUserId: referral.referrer_id,
    affectedUserName: referral.referrer.name,
    description: `Indicação rejeitada: ${referral.client_name}. Motivo: ${reason || 'Não informado'}`
  })

  return { success: true }
}

// ============================================
// FUNÇÕES DE VENDAS
// ============================================

export async function getAllSales() {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      referrer:profiles!referrer_id(id, name, email),
      client:profiles!client_id(id, name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function registerSale(clientName, referrerCode, saleValue, profit, existingReferralId = null, clientId = null) {
  // Calcular créditos
  const creditsCalc = calculateSaleCredits(profit)

  if (!creditsCalc.eligible) {
    return {
      success: false,
      message: creditsCalc.reason,
      minProfit: creditsConfig.minProfitToGenerateCredits
    }
  }

  let referrerId = null
  let referrerName = null
  let referralId = existingReferralId

  // Se tem indicação existente
  if (existingReferralId) {
    const { data: referral } = await supabase
      .from('referrals')
      .select('*, referrer:profiles!referrer_id(id, name, points)')
      .eq('id', existingReferralId)
      .single()

    if (!referral) return { success: false, message: 'Indicação não encontrada' }

    referrerId = referral.referrer_id
    referrerName = referral.referrer.name
    clientName = clientName || referral.client_name

    // Atualizar indicação
    await supabase
      .from('referrals')
      .update({ status: 'approved', converted_at: new Date().toISOString() })
      .eq('id', existingReferralId)

    // Adicionar créditos ao indicador
    await supabase
      .from('profiles')
      .update({ points: referral.referrer.points + creditsCalc.referrerCredits })
      .eq('id', referrerId)
  } else {
    // Buscar usuário pelo código de indicação
    const { data: referrer } = await supabase
      .from('profiles')
      .select('*')
      .or(`referral_code.ilike.%${referrerCode}%,name.ilike.%${referrerCode}%`)
      .single()

    if (!referrer) return { success: false, message: 'Código de indicação não encontrado' }

    referrerId = referrer.id
    referrerName = referrer.name

    // Criar indicação
    const { data: newReferral } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        client_name: clientName,
        client_id: clientId,
        status: 'approved',
        converted_at: new Date().toISOString()
      })
      .select()
      .single()

    referralId = newReferral?.id

    // Adicionar créditos e incrementar contador
    await supabase
      .from('profiles')
      .update({
        points: referrer.points + creditsCalc.referrerCredits,
        total_referrals: referrer.total_referrals + 1
      })
      .eq('id', referrerId)
  }

  // Adicionar créditos ao comprador (se existir)
  if (clientId) {
    const { data: buyer } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', clientId)
      .single()

    if (buyer) {
      await supabase
        .from('profiles')
        .update({ points: buyer.points + creditsCalc.buyerCredits })
        .eq('id', clientId)
    }
  }

  // Registrar venda
  const { data: sale, error } = await supabase
    .from('sales')
    .insert({
      referral_id: referralId,
      referrer_id: referrerId,
      client_id: clientId,
      client_name: clientName,
      sale_value: saleValue,
      profit: profit,
      referrer_credits: creditsCalc.referrerCredits,
      buyer_credits: creditsCalc.buyerCredits,
      total_credits: creditsCalc.totalCredits,
      estimated_cost: creditsCalc.estimatedCost,
      cost_percentage: creditsCalc.costPercentage
    })
    .select()
    .single()

  if (error) throw error

  // Log
  await logAdminAction({
    actionType: 'approve',
    resourceType: 'sale',
    resourceId: sale.id,
    affectedUserId: referrerId,
    affectedUserName: referrerName,
    newValue: {
      saleValue,
      profit,
      referrerCredits: creditsCalc.referrerCredits,
      buyerCredits: creditsCalc.buyerCredits
    },
    description: `Venda registrada: ${clientName} - R$${saleValue}`
  })

  return { success: true, sale, credits: creditsCalc }
}

// ============================================
// FUNÇÕES DE TAREFAS
// ============================================

export async function getAllTasks() {
  const { data, error } = await supabase
    .from('user_tasks')
    .select(`
      *,
      user:profiles!user_id(id, name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPendingTasks() {
  const { data, error } = await supabase
    .from('user_tasks')
    .select(`
      *,
      user:profiles!user_id(id, name, email)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function approveTask(taskId, adminId) {
  const { data: task } = await supabase
    .from('user_tasks')
    .select('*, user:profiles!user_id(id, name, points)')
    .eq('id', taskId)
    .single()

  if (!task) return { success: false, message: 'Tarefa não encontrada' }

  // Atualizar tarefa
  await supabase
    .from('user_tasks')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', taskId)

  // Adicionar pontos ao usuário
  await supabase
    .from('profiles')
    .update({ points: task.user.points + task.points })
    .eq('id', task.user_id)

  await logAdminAction({
    actionType: 'approve',
    resourceType: 'task',
    resourceId: taskId,
    affectedUserId: task.user_id,
    affectedUserName: task.user.name,
    newValue: { points: task.points },
    description: `Tarefa aprovada: ${task.task_name} (+${task.points} créditos)`
  })

  return { success: true }
}

export async function rejectTask(taskId, adminId, reason) {
  const { data: task } = await supabase
    .from('user_tasks')
    .select('*, user:profiles!user_id(id, name)')
    .eq('id', taskId)
    .single()

  if (!task) return { success: false }

  await supabase
    .from('user_tasks')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', taskId)

  await logAdminAction({
    actionType: 'reject',
    resourceType: 'task',
    resourceId: taskId,
    affectedUserId: task.user_id,
    affectedUserName: task.user.name,
    description: `Tarefa rejeitada: ${task.task_name}`
  })

  return { success: true }
}

// ============================================
// FUNÇÕES DE RECOMPENSAS
// ============================================

export async function getAllRewards() {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('points_required', { ascending: true })

  if (error) throw error
  return data || []
}

export async function toggleRewardStatus(rewardId) {
  const { data: reward } = await supabase
    .from('rewards')
    .select('is_active, name')
    .eq('id', rewardId)
    .single()

  if (!reward) return { success: false }

  const newStatus = !reward.is_active

  await supabase
    .from('rewards')
    .update({ is_active: newStatus })
    .eq('id', rewardId)

  await logAdminAction({
    actionType: 'edit',
    resourceType: 'reward',
    resourceId: rewardId,
    oldValue: { is_active: reward.is_active },
    newValue: { is_active: newStatus },
    description: `Recompensa ${reward.name}: ${newStatus ? 'ativada' : 'desativada'}`
  })

  return { success: true, newStatus }
}

export async function updateReward(rewardId, updates) {
  const { error } = await supabase
    .from('rewards')
    .update(updates)
    .eq('id', rewardId)

  if (error) return { success: false, message: error.message }

  await logAdminAction({
    actionType: 'edit',
    resourceType: 'reward',
    resourceId: rewardId,
    newValue: updates,
    description: `Recompensa atualizada`
  })

  return { success: true }
}

// ============================================
// FUNÇÕES DE SAQUES
// ============================================

export async function getAllWithdrawals() {
  const { data, error } = await supabase
    .from('withdrawals')
    .select(`
      *,
      user:profiles!user_id(id, name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUserMonthlyWithdrawals(userId) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { data, error } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .neq('status', 'cancelled')
    .neq('status', 'rejected')

  if (error) return 0
  return data?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0
}

export async function requestWithdrawal(userId, amount, type = 'pix', pixKey = null) {
  const { data: user } = await supabase
    .from('profiles')
    .select('points, name')
    .eq('id', userId)
    .single()

  if (!user) return { success: false, message: 'Usuário não encontrado' }
  if (user.points < amount) return { success: false, message: 'Saldo insuficiente' }

  // Verificar limite mensal
  const currentMonthWithdrawals = await getUserMonthlyWithdrawals(userId)
  const validation = validateMonthlyWithdrawal(currentMonthWithdrawals, amount)

  if (!validation.canWithdraw) {
    return {
      success: false,
      message: `Limite mensal excedido. Disponível: R$ ${validation.remainingLimit.toFixed(2)}`,
      validation
    }
  }

  const now = new Date()

  const { data, error } = await supabase
    .from('withdrawals')
    .insert({
      user_id: userId,
      amount: validation.allowedAmount,
      withdrawal_type: type,
      pix_key: pixKey,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    })
    .select()
    .single()

  if (error) return { success: false, message: error.message }

  return { success: true, withdrawal: data, validation }
}

export async function processWithdrawal(withdrawalId, adminId, approved, reason = null) {
  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .select('*, user:profiles!user_id(id, name, points)')
    .eq('id', withdrawalId)
    .single()

  if (!withdrawal) return { success: false, message: 'Saque não encontrado' }

  if (approved) {
    // Deduzir pontos do usuário
    await supabase
      .from('profiles')
      .update({ points: withdrawal.user.points - withdrawal.amount })
      .eq('id', withdrawal.user_id)

    await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        processed_by: adminId,
        processed_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)
  } else {
    await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        processed_by: adminId,
        processed_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', withdrawalId)
  }

  await logAdminAction({
    actionType: approved ? 'approve' : 'reject',
    resourceType: 'withdrawal',
    resourceId: withdrawalId,
    affectedUserId: withdrawal.user_id,
    affectedUserName: withdrawal.user.name,
    description: `Saque ${approved ? 'aprovado' : 'rejeitado'}: R$ ${withdrawal.amount}`
  })

  return { success: true }
}

// ============================================
// FUNÇÕES DE AJUSTE DE CRÉDITOS
// ============================================

export async function adjustUserCredits(userId, amount, reason, adminId, category = 'manual') {
  const { data: user } = await supabase
    .from('profiles')
    .select('points, name')
    .eq('id', userId)
    .single()

  if (!user) return { success: false, message: 'Usuário não encontrado' }

  const oldBalance = user.points
  const newBalance = Math.max(0, oldBalance + amount)

  // Atualizar pontos
  await supabase
    .from('profiles')
    .update({ points: newBalance })
    .eq('id', userId)

  // Registrar ajuste
  const { data: adjustment, error } = await supabase
    .from('credit_adjustments')
    .insert({
      user_id: userId,
      admin_id: adminId,
      amount,
      old_balance: oldBalance,
      new_balance: newBalance,
      reason,
      category
    })
    .select()
    .single()

  if (error) return { success: false, message: error.message }

  await logAdminAction({
    actionType: 'credit_adjust',
    resourceType: 'user',
    resourceId: userId,
    affectedUserId: userId,
    affectedUserName: user.name,
    oldValue: { points: oldBalance },
    newValue: { points: newBalance },
    description: `Ajuste de ${amount > 0 ? '+' : ''}${amount} créditos. Motivo: ${reason}`
  })

  return { success: true, oldBalance, newBalance, adjustment }
}

export async function getCreditAdjustments(userId = null) {
  let query = supabase
    .from('credit_adjustments')
    .select(`
      *,
      user:profiles!user_id(id, name),
      admin:profiles!admin_id(id, name)
    `)
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================
// FUNÇÕES DE ESTATÍSTICAS
// ============================================

export async function getAdminStats() {
  const { data, error } = await supabase
    .from('admin_stats')
    .select('*')
    .single()

  if (error) {
    // Se a view não existir, calcular manualmente
    const [users, referrals, sales, tasks, withdrawals] = await Promise.all([
      supabase.from('profiles').select('id, status, points', { count: 'exact' }),
      supabase.from('referrals').select('id, status', { count: 'exact' }),
      supabase.from('sales').select('*'),
      supabase.from('user_tasks').select('id, status', { count: 'exact' }),
      supabase.from('withdrawals').select('id, status', { count: 'exact' })
    ])

    const salesData = sales.data || []

    return {
      totalUsers: users.count || 0,
      activeUsers: users.data?.filter(u => u.status === 'active').length || 0,
      totalReferrals: referrals.count || 0,
      pendingReferrals: referrals.data?.filter(r => r.status === 'pending').length || 0,
      totalSales: salesData.length,
      totalSalesValue: salesData.reduce((sum, s) => sum + parseFloat(s.sale_value || 0), 0),
      totalProfit: salesData.reduce((sum, s) => sum + parseFloat(s.profit || 0), 0),
      totalReferrerCredits: salesData.reduce((sum, s) => sum + (s.referrer_credits || 0), 0),
      totalBuyerCredits: salesData.reduce((sum, s) => sum + (s.buyer_credits || 0), 0),
      totalEstimatedCost: salesData.reduce((sum, s) => sum + parseFloat(s.estimated_cost || 0), 0),
      pendingTasks: tasks.data?.filter(t => t.status === 'pending').length || 0,
      pendingWithdrawals: withdrawals.data?.filter(w => w.status === 'pending').length || 0,
      config: {
        referrerPercentage: creditsConfig.referrerPercentage * 100,
        buyerPercentage: creditsConfig.buyerPercentage * 100,
        minProfit: creditsConfig.minProfitToGenerateCredits,
        monthlyWithdrawalLimit: creditsConfig.monthlyWithdrawalLimit,
        maxExtraBonusPercentage: creditsConfig.maxExtraBonusPercentage * 100
      }
    }
  }

  return {
    ...data,
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
// FUNÇÕES DE AUDIT LOG
// ============================================

export async function logAdminAction({
  actionType,
  resourceType,
  resourceId,
  affectedUserId,
  affectedUserName,
  oldValue,
  newValue,
  description
}) {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      admin_id: user?.id,
      admin_name: user?.email,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      affected_user_id: affectedUserId,
      affected_user_name: affectedUserName,
      old_value: oldValue,
      new_value: newValue,
      description
    })

  if (error) console.error('Erro ao registrar log:', error)
}

export async function getAuditLogs(filters = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.actionType) {
    query = query.eq('action_type', filters.actionType)
  }
  if (filters.resourceType) {
    query = query.eq('resource_type', filters.resourceType)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo + 'T23:59:59')
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================
// FUNÇÕES DE NOTIFICAÇÕES
// ============================================

export async function getUserNotifications(userId, unreadOnly = false) {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function markNotificationAsRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)

  return !error
}

export async function createNotification(userId, title, message, type = 'info', actionUrl = null) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      action_url: actionUrl
    })

  return !error
}
