// ============================================
// SERVIÇO DE RESGATE DE EXPERIÊNCIAS - Meup Club
// Fluxo: Cliente SOLICITA → Admin APROVA → Só então debita
// ============================================

import { supabase } from '@/lib/supabase'
import { formatDateLocal } from '@/utils/dateUtils'

// ============================================
// FUNÇÕES DO CLIENTE
// ============================================

/**
 * Solicita resgate de uma experiência (DEBITA NA HORA!)
 * Modelo de reserva: pontos são debitados imediatamente.
 * Se rejeitado, pontos são estornados ao cliente.
 *
 * @param {string} experienciaId - ID da experiência
 * @param {string} experienciaNome - Nome da experiência
 * @param {number} pontosUnitarios - Custo unitário em pontos
 * @param {number} classeMinima - Classe mínima exigida (1-4)
 * @param {number} quantidade - Quantidade a resgatar (default: 1)
 * @returns {Object} { success, error, requestId, quantity, totalPoints, balance_after }
 */
export async function solicitarResgate(experienciaId, experienciaNome, pontosUnitarios, classeMinima = 1, quantidade = 1) {
  try {
    const { data, error } = await supabase.rpc('client_request_redemption', {
      p_experience_id: experienciaId,
      p_experience_name: experienciaNome,
      p_points_cost: pontosUnitarios,
      p_min_class: classeMinima,
      p_quantity: quantidade
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
      quantity: data.quantity || quantidade,
      totalPoints: data.total_points || (pontosUnitarios * quantidade),
      balance_after: data.balance_after,
      message: data.message || 'Pontos reservados! Aguardando aprovação.'
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
  console.log('[fetchSolicitacoesResgate] Buscando com filtro:', statusFilter)

  try {
    let query = supabase
      .from('resgate_solicitacoes')
      .select('id, user_id, experiencia_id, experiencia_nome, pontos, quantidade, status, admin_comentario, created_at, processed_at')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    console.log('[fetchSolicitacoesResgate] Dados brutos:', data?.length, 'registros')

    if (error) {
      console.error('[fetchSolicitacoesResgate] Erro:', error)
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

    // Buscar vouchers para todos os resgates de uma vez
    const resgateIds = (data || []).map(s => s.id)
    let vouchersMap = {}
    if (resgateIds.length > 0) {
      const { data: vouchersData } = await supabase
        .from('vouchers')
        .select('*')
        .in('resgate_id', resgateIds)

      if (vouchersData) {
        vouchersMap = vouchersData.reduce((acc, v) => {
          acc[v.resgate_id] = v
          return acc
        }, {})
      }
    }

    const solicitacoes = (data || []).map(s => {
      const quantidade = s.quantidade || 1
      const voucher = vouchersMap[s.id]
      const mapped = {
        id: s.id,
        userId: s.user_id,
        userName: usersMap[s.user_id]?.name || 'Usuário',
        userEmail: usersMap[s.user_id]?.email || '',
        userPoints: usersMap[s.user_id]?.points || 0,
        experienciaId: s.experiencia_id,
        experienciaNome: s.experiencia_nome,
        pontos: s.pontos,
        quantidade: quantidade,
        // Display name com quantidade (ex: "3× Crédito R$100")
        displayName: quantidade > 1
          ? `${quantidade}× ${s.experiencia_nome}`
          : s.experiencia_nome,
        status: s.status,
        adminComentario: s.admin_comentario,
        // Dados do voucher se existir
        voucher: voucher ? {
          id: voucher.id,
          codigo: voucher.codigo,
          valor: voucher.valor,
          validade: formatDateLocal(voucher.validade),
          status: voucher.status
        } : null,
        createdAt: new Date(s.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        processedAt: s.processed_at ? new Date(s.processed_at).toLocaleDateString('pt-BR') : null
      }
      console.log('[fetchSolicitacoesResgate] Solicitação mapeada:', mapped.id, mapped.status, mapped.displayName)
      return mapped
    })

    // Estatísticas - buscar de TODOS os registros, não dos filtrados
    let stats = { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 }

    if (statusFilter) {
      // Se há filtro, buscar stats separadamente
      const { data: allData } = await supabase
        .from('resgate_solicitacoes')
        .select('status')

      if (allData) {
        stats = {
          total: allData.length,
          pendentes: allData.filter(s => s.status === 'pendente' || s.status === 'solicitado').length,
          aprovados: allData.filter(s => ['aprovado', 'em_preparacao', 'entregue'].includes(s.status)).length,
          rejeitados: allData.filter(s => s.status === 'rejeitado').length
        }
      }
    } else {
      // Sem filtro, usar os dados já carregados
      stats = {
        total: solicitacoes.length,
        pendentes: solicitacoes.filter(s => s.status === 'pendente' || s.status === 'solicitado').length,
        aprovados: solicitacoes.filter(s => ['aprovado', 'em_preparacao', 'entregue'].includes(s.status)).length,
        rejeitados: solicitacoes.filter(s => s.status === 'rejeitado').length
      }
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
  console.log('[aprovarResgate] Tipo do ID:', typeof solicitacaoId)

  if (!solicitacaoId) {
    console.error('[aprovarResgate] ID inválido')
    return { success: false, error: 'ID da solicitação é obrigatório' }
  }

  // Garantir que o ID é string
  const requestId = String(solicitacaoId)
  console.log('[aprovarResgate] Request ID normalizado:', requestId)

  try {
    // Verificar sessão do usuário
    const { data: sessionData } = await supabase.auth.getSession()
    console.log('[aprovarResgate] Sessão ativa:', !!sessionData?.session)

    if (!sessionData?.session) {
      console.error('[aprovarResgate] Usuário não autenticado')
      return { success: false, error: 'Você precisa estar logado como admin' }
    }

    console.log('[aprovarResgate] Chamando RPC admin_approve_redemption...')
    const { data, error } = await supabase.rpc('admin_approve_redemption', {
      p_request_id: requestId
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

    console.log('[aprovarResgate] Sucesso! Resgate aprovado (pontos já haviam sido reservados)')
    return {
      success: true,
      quantity: data.quantity,
      message: data.message
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

// ============================================
// FUNÇÕES DE ENTREGA (DELIVERY SYSTEM)
// ============================================

/**
 * Solicita resgate v2 com formulário de dados e emissão
 * @param {string} experienciaId
 * @param {string} experienciaNome
 * @param {number} pontosUnitarios
 * @param {number} classeMinima
 * @param {number} quantidade
 * @param {Object} formData - Dados do formulário
 * @param {string} emissaoId - ID da emissão (para serviços de voo)
 */
export async function solicitarResgateV2(experienciaId, experienciaNome, pontosUnitarios, classeMinima = 1, quantidade = 1, formData = {}, emissaoId = null) {
  try {
    const { data, error } = await supabase.rpc('client_request_redemption_v2', {
      p_experience_id: experienciaId,
      p_experience_name: experienciaNome,
      p_points_cost: pontosUnitarios,
      p_min_class: classeMinima,
      p_quantity: quantidade,
      p_form_data: formData,
      p_emissao_id: emissaoId
    })

    if (error) {
      console.error('Erro ao solicitar resgate v2:', error)
      return { success: false, error: error.message || 'Erro ao processar solicitação.' }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      requestId: data.request_id,
      quantity: data.quantity || quantidade,
      totalPoints: data.total_points || (pontosUnitarios * quantidade),
      balance_after: data.balance_after,
      message: data.message || 'Pontos reservados! Aguardando aprovação.'
    }
  } catch (error) {
    console.error('Erro inesperado na solicitação v2:', error)
    return { success: false, error: 'Erro inesperado. Tente novamente.' }
  }
}

/**
 * Busca fila de entregas (em_preparacao) para admin
 * Ordenado por prazo de entrega (urgente primeiro)
 */
export async function fetchFilaEntregas() {
  try {
    // Buscar resgates em preparação
    const { data, error } = await supabase
      .from('resgate_solicitacoes')
      .select(`
        id, user_id, experiencia_id, experiencia_nome, pontos, quantidade,
        status, formulario_dados, prazo_entrega, emissao_id, created_at
      `)
      .eq('status', 'em_preparacao')
      .order('prazo_entrega', { ascending: true })

    if (error) {
      console.error('Erro ao buscar fila de entregas:', error)
      return { success: false, error: error.message, entregas: [] }
    }

    if (!data || data.length === 0) {
      return { success: true, entregas: [] }
    }

    // Buscar perfis dos usuários
    const userIds = [...new Set(data.map(e => e.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds)

    const profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {})

    // Buscar experiências para pegar tipo_entrega
    const expIds = [...new Set(data.map(e => e.experiencia_id).filter(Boolean))]
    let experienciasMap = {}
    if (expIds.length > 0) {
      const { data: experiencias } = await supabase
        .from('experiencias')
        .select('id, tipo_entrega, subtipo_entrega')
        .in('id', expIds)

      experienciasMap = (experiencias || []).reduce((acc, e) => {
        acc[e.id] = e
        return acc
      }, {})
    }

    const now = new Date()
    const entregas = data.map(e => {
      const prazoDate = e.prazo_entrega ? new Date(e.prazo_entrega) : null
      const isAtrasado = prazoDate && prazoDate < now
      const profile = profilesMap[e.user_id] || {}
      const exp = experienciasMap[e.experiencia_id] || {}

      return {
        id: e.id,
        userId: e.user_id,
        userName: profile.name || 'Cliente',
        userEmail: profile.email || '',
        experienciaId: e.experiencia_id,
        experienciaNome: e.experiencia_nome,
        pontos: e.pontos,
        quantidade: e.quantidade || 1,
        tipoEntrega: exp.tipo_entrega || 'voucher',
        subtipoEntrega: exp.subtipo_entrega || null,
        formularioDados: e.formulario_dados || {},
        prazoEntrega: prazoDate,
        prazoFormatado: prazoDate ? prazoDate.toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        }) : null,
        isAtrasado,
        emissaoId: e.emissao_id,
        createdAt: new Date(e.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      }
    })

    return { success: true, entregas }
  } catch (error) {
    console.error('Erro ao buscar fila de entregas:', error)
    return { success: false, error: error.message, entregas: [] }
  }
}

/**
 * Admin marca resgate como entregue
 * @param {string} resgateId
 * @param {Object} entregaDados - Dados da entrega (varia por tipo)
 */
export async function marcarEntregue(resgateId, entregaDados = {}) {
  try {
    const { data, error } = await supabase.rpc('admin_mark_delivered', {
      p_request_id: resgateId,
      p_delivery_data: entregaDados
    })

    if (error) {
      console.error('Erro ao marcar como entregue:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Erro ao marcar como entregue:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Admin cancela resgate (devolve pontos)
 * @param {string} resgateId
 * @param {string} motivo
 */
export async function cancelarResgate(resgateId, motivo = null) {
  try {
    const { data, error } = await supabase.rpc('admin_cancel_redemption', {
      p_request_id: resgateId,
      p_reason: motivo
    })

    if (error) {
      console.error('Erro ao cancelar resgate:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      pointsRefunded: data.points_refunded,
      idempotent: data.idempotent || false,
      message: data.message
    }
  } catch (error) {
    console.error('Erro ao cancelar resgate:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Upload de arquivo de entrega (para tipos 'arquivo')
 * @param {File} file
 * @param {string} resgateId
 */
export async function uploadArquivoEntrega(file, resgateId) {
  try {
    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.' }
    }

    // Validar tamanho (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'Arquivo muito grande. Máximo 10MB.' }
    }

    // Gerar nome único
    const ext = file.name.split('.').pop()
    const timestamp = Date.now()
    const path = `entregas/${resgateId}/${timestamp}.${ext}`

    // Upload para o storage
    const { data, error } = await supabase.storage
      .from('entregas-resgate')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Registrar arquivo na tabela
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('arquivos_resgate').insert([{
      resgate_id: resgateId,
      file_path: data.path,
      file_name: file.name,
      uploaded_by: user?.id
    }])

    return {
      success: true,
      path: data.path,
      fileName: file.name
    }
  } catch (error) {
    console.error('Erro no upload de arquivo:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Gera URL assinada para acessar arquivo de entrega
 * @param {string} path
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function getArquivoSignedUrl(path) {
  try {
    if (!path) return { success: false, error: 'Caminho não informado' }

    const { data, error } = await supabase.storage
      .from('entregas-resgate')
      .createSignedUrl(path, 300) // 5 minutos

    if (error) throw error

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error('Erro ao gerar signed URL:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Admin marca voucher como utilizado
 * @param {string} voucherId
 * @param {string} emissaoId - Emissão onde o voucher foi usado (opcional)
 */
export async function marcarVoucherUtilizado(voucherId, emissaoId = null) {
  try {
    const { data, error } = await supabase.rpc('admin_mark_voucher_used', {
      p_voucher_id: voucherId,
      p_emissao_id: emissaoId
    })

    if (error) {
      console.error('Erro ao marcar voucher como utilizado:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Erro ao marcar voucher como utilizado:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca vouchers do cliente logado
 */
export async function buscarMeusVouchers() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não logado', vouchers: [] }

    const { data, error } = await supabase
      .from('vouchers')
      .select(`
        id, codigo, valor, validade, status, usado_em, created_at,
        resgate_solicitacoes:resgate_id (experiencia_nome)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar vouchers:', error)
      return { success: false, error: error.message, vouchers: [] }
    }

    const vouchers = (data || []).map(v => ({
      id: v.id,
      codigo: v.codigo,
      valor: v.valor,
      validade: v.validade,
      validadeFormatada: formatDateLocal(v.validade),
      status: v.status,
      usadoEm: v.usado_em ? new Date(v.usado_em).toLocaleDateString('pt-BR') : null,
      experienciaNome: v.resgate_solicitacoes?.experiencia_nome || 'Voucher',
      isExpirado: new Date(v.validade) < new Date(),
      createdAt: new Date(v.created_at).toLocaleDateString('pt-BR')
    }))

    return { success: true, vouchers }
  } catch (error) {
    console.error('Erro ao buscar vouchers:', error)
    return { success: false, error: error.message, vouchers: [] }
  }
}

/**
 * Busca arquivos de entrega do resgate
 * @param {string} resgateId
 */
export async function buscarArquivosResgate(resgateId) {
  try {
    const { data, error } = await supabase
      .from('arquivos_resgate')
      .select('id, file_path, file_name, created_at')
      .eq('resgate_id', resgateId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      arquivos: (data || []).map(a => ({
        id: a.id,
        filePath: a.file_path,
        fileName: a.file_name,
        createdAt: new Date(a.created_at).toLocaleDateString('pt-BR')
      }))
    }
  } catch (error) {
    console.error('Erro ao buscar arquivos:', error)
    return { success: false, error: error.message, arquivos: [] }
  }
}

/**
 * Busca solicitações de resgate do cliente com dados completos de entrega
 * Usa a view vw_resgates_completos que já inclui voucher
 */
export async function buscarMeusResgatesCompletos() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não logado', resgates: [] }
    }

    // Buscar resgates do usuário
    const { data, error } = await supabase
      .from('resgate_solicitacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar resgates:', error)
      return { success: false, error: error.message, resgates: [] }
    }

    // Buscar todos os vouchers do usuário de uma vez
    const resgateIds = (data || []).map(r => r.id)
    let vouchersMap = {}
    if (resgateIds.length > 0) {
      const { data: vouchersData } = await supabase
        .from('vouchers')
        .select('*')
        .in('resgate_id', resgateIds)

      if (vouchersData) {
        vouchersMap = vouchersData.reduce((acc, v) => {
          acc[v.resgate_id] = v
          return acc
        }, {})
      }
    }

    const resgates = await Promise.all((data || []).map(async (r) => {
      // Voucher direto do mapa
      const voucherData = vouchersMap[r.id]

      // Buscar arquivos se tiver
      let arquivos = []
      if (r.status === 'entregue') {
        const { data: arquivosData } = await supabase
          .from('arquivos_resgate')
          .select('id, file_path, file_name')
          .eq('resgate_id', r.id)
        arquivos = arquivosData || []
      }

      return {
        id: r.id,
        experienciaId: r.experiencia_id,
        experienciaNome: r.experiencia_nome,
        pontos: r.pontos,
        quantidade: r.quantidade || 1,
        status: r.status,
        tipoEntrega: voucherData ? 'voucher' : 'outro',
        subtipoEntrega: null,
        adminComentario: r.admin_comentario,
        formularioDados: r.formulario_dados || {},
        prazoEntrega: r.prazo_entrega ? new Date(r.prazo_entrega) : null,
        prazoFormatado: r.prazo_entrega
          ? new Date(r.prazo_entrega).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : null,
        entregueEm: r.entregue_em ? new Date(r.entregue_em).toLocaleDateString('pt-BR') : null,
        entregaDados: r.entrega_dados || {},
        motivoCancelamento: r.motivo_cancelamento,
        voucher: voucherData ? {
          id: voucherData.id,
          codigo: voucherData.codigo,
          valor: voucherData.valor,
          validade: formatDateLocal(voucherData.validade),
          status: voucherData.status
        } : null,
        arquivos: arquivos.map(a => ({
          id: a.id,
          filePath: a.file_path,
          fileName: a.file_name
        })),
        createdAt: new Date(r.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        processedAt: r.processed_at ? new Date(r.processed_at).toLocaleDateString('pt-BR') : null
      }
    }))

    return { success: true, resgates }
  } catch (error) {
    console.error('Erro ao buscar resgates:', error)
    return { success: false, error: error.message, resgates: [] }
  }
}

/**
 * Admin desfaz voucher utilizado (volta para disponível)
 * @param {string} voucherId
 */
export async function desfazerVoucherUtilizado(voucherId) {
  try {
    const { data, error } = await supabase.rpc('admin_undo_voucher_used', {
      p_voucher_id: voucherId
    })

    if (error) {
      console.error('Erro ao desfazer voucher utilizado:', error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Erro ao desfazer' }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Erro ao desfazer voucher utilizado:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Admin aprova resgate v2 (com sistema de entrega)
 * @param {string} solicitacaoId
 */
export async function aprovarResgateV2(solicitacaoId) {
  console.log('[aprovarResgateV2] Iniciando aprovação para:', solicitacaoId)

  if (!solicitacaoId) {
    console.error('[aprovarResgateV2] ID inválido')
    return { success: false, error: 'ID da solicitação é obrigatório' }
  }

  try {
    const { data, error } = await supabase.rpc('admin_approve_redemption_v2', {
      p_request_id: solicitacaoId
    })

    console.log('[aprovarResgateV2] Resposta RPC:', data, error)

    if (error) {
      console.error('[aprovarResgateV2] Erro RPC:', error)
      return { success: false, error: error.message || 'Erro ao chamar função de aprovação' }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Erro desconhecido na aprovação' }
    }

    return {
      success: true,
      tipoEntrega: data.tipo_entrega,
      prazoEntrega: data.prazo_entrega,
      voucherCode: data.voucher_code,
      message: data.message
    }
  } catch (error) {
    console.error('[aprovarResgateV2] Exceção:', error)
    return { success: false, error: 'Erro inesperado: ' + (error.message || 'Tente novamente') }
  }
}
