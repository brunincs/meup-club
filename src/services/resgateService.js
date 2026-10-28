// Serviço de Resgate de Experiências - Meup Club
// Debita pontos do saldo real no Supabase e registra a transação
// CORREÇÃO: Usa função RPC segura que roda no banco

import { supabase } from '@/lib/supabase'

/**
 * Resgata uma experiência (debita pontos do saldo do usuário)
 *
 * SEGURANÇA:
 * - Usa função RPC do banco (SECURITY DEFINER)
 * - Valida saldo no banco antes de debitar
 * - Registra transação com balance_before/after corretos
 *
 * @param {string} experienciaId - ID da experiência
 * @param {string} experienciaNome - Nome da experiência (para histórico)
 * @param {number} pontosNecessarios - Custo em pontos
 * @returns {Object} { success, error, novoSaldo }
 */
export async function resgatarExperiencia(experienciaId, experienciaNome, pontosNecessarios) {
  try {
    // Chamar função segura do banco que faz tudo atomicamente
    const { data, error } = await supabase.rpc('client_redeem_experience', {
      p_experience_id: experienciaId,
      p_experience_name: experienciaNome,
      p_points_cost: pontosNecessarios
    })

    if (error) {
      console.error('Erro ao resgatar experiência:', error)
      return {
        success: false,
        error: error.message || 'Erro ao processar o resgate.'
      }
    }

    // A função retorna um JSON com success/error
    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      novoSaldo: data.balance_after,
      message: 'Experiência resgatada com sucesso!'
    }

  } catch (error) {
    console.error('Erro inesperado no resgate:', error)
    return { success: false, error: 'Erro inesperado. Tente novamente.' }
  }
}

/**
 * Busca histórico de resgates do usuário
 * Usa função RPC para contornar RLS
 * @returns {Object} { success, resgates, error }
 */
export async function buscarHistoricoResgates() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não logado' }
    }

    // Usar função RPC que permite cliente ver seu próprio histórico
    const { data, error } = await supabase.rpc('client_get_my_transactions', {
      p_type_filter: 'redemption'
    })

    if (error) {
      console.error('Erro ao buscar histórico:', error)
      return { success: false, error: error.message }
    }

    return { success: true, resgates: data || [] }
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Verifica se uma experiência já foi resgatada pelo usuário
 * @param {string} experienciaId
 * @returns {boolean}
 */
export async function verificarJaResgatada(experienciaId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Usar função RPC para verificar
    const { data, error } = await supabase.rpc('client_check_redeemed', {
      p_experience_id: experienciaId
    })

    if (error) return false
    return data === true
  } catch {
    return false
  }
}

/**
 * Busca IDs das experiências já resgatadas pelo usuário
 * @returns {string[]} Array de IDs
 */
export async function buscarExperienciasResgatadas() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Usar função RPC para buscar IDs
    const { data, error } = await supabase.rpc('client_get_redeemed_ids')

    if (error) {
      console.error('Erro ao buscar resgatadas:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Erro ao buscar resgatadas:', err)
    return []
  }
}
