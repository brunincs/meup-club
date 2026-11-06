// ============================================
// SERVIÇO DE RESGATE DE EXPERIÊNCIAS - Meup Club
// Fluxo: Cliente SOLICITA → Admin APROVA → Só então debita
// ============================================

import { supabase } from '@/lib/supabase'

// ============================================
// FUNÇÕES DO CLIENTE
// ============================================

/**
 * Solicita resgate de uma experiência (NÃO debita ainda!)
 * Cria uma solicitação PENDENTE para aprovação do admin
 *
 * @param {string} experienciaId - ID da experiência
 * @param {string} experienciaNome - Nome da experiência
 * @param {number} pontosNecessarios - Custo em pontos
 * @param {number} classeMinima - Classe mínima exigida (1-4)
 * @returns {Object} { success, error, requestId }
 */
export async function solicitarResgate(experienciaId, experienciaNome, pontosNecessarios, classeMinima = 1) {
  try {
    const { data, error } = await supabase.rpc('client_request_redemption', {
      p_experience_id: experienciaId,
      p_experience_name: experienciaNome,
      p_points_cost: pontosNecessarios,
      p_min_class: classeMinima
    })

    if (error) {
      console.error('Erro ao solicitar resgate:', error)
      return { success: false, error: error.message || 'Erro ao processar solicitação.' }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      requestId: data.request_id,
      message: data.message || 'Solicitação enviada! Aguarde a aprovação.'
    }
  } catch (error) {
    console.error('Erro inesperado na solicitação:', error)
    return { success: false, error: 'Erro inesperado. Tente novamente.' }
  }
}

/**
 * Busca solicitações de resgate do cliente logado
 * @returns {Object} { success, solicitacoes, error }
 */
export async function buscarMinhasSolicitacoesResgate() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não logado', solicitacoes: [] }
    }

    const { data, error } = await supabase
      .from('resgate_solicitacoes')
      .select('id, experiencia_id, experiencia_nome, pontos, status, admin_comentario, created_at, processed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar solicitações:', error)
      return { success: false, error: error.message, solicitacoes: [] }
    }

    const solicitacoes = (data || []).map(s => ({
      id: s.id,
      experienciaId: s.experiencia_id,
      experienciaNome: s.experiencia_nome,
      pontos: s.pontos,
      status: s.status,
      adminComentario: s.admin_comentario,
      createdAt: new Date(s.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      processedAt: s.processed_at ? new Date(s.processed_at).toLocaleDateString('pt-BR') : null
    }))

    return { success: true, solicitacoes }
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error)
    return { success: false, error: error.message, solicitacoes: [] }
  }
}

/**
 * Verifica se já existe pedido pendente para uma experiência
 * @param {string} experienciaId
 * @returns {Object} { pendente, aprovado }
 */
export async function verificarStatusResgate(experienciaId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { pendente: false, aprovado: false }

    const { data, error } = await supabase
      .from('resgate_solicitacoes')
      .select('status')
      .eq('user_id', user.id)
      .eq('experiencia_id', experienciaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return { pendente: false, aprovado: false }

    return {
      pendente: data.status === 'pendente',
      aprovado: data.status === 'aprovado',
      rejeitado: data.status === 'rejeitado'
    }
  } catch {
    return { pendente: false, aprovado: false }
  }
}

/**
 * Busca mapa de status de todas experiências do cliente
 * @returns {Object} { experienciaId: status }
 */
export async function buscarStatusResgates() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}

    const { data, error } = await supabase
      .from('resgate_solicitacoes')
      .select('experiencia_id, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return {}

    // Criar mapa: experiencia_id -> status mais recente
    const statusMap = {}
    for (const s of (data || [])) {
      if (!statusMap[s.experiencia_id]) {
        statusMap[s.experiencia_id] = s.status
      }
    }

    return statusMap
  } catch {
    return {}
  }
}

// ============================================
// FUNÇÕES DO ADMIN
// ============================================

/**
 * Busca todas as solicitações de resgate (admin)
 * @param {string} statusFilter - 'pendente', 'aprovado', 'rejeitado' ou null para todas
 */
export async function fetchSolicitacoesResgate(statusFilter = null) {
  try {
    let query = supabase
      .from('resgate_solicitacoes')
      .select('id, user_id, experiencia_id, experiencia_nome, pontos, status, admin_comentario, created_at, processed_at')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar solicitações:', error)
      return { success: false, error: error.message, solicitacoes: [] }
    }

    // Buscar nomes dos usuários
    const userIds = [...new Set((data || []).map(s => s.user_id))]
    let usersMap = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, email, points')
        .in('id', userIds)

      if (users) {
        usersMap = users.reduce((acc, u) => {
          acc[u.id] = u
          return acc
        }, {})
      }
    }

    const solicitacoes = (data || []).map(s => ({
      id: s.id,
      userId: s.user_id,
      userName: usersMap[s.user_id]?.name || 'Usuário',
      userEmail: usersMap[s.user_id]?.email || '',
      userPoints: usersMap[s.user_id]?.points || 0,
      experienciaId: s.experiencia_id,
      experienciaNome: s.experiencia_nome,
      pontos: s.pontos,
      status: s.status,
      adminComentario: s.admin_comentario,
      createdAt: new Date(s.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      processedAt: s.processed_at ? new Date(s.processed_at).toLocaleDateString('pt-BR') : null
    }))

    // Estatísticas
    const stats = {
      total: solicitacoes.length,
      pendentes: solicitacoes.filter(s => s.status === 'pendente').length,
      aprovados: solicitacoes.filter(s => s.status === 'aprovado').length,
      rejeitados: solicitacoes.filter(s => s.status === 'rejeitado').length
    }

    return { success: true, solicitacoes, stats }
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error)
    return { success: false, error: error.message, solicitacoes: [], stats: {} }
  }
}

/**
 * Conta solicitações pendentes (para badge no menu)
 */
export async function contarResgatesPendentes() {
  try {
    const { count, error } = await supabase
      .from('resgate_solicitacoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente')

    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}

/**
 * Admin aprova resgate (debita pontos + registra histórico)
 * @param {string} solicitacaoId
 */
export async function aprovarResgate(solicitacaoId) {
  console.log('[aprovarResgate] Iniciando aprovação para:', solicitacaoId)

  if (!solicitacaoId) {
    console.error('[aprovarResgate] ID inválido')
    return { success: false, error: 'ID da solicitação é obrigatório' }
  }

  try {
    console.log('[aprovarResgate] Chamando RPC admin_approve_redemption...')
    const { data, error } = await supabase.rpc('admin_approve_redemption', {
      p_request_id: solicitacaoId
    })

    console.log('[aprovarResgate] Resposta RPC - data:', data, 'error:', error)

    if (error) {
      console.error('[aprovarResgate] Erro RPC:', error)
      return { success: false, error: error.message || 'Erro ao chamar função de aprovação' }
    }

    if (!data) {
      console.error('[aprovarResgate] Data é null/undefined')
      return { success: false, error: 'Resposta vazia do servidor' }
    }

    if (!data.success) {
      console.log('[aprovarResgate] Função retornou erro:', data.error)
      return { success: false, error: data.error || 'Erro desconhecido na aprovação' }
    }

    console.log('[aprovarResgate] Sucesso! Pontos debitados:', data.points_debited)
    return {
      success: true,
      pointsDebited: data.points_debited,
      newBalance: data.new_balance
    }
  } catch (error) {
    console.error('[aprovarResgate] Exceção:', error)
    return { success: false, error: 'Erro inesperado: ' + (error.message || 'Tente novamente') }
  }
}

/**
 * Admin rejeita resgate (não debita)
 * @param {string} solicitacaoId
 * @param {string} motivo - Motivo da rejeição (opcional)
 */
export async function rejeitarResgate(solicitacaoId, motivo = null) {
  console.log('[rejeitarResgate] Iniciando rejeição para:', solicitacaoId, 'motivo:', motivo)

  if (!solicitacaoId) {
    console.error('[rejeitarResgate] ID inválido')
    return { success: false, error: 'ID da solicitação é obrigatório' }
  }

  try {
    console.log('[rejeitarResgate] Chamando RPC admin_reject_redemption...')
    const { data, error } = await supabase.rpc('admin_reject_redemption', {
      p_request_id: solicitacaoId,
      p_reason: motivo
    })

    console.log('[rejeitarResgate] Resposta RPC - data:', data, 'error:', error)

    if (error) {
      console.error('[rejeitarResgate] Erro RPC:', error)
      return { success: false, error: error.message || 'Erro ao chamar função de rejeição' }
    }

    if (!data) {
      console.error('[rejeitarResgate] Data é null/undefined')
      return { success: false, error: 'Resposta vazia do servidor' }
    }

    if (!data.success) {
      console.log('[rejeitarResgate] Função retornou erro:', data.error)
      return { success: false, error: data.error || 'Erro desconhecido na rejeição' }
    }

    console.log('[rejeitarResgate] Sucesso!')
    return { success: true }
  } catch (error) {
    console.error('[rejeitarResgate] Exceção:', error)
    return { success: false, error: 'Erro inesperado: ' + (error.message || 'Tente novamente') }
  }
}

// ============================================
// FUNÇÕES LEGADAS (mantidas para compatibilidade)
// ============================================

/**
 * @deprecated Use solicitarResgate() - Resgate agora requer aprovação
 */
export async function resgatarExperiencia(experienciaId, experienciaNome, pontosNecessarios) {
  // Redireciona para o novo fluxo
  return solicitarResgate(experienciaId, experienciaNome, pontosNecessarios)
}

/**
 * Busca histórico de resgates APROVADOS do usuário
 * (Lê de point_transactions type='redemption')
 */
export async function buscarHistoricoResgates() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não logado' }
    }

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
 * Verifica se uma experiência já foi resgatada (aprovada)
 */
export async function verificarJaResgatada(experienciaId) {
  const status = await verificarStatusResgate(experienciaId)
  return status.aprovado
}

/**
 * Busca IDs das experiências já resgatadas (aprovadas)
 */
export async function buscarExperienciasResgatadas() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('resgate_solicitacoes')
      .select('experiencia_id')
      .eq('user_id', user.id)
      .eq('status', 'aprovado')

    if (error) return []

    return (data || []).map(s => s.experiencia_id)
  } catch {
    return []
  }
}
