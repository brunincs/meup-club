// ══════════════════════════════════════════════════════════════════════════════
// Subscription Service - Meup Club
// ══════════════════════════════════════════════════════════════════════════════
// Gerencia planos Free e Meup Prime
// IMPORTANTE: Plano é SEPARADO de classe. Classe = pontos. Plano = assinatura.
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabase'

// ══════════════════════════════════════════════════════════════════════════════
// TIPOS (para referência)
// ══════════════════════════════════════════════════════════════════════════════
// plano: 'free' | 'prime'
// ciclo: 'mensal' | 'anual' | null
// status: 'active' | 'canceled' | 'past_due' | 'expired'

// ══════════════════════════════════════════════════════════════════════════════
// BUSCAR BENEFÍCIOS DO USUÁRIO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Busca os benefícios efetivos do usuário (plano + config aplicada)
 * Esta é a função principal para saber o que o usuário tem direito
 */
export async function fetchUserBenefits(userId) {
  try {
    const { data, error } = await supabase
      .rpc('get_user_benefits', { p_user_id: userId })
      .single()

    if (error) throw error

    return {
      success: true,
      benefits: {
        plano: data.plano,
        ciclo: data.ciclo,
        multiplicadorViagem: parseFloat(data.multiplicador_viagem),
        pontosIndicacao: data.pontos_indicacao,
        pontosAniversario: data.pontos_aniversario,
        pontosCheckin: data.pontos_checkin,
        lancamentoModo: data.lancamento_modo,
        isPrime: data.is_prime,
        isAnual: data.is_anual
      }
    }
  } catch (error) {
    console.error('Erro ao buscar benefícios:', error)
    // Retorna valores Free como fallback
    return {
      success: false,
      error: error.message,
      benefits: {
        plano: 'free',
        ciclo: null,
        multiplicadorViagem: 1.0,
        pontosIndicacao: 3000,
        pontosAniversario: 0,
        pontosCheckin: 10,
        lancamentoModo: 'manual',
        isPrime: false,
        isAnual: false
      }
    }
  }
}

/**
 * Busca a assinatura do usuário atual
 */
export async function fetchMySubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Se não tem assinatura, é free
    if (error && error.code === 'PGRST116') {
      return {
        success: true,
        subscription: null,
        plano: 'free',
        ciclo: null
      }
    }

    if (error) throw error

    return {
      success: true,
      subscription: data,
      plano: data.plano,
      ciclo: data.ciclo
    }
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error)
    return { success: false, error: error.message, subscription: null }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BUSCAR CONFIGURAÇÃO DOS PLANOS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Busca todas as configurações de planos (para exibir na UI)
 * Usa função RPC get_planos_config para retornar estrutura padronizada
 */
export async function fetchPlanosConfig() {
  try {
    const { data, error } = await supabase.rpc('get_planos_config')

    if (error) throw error

    // data já vem no formato { free: {...}, prime: {...}, config: {...} }
    const planos = {
      free: {
        nome: data.free?.nome || 'Free',
        descricao: data.free?.descricao || 'Acesso básico ao clube',
        pontosCheckin: data.free?.pontosCheckin || 10,
        pontosIndicacao: data.free?.pontosIndicacao || 3000,
        multiplicadorViagem: data.free?.multiplicadorViagem || 1.0,
        fatorPontos: data.free?.fatorPontos || 150
      },
      prime: {
        nome: data.prime?.nome || 'Prime',
        descricao: data.prime?.descricao || 'Benefícios exclusivos',
        pontosCheckin: data.prime?.pontosCheckin || 30,
        pontosIndicacao: data.prime?.pontosIndicacao || 5000,
        multiplicadorViagem: data.prime?.multiplicadorViagem || 1.5,
        fatorPontos: data.prime?.fatorPontos || 130,
        pontosAnualIndicador: data.prime?.pontosAnualIndicador || 3000,
        pontosAnualIndicado: data.prime?.pontosAnualIndicado || 1000
      },
      config: {
        diasBloqueio: data.config?.diasBloqueio || 7
      }
    }

    return { success: true, planos }
  } catch (error) {
    console.error('Erro ao buscar config de planos:', error)
    // Retorna valores default como fallback
    return {
      success: false,
      error: error.message,
      planos: {
        free: { nome: 'Free', pontosCheckin: 10, pontosIndicacao: 3000, multiplicadorViagem: 1.0, fatorPontos: 150 },
        prime: { nome: 'Prime', pontosCheckin: 30, pontosIndicacao: 5000, multiplicadorViagem: 1.5, fatorPontos: 130 }
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se o usuário tem Prime ativo
 */
export async function isPrimeActive(userId) {
  const result = await fetchUserBenefits(userId)
  return result.benefits.isPrime
}

/**
 * Formata o ciclo para exibição (apenas anual disponível)
 */
export function formatCiclo(ciclo) {
  return ciclo === 'anual' ? 'Anual' : ciclo
}

/**
 * Formata o status para exibição
 */
export function formatStatus(status) {
  const map = {
    active: 'Ativo',
    canceled: 'Cancelado',
    past_due: 'Pagamento Pendente',
    expired: 'Expirado'
  }
  return map[status] || status
}

/**
 * Calcula dias restantes da assinatura
 */
export function getDaysRemaining(periodEnd) {
  if (!periodEnd) return null
  const end = new Date(periodEnd)
  const now = new Date()
  const diffMs = end - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: ATIVAÇÃO MANUAL
// ══════════════════════════════════════════════════════════════════════════════
// IMPORTANTE: Estas mesmas funções serão chamadas pelo webhook do gateway.

/**
 * Ativa Meup Prime para um usuário (admin only)
 * @param {string} userId - ID do usuário
 * @param {string} ciclo - 'mensal' ou 'anual'
 * @param {string} origem - 'manual' (padrão), 'webhook', 'migration'
 * @param {string} origemRef - Referência adicional (admin_id, webhook_id, etc.)
 */
export async function ativarPrime(userId, ciclo, origem = 'manual', origemRef = null) {
  try {
    const { data, error } = await supabase.rpc('ativar_prime', {
      p_user_id: userId,
      p_ciclo: ciclo,
      p_origem: origem,
      p_origem_ref: origemRef,
      p_provider: null,
      p_provider_subscription_id: null
    })

    if (error) throw error

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      subscriptionId: data.subscription_id,
      plano: data.plano,
      ciclo: data.ciclo,
      periodEnd: data.period_end
    }
  } catch (error) {
    console.error('Erro ao ativar Prime:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancela Meup Prime (volta para Free)
 * @param {string} userId - ID do usuário
 * @param {string} origem - 'manual' (padrão), 'webhook'
 * @param {string} origemRef - Referência adicional
 */
export async function cancelarPrime(userId, origem = 'manual', origemRef = null) {
  try {
    const { data, error } = await supabase.rpc('cancelar_prime', {
      p_user_id: userId,
      p_origem: origem,
      p_origem_ref: origemRef
    })

    if (error) throw error

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      plano: data.plano,
      previousCiclo: data.previous_ciclo
    }
  } catch (error) {
    console.error('Erro ao cancelar Prime:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca status completo da assinatura de um usuário (admin)
 */
export async function fetchSubscriptionStatus(userId) {
  try {
    const { data, error } = await supabase.rpc('get_subscription_status', {
      p_user_id: userId
    })

    if (error) throw error

    return {
      success: true,
      status: {
        plano: data.plano,
        ciclo: data.ciclo,
        status: data.status,
        startedAt: data.started_at,
        periodEnd: data.period_end,
        daysRemaining: data.days_remaining,
        isPrime: data.is_prime,
        isAnual: data.is_anual,
        multiplicadorViagem: parseFloat(data.multiplicador_viagem || '1'),
        pontosCheckin: data.pontos_checkin,
        pontosIndicacao: data.pontos_indicacao,
        pontosAniversario: data.pontos_aniversario
      }
    }
  } catch (error) {
    console.error('Erro ao buscar status da assinatura:', error)
    return { success: false, error: error.message, status: null }
  }
}

/**
 * Confirma Prime Anual e processa bônus de indicação
 * Pontos ficam pendentes por 7 dias (período de arrependimento)
 */
export async function confirmarPrimeAnual(subscriptionId) {
  try {
    const { data, error } = await supabase.rpc('admin_confirmar_prime_anual', {
      p_subscription_id: subscriptionId
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao confirmar Prime Anual:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancela pontos pendentes de uma assinatura (arrependimento)
 */
export async function cancelarPontosPendentes(subscriptionId, motivo) {
  try {
    const { data, error } = await supabase.rpc('cancelar_pontos_pendentes_assinatura', {
      p_subscription_id: subscriptionId,
      p_motivo: motivo || 'Cancelamento no período de arrependimento'
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao cancelar pontos pendentes:', error)
    return { success: false, error: error.message }
  }
}
