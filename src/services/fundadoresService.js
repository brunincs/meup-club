// ============================================
// SERVIÇO DE FUNDADORES - Meup Club
// Gerencia a Ação Fundadores (100 primeiros anuais)
// ============================================

import { supabase } from '@/lib/supabase'

/**
 * Busca dados do fundador do usuário atual
 */
export async function getMyFundadorData() {
  try {
    const { data, error } = await supabase.rpc('get_my_fundador_data')

    if (error) throw error
    return { success: true, ...data }
  } catch (error) {
    console.error('Erro ao buscar dados de fundador:', error)
    return { success: false, is_fundador: false, error: error.message }
  }
}

/**
 * Busca contagem de vagas de fundador
 */
export async function getFundadoresCount() {
  try {
    const { data, error } = await supabase.rpc('get_fundadores_count')

    if (error) throw error
    return {
      success: true,
      vagas_usadas: data?.[0]?.vagas_usadas || 0,
      vagas_total: data?.[0]?.vagas_total || 100,
      vagas_disponiveis: data?.[0]?.vagas_disponiveis || 100
    }
  } catch (error) {
    console.error('Erro ao buscar vagas:', error)
    return { success: false, vagas_usadas: 0, vagas_total: 100, vagas_disponiveis: 100 }
  }
}

/**
 * Busca pontos pendentes do usuário
 */
export async function getMyPendingPoints() {
  try {
    const { data, error } = await supabase.rpc('get_my_pending_points')

    if (error) throw error
    return { success: true, pending: data || [] }
  } catch (error) {
    console.error('Erro ao buscar pontos pendentes:', error)
    return { success: false, pending: [] }
  }
}

/**
 * Busca preço atual do lote de fundador
 * Retorna lote_numero, preco, vagas_restantes
 */
export async function getPrecoFundadorAtual() {
  try {
    const { data, error } = await supabase.rpc('get_preco_fundador_atual')

    if (error) throw error

    const loteData = data?.[0] || {}
    return {
      success: true,
      lote_numero: loteData.lote_numero || 1,
      preco: parseFloat(loteData.preco) || 497,
      vagas_restantes: loteData.vagas_restantes || 0,
      total_vendidas: loteData.total_vendidas || 0
    }
  } catch (error) {
    console.error('Erro ao buscar preço do lote:', error)
    return { success: false, lote_numero: 1, preco: 497, vagas_restantes: 100 }
  }
}

/**
 * Busca URL do regulamento
 */
export async function getRegulamentoUrl() {
  try {
    const { data, error } = await supabase
      .from('plano_config')
      .select('valor_texto')
      .eq('chave', 'fundador_regulamento_url')
      .single()

    if (error) throw error
    return data?.valor_texto || 'https://meup.club/regulamento-fundadores'
  } catch (error) {
    return 'https://meup.club/regulamento-fundadores'
  }
}

// ============================================
// ADMIN
// ============================================

/**
 * Lista todos os fundadores (admin)
 */
export async function adminGetFundadores() {
  try {
    const { data, error } = await supabase.rpc('admin_get_fundadores')

    if (error) throw error
    return { success: true, fundadores: data || [] }
  } catch (error) {
    console.error('Erro ao buscar fundadores:', error)
    return { success: false, fundadores: [], error: error.message }
  }
}

/**
 * Registra ganhador da Ação Fundadores (admin)
 */
export async function adminRegistrarGanhador(fundadorId) {
  try {
    const { data, error } = await supabase.rpc('admin_registrar_ganhador_fundadores', {
      p_fundador_id: fundadorId
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao registrar ganhador:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancela assinatura no período de arrependimento (admin)
 */
export async function adminCancelarArrependimento(userId, motivo) {
  try {
    const { data, error } = await supabase.rpc('cancelar_prime_arrependimento', {
      p_user_id: userId,
      p_motivo: motivo || 'Cancelamento no período de arrependimento'
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao cancelar:', error)
    return { success: false, error: error.message }
  }
}
