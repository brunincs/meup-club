// Serviço do Passaporte - Meup Club
// Busca dados REAIS do banco para o perfil do cliente

import { supabase } from '@/lib/supabase'

// ══════════════════════════════════════════════════════════════════════════════
// DADOS DO PERFIL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Busca o perfil completo do usuário
 */
export async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error

    return { success: true, profile: data }
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return { success: false, error: error.message, profile: null }
  }
}

/**
 * Atualiza os dados do perfil do usuário
 * Campos permitidos: name, phone, city, state, birth_date, cpf, dream_destinations, travel_preferences
 */
export async function updateUserProfile(userId, updates) {
  try {
    // Sanitizar e validar campos permitidos
    const allowedFields = [
      'name', 'phone', 'city', 'state', 'birth_date',
      'cpf', 'dream_destinations', 'travel_preferences', 'avatar_url'
    ]

    const safeUpdates = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field]
      }
    }

    // Adicionar timestamp de atualização
    safeUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return { success: true, profile: data }
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return { success: false, error: error.message }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ESTATÍSTICAS REAIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Busca estatísticas reais de indicações
 * Por enquanto retorna 0 pois não temos tabela referrals implementada
 */
export async function fetchReferralStats(userId) {
  try {
    // Buscar do profile o total_referrals
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_referrals')
      .eq('id', userId)
      .single()

    return {
      success: true,
      stats: {
        total: profile?.total_referrals || 0,
        approved: profile?.total_referrals || 0, // Por enquanto igual ao total
        pending: 0
      }
    }
  } catch (error) {
    console.error('Erro ao buscar indicações:', error)
    return { success: false, stats: { total: 0, approved: 0, pending: 0 } }
  }
}

/**
 * Busca tarefas aprovadas do usuário
 */
export async function fetchApprovedTasks(userId) {
  try {
    const { data, error, count } = await supabase
      .from('tarefa_solicitacoes')
      .select('id, pontos_concedidos, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'aprovada')

    if (error) throw error

    const totalPoints = (data || []).reduce((sum, t) => sum + (t.pontos_concedidos || 0), 0)

    return {
      success: true,
      stats: {
        total: count || 0,
        points: totalPoints
      }
    }
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error)
    return { success: false, stats: { total: 0, points: 0 } }
  }
}

/**
 * Busca experiências resgatadas pelo usuário
 */
export async function fetchRedeemedExperiences(userId) {
  try {
    const { data, error, count } = await supabase
      .from('point_transactions')
      .select('id, amount, reason', { count: 'exact' })
      .eq('user_id', userId)
      .eq('type', 'redemption')

    if (error) throw error

    return {
      success: true,
      stats: {
        total: count || 0,
        transactions: data || []
      }
    }
  } catch (error) {
    console.error('Erro ao buscar resgates:', error)
    return { success: false, stats: { total: 0, transactions: [] } }
  }
}

/**
 * Busca histórico de transações por tipo
 * Retorna soma de pontos por tipo de transação
 */
export async function fetchPointsBreakdown(userId) {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .gt('amount', 0) // Só entradas positivas

    if (error) throw error

    // Agrupar por tipo
    const breakdown = {}
    for (const tx of (data || [])) {
      const type = tx.type || 'other'
      breakdown[type] = (breakdown[type] || 0) + tx.amount
    }

    return { success: true, breakdown }
  } catch (error) {
    console.error('Erro ao buscar breakdown:', error)
    return { success: false, breakdown: {} }
  }
}

/**
 * Busca histórico recente de atividades
 */
export async function fetchRecentActivity(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('id, amount, type, reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, activities: data || [] }
  } catch (error) {
    console.error('Erro ao buscar atividades:', error)
    return { success: false, activities: [] }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Mascara CPF para exibição segura
 * Ex: 123.456.789-00 -> ***.456.***-00
 */
export function maskCPF(cpf) {
  if (!cpf) return ''
  // Remove formatação
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return '***.***.***-**'
  // Mostra apenas dígitos do meio e final
  return `***.${digits.slice(3, 6)}.***-${digits.slice(9, 11)}`
}

/**
 * Formata CPF para entrada
 * Ex: 12345678900 -> 123.456.789-00
 */
export function formatCPF(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

/**
 * Valida formato de CPF (não valida se é real)
 */
export function isValidCPFFormat(cpf) {
  if (!cpf) return true // Opcional
  const digits = cpf.replace(/\D/g, '')
  return digits.length === 11
}

/**
 * Formata telefone
 * Ex: 11999999999 -> (11) 99999-9999
 */
export function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Formata data para exibição
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...options
  })
}

/**
 * Formata "membro desde" baseado na data de criação
 */
export function formatMemberSince(createdAt) {
  if (!createdAt) return 'Recém-chegado'
  const date = new Date(createdAt)
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
}
