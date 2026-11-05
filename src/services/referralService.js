// ============================================
// SERVIÇO DE INDICAÇÕES - Meup Club
// Gerencia todo o fluxo de indicações
// ============================================

import { supabase } from '@/lib/supabase'

// Constante de pontos (também está no banco, mas mantemos aqui para referência)
export const PONTOS_POR_INDICACAO = 3000

// ============================================
// FUNÇÕES PARA O CLIENTE (PORTAL)
// ============================================

/**
 * Busca o código de indicação do usuário logado
 * @param {string} userId - ID do usuário
 * @returns {Promise<{code: string, link: string}>}
 */
export async function getMyReferralCode(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single()

    if (error) throw error

    const code = data?.referral_code || ''
    const link = code ? `${window.location.origin}/cadastro?ref=${code}` : ''

    return { success: true, code, link }
  } catch (error) {
    console.error('Erro ao buscar código de indicação:', error)
    return { success: false, code: '', link: '', error: error.message }
  }
}

/**
 * Busca as indicações feitas pelo usuário (minhas indicações)
 * @param {string} userId - ID do indicador
 * @returns {Promise<Array>}
 */
export async function getMyReferrals(userId) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        id,
        status,
        points_awarded,
        created_at,
        referred:referred_id (
          id,
          name,
          email
        )
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      referrals: data || [],
      stats: {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === 'pending').length || 0,
        approved: data?.filter(r => r.status === 'approved').length || 0,
        rejected: data?.filter(r => r.status === 'rejected').length || 0
      }
    }
  } catch (error) {
    console.error('Erro ao buscar indicações:', error)
    return {
      success: false,
      referrals: [],
      stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
      error: error.message
    }
  }
}

/**
 * Valida código de indicação usando função RPC segura
 * - Funciona mesmo SEM estar logado (para página de cadastro)
 * - Retorna apenas: válido (bool), ID do indicador, primeiro nome
 * - NÃO expõe: email, CPF, pontos ou outros dados sensíveis
 *
 * @param {string} code - Código de indicação (ex: MEUP85F3)
 * @returns {Promise<{success: boolean, referrerId: string|null, referrerName: string|null}>}
 */
export async function getReferrerByCode(code) {
  if (!code || code.length < 4) {
    return { success: false, referrerId: null, referrerName: null }
  }

  try {
    // Usa função RPC segura (não expõe dados sensíveis)
    const { data, error } = await supabase
      .rpc('validate_referral_code', { p_code: code.trim() })

    if (error) {
      console.error('Erro ao validar código:', error)
      return { success: false, referrerId: null, referrerName: null }
    }

    // A função retorna: { valid, referrer_id, referrer_first_name }
    if (!data || !data.valid) {
      return { success: false, referrerId: null, referrerName: null }
    }

    return {
      success: true,
      referrerId: data.referrer_id,
      referrerName: data.referrer_first_name // Apenas primeiro nome (segurança)
    }
  } catch (error) {
    console.error('Erro ao buscar indicador:', error)
    return { success: false, referrerId: null, referrerName: null, error: error.message }
  }
}

/**
 * Cria uma indicação pendente (chamado após cadastro com código)
 * @param {string} referrerId - ID de quem indicou
 * @param {string} referredId - ID de quem foi indicado
 * @returns {Promise<{success: boolean}>}
 */
export async function createReferral(referrerId, referredId) {
  // Validações básicas
  if (!referrerId || !referredId) {
    return { success: false, error: 'IDs inválidos' }
  }

  if (referrerId === referredId) {
    return { success: false, error: 'Não é permitido se auto-indicar' }
  }

  try {
    // Verificar se já existe indicação para este usuário
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', referredId)
      .single()

    if (existing) {
      return { success: false, error: 'Usuário já foi indicado anteriormente' }
    }

    // Criar a indicação
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: referredId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Atualizar o referred_by no perfil do indicado
    await supabase
      .from('profiles')
      .update({ referred_by: referrerId, updated_at: new Date().toISOString() })
      .eq('id', referredId)

    return { success: true, referral: data }
  } catch (error) {
    console.error('Erro ao criar indicação:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// FUNÇÕES PARA O ADMIN
// ============================================

/**
 * Busca todas as indicações (para admin)
 * @param {string} status - Filtrar por status (opcional)
 * @returns {Promise<Array>}
 */
export async function getAllReferrals(status = null) {
  try {
    let query = supabase
      .from('referrals')
      .select(`
        id,
        status,
        points_awarded,
        processed_at,
        created_at,
        referrer:referrer_id (
          id,
          name,
          email
        ),
        referred:referred_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      referrals: data || [],
      stats: {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === 'pending').length || 0,
        approved: data?.filter(r => r.status === 'approved').length || 0,
        rejected: data?.filter(r => r.status === 'rejected').length || 0
      }
    }
  } catch (error) {
    console.error('Erro ao buscar indicações:', error)
    return {
      success: false,
      referrals: [],
      stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
      error: error.message
    }
  }
}

/**
 * Busca indicações pendentes (para admin)
 * @returns {Promise<Array>}
 */
export async function getPendingReferrals() {
  return getAllReferrals('pending')
}

/**
 * Aprova uma indicação e credita os pontos
 * @param {string} referralId - ID da indicação
 * @returns {Promise<{success: boolean, points_awarded: number}>}
 */
export async function approveReferral(referralId) {
  try {
    // Buscar a indicação
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('*, referrer:referrer_id(id, name, points)')
      .eq('id', referralId)
      .single()

    if (fetchError) throw fetchError

    if (!referral) {
      return { success: false, error: 'Indicação não encontrada' }
    }

    if (referral.status !== 'pending') {
      return { success: false, error: 'Indicação já foi processada' }
    }

    // 1. Atualizar a indicação para aprovada
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        status: 'approved',
        points_awarded: PONTOS_POR_INDICACAO,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', referralId)

    if (updateError) throw updateError

    // 2. Creditar pontos ao indicador
    // Primeiro buscar o valor atual de total_referrals
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('points, total_referrals')
      .eq('id', referral.referrer_id)
      .single()

    const currentPoints = referrerProfile?.points || 0
    const currentReferrals = referrerProfile?.total_referrals || 0

    const { error: pointsError } = await supabase
      .from('profiles')
      .update({
        points: currentPoints + PONTOS_POR_INDICACAO,
        total_referrals: currentReferrals + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', referral.referrer_id)

    if (pointsError) throw pointsError

    const newPoints = currentPoints + PONTOS_POR_INDICACAO

    // 3. Registrar no histórico de transações
    const { error: txError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: referral.referrer_id,
        amount: PONTOS_POR_INDICACAO,
        type: 'referral',
        reason: 'Indicação aprovada',
        reference_id: referralId
      })

    if (txError) {
      console.warn('Erro ao registrar transação (não crítico):', txError)
    }

    return {
      success: true,
      points_awarded: PONTOS_POR_INDICACAO,
      referrer_id: referral.referrer_id,
      new_balance: newPoints
    }
  } catch (error) {
    console.error('Erro ao aprovar indicação:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Rejeita uma indicação (não credita pontos)
 * @param {string} referralId - ID da indicação
 * @returns {Promise<{success: boolean}>}
 */
export async function rejectReferral(referralId) {
  try {
    // Buscar a indicação
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('status')
      .eq('id', referralId)
      .single()

    if (fetchError) throw fetchError

    if (!referral) {
      return { success: false, error: 'Indicação não encontrada' }
    }

    if (referral.status !== 'pending') {
      return { success: false, error: 'Indicação já foi processada' }
    }

    // Atualizar para rejeitada
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', referralId)

    if (updateError) throw updateError

    return { success: true }
  } catch (error) {
    console.error('Erro ao rejeitar indicação:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Formata status para exibição
 * @param {string} status - pending | approved | rejected
 * @returns {object} - { label, color, bg }
 */
export function formatReferralStatus(status) {
  const statusMap = {
    pending: {
      label: 'Pendente',
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      border: 'border-amber-200'
    },
    approved: {
      label: 'Aprovada',
      color: 'text-green-600',
      bg: 'bg-green-100',
      border: 'border-green-200'
    },
    rejected: {
      label: 'Rejeitada',
      color: 'text-red-600',
      bg: 'bg-red-100',
      border: 'border-red-200'
    }
  }
  return statusMap[status] || statusMap.pending
}

/**
 * Formata data para exibição
 * @param {string} dateStr - Data ISO
 * @returns {string} - Data formatada
 */
export function formatReferralDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
