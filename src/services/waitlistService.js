// ============================================
// SERVIÇO DE LISTA DE ESPERA - Meup Club
// Gerencia pré-lançamento e lista de espera
// ============================================

import { supabase } from '@/lib/supabase'

/**
 * Submete interesse na lista de espera
 * @param {Object} data - Dados do interessado
 * @param {string} data.nome - Nome completo
 * @param {string} data.whatsapp - WhatsApp (obrigatório)
 * @param {string} data.email - Email (opcional)
 * @param {string} data.cpf - CPF (opcional, para verificar se é cliente)
 * @param {string} data.perfil_viagem - 'lazer' | 'negocios' | 'ambos'
 * @param {string} data.origem - 'site' | 'whatsapp' | 'convite' | 'admin'
 * @returns {Promise<{success: boolean, id?: string, e_cliente?: boolean, error?: string}>}
 */
export async function submitToWaitlist(data) {
  try {
    // Formata WhatsApp (remove caracteres não numéricos)
    const whatsappClean = data.whatsapp?.replace(/\D/g, '')

    if (!whatsappClean || whatsappClean.length < 10) {
      return { success: false, error: 'WhatsApp inválido' }
    }

    // Verifica duplicado de WhatsApp
    const { isDuplicate } = await checkDuplicate(whatsappClean)
    if (isDuplicate) {
      return {
        success: false,
        error: 'Esse WhatsApp já está na lista',
        isDuplicate: true
      }
    }

    // Insere na lista de espera
    const { data: inserted, error } = await supabase
      .from('lista_espera')
      .insert({
        nome: data.nome?.trim(),
        whatsapp: whatsappClean,
        email: data.email?.trim()?.toLowerCase() || null,
        cpf: null, // CPF removido do formulário
        perfil_viagem: data.perfil_viagem || null,
        origem: data.origem || 'site',
        e_cliente: false,
        status: 'aguardando'
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao inserir na lista de espera:', error)

      // Trata erro de unique constraint
      if (error.code === '23505') {
        return { success: false, error: 'Esse WhatsApp já está na lista', isDuplicate: true }
      }

      // Trata erro de check constraint (origem inválida)
      if (error.code === '23514') {
        console.error('Erro de constraint - origem:', data.origem)
        return { success: false, error: 'Erro interno. Tente novamente.' }
      }

      throw error
    }

    return {
      success: true,
      id: inserted.id,
      message: 'Prontinho! Você está na lista. Vamos te chamar no WhatsApp.'
    }
  } catch (error) {
    console.error('Erro ao submeter para lista de espera:', error)
    return { success: false, error: error.message || 'Erro ao registrar interesse' }
  }
}

/**
 * Verifica se já existe duplicado na lista de espera
 * @param {string} whatsapp - WhatsApp limpo
 * @returns {Promise<{isDuplicate: boolean}>}
 */
export async function checkDuplicate(whatsapp) {
  try {
    // Verifica WhatsApp
    const { data: byWhatsapp } = await supabase
      .from('lista_espera')
      .select('id')
      .eq('whatsapp', whatsapp?.replace(/\D/g, ''))
      .neq('status', 'descartado')
      .limit(1)

    if (byWhatsapp?.length > 0) {
      return { isDuplicate: true }
    }

    return { isDuplicate: false }
  } catch (error) {
    console.error('Erro ao verificar duplicado:', error)
    return { isDuplicate: false }
  }
}

/**
 * Gera hash SHA-256 do CPF (client-side)
 * @param {string} cpf - CPF (pode ter formatação)
 * @returns {Promise<string>} - Hash SHA-256
 */
export async function hashCPF(cpf) {
  const cpfClean = cpf.replace(/\D/g, '')
  const encoder = new TextEncoder()
  const data = encoder.encode(cpfClean)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================
// FUNÇÕES ADMIN
// ============================================

/**
 * Busca lista de espera completa (admin)
 * @param {Object} filters - Filtros opcionais
 * @param {string} filters.status - Filtrar por status
 * @param {boolean} filters.e_cliente - Filtrar por cliente
 * @param {string} filters.search - Busca por nome/whatsapp
 * @returns {Promise<{success: boolean, items: Array, stats: Object}>}
 */
export async function adminGetWaitlist(filters = {}) {
  try {
    let query = supabase
      .from('lista_espera')
      .select('*')
      .order('criado_em', { ascending: false })

    // Aplica filtros
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (typeof filters.e_cliente === 'boolean') {
      query = query.eq('e_cliente', filters.e_cliente)
    }

    if (filters.search) {
      query = query.or(`nome.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    // Calcula estatísticas
    const stats = {
      total: data?.length || 0,
      aguardando: data?.filter(i => i.status === 'aguardando').length || 0,
      convidado: data?.filter(i => i.status === 'convidado').length || 0,
      cadastrado: data?.filter(i => i.status === 'cadastrado').length || 0,
      clientes: data?.filter(i => i.e_cliente).length || 0,
      nao_clientes: data?.filter(i => !i.e_cliente).length || 0
    }

    return { success: true, items: data || [], stats }
  } catch (error) {
    console.error('Erro ao buscar lista de espera:', error)
    return { success: false, items: [], stats: {}, error: error.message }
  }
}

/**
 * Atualiza status de item na lista de espera (admin)
 * @param {string} id - ID do item
 * @param {string} status - Novo status
 * @param {string} notas - Notas adicionais (opcional)
 * @returns {Promise<{success: boolean}>}
 */
export async function adminUpdateWaitlistStatus(id, status, notas = null) {
  try {
    const updateData = { status }
    if (notas) {
      updateData.notas = notas
    }

    const { error } = await supabase
      .from('lista_espera')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Exporta lista de espera para CSV (admin)
 * @param {string} status - Filtrar por status (opcional)
 * @returns {Promise<{success: boolean, csv?: string}>}
 */
export async function adminExportCSV(status = null) {
  try {
    let query = supabase
      .from('lista_espera')
      .select('nome, whatsapp, email, cpf, perfil_viagem, origem, e_cliente, status, criado_em')
      .order('criado_em', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    // Gera CSV
    const headers = ['Nome', 'WhatsApp', 'Email', 'CPF', 'Perfil', 'Origem', 'É Cliente', 'Status', 'Data']
    const rows = data.map(item => [
      item.nome || '',
      item.whatsapp || '',
      item.email || '',
      item.cpf || '',
      item.perfil_viagem || '',
      item.origem || '',
      item.e_cliente ? 'Sim' : 'Não',
      item.status || '',
      new Date(item.criado_em).toLocaleDateString('pt-BR')
    ])

    const csv = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n')

    return { success: true, csv }
  } catch (error) {
    console.error('Erro ao exportar CSV:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca estatísticas da lista de espera (admin)
 * @returns {Promise<{success: boolean, stats: Object}>}
 */
export async function adminGetWaitlistStats() {
  try {
    const { data, error } = await supabase
      .from('lista_espera')
      .select('status, e_cliente, perfil_viagem')

    if (error) throw error

    const stats = {
      total: data.length,
      por_status: {
        aguardando: data.filter(i => i.status === 'aguardando').length,
        convidado: data.filter(i => i.status === 'convidado').length,
        cadastrado: data.filter(i => i.status === 'cadastrado').length,
        descartado: data.filter(i => i.status === 'descartado').length
      },
      clientes: data.filter(i => i.e_cliente).length,
      nao_clientes: data.filter(i => !i.e_cliente).length,
      por_perfil: {
        lazer: data.filter(i => i.perfil_viagem === 'lazer').length,
        negocios: data.filter(i => i.perfil_viagem === 'negocios').length,
        ambos: data.filter(i => i.perfil_viagem === 'ambos').length,
        nao_informado: data.filter(i => !i.perfil_viagem).length
      }
    }

    return { success: true, stats }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return { success: false, stats: {}, error: error.message }
  }
}
