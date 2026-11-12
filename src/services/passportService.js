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
 * IMPORTANTE: Strings vazias são convertidas para NULL para campos opcionais
 */
export async function updateUserProfile(userId, updates) {
  try {
    // Sanitizar e validar campos permitidos
    const allowedFields = [
      'name', 'phone', 'city', 'state', 'birth_date',
      'cpf', 'dream_destinations', 'travel_preferences', 'avatar_url'
    ]

    // Campos que devem ser NULL quando vazios (tipos especiais no banco)
    const nullableFields = ['birth_date', 'cpf', 'phone', 'city', 'state', 'dream_destinations', 'travel_preferences', 'avatar_url']

    const safeUpdates = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        let value = updates[field]

        // Converter string vazia para null em campos opcionais
        // Isso evita erro "invalid input syntax for type date" quando birth_date = ""
        if (nullableFields.includes(field) && value === '') {
          value = null
        }

        safeUpdates[field] = value
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
 * Busca estatísticas REAIS de indicações que o usuário FEZ
 * Conta apenas onde o usuário é o INDICADOR (referrer_id), não onde foi indicado
 */
export async function fetchReferralStats(userId) {
  try {
    // Buscar indicações onde o usuário é o INDICADOR
    const { data, error } = await supabase
      .from('referrals')
      .select('id, status')
      .eq('referrer_id', userId)

    if (error) throw error

    const referrals = data || []
    const approved = referrals.filter(r => r.status === 'approved').length
    const pending = referrals.filter(r => r.status === 'pending').length

    return {
      success: true,
      stats: {
        total: referrals.length,
        approved,
        pending
      }
    }
  } catch (error) {
    console.error('Erro ao buscar indicações:', error)
    return { success: false, stats: { total: 0, approved: 0, pending: 0 } }
  }
}

/**
 * Busca missões concluídas do usuário
 * Inclui tanto tarefas manuais (tarefa_solicitacoes) quanto missões automáticas
 */
export async function fetchApprovedTasks(userId) {
  try {
    // 1. Buscar tarefas manuais aprovadas
    const { data: manualTasks, error: manualError, count: manualCount } = await supabase
      .from('tarefa_solicitacoes')
      .select('id, pontos_concedidos, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'aprovada')

    if (manualError) throw manualError

    // 2. Buscar missões automáticas concluídas
    const { data: autoMissions, error: autoError, count: autoCount } = await supabase
      .from('missoes_automaticas_concluidas')
      .select('id, pontos_concedidos, created_at', { count: 'exact' })
      .eq('user_id', userId)

    if (autoError) {
      // Tabela pode não existir em alguns ambientes, continue apenas com manuais
      console.warn('Erro ao buscar missões automáticas:', autoError)
    }

    const manualPoints = (manualTasks || []).reduce((sum, t) => sum + (t.pontos_concedidos || 0), 0)
    const autoPoints = (autoMissions || []).reduce((sum, t) => sum + (t.pontos_concedidos || 0), 0)

    return {
      success: true,
      stats: {
        total: (manualCount || 0) + (autoCount || 0),
        points: manualPoints + autoPoints
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
 * Busca histórico recente de atividades (para preview)
 */
export async function fetchRecentActivity(userId, limit = 5) {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('id, amount, type, reason, created_at, balance_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, activities: data || [] }
  } catch (error) {
    console.error('Erro ao buscar atividades:', error)
    return { success: false, activities: [] }
  }
}

/**
 * Busca TODAS as transações do usuário (extrato completo)
 * Inclui balance_after para mostrar saldo após cada transação
 */
export async function fetchAllTransactions(userId) {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('id, amount, type, reason, created_at, balance_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (error) throw error

    return { success: true, transactions: data || [] }
  } catch (error) {
    console.error('Erro ao buscar extrato:', error)
    return { success: false, transactions: [] }
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
