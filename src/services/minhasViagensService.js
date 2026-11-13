// ============================================
// SERVIÇO: Minhas Viagens - Área do Cliente
// ============================================

import { supabase } from '@/lib/supabase'

/**
 * Busca viagens do cliente logado
 * @param {'proximas' | 'realizadas' | null} status - Filtro de status
 * @returns {Promise<{success: boolean, viagens?: Array, error?: string}>}
 */
export async function getMinhasViagens(status = null) {
  try {
    const { data, error } = await supabase.rpc('get_minhas_viagens', {
      p_status: status
    })

    if (error) {
      console.error('[getMinhasViagens] Erro:', error)
      return { success: false, error: error.message, viagens: [] }
    }

    return { success: true, viagens: data || [] }
  } catch (error) {
    console.error('[getMinhasViagens] Exceção:', error)
    return { success: false, error: error.message, viagens: [] }
  }
}

/**
 * Busca próxima viagem (para widget do dashboard)
 * @returns {Promise<{success: boolean, viagem?: Object, error?: string}>}
 */
export async function getProximaViagem() {
  try {
    const { data, error } = await supabase.rpc('get_proxima_viagem')

    if (error) {
      console.error('[getProximaViagem] Erro:', error)
      return { success: false, error: error.message }
    }

    // RPC retorna array, pegar primeiro
    const viagem = Array.isArray(data) ? data[0] : data
    return { success: true, viagem: viagem || null }
  } catch (error) {
    console.error('[getProximaViagem] Exceção:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca viagens para o calendário (mês específico)
 * @param {number} ano
 * @param {number} mes - 1-12
 * @returns {Promise<{success: boolean, viagens?: Array, error?: string}>}
 */
export async function getViagensCalendario(ano, mes) {
  try {
    const { data, error } = await supabase.rpc('get_viagens_calendario', {
      p_ano: ano,
      p_mes: mes
    })

    if (error) {
      console.error('[getViagensCalendario] Erro:', error)
      return { success: false, error: error.message, viagens: [] }
    }

    return { success: true, viagens: data || [] }
  } catch (error) {
    console.error('[getViagensCalendario] Exceção:', error)
    return { success: false, error: error.message, viagens: [] }
  }
}

/**
 * Busca detalhes completos de uma viagem (incluindo voos e passageiros)
 * @param {string} viagemId
 * @returns {Promise<{success: boolean, viagem?: Object, error?: string}>}
 */
export async function getViagemCompleta(viagemId) {
  try {
    const { data, error } = await supabase.rpc('get_viagem_completa', {
      p_viagem_id: viagemId
    })

    if (error) {
      console.error('[getViagemCompleta] Erro:', error)
      return { success: false, error: error.message }
    }

    return { success: true, viagem: data }
  } catch (error) {
    console.error('[getViagemCompleta] Exceção:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca resgates vinculados a uma viagem
 * @param {string} viagemId
 * @returns {Promise<{success: boolean, resgates?: Array, error?: string}>}
 */
export async function getResgatesViagem(viagemId) {
  try {
    const { data, error } = await supabase.rpc('get_resgates_viagem', {
      p_viagem_id: viagemId
    })

    if (error) {
      console.error('[getResgatesViagem] Erro:', error)
      return { success: false, error: error.message, resgates: [] }
    }

    return { success: true, resgates: data || [] }
  } catch (error) {
    console.error('[getResgatesViagem] Exceção:', error)
    return { success: false, error: error.message, resgates: [] }
  }
}

/**
 * Busca viagens disponíveis para seleção em resgate
 * @returns {Promise<{success: boolean, viagens?: Array, error?: string}>}
 */
export async function getViagensParaResgate() {
  try {
    const { data, error } = await supabase.rpc('get_viagens_para_resgate')

    if (error) {
      console.error('[getViagensParaResgate] Erro:', error)
      return { success: false, error: error.message, viagens: [] }
    }

    return { success: true, viagens: data || [] }
  } catch (error) {
    console.error('[getViagensParaResgate] Exceção:', error)
    return { success: false, error: error.message, viagens: [] }
  }
}

/**
 * Gera signed URL para o PDF do card Meup
 * @param {string} cardPath - Caminho do arquivo no bucket
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function getCardSignedUrl(cardPath) {
  try {
    if (!cardPath) {
      return { success: false, error: 'Caminho do card não informado' }
    }

    const { data, error } = await supabase.storage
      .from('cards-meup')
      .createSignedUrl(cardPath, 600) // 10 minutos

    if (error) {
      console.error('[getCardSignedUrl] Erro:', error)
      return { success: false, error: error.message }
    }

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error('[getCardSignedUrl] Exceção:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca resgates de assento para voos de uma viagem
 * @param {string} viagemId
 * @returns {Promise<{success: boolean, resgates?: Array, error?: string}>}
 */
export async function getResgatesVooAssento(viagemId) {
  try {
    const { data, error } = await supabase.rpc('get_resgates_voo_assento', {
      p_viagem_id: viagemId
    })

    if (error) {
      console.error('[getResgatesVooAssento] Erro:', error)
      return { success: false, error: error.message, resgates: [] }
    }

    return { success: true, resgates: data || [] }
  } catch (error) {
    console.error('[getResgatesVooAssento] Exceção:', error)
    return { success: false, error: error.message, resgates: [] }
  }
}

/**
 * Formata contagem de dias para exibição
 * @param {number} dias
 * @param {Date} dataVoo - Data do primeiro voo (para exibir DD/MM quando > 30 dias)
 * @returns {string}
 */
export function formatDiasParaViagem(dias, dataVoo = null) {
  if (dias === null || dias === undefined) return ''
  if (dias === 0) return 'Embarque hoje'
  if (dias === 1) return 'Embarque amanhã'
  if (dias < 0) return 'Concluída'
  if (dias <= 30) return `Embarque em ${dias} dias`
  // Mais de 30 dias: mostrar data DD/MM
  if (dataVoo) {
    const data = new Date(dataVoo)
    const dia = String(data.getDate()).padStart(2, '0')
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    return `Embarque em ${dia}/${mes}`
  }
  return `Embarque em ${dias} dias`
}

/**
 * Busca passageiros de um voo com status de resgate
 * @param {string} vooId - ID do voo
 * @param {string} subtipoEntrega - Subtipo para verificar duplicatas (assento, bagagem, etc)
 * @returns {Promise<{success: boolean, passageiros?: Array, error?: string}>}
 */
export async function getPassageirosVoo(vooId, subtipoEntrega = null) {
  try {
    const { data, error } = await supabase.rpc('get_passageiros_voo', {
      p_voo_id: String(vooId),
      p_subtipo_entrega: subtipoEntrega
    })

    if (error) {
      console.error('[getPassageirosVoo] Erro:', error)
      return { success: false, error: error.message, passageiros: [] }
    }

    // Mapear para formato mais amigável
    const passageiros = (data || []).map(p => ({
      id: p.passageiro_id,
      nome: p.nome,
      eticket: p.eticket,
      jaSolicitado: p.ja_solicitado,
      resgateStatus: p.resgate_status
    }))

    return { success: true, passageiros }
  } catch (error) {
    console.error('[getPassageirosVoo] Exceção:', error)
    return { success: false, error: error.message, passageiros: [] }
  }
}

/**
 * Formata intervalo de datas para exibição
 * @param {string} dataIda
 * @param {string} dataVolta
 * @returns {string}
 */
export function formatIntervaloViagem(dataIda, dataVolta) {
  if (!dataIda) return ''

  const ida = new Date(dataIda + 'T12:00:00')
  const formatOpts = { day: 'numeric', month: 'short' }

  if (!dataVolta || dataIda === dataVolta) {
    return ida.toLocaleDateString('pt-BR', formatOpts)
  }

  const volta = new Date(dataVolta + 'T12:00:00')

  // Mesmo mês
  if (ida.getMonth() === volta.getMonth() && ida.getFullYear() === volta.getFullYear()) {
    return `${ida.getDate()} – ${volta.toLocaleDateString('pt-BR', formatOpts)}`
  }

  return `${ida.toLocaleDateString('pt-BR', formatOpts)} – ${volta.toLocaleDateString('pt-BR', formatOpts)}`
}
