// ============================================
// SERVIÇO DE COTAÇÕES - Meup Club
// Gerencia cotações e validações
// ============================================

import { supabase } from '@/lib/supabase'

// ============================================
// FUNÇÕES PARA O CLIENTE
// ============================================

/**
 * Cria uma nova cotação
 */
export async function criarCotacao({ destino, dataIda, dataVolta, numPessoas, observacoes }) {
  try {
    const { data, error } = await supabase.rpc('client_criar_cotacao', {
      p_destino: destino,
      p_data_ida: dataIda,
      p_data_volta: dataVolta || null,
      p_num_pessoas: numPessoas || 1,
      p_observacoes: observacoes || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar cotação:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca as cotações do usuário logado
 */
export async function getMinhasCotacoes() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabase
      .from('cotacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, cotacoes: data || [] }
  } catch (error) {
    console.error('Erro ao buscar cotações:', error)
    return { success: false, cotacoes: [], error: error.message }
  }
}

// ============================================
// FUNÇÕES PARA O ADMIN
// ============================================

/**
 * Busca cotações pendentes
 */
export async function getCotacoesPendentes() {
  try {
    const { data, error } = await supabase.rpc('admin_get_cotacoes_pendentes')

    if (error) throw error
    return { success: true, cotacoes: data || [] }
  } catch (error) {
    console.error('Erro ao buscar cotações pendentes:', error)
    return { success: false, cotacoes: [], error: error.message }
  }
}

/**
 * Busca todas as cotações (admin)
 */
export async function getTodasCotacoes(status = null) {
  try {
    let query = supabase
      .from('cotacoes')
      .select(`
        *,
        user:user_id (
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

    // Formatar dados
    const cotacoes = (data || []).map(c => ({
      ...c,
      user_name: c.user?.name || 'Desconhecido',
      user_email: c.user?.email || ''
    }))

    return { success: true, cotacoes }
  } catch (error) {
    console.error('Erro ao buscar cotações:', error)
    return { success: false, cotacoes: [], error: error.message }
  }
}

/**
 * Valida uma cotação
 */
export async function validarCotacao(cotacaoId, { destino, dataIda, dataVolta, numPessoas }) {
  try {
    const { data, error } = await supabase.rpc('admin_validar_cotacao', {
      p_cotacao_id: cotacaoId,
      p_destino: destino || null,
      p_data_ida: dataIda || null,
      p_data_volta: dataVolta || null,
      p_num_pessoas: numPessoas || null
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao validar cotação:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Reverte uma cotação validada (estorna pontos)
 */
export async function reverterCotacao(cotacaoId, motivo) {
  try {
    const { data, error } = await supabase.rpc('admin_reverter_cotacao', {
      p_cotacao_id: cotacaoId,
      p_motivo: motivo || 'Reversão administrativa'
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao reverter cotação:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// FUNÇÕES DE GANHOS PERDIDOS (Free users)
// ============================================

/**
 * Busca ganhos perdidos do usuário
 */
export async function getMissedEarnings() {
  try {
    const { data, error } = await supabase.rpc('get_missed_earnings')
    if (error) throw error
    return { success: true, earnings: data || [] }
  } catch (error) {
    console.error('Erro ao buscar ganhos perdidos:', error)
    return { success: false, earnings: [], error: error.message }
  }
}

/**
 * Busca total de ganhos perdidos
 */
export async function getTotalMissedEarnings() {
  try {
    const { data, error } = await supabase.rpc('get_total_missed_earnings')
    if (error) throw error
    return { success: true, total: data || 0 }
  } catch (error) {
    console.error('Erro ao buscar total:', error)
    return { success: false, total: 0, error: error.message }
  }
}

/**
 * Marca ganhos perdidos como visualizados
 */
export async function markMissedEarningsViewed() {
  try {
    const { error } = await supabase.rpc('mark_missed_earnings_viewed')
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Erro ao marcar como visualizado:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// FUNÇÕES DE ETAPAS DE INDICAÇÃO
// ============================================

/**
 * Busca etapas de indicação por amigo
 */
export async function getReferralSteps() {
  try {
    const { data, error } = await supabase.rpc('get_referral_steps')
    if (error) throw error
    return { success: true, steps: data || [] }
  } catch (error) {
    console.error('Erro ao buscar etapas:', error)
    return { success: false, steps: [], error: error.message }
  }
}

// ============================================
// FORMATTERS
// ============================================

export function formatCotacaoStatus(status) {
  const statusMap = {
    pendente: {
      label: 'Pendente',
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      border: 'border-amber-200'
    },
    validada: {
      label: 'Validada',
      color: 'text-green-600',
      bg: 'bg-green-100',
      border: 'border-green-200'
    },
    cancelada: {
      label: 'Cancelada',
      color: 'text-red-600',
      bg: 'bg-red-100',
      border: 'border-red-200'
    }
  }
  return statusMap[status] || statusMap.pendente
}

export function formatCotacaoDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  })
}
