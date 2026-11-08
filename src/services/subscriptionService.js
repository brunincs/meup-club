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
 */
export async function fetchPlanosConfig() {
  try {
    const { data, error } = await supabase
      .from('plano_config')
      .select('*')
      .order('plano')

    if (error) throw error

    // Mapear para formato mais amigável
    const planos = {}
    for (const p of data) {
      planos[p.plano] = {
        nome: p.nome_exibicao,
        descricao: p.descricao,
        precoMensal: p.preco_mensal,
        precoAnual: p.preco_anual,
        multiplicadorViagem: parseFloat(p.multiplicador_viagem),
        multiplicadorSoAnual: p.multiplicador_viagem_so_anual,
        pontosIndicacao: p.pontos_indicacao,
        pontosAniversario: p.pontos_aniversario,
        pontosCheckin: p.pontos_checkin,
        lancamentoModo: p.lancamento_modo
      }
    }

    return { success: true, planos }
  } catch (error) {
    console.error('Erro ao buscar config de planos:', error)
    return { success: false, error: error.message, planos: {} }
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
 * Formata o ciclo para exibição
 */
export function formatCiclo(ciclo) {
  const map = {
    mensal: 'Mensal',
    anual: 'Anual'
  }
  return map[ciclo] || ciclo
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
