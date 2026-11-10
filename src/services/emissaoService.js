// ============================================
// SERVIÇO DE EMISSÕES (VIAGENS) - Meup Club
// Cliente lança viagem -> Admin aprova -> Pontos creditados
// ============================================

import { supabase } from '@/lib/supabase'

// Configuração de pontos (1 pt por R$1)
const PONTOS_POR_REAL = 1

// ============================================
// CLIENTE: CRIAR EMISSÃO
// ============================================

/**
 * Upload do card Meup para o storage
 * @param {File} file - Arquivo (imagem ou PDF)
 * @param {string} userId - ID do usuário
 * @returns {Promise<{success: boolean, url?: string, path?: string, error?: string}>}
 */
export async function uploadCardMeup(file, userId) {
  try {
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Tipo de arquivo não permitido. Use JPG, PNG ou PDF.' }
    }

    // Validar tamanho (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'Arquivo muito grande. Máximo 5MB.' }
    }

    // Gerar nome único
    const ext = file.name.split('.').pop()
    const timestamp = Date.now()
    const path = `emissoes/${userId}/${timestamp}.${ext}`

    // Upload para o storage
    const { data, error } = await supabase.storage
      .from('cards-meup')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('cards-meup')
      .getPublicUrl(path)

    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl
    }
  } catch (error) {
    console.error('Erro no upload:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Criar uma nova emissão (viagem)
 * @param {string} userId - ID do usuário
 * @param {number} valor - Valor total da emissão (R$)
 * @param {string} dataEmissao - Data da emissão (YYYY-MM-DD)
 * @param {string} cardUrl - URL do card Meup no storage
 * @param {string} cardPath - Path do arquivo no storage
 */
export async function criarEmissao(userId, valor, dataEmissao, cardUrl, cardPath) {
  try {
    // Validações
    if (!userId) return { success: false, error: 'Usuário não identificado' }
    if (!valor || valor <= 0) return { success: false, error: 'Valor inválido' }
    if (!cardUrl) return { success: false, error: 'Anexe o card Meup' }

    // Calcular pontos (1 pt por R$1)
    const pontosEstimados = Math.floor(valor * PONTOS_POR_REAL)

    const { data, error } = await supabase
      .from('emissoes')
      .insert([{
        user_id: userId,
        valor: valor,
        pontos_estimados: pontosEstimados,
        data_emissao: dataEmissao,
        card_url: cardUrl,
        card_path: cardPath,
        status: 'pendente'
      }])
      .select()
      .single()

    if (error) throw error

    return { success: true, emissao: data }
  } catch (error) {
    console.error('Erro ao criar emissão:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Buscar emissões do usuário (histórico)
 * @param {string} userId - ID do usuário
 */
export async function fetchMinhasEmissoes(userId) {
  try {
    const { data, error } = await supabase
      .from('emissoes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, emissoes: data || [] }
  } catch (error) {
    console.error('Erro ao buscar emissões:', error)
    return { success: false, error: error.message, emissoes: [] }
  }
}

// ============================================
// ADMIN: GERENCIAR EMISSÕES
// ============================================

/**
 * Buscar emissões pendentes (admin)
 */
export async function fetchEmissoesPendentes() {
  try {
    const { data, error } = await supabase
      .from('emissoes')
      .select(`
        *,
        profiles:user_id (name, email)
      `)
      .eq('status', 'pendente')
      .order('created_at', { ascending: true })

    if (error) throw error

    const emissoes = (data || []).map(e => ({
      id: e.id,
      userId: e.user_id,
      userName: e.profiles?.name || 'Cliente',
      userEmail: e.profiles?.email || '',
      valor: e.valor,
      pontosEstimados: e.pontos_estimados,
      dataEmissao: e.data_emissao,
      cardUrl: e.card_url,
      cardPath: e.card_path,
      status: e.status,
      createdAt: new Date(e.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }))

    return { success: true, emissoes }
  } catch (error) {
    console.error('Erro ao buscar emissões:', error)
    return { success: false, error: error.message, emissoes: [] }
  }
}

/**
 * Buscar todas as emissões (admin) com filtro opcional
 * @param {string} status - Filtro por status ('pendente', 'aprovada', 'recusada', ou null para todas)
 */
export async function fetchTodasEmissoes(status = null) {
  try {
    let query = supabase
      .from('emissoes')
      .select(`
        *,
        profiles:user_id (name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    const emissoes = (data || []).map(e => ({
      id: e.id,
      userId: e.user_id,
      userName: e.profiles?.name || 'Cliente',
      userEmail: e.profiles?.email || '',
      valor: e.valor,
      pontosEstimados: e.pontos_estimados,
      pontosCreditados: e.pontos_creditados,
      dataEmissao: e.data_emissao,
      cardUrl: e.card_url,
      cardPath: e.card_path,
      status: e.status,
      origem: e.origem || 'cliente', // 'cliente' ou 'equipe'
      motivoRecusa: e.motivo_recusa,
      adminId: e.admin_id,
      createdAt: new Date(e.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      processedAt: e.processed_at ? new Date(e.processed_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : null
    }))

    return { success: true, emissoes }
  } catch (error) {
    console.error('Erro ao buscar emissões:', error)
    return { success: false, error: error.message, emissoes: [] }
  }
}

/**
 * Aprovar emissão (admin)
 * ANTI-DUPLO-CRÉDITO: verifica status antes de creditar
 * Usa SELECT FOR UPDATE via RPC para evitar race conditions
 *
 * @param {string} emissaoId - ID da emissão
 * @param {string} adminId - ID do admin que está aprovando
 */
export async function aprovarEmissao(emissaoId, adminId) {
  try {
    // 1. Buscar emissão com lock (verifica status)
    // Se status != 'pendente', a função RPC já retorna erro
    const { data, error } = await supabase.rpc('aprovar_emissao_seguro', {
      p_emissao_id: emissaoId,
      p_admin_id: adminId
    })

    if (error) throw error

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      pontos: data.pontos_creditados,
      emissao: {
        id: emissaoId,
        valor: data.valor,
        pontosCreditados: data.pontos_creditados
      }
    }
  } catch (error) {
    console.error('Erro ao aprovar emissão:', error)

    // Fallback se RPC não existir ainda (desenvolvimento)
    if (error.message?.includes('function') && error.message?.includes('does not exist')) {
      return aprovarEmissaoFallback(emissaoId, adminId)
    }

    return { success: false, error: error.message }
  }
}

/**
 * Fallback para aprovar emissão (sem RPC)
 * MENOS SEGURO - usar apenas em desenvolvimento
 */
async function aprovarEmissaoFallback(emissaoId, adminId) {
  try {
    // 1. Buscar emissão
    const { data: emissao, error: fetchError } = await supabase
      .from('emissoes')
      .select('*')
      .eq('id', emissaoId)
      .single()

    if (fetchError) throw fetchError
    if (!emissao) throw new Error('Emissão não encontrada')

    // ANTI-DUPLO-CRÉDITO: verifica status
    if (emissao.status !== 'pendente') {
      return { success: false, error: 'Esta emissão já foi processada' }
    }

    // 2. Calcular pontos
    const pontos = Math.floor(emissao.valor * PONTOS_POR_REAL)

    // 3. Creditar pontos usando função existente
    const { error: creditError } = await supabase.rpc('admin_credit_points', {
      p_user_id: emissao.user_id,
      p_amount: pontos,
      p_reason: `Emissão aprovada: R$ ${emissao.valor.toLocaleString('pt-BR')}`,
      p_type: 'credit'
    })

    if (creditError) throw creditError

    // 4. Atualizar status da emissão
    const { error: updateError } = await supabase
      .from('emissoes')
      .update({
        status: 'aprovada',
        pontos_creditados: pontos,
        admin_id: adminId,
        processed_at: new Date().toISOString()
      })
      .eq('id', emissaoId)
      .eq('status', 'pendente') // Double-check do status

    if (updateError) throw updateError

    // 5. Criar notificação para o cliente
    await supabase.from('notifications').insert([{
      user_id: emissao.user_id,
      type: 'emissao_aprovada',
      title: 'Viagem aprovada!',
      message: `Sua emissão de R$ ${emissao.valor.toLocaleString('pt-BR')} foi aprovada. +${pontos.toLocaleString('pt-BR')} pontos creditados!`,
      read: false
    }])

    return {
      success: true,
      pontos,
      emissao: {
        id: emissaoId,
        valor: emissao.valor,
        pontosCreditados: pontos
      }
    }
  } catch (error) {
    console.error('Erro no fallback aprovar:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Recusar emissão (admin)
 * @param {string} emissaoId - ID da emissão
 * @param {string} adminId - ID do admin
 * @param {string} motivo - Motivo da recusa
 */
export async function recusarEmissao(emissaoId, adminId, motivo = '') {
  try {
    // 1. Buscar emissão para verificar status
    const { data: emissao, error: fetchError } = await supabase
      .from('emissoes')
      .select('user_id, valor, status')
      .eq('id', emissaoId)
      .single()

    if (fetchError) throw fetchError
    if (!emissao) throw new Error('Emissão não encontrada')
    if (emissao.status !== 'pendente') {
      return { success: false, error: 'Esta emissão já foi processada' }
    }

    // 2. Atualizar status
    const { error: updateError } = await supabase
      .from('emissoes')
      .update({
        status: 'recusada',
        motivo_recusa: motivo || 'Documento não válido',
        admin_id: adminId,
        processed_at: new Date().toISOString()
      })
      .eq('id', emissaoId)
      .eq('status', 'pendente')

    if (updateError) throw updateError

    // 3. Notificar cliente
    await supabase.from('notifications').insert([{
      user_id: emissao.user_id,
      type: 'emissao_recusada',
      title: 'Emissão não aprovada',
      message: motivo || 'Sua emissão não foi aprovada. Verifique o documento enviado.',
      read: false
    }])

    return { success: true }
  } catch (error) {
    console.error('Erro ao recusar emissão:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// ADMIN: LANÇAR EMISSÃO PELA EQUIPE
// ============================================

/**
 * Buscar clientes para seleção (autocomplete)
 * @param {string} search - Termo de busca (nome ou email)
 */
export async function buscarClientes(search = '') {
  try {
    let query = supabase
      .from('profiles')
      .select('id, name, email')
      .limit(20)
      .order('name', { ascending: true })

    if (search && search.length >= 2) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      clientes: (data || []).map(c => ({
        id: c.id,
        name: c.name || 'Sem nome',
        email: c.email
      }))
    }
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return { success: false, error: error.message, clientes: [] }
  }
}

/**
 * Lançar emissão diretamente pela equipe (admin)
 * JÁ credita os pontos e registra como aprovada
 * ANTI-DUPLO-CRÉDITO: usa token único de idempotência
 *
 * @param {Object} params
 * @param {string} params.clienteId - ID do cliente
 * @param {number} params.valor - Valor total (R$)
 * @param {string} params.dataEmissao - Data da emissão (YYYY-MM-DD)
 * @param {string} params.cardUrl - URL do card no storage
 * @param {string} params.cardPath - Path do arquivo no storage
 * @param {string} params.adminId - ID do admin que está lançando
 * @param {string} params.idempotencyKey - Chave única para evitar duplo-crédito
 */
export async function lancarEmissaoEquipe({
  clienteId,
  valor,
  dataEmissao,
  cardUrl,
  cardPath,
  adminId,
  idempotencyKey
}) {
  try {
    // Validações
    if (!clienteId) return { success: false, error: 'Selecione um cliente' }
    if (!valor || valor <= 0) return { success: false, error: 'Valor inválido' }
    if (!cardUrl) return { success: false, error: 'Anexe o card Meup' }
    if (!idempotencyKey) return { success: false, error: 'Erro de idempotência' }

    // ANTI-DUPLO-CRÉDITO: verificar se já existe emissão com essa chave
    const { data: existente } = await supabase
      .from('emissoes')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existente) {
      return {
        success: false,
        error: 'Esta emissão já foi processada',
        duplicada: true
      }
    }

    // Calcular pontos (1 pt por R$1)
    const pontos = Math.floor(valor * PONTOS_POR_REAL)

    // 1. Criar emissão JÁ aprovada com origem = 'equipe'
    const { data: emissao, error: insertError } = await supabase
      .from('emissoes')
      .insert([{
        user_id: clienteId,
        valor: valor,
        pontos_estimados: pontos,
        pontos_creditados: pontos,
        data_emissao: dataEmissao,
        card_url: cardUrl,
        card_path: cardPath,
        status: 'aprovada',
        origem: 'equipe',
        admin_id: adminId,
        processed_at: new Date().toISOString(),
        idempotency_key: idempotencyKey
      }])
      .select()
      .single()

    if (insertError) throw insertError

    // 2. Creditar pontos usando função existente
    const { error: creditError } = await supabase.rpc('admin_credit_points', {
      p_user_id: clienteId,
      p_amount: pontos,
      p_reason: `Emissão lançada pela equipe: R$ ${valor.toLocaleString('pt-BR')}`,
      p_type: 'credit'
    })

    if (creditError) {
      // Rollback: deletar emissão se falhou crédito
      await supabase.from('emissoes').delete().eq('id', emissao.id)
      throw creditError
    }

    // 3. Notificar cliente
    await supabase.from('notifications').insert([{
      user_id: clienteId,
      type: 'emissao_aprovada',
      title: 'Viagem registrada!',
      message: `A equipe registrou sua emissão de R$ ${valor.toLocaleString('pt-BR')}. +${pontos.toLocaleString('pt-BR')} pontos creditados!`,
      read: false
    }])

    return {
      success: true,
      pontos,
      emissao: {
        id: emissao.id,
        valor,
        pontosCreditados: pontos
      }
    }
  } catch (error) {
    console.error('Erro ao lançar emissão:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// SIGNED URL PARA VISUALIZAÇÃO SEGURA
// ============================================

/**
 * Gera URL assinada para acessar arquivo privado
 * Expira em 5 minutos
 * @param {string} path - Caminho do arquivo no bucket (ex: emissoes/userId/timestamp.pdf)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function getSignedCardUrl(path) {
  try {
    if (!path) return { success: false, error: 'Caminho não informado' }

    const { data, error } = await supabase.storage
      .from('cards-meup')
      .createSignedUrl(path, 300) // 5 minutos

    if (error) throw error

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error('Erro ao gerar signed URL:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Baixar arquivo do card Meup
 * @param {string} path - Caminho do arquivo no bucket
 * @param {string} filename - Nome do arquivo para download
 */
export async function downloadCardMeup(path, filename = 'card-meup') {
  try {
    const { data, error } = await supabase.storage
      .from('cards-meup')
      .download(path)

    if (error) throw error

    // Criar link de download
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return { success: true }
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Formatar status para exibição
 */
export function formatStatus(status) {
  const statusMap = {
    pendente: { label: 'Em análise', color: 'text-amber-600', bg: 'bg-amber-100' },
    aprovada: { label: 'Aprovada', color: 'text-green-600', bg: 'bg-green-100' },
    recusada: { label: 'Recusada', color: 'text-red-600', bg: 'bg-red-100' },
    revertida: { label: 'Revertida', color: 'text-purple-600', bg: 'bg-purple-100' }
  }
  return statusMap[status] || statusMap.pendente
}

/**
 * Calcular pontos estimados
 */
export function calcularPontos(valor) {
  return Math.floor(valor * PONTOS_POR_REAL)
}
