// ============================================
// SERVIÇO DE CONVITES - Meup Club
// Gerencia convites de fundadores
// ============================================

import { supabase } from '@/lib/supabase'

/**
 * Busca convites do usuário logado (fundador)
 * @returns {Promise<{
 *   success: boolean,
 *   invites: Array,
 *   stats: { total_emitidos, enviados, aceitos, disponiveis, expirados }
 * }>}
 */
export async function getMyInvites() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Usuário não autenticado', invites: [], stats: {} }
    }

    // Busca convites
    const { data: invites, error: invitesError } = await supabase
      .from('convites')
      .select(`
        id,
        nome_convidado,
        whatsapp_convidado,
        email_convidado,
        codigo,
        mensagem_personalizada,
        status,
        expira_em,
        enviado_em,
        aceito_por,
        aceito_em,
        criado_em
      `)
      .eq('fundador_id', user.id)
      .neq('status', 'cancelado')
      .order('criado_em', { ascending: false })

    if (invitesError) throw invitesError

    // Busca estatísticas - se falhar, calcula pela lista de convites
    let stats = {
      total_emitidos: 0,
      enviados: 0,
      aceitos: 0,
      disponiveis: 2,
      expirados: 0
    }

    const { data: statsData, error: statsError } = await supabase.rpc('contar_convites_fundador', {
      p_fundador_id: user.id
    })

    if (statsError) {
      // Log do erro mas não interrompe - calcula stats pela lista
      console.warn('Erro ao buscar estatísticas de convites (calculando localmente):', statsError.message)

      // Calcula estatísticas pela própria lista de convites
      const inviteList = invites || []
      const maxConvites = 2 // valor padrão
      stats = {
        total_emitidos: inviteList.length,
        enviados: inviteList.filter(i => i.status === 'enviado').length,
        aceitos: inviteList.filter(i => i.status === 'aceito').length,
        disponiveis: Math.max(0, maxConvites - inviteList.length),
        expirados: inviteList.filter(i => i.status === 'expirado').length
      }
    } else {
      stats = statsData?.[0] || stats
    }

    return {
      success: true,
      invites: invites || [],
      stats
    }
  } catch (error) {
    console.error('Erro ao buscar convites:', error)
    return {
      success: false,
      invites: [],
      stats: { total_emitidos: 0, enviados: 0, aceitos: 0, disponiveis: 0, expirados: 0 },
      error: error.message
    }
  }
}

/**
 * Verifica se usuário pode criar convites
 * @returns {Promise<{ canInvite: boolean, remaining: number, reason?: string }>}
 */
export async function canCreateInvite() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { canInvite: false, remaining: 0, reason: 'Usuário não autenticado' }
    }

    const { data, error } = await supabase.rpc('usuario_pode_convidar', {
      p_user_id: user.id
    })

    if (error) throw error

    const result = data?.[0] || { pode_convidar: false, convites_disponiveis: 0, motivo: 'Erro' }

    return {
      canInvite: result.pode_convidar,
      remaining: result.convites_disponiveis,
      reason: result.motivo
    }
  } catch (error) {
    console.error('Erro ao verificar permissão:', error)
    return { canInvite: false, remaining: 0, reason: error.message }
  }
}

/**
 * Cria novo convite
 * @param {Object} data - Dados do convite
 * @param {string} data.nome_convidado - Nome do convidado
 * @param {string} data.whatsapp_convidado - WhatsApp (opcional)
 * @param {string} data.email_convidado - Email (opcional)
 * @param {string} data.mensagem_personalizada - Mensagem customizada (opcional)
 * @returns {Promise<{ success: boolean, invite?: Object, error?: string }>}
 */
export async function createInvite(data) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    // Verifica se pode criar
    const { canInvite, reason } = await canCreateInvite()
    if (!canInvite) {
      return { success: false, error: reason }
    }

    // Busca validade do convite
    const { data: configData } = await supabase
      .from('config_exclusivo')
      .select('valor')
      .eq('chave', 'validade_convite_dias')
      .single()

    const validadeDias = parseInt(configData?.valor) || 30

    // Gera código único
    const { data: codigoData, error: codigoError } = await supabase.rpc('gerar_codigo_convite')
    if (codigoError) throw codigoError

    const codigo = codigoData

    // Calcula data de expiração
    const expiraEm = new Date()
    expiraEm.setDate(expiraEm.getDate() + validadeDias)

    // Cria o convite
    const { data: invite, error } = await supabase
      .from('convites')
      .insert({
        fundador_id: user.id,
        nome_convidado: data.nome_convidado?.trim(),
        whatsapp_convidado: data.whatsapp_convidado?.replace(/\D/g, '') || null,
        email_convidado: data.email_convidado?.trim()?.toLowerCase() || null,
        mensagem_personalizada: data.mensagem_personalizada?.trim() || null,
        codigo,
        status: 'disponivel',
        expira_em: expiraEm.toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      invite,
      link: `${window.location.origin}/convite/${codigo}`
    }
  } catch (error) {
    console.error('Erro ao criar convite:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Marca convite como enviado
 * @param {string} inviteId - ID do convite
 * @returns {Promise<{ success: boolean }>}
 */
export async function markInviteAsSent(inviteId) {
  try {
    const { error } = await supabase
      .from('convites')
      .update({
        status: 'enviado',
        enviado_em: new Date().toISOString()
      })
      .eq('id', inviteId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Erro ao marcar como enviado:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancela um convite
 * @param {string} inviteId - ID do convite
 * @returns {Promise<{ success: boolean }>}
 */
export async function cancelInvite(inviteId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const { error } = await supabase
      .from('convites')
      .update({ status: 'cancelado' })
      .eq('id', inviteId)
      .eq('fundador_id', user.id)
      .in('status', ['disponivel', 'enviado'])

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Erro ao cancelar convite:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Valida código de convite (público)
 * @param {string} codigo - Código do convite
 * @returns {Promise<{
 *   valido: boolean,
 *   motivo: string,
 *   convite_id?: string,
 *   fundador_nome?: string,
 *   expira_em?: Date
 * }>}
 */
export async function validateInviteCode(codigo) {
  try {
    if (!codigo) {
      return { valido: false, motivo: 'Código não informado' }
    }

    const { data, error } = await supabase.rpc('validar_convite', {
      p_codigo: codigo.toUpperCase()
    })

    if (error) throw error

    const result = data?.[0] || { valido: false, motivo: 'Código inválido' }

    return {
      valido: result.valido,
      motivo: result.motivo,
      convite_id: result.convite_id,
      fundador_nome: result.fundador_nome,
      fundador_id: result.fundador_id,
      expira_em: result.expira_em ? new Date(result.expira_em) : null
    }
  } catch (error) {
    console.error('Erro ao validar convite:', error)
    return { valido: false, motivo: 'Erro ao validar código' }
  }
}

/**
 * Aceita um convite (chamado após cadastro do usuário)
 * @param {string} conviteId - ID do convite
 * @param {string} userId - ID do novo usuário
 * @returns {Promise<{ success: boolean, fundador_nome?: string, error?: string }>}
 */
export async function acceptInvite(conviteId, userId) {
  try {
    const { data, error } = await supabase.rpc('aceitar_convite', {
      p_convite_id: conviteId,
      p_user_id: userId
    })

    if (error) throw error

    const result = data?.[0] || { sucesso: false, mensagem: 'Erro ao aceitar convite' }

    return {
      success: result.sucesso,
      message: result.mensagem,
      fundador_nome: result.fundador_nome
    }
  } catch (error) {
    console.error('Erro ao aceitar convite:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Verifica se convidado pode ativar Prime
 * @returns {Promise<{
 *   pode_ativar: boolean,
 *   motivo: string,
 *   preco: number,
 *   dias_restantes: number,
 *   tem_emissao: boolean
 * }>}
 */
export async function checkPrimeActivation() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { pode_ativar: false, motivo: 'Usuário não autenticado', preco: 597, dias_restantes: 0, tem_emissao: false }
    }

    const { data, error } = await supabase.rpc('verificar_ativacao_prime_convidado', {
      p_user_id: user.id
    })

    if (error) throw error

    const result = data?.[0] || {
      pode_ativar: false,
      motivo: 'Erro ao verificar',
      preco: 597,
      dias_restantes: 0,
      tem_emissao: false
    }

    return result
  } catch (error) {
    console.error('Erro ao verificar ativação Prime:', error)
    return { pode_ativar: false, motivo: error.message, preco: 597, dias_restantes: 0, tem_emissao: false }
  }
}

/**
 * Ativa Prime para convidado (após comprar passagem)
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function activatePrimeAsInvitee() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    const { data, error } = await supabase.rpc('convidado_ativar_prime', {
      p_user_id: user.id
    })

    if (error) throw error

    const result = data?.[0] || { sucesso: false, mensagem: 'Erro ao ativar' }

    return {
      success: result.sucesso,
      message: result.mensagem
    }
  } catch (error) {
    console.error('Erro ao ativar Prime:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Gera link de convite formatado para WhatsApp
 * @param {Object} invite - Dados do convite
 * @param {string} fundadorNome - Nome do fundador
 * @returns {string} - URL do WhatsApp
 */
export function generateWhatsAppLink(invite, fundadorNome) {
  const link = `${window.location.origin}/convite/${invite.codigo}`

  // Busca mensagem padrão ou usa personalizada
  let mensagem = invite.mensagem_personalizada ||
    `${fundadorNome} reservou um lugar especial para você no Me,up Club! 🎁 Acesse o link exclusivo para garantir sua vaga antes da abertura oficial.`

  mensagem = mensagem.replace('[FUNDADOR]', fundadorNome)
  mensagem += `\n\n${link}`

  const phone = invite.whatsapp_convidado || ''
  const encodedMessage = encodeURIComponent(mensagem)

  return `https://wa.me/${phone}?text=${encodedMessage}`
}

/**
 * Formata status do convite para exibição
 * @param {string} status - Status do convite
 * @returns {{ label: string, color: string, bg: string }}
 */
export function formatInviteStatus(status) {
  const statusMap = {
    disponivel: { label: 'Disponível', color: 'text-blue-600', bg: 'bg-blue-100' },
    enviado: { label: 'Enviado', color: 'text-amber-600', bg: 'bg-amber-100' },
    aceito: { label: 'Aceito', color: 'text-green-600', bg: 'bg-green-100' },
    expirado: { label: 'Expirado', color: 'text-gray-600', bg: 'bg-gray-100' },
    cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100' }
  }
  return statusMap[status] || statusMap.disponivel
}
