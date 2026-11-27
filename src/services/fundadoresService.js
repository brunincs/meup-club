// ============================================
// SERVIÇO DE FUNDADORES - Meup Club
// Gerencia fundadores do Modelo Exclusivo 2026
// 30 vagas Prime a R$597/ano
// ============================================

import { supabase } from '@/lib/supabase'

// Constantes do modelo exclusivo
const VAGAS_FUNDADOR = 30
const PRECO_FUNDADOR = 597

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
 * Busca contagem de vagas de fundador (simplificado - sem lotes)
 */
export async function getFundadoresCount() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('is_fundador', true)
      .not('fundador_numero', 'is', null)

    if (error) throw error

    const vagasUsadas = data?.length || 0

    return {
      success: true,
      vagas_usadas: vagasUsadas,
      vagas_total: VAGAS_FUNDADOR,
      vagas_disponiveis: Math.max(0, VAGAS_FUNDADOR - vagasUsadas)
    }
  } catch (error) {
    console.error('Erro ao buscar vagas:', error)
    return {
      success: false,
      vagas_usadas: 0,
      vagas_total: VAGAS_FUNDADOR,
      vagas_disponiveis: VAGAS_FUNDADOR
    }
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
 * Busca preço Prime (simplificado - preço único)
 * Mantém compatibilidade com componentes que usavam getPrecoFundadorAtual
 */
export async function getPrecoFundadorAtual() {
  try {
    const countResult = await getFundadoresCount()
    const vagasUsadas = countResult.vagas_usadas || 0
    const vagasRestantes = Math.max(0, VAGAS_FUNDADOR - vagasUsadas)

    return {
      success: true,
      // Compatibilidade com código legado (sem lotes)
      lote_numero: 1,
      preco: PRECO_FUNDADOR,
      vagas_restantes: vagasRestantes,
      total_vendidas: vagasUsadas,
      vagas_lote: VAGAS_FUNDADOR,
      vendidas_lote: vagasUsadas,
      preco_proximo: null,
      is_ultimo_lote: true,
      esgotado: vagasRestantes <= 0
    }
  } catch (error) {
    console.error('Erro ao buscar preço:', error)
    return {
      success: false,
      lote_numero: 1,
      preco: PRECO_FUNDADOR,
      vagas_restantes: VAGAS_FUNDADOR,
      total_vendidas: 0,
      vagas_lote: VAGAS_FUNDADOR,
      vendidas_lote: 0,
      preco_proximo: null,
      is_ultimo_lote: true,
      esgotado: false
    }
  }
}

/**
 * Busca URL do regulamento
 */
export async function getRegulamentoUrl() {
  try {
    const { data, error } = await supabase
      .from('plano_config')
      .select('value')
      .eq('key', 'fundador_regulamento_url')
      .single()

    if (error) {
      // Tenta formato antigo
      const { data: oldData } = await supabase
        .from('plano_config')
        .select('valor_texto')
        .eq('chave', 'fundador_regulamento_url')
        .single()

      return oldData?.valor_texto || 'https://meup.club/regulamento-fundadores'
    }

    return data?.value || 'https://meup.club/regulamento-fundadores'
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
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        fundador_numero,
        fundador_numero_sorte,
        is_fundador,
        created_at,
        subscriptions (
          plano,
          status,
          started_at
        )
      `)
      .eq('is_fundador', true)
      .not('fundador_numero', 'is', null)
      .order('fundador_numero', { ascending: true })

    if (error) throw error
    return { success: true, fundadores: data || [] }
  } catch (error) {
    console.error('Erro ao buscar fundadores:', error)
    return { success: false, fundadores: [], error: error.message }
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

/**
 * Busca estatísticas de fundadores (admin)
 */
export async function adminGetFundadoresStats() {
  try {
    const { data: fundadores, error } = await supabase
      .from('profiles')
      .select('id, fundador_numero, prime_via_convite, created_at')
      .eq('is_fundador', true)
      .not('fundador_numero', 'is', null)

    if (error) throw error

    const total = fundadores?.length || 0

    return {
      success: true,
      total_fundadores: total,
      vagas_restantes: Math.max(0, VAGAS_FUNDADOR - total),
      vagas_total: VAGAS_FUNDADOR,
      preco: PRECO_FUNDADOR,
      esgotado: total >= VAGAS_FUNDADOR
    }
  } catch (error) {
    console.error('Erro ao buscar stats:', error)
    return { success: false, error: error.message }
  }
}
