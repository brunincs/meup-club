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
 * Sanitiza input de busca para prevenir injeção
 * @param {string} input - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
function sanitizeSearchInput(input) {
  if (!input) return ''
  // Remove caracteres especiais do PostgREST/SQL
  return input
    .replace(/[%_\\'"(){}[\]<>]/g, '')
    .trim()
    .slice(0, 100) // Limita tamanho
}

/**
 * Busca todos os usuários (clientes) do sistema
 * @param {string} searchQuery - Filtro por nome ou email
 */
export async function fetchAllUsers(searchQuery = '') {
  let query = supabase
    .from('profiles')
    .select('id, name, email, points, role, created_at')
    .order('created_at', { ascending: false })

  const sanitizedQuery = sanitizeSearchInput(searchQuery)
  if (sanitizedQuery) {
    query = query.or(`name.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%`)
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
      baseAmount: data.base_amount,
      multiplier: parseFloat(data.multiplier),
      finalAmount: data.final_amount,
      balanceBefore: data.balance_before,
      balanceAfter: data.balance_after,
      reason: data.reason
    }
  }
}

/**
 * Busca preview do crédito com valores do plano
 * Usado pelo modal para mostrar o valor correto antes de confirmar
 *
 * @param {string} userId - ID do usuário
 * @param {number} baseAmount - Valor base (R$ para viagem, count para indicação)
 * @param {string} type - Tipo: 'credit' (viagem), 'referral' (indicação), 'birthday', 'task'
 */
export async function getCreditPreview(userId, baseAmount, type = 'credit') {
  try {
    const { data, error } = await supabase.rpc('get_credit_preview', {
      p_user_id: userId,
      p_base_amount: baseAmount,
      p_type: type
    })

    if (error) throw error

    return {
      success: true,
      preview: {
        plano: data.plano,
        ciclo: data.ciclo,
        isPrime: data.is_prime,
        baseAmount: data.base_amount,
        unitValue: data.unit_value,
        multiplier: parseFloat(data.multiplier || 1),
        finalAmount: data.final_amount,
        hasBonus: data.has_bonus,
        // Valores do plano para referência
        pontos_indicacao: data.pontos_indicacao,
        pontos_checkin: data.pontos_checkin,
        pontos_aniversario: data.pontos_aniversario
      }
    }
  } catch (error) {
    console.error('Erro ao buscar preview:', error)
    return {
      success: false,
      preview: {
        baseAmount,
        multiplier: 1.0,
        finalAmount: baseAmount,
        hasBonus: false
      }
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
    .select('id, admin_id, amount, balance_before, balance_after, type, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar transações:', error)
    return { success: false, error: error.message, transactions: [] }
  }

  if (!data || data.length === 0) {
    return { success: true, transactions: [] }
  }

  // Buscar nomes dos admins
  const adminIds = [...new Set(data.map(t => t.admin_id).filter(Boolean))]
  let adminsMap = {}

  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', adminIds)

    if (admins) {
      adminsMap = admins.reduce((acc, a) => {
        acc[a.id] = a.name
        return acc
      }, {})
    }
  }

  const transactions = data.map(t => ({
    id: t.id,
    amount: t.amount,
    balanceBefore: t.balance_before || 0,
    balanceAfter: t.balance_after || 0,
    type: t.type,
    reason: t.reason || 'Sem descrição',
    adminName: adminsMap[t.admin_id] || 'Sistema',
    createdAt: new Date(t.created_at).toLocaleString('pt-BR')
  }))

  return { success: true, transactions }
}

/**
 * Busca todas as transações (para o admin)
 * Usa função RPC segura que bypassa RLS
 */
export async function fetchAllTransactions(filters = {}) {
  // Primeiro, buscar as transações
  let query = supabase
    .from('point_transactions')
    .select('id, user_id, admin_id, amount, balance_before, balance_after, type, reason, created_at')
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

  if (!data || data.length === 0) {
    return { success: true, transactions: [] }
  }

  // Buscar nomes dos usuários e admins em uma segunda query
  const userIds = [...new Set(data.map(t => t.user_id).filter(Boolean))]
  const adminIds = [...new Set(data.map(t => t.admin_id).filter(Boolean))]
  const allIds = [...new Set([...userIds, ...adminIds])]

  let profilesMap = {}
  if (allIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', allIds)

    if (profiles) {
      profilesMap = profiles.reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})
    }
  }

  const transactions = data.map(t => ({
    id: t.id,
    amount: t.amount,
    balanceBefore: t.balance_before || 0,
    balanceAfter: t.balance_after || 0,
    type: t.type,
    reason: t.reason || 'Sem descrição',
    userId: t.user_id,
    userName: profilesMap[t.user_id]?.name || 'Usuário',
    userEmail: profilesMap[t.user_id]?.email || '',
    adminName: profilesMap[t.admin_id]?.name || 'Sistema',
    createdAt: new Date(t.created_at).toLocaleString('pt-BR')
  }))

  return { success: true, transactions }
}

// ============================================
// PERFIL DO CLIENTE (ADMIN)
// ============================================

/**
 * Busca perfil completo do cliente (admin-only)
 * CPF retorna MASCARADO (ex: ***.***.**9-21)
 * @param {string} userId - ID do cliente
 */
export async function fetchClientProfile(userId) {
  const { data, error } = await supabase.rpc('admin_get_client_profile', {
    p_user_id: userId
  })

  if (error) {
    console.error('Erro ao buscar perfil do cliente:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Revela CPF completo do cliente (admin-only)
 * Registra no audit log para conformidade
 * @param {string} userId - ID do cliente
 */
export async function revealClientCpf(userId) {
  const { data, error } = await supabase.rpc('admin_reveal_cpf', {
    p_user_id: userId
  })

  if (error) {
    console.error('Erro ao revelar CPF:', error)
    return { success: false, error: error.message }
  }

  return data
}

// ============================================
// ESTATÍSTICAS
// ============================================

// ============================================
// ASSINATURAS
// ============================================

/**
 * Busca todas as assinaturas Prime ativas
 */
export async function fetchAllSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, profiles(name, email)')
    .eq('status', 'active')
    .order('current_period_end', { ascending: true })

  if (error) {
    console.error('Erro ao buscar assinaturas:', error)
    return { success: false, error: error.message, subscriptions: [] }
  }

  return { success: true, subscriptions: data || [] }
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

// ============================================
// VERIFICAÇÃO DE DISCREPÂNCIAS
// ============================================

/**
 * Verifica discrepâncias entre saldo (profile.points) e soma de transações
 * Retorna lista de usuários com saldo inconsistente
 */
export async function fetchBalanceDiscrepancies() {
  const { data, error } = await supabase.rpc('admin_check_balance_discrepancies')

  if (error) {
    console.error('Erro ao verificar discrepâncias:', error)
    return { success: false, error: error.message, discrepancies: [] }
  }

  return {
    success: true,
    discrepancies: (data || []).map(d => ({
      userId: d.user_id,
      userName: d.user_name,
      userEmail: d.user_email,
      profilePoints: d.profile_points,
      transactionsSum: d.transactions_sum,
      discrepancy: d.discrepancy
    }))
  }
}

// ============================================
// PONTOS PENDENTES
// ============================================

/**
 * Busca pontos pendentes de liberação de um usuário
 */
export async function fetchUserPendingPoints(userId) {
  const { data, error } = await supabase.rpc('get_user_pending_points', {
    p_user_id: userId
  })

  if (error) {
    console.error('Erro ao buscar pontos pendentes:', error)
    return { success: false, error: error.message, pendingPoints: [] }
  }

  return {
    success: true,
    pendingPoints: (data || []).map(p => ({
      id: p.id,
      pontos: p.pontos,
      motivo: p.motivo,
      liberarEm: p.liberar_em,
      diasRestantes: p.dias_restantes
    }))
  }
}

/**
 * Busca total de pontos pendentes de um usuário
 */
export async function fetchUserPendingPointsTotal(userId = null) {
  const { data, error } = await supabase.rpc('get_user_pending_points_total', {
    p_user_id: userId
  })

  if (error) {
    console.error('Erro ao buscar total pendente:', error)
    return { success: false, total: 0 }
  }

  return { success: true, total: data || 0 }
}
