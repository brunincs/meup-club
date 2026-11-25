// Serviço de Experiências e Tarefas - Meup Club
// Conexão com Supabase para gestão do catálogo

import { supabase } from '@/lib/supabase'

// ══════════════════════════════════════════════════════════════════════════════
// EXPERIÊNCIAS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Busca experiências com preços calculados por plano
 * Retorna pontos_free, pontos_prime e pontos_usuario (baseado no plano atual)
 */
export async function fetchExperienciasComPrecos() {
  try {
    const { data, error } = await supabase.rpc('get_experiencias_com_precos')

    if (error) throw error

    return {
      success: true,
      experiencias: data || []
    }
  } catch (error) {
    console.error('Erro ao buscar experiências com preços:', error)
    // Fallback para busca simples
    return fetchExperiencias(false)
  }
}

/**
 * Busca todas as experiências (admin vê todas, cliente vê só ativas)
 * @param {boolean} includeInactive - Se true, inclui inativas (só admin)
 */
export async function fetchExperiencias(includeInactive = false) {
  try {
    let query = supabase
      .from('experiencias')
      .select('*')
      .order('ordem', { ascending: true })

    if (!includeInactive) {
      query = query.eq('ativa', true)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      experiencias: data || []
    }
  } catch (error) {
    console.error('Erro ao buscar experiências:', error)
    return { success: false, error: error.message, experiencias: [] }
  }
}

/**
 * Cria uma nova experiência (apenas admin)
 * Usa valor_referencia_reais, pontos_prime e pontos_free (catálogo v2)
 */
export async function createExperiencia(experiencia) {
  try {
    const { data, error } = await supabase
      .from('experiencias')
      .insert([{
        nome: experiencia.nome,
        descricao: experiencia.descricao,
        // Campos v2 (fonte única)
        valor_referencia_reais: experiencia.valor_referencia_reais || null,
        pontos_prime: experiencia.pontos_prime || null,
        pontos_free: experiencia.pontos_free || null,
        tipo: experiencia.tipo || 'fixo',
        // Compatibilidade com colunas antigas
        pontos: experiencia.pontos_free || experiencia.pontos || null,
        // Outros campos
        classe_minima: experiencia.classe_minima || 1,
        selo: experiencia.selo || null,
        imagem_url: experiencia.imagem_url || null,
        ativa: experiencia.ativa !== false,
        ordem: experiencia.ordem || 0,
        tipo_entrega: experiencia.tipo_entrega || 'voucher',
        subtipo_entrega: experiencia.subtipo_entrega || null
      }])
      .select()
      .single()

    if (error) throw error

    return { success: true, experiencia: data }
  } catch (error) {
    console.error('Erro ao criar experiência:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Atualiza uma experiência existente (apenas admin)
 * Usa valor_referencia_reais, pontos_prime e pontos_free (catálogo v2)
 */
export async function updateExperiencia(id, updates) {
  try {
    const { data, error } = await supabase
      .from('experiencias')
      .update({
        nome: updates.nome,
        descricao: updates.descricao,
        // Campos v2 (fonte única)
        valor_referencia_reais: updates.valor_referencia_reais || null,
        pontos_prime: updates.pontos_prime || null,
        pontos_free: updates.pontos_free || null,
        tipo: updates.tipo || 'fixo',
        // Compatibilidade com colunas antigas
        pontos: updates.pontos_free || updates.pontos || null,
        // Outros campos
        classe_minima: updates.classe_minima,
        selo: updates.selo || null,
        imagem_url: updates.imagem_url,
        ativa: updates.ativa,
        ordem: updates.ordem,
        tipo_entrega: updates.tipo_entrega || 'voucher',
        subtipo_entrega: updates.subtipo_entrega || null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, experiencia: data }
  } catch (error) {
    console.error('Erro ao atualizar experiência:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ativa/desativa uma experiência (apenas admin)
 * Verifica se realmente alterou algo
 */
export async function toggleExperienciaAtiva(id, ativa) {
  try {
    const { data, error, count } = await supabase
      .from('experiencias')
      .update({ ativa, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()

    if (error) throw error

    // Verificar se alterou algo
    if (!data || data.length === 0) {
      return { success: false, error: 'Nenhum registro alterado. Verifique permissões.' }
    }

    return { success: true, experiencia: data[0] }
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return { success: false, error: error.message }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TAREFAS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Busca todas as tarefas (admin vê todas, cliente vê só ativas)
 * @param {boolean} includeInactive - Se true, inclui inativas (só admin)
 */
export async function fetchTarefas(includeInactive = false) {
  try {
    let query = supabase
      .from('tarefas')
      .select('*')
      .order('ordem', { ascending: true })

    if (!includeInactive) {
      query = query.eq('ativa', true)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      tarefas: data || []
    }
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error)
    return { success: false, error: error.message, tarefas: [] }
  }
}

/**
 * Cria uma nova tarefa (apenas admin)
 */
export async function createTarefa(tarefa) {
  try {
    const { data, error } = await supabase
      .from('tarefas')
      .insert([{
        nome: tarefa.nome,
        descricao: tarefa.descricao,
        pontos: tarefa.pontos,
        tipo: tarefa.tipo,
        icone: tarefa.icone || '✓',
        ativa: tarefa.ativa !== false,
        ordem: tarefa.ordem || 0
      }])
      .select()
      .single()

    if (error) throw error

    return { success: true, tarefa: data }
  } catch (error) {
    console.error('Erro ao criar tarefa:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Atualiza uma tarefa existente (apenas admin)
 */
export async function updateTarefa(id, updates) {
  try {
    const { data, error } = await supabase
      .from('tarefas')
      .update({
        nome: updates.nome,
        descricao: updates.descricao,
        pontos: updates.pontos,
        tipo: updates.tipo,
        icone: updates.icone,
        ativa: updates.ativa,
        ordem: updates.ordem
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, tarefa: data }
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ativa/desativa uma tarefa (apenas admin)
 */
export async function toggleTarefaAtiva(id, ativa) {
  try {
    const { error } = await supabase
      .from('tarefas')
      .update({ ativa })
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return { success: false, error: error.message }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOLICITAÇÕES DE TAREFAS (cliente solicita, admin aprova)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cliente solicita conclusão de uma tarefa
 */
export async function solicitarTarefa(userId, tarefaId) {
  try {
    const { data, error } = await supabase
      .from('tarefa_solicitacoes')
      .insert([{
        user_id: userId,
        tarefa_id: tarefaId,
        status: 'pendente'
      }])
      .select()
      .single()

    if (error) throw error

    return { success: true, solicitacao: data }
  } catch (error) {
    console.error('Erro ao solicitar tarefa:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cliente solicita conclusão de uma tarefa COM dados extras (ex: Instagram @)
 * @param {string} userId - ID do usuário
 * @param {string} tarefaId - ID da tarefa
 * @param {object} dadosExtras - Dados extras (ex: { instagram_handle: '@meup.viagens' })
 */
export async function solicitarTarefaComDados(userId, tarefaId, dadosExtras = {}) {
  try {
    const { data, error } = await supabase.rpc('solicitar_tarefa_com_dados', {
      p_user_id: userId,
      p_tarefa_id: tarefaId,
      p_dados_extras: dadosExtras
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error('Erro ao solicitar tarefa com dados:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca solicitações pendentes (admin)
 */
export async function fetchSolicitacoesPendentes() {
  try {
    const { data, error } = await supabase
      .from('tarefa_solicitacoes')
      .select(`
        *,
        tarefas (nome, pontos, icone),
        profiles:user_id (name, email)
      `)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Formatar dados para exibição
    const solicitacoes = (data || []).map(s => ({
      id: s.id,
      userId: s.user_id,
      userName: s.profiles?.name || 'Usuário',
      userEmail: s.profiles?.email || '',
      tarefaId: s.tarefa_id,
      tarefaNome: s.tarefas?.nome || 'Tarefa',
      tarefaPontos: s.tarefas?.pontos || 0,
      tarefaIcone: s.tarefas?.icone || '✓',
      status: s.status,
      dadosExtras: s.dados_extras || {},
      instagramHandle: s.dados_extras?.instagram_handle || null,
      createdAt: new Date(s.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }))

    return { success: true, solicitacoes }
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error)
    return { success: false, error: error.message, solicitacoes: [] }
  }
}

/**
 * Aprovar solicitação de tarefa (admin)
 * Credita os pontos no saldo do cliente
 */
export async function aprovarSolicitacao(solicitacaoId, adminId) {
  try {
    // 1. Buscar a solicitação com dados da tarefa
    const { data: solicitacao, error: fetchError } = await supabase
      .from('tarefa_solicitacoes')
      .select('*, tarefas(pontos, nome)')
      .eq('id', solicitacaoId)
      .single()

    if (fetchError) throw fetchError
    if (!solicitacao) throw new Error('Solicitação não encontrada')
    if (solicitacao.status !== 'pendente') throw new Error('Solicitação já processada')

    const pontos = solicitacao.tarefas?.pontos || 0
    const tarefaNome = solicitacao.tarefas?.nome || 'Tarefa'

    // 2. Creditar pontos usando a função RPC existente
    // CORREÇÃO: nomes de parâmetros devem ser p_user_id, p_amount, p_reason, p_type
    const { error: creditError } = await supabase.rpc('admin_credit_points', {
      p_user_id: solicitacao.user_id,
      p_amount: pontos,
      p_reason: `Tarefa concluída: ${tarefaNome}`,
      p_type: 'task'
    })

    if (creditError) throw creditError

    // 3. Atualizar status da solicitação
    const { error: updateError } = await supabase
      .from('tarefa_solicitacoes')
      .update({
        status: 'aprovada',
        pontos_concedidos: pontos,
        admin_id: adminId
      })
      .eq('id', solicitacaoId)

    if (updateError) throw updateError

    return { success: true, pontos }
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Rejeitar solicitação de tarefa (admin)
 */
export async function rejeitarSolicitacao(solicitacaoId, adminId, comentario = '') {
  try {
    const { error } = await supabase
      .from('tarefa_solicitacoes')
      .update({
        status: 'rejeitada',
        admin_id: adminId,
        admin_comentario: comentario
      })
      .eq('id', solicitacaoId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca solicitações do usuário atual
 */
export async function fetchMinhasSolicitacoes(userId) {
  try {
    const { data, error } = await supabase
      .from('tarefa_solicitacoes')
      .select(`
        *,
        tarefas (nome, pontos, icone)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      solicitacoes: data || []
    }
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error)
    return { success: false, error: error.message, solicitacoes: [] }
  }
}

/**
 * Verifica se já existe solicitação pendente para uma tarefa
 * Evita duplicatas - cliente não pode solicitar a mesma tarefa duas vezes
 */
export async function verificarSolicitacaoPendente(userId, tarefaId) {
  try {
    const { data, error } = await supabase
      .from('tarefa_solicitacoes')
      .select('id, status')
      .eq('user_id', userId)
      .eq('tarefa_id', tarefaId)
      .eq('status', 'pendente')
      .maybeSingle()

    if (error) throw error

    return {
      success: true,
      pendente: !!data,
      solicitacaoId: data?.id
    }
  } catch (error) {
    console.error('Erro ao verificar solicitação:', error)
    return { success: false, error: error.message, pendente: false }
  }
}

/**
 * Busca status de todas as missões do usuário para exibição
 * Combina missões manuais (tarefa_solicitacoes) e automáticas (missoes_automaticas_concluidas)
 * Retorna mapa de tarefaId -> { status, motivo } ou string (legado)
 */
export async function fetchStatusSolicitacoes(userId) {
  try {
    // Usar função RPC que combina ambas as tabelas
    const { data, error } = await supabase.rpc('get_user_mission_status', {
      p_user_id: userId
    })

    if (error) {
      console.warn('RPC get_user_mission_status falhou, usando fallback:', error)
      // Fallback: buscar apenas de tarefa_solicitacoes (com motivo)
      return await fetchStatusSolicitacoesFallback(userId)
    }

    // A função RPC retorna JSONB - pode ser { tarefa_id: status } ou { tarefa_id: { status, motivo } }
    // Para retrocompatibilidade, normalizar para objeto
    const statusMap = data || {}

    return { success: true, statusMap }
  } catch (error) {
    console.error('Erro ao buscar status:', error)
    return { success: false, error: error.message, statusMap: {} }
  }
}

/**
 * Fallback: busca apenas de tarefa_solicitacoes (comportamento antigo)
 * Usado caso a função RPC não exista ainda
 */
async function fetchStatusSolicitacoesFallback(userId) {
  try {
    const { data, error } = await supabase
      .from('tarefa_solicitacoes')
      .select('tarefa_id, status, admin_comentario, dados_extras, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Criar mapa de tarefa_id -> { status, motivo, instagramHandle }
    const statusMap = {}
    for (const s of (data || [])) {
      // Só guarda a primeira (mais recente) de cada tarefa
      if (!statusMap[s.tarefa_id]) {
        statusMap[s.tarefa_id] = {
          status: s.status,
          motivo: s.admin_comentario || null,
          instagramHandle: s.dados_extras?.instagram_handle || null
        }
      }
    }

    return { success: true, statusMap }
  } catch (error) {
    console.error('Erro ao buscar status (fallback):', error)
    return { success: false, error: error.message, statusMap: {} }
  }
}

/**
 * Busca solicitações de um cliente específico (admin)
 */
export async function fetchSolicitacoesCliente(userId) {
  try {
    const { data, error } = await supabase
      .from('tarefa_solicitacoes')
      .select(`
        *,
        tarefas (nome, pontos, icone)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Formatar dados para exibição
    const solicitacoes = (data || []).map(s => ({
      id: s.id,
      tarefaId: s.tarefa_id,
      tarefaNome: s.tarefas?.nome || 'Tarefa',
      tarefaPontos: s.tarefas?.pontos || 0,
      tarefaIcone: s.tarefas?.icone || '✓',
      status: s.status,
      pontosCredidados: s.pontos_concedidos,
      adminComentario: s.admin_comentario,
      createdAt: new Date(s.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }))

    return { success: true, solicitacoes }
  } catch (error) {
    console.error('Erro ao buscar solicitações do cliente:', error)
    return { success: false, error: error.message, solicitacoes: [] }
  }
}
