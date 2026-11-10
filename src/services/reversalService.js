// ============================================
// SERVIÇO DE REVERSÃO - Admin
// Estornar transações, reabrir rejeições, reverter aprovações
// ============================================

import { supabase } from '@/lib/supabase'

// ============================================
// ESTORNAR TRANSAÇÃO
// Cria lançamento negativo, marca original como estornado
// ============================================
export async function estornarTransacao(transactionId, motivo) {
  try {
    const { data, error } = await supabase.rpc('estornar_transacao', {
      p_transaction_id: transactionId,
      p_motivo: motivo
    })

    if (error) {
      console.error('Erro ao estornar transação:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      estornoId: data.estorno_id,
      amountEstornado: data.amount_estornado,
      balanceBefore: data.balance_before,
      balanceAfter: data.balance_after
    }
  } catch (error) {
    console.error('Erro ao estornar transação:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// REABRIR INDICAÇÃO REJEITADA
// ============================================
export async function reabrirIndicacao(referralId, motivo) {
  try {
    const { data, error } = await supabase.rpc('reabrir_indicacao', {
      p_referral_id: referralId,
      p_motivo: motivo
    })

    if (error) {
      console.error('Erro ao reabrir indicação:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { success: true, newStatus: data.new_status }
  } catch (error) {
    console.error('Erro ao reabrir indicação:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// REABRIR EMISSÃO RECUSADA
// ============================================
export async function reabrirEmissao(emissaoId, motivo) {
  try {
    const { data, error } = await supabase.rpc('reabrir_emissao', {
      p_emissao_id: emissaoId,
      p_motivo: motivo
    })

    if (error) {
      console.error('Erro ao reabrir emissão:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { success: true, newStatus: data.new_status }
  } catch (error) {
    console.error('Erro ao reabrir emissão:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// REABRIR RESGATE REJEITADO
// ============================================
export async function reabrirResgate(resgateId, motivo) {
  try {
    const { data, error } = await supabase.rpc('reabrir_resgate', {
      p_resgate_id: resgateId,
      p_motivo: motivo
    })

    if (error) {
      console.error('Erro ao reabrir resgate:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { success: true, newStatus: data.new_status }
  } catch (error) {
    console.error('Erro ao reabrir resgate:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// REVERTER APROVAÇÃO DE INDICAÇÃO
// Estorna pontos e muda status para "reverted"
// ============================================
export async function reverterAprovacaoIndicacao(referralId, motivo) {
  try {
    const { data, error } = await supabase.rpc('reverter_aprovacao_indicacao', {
      p_referral_id: referralId,
      p_motivo: motivo
    })

    if (error) {
      console.error('Erro ao reverter indicação:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      newStatus: data.new_status,
      pointsEstornados: data.points_estornados
    }
  } catch (error) {
    console.error('Erro ao reverter indicação:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// REVERTER APROVAÇÃO DE EMISSÃO
// Estorna pontos e muda status para "revertida"
// ============================================
export async function reverterAprovacaoEmissao(emissaoId, motivo) {
  try {
    const { data, error } = await supabase.rpc('reverter_aprovacao_emissao', {
      p_emissao_id: emissaoId,
      p_motivo: motivo
    })

    if (error) {
      console.error('Erro ao reverter emissão:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      newStatus: data.new_status,
      pointsEstornados: data.points_estornados
    }
  } catch (error) {
    console.error('Erro ao reverter emissão:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// REVERTER APROVAÇÃO DE RESGATE
// DEVOLVE os pontos ao cliente
// ============================================
export async function reverterAprovacaoResgate(resgateId, motivo) {
  try {
    const { data, error } = await supabase.rpc('reverter_aprovacao_resgate', {
      p_resgate_id: resgateId,
      p_motivo: motivo
    })

    if (error) {
      console.error('Erro ao reverter resgate:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      newStatus: data.new_status,
      pointsDevolvidos: data.points_devolvidos,
      balanceAfter: data.balance_after
    }
  } catch (error) {
    console.error('Erro ao reverter resgate:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// BUSCAR HISTÓRICO DE TRANSAÇÕES DO CLIENTE
// Para o admin ver e poder estornar
// ============================================
export async function fetchHistoricoCliente(userId) {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar histórico:', error)
      return { success: false, error: error.message, transactions: [] }
    }

    return { success: true, transactions: data || [] }
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return { success: false, error: error.message, transactions: [] }
  }
}

// ============================================
// FORMATAR STATUS DE REVERSÃO
// ============================================
export function formatReversalStatus(status) {
  const statusMap = {
    reverted: { label: 'Revertida', color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
    revertida: { label: 'Revertida', color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
    revertido: { label: 'Revertido', color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' }
  }
  return statusMap[status] || null
}
