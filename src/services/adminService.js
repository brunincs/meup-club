// ============================================
// SERVIÇO ADMIN - DADOS REAIS DO SUPABASE
// ============================================

import { supabase } from '@/lib/supabase'
import { levels } from './pointsSystem'

/**
 * Calcula o nível baseado nos pontos
 */
function calculateLevelFromPoints(points) {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].minPoints) {
      return levels[i]
    }
  }
  return levels[0]
}

// ============================================
// USUÁRIOS
// ============================================

/**
 * Busca todos os usuários (clientes) do sistema
 * @param {string} searchQuery - Filtro por nome ou email
 */
export async function fetchAllUsers(searchQuery = '') {
  let query = supabase
    .from('profiles')
    .select('id, name, email, points, role, created_at')
    .order('created_at', { ascending: false })

  if (searchQuery.trim()) {
    query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    return { success: false, error: error.message, users: [] }
  }

  // Adicionar informações de nível
  const usersWithLevel = data.map(user => {
    const level = calculateLevelFromPoints(user.points || 0)
    return {
      ...user,
      points: user.points || 0,
      levelId: level.id,
      levelName: level.name,
      levelShortName: level.shortName,
      joinDate: new Date(user.created_at).toLocaleDateString('pt-BR'),
      status: 'active' // TODO: implementar bloqueio de usuários se necessário
    }
  })

  return { success: true, users: usersWithLevel }
}

/**
 * Busca um usuário específico pelo ID
 */
export async function fetchUserById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, points, role, created_at')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Erro ao buscar usuário:', error)
    return { success: false, error: error.message }
  }

  const level = calculateLevelFromPoints(data.points || 0)
  return {
    success: true,
    user: {
      ...data,
      points: data.points || 0,
      levelId: level.id,
      levelName: level.name,
      levelShortName: level.shortName
    }
  }
}

// ============================================
// CREDITAR/AJUSTAR PONTOS
// ============================================

/**
 * Credita ou debita pontos de um usuário
 * A verificação de admin é feita NO BANCO (seguro)
 *
 * @param {string} userId - ID do usuário que receberá os pontos
 * @param {number} amount - Quantidade (positivo = crédito, negativo = débito)
 * @param {string} reason - Motivo da operação
 * @param {string} type - Tipo: 'credit', 'debit', 'referral', 'task'
 */
export async function creditPoints(userId, amount, reason, type = 'credit') {
  // Validações básicas no frontend (o banco valida de novo)
  if (!userId) {
    return { success: false, error: 'Usuário não informado' }
  }

  if (amount === 0) {
    return { success: false, error: 'Quantidade não pode ser zero' }
  }

  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Motivo é obrigatório' }
  }

  // Chamar a função segura do banco
  // A função verifica se quem está chamando é admin
  const { data, error } = await supabase.rpc('admin_credit_points', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason.trim(),
    p_type: type
  })

  if (error) {
    console.error('Erro ao creditar pontos:', error)
    return { success: false, error: error.message }
  }

  // A função retorna um JSON com success/error
  if (!data.success) {
    return { success: false, error: data.error }
  }

  return {
    success: true,
    transaction: {
      id: data.transaction_id,
      userId: data.user_id,
      userName: data.user_name,
      amount: data.amount,
      balanceBefore: data.balance_before,
      balanceAfter: data.balance_after,
      reason: data.reason
    }
  }
}

// ============================================
// HISTÓRICO DE TRANSAÇÕES
// ============================================

/**
 * Busca o histórico de transações de um usuário específico
 */
export async function fetchUserTransactions(userId) {
  const { data, error } = await supabase
    .from('point_transactions')
    .select(`
      id,
      amount,
      balance_before,
      balance_after,
      type,
      reason,
      created_at,
      admin:admin_id (
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar transações:', error)
    return { success: false, error: error.message, transactions: [] }
  }

  const transactions = data.map(t => ({
    id: t.id,
    amount: t.amount,
    balanceBefore: t.balance_before,
    balanceAfter: t.balance_after,
    type: t.type,
    reason: t.reason,
    adminName: t.admin?.name || 'Admin',
    createdAt: new Date(t.created_at).toLocaleString('pt-BR')
  }))

  return { success: true, transactions }
}

/**
 * Busca todas as transações (para o admin)
 */
export async function fetchAllTransactions(filters = {}) {
  let query = supabase
    .from('point_transactions')
    .select(`
      id,
      amount,
      balance_before,
      balance_after,
      type,
      reason,
      created_at,
      user:user_id (
        id,
        name,
        email
      ),
      admin:admin_id (
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar transações:', error)
    return { success: false, error: error.message, transactions: [] }
  }

  const transactions = data.map(t => ({
    id: t.id,
    amount: t.amount,
    balanceBefore: t.balance_before,
    balanceAfter: t.balance_after,
    type: t.type,
    reason: t.reason,
    userId: t.user?.id,
    userName: t.user?.name || 'Desconhecido',
    userEmail: t.user?.email,
    adminName: t.admin?.name || 'Admin',
    createdAt: new Date(t.created_at).toLocaleString('pt-BR')
  }))

  return { success: true, transactions }
}

// ============================================
// ESTATÍSTICAS
// ============================================

/**
 * Busca estatísticas gerais para o dashboard admin
 */
export async function fetchAdminStats() {
  // Total de usuários
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Total de pontos distribuídos
  const { data: pointsData } = await supabase
    .from('profiles')
    .select('points')

  const totalPointsDistributed = pointsData?.reduce((sum, u) => sum + (u.points || 0), 0) || 0

  // Total de transações
  const { count: totalTransactions } = await supabase
    .from('point_transactions')
    .select('*', { count: 'exact', head: true })

  return {
    success: true,
    stats: {
      totalUsers: totalUsers || 0,
      totalPointsDistributed,
      totalTransactions: totalTransactions || 0
    }
  }
}
