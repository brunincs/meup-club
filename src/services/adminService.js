// ============================================
// SERVIÇO ADMIN - DADOS REAIS DO SUPABASE
// Fonte única: metricas_clube() RPC
// ============================================

import { supabase } from '@/lib/supabase'
import { levels } from './pointsSystem'

// Cache compartilhado para metricas_clube
let _metricasAdminCache = null
let _metricasAdminCacheTime = 0
const CACHE_TTL = 30000 // 30 segundos

/**
 * Busca métricas do clube (fonte única de verdade)
 * Com cache de 30 segundos
 */
export async function getMetricasClubeAdmin() {
  const now = Date.now()
  if (_metricasAdminCache && (now - _metricasAdminCacheTime) < CACHE_TTL) {
    return { success: true, metricas: _metricasAdminCache }
  }

  try {
    const { data, error } = await supabase.rpc('metricas_clube')
    if (error) throw error
    _metricasAdminCache = data
    _metricasAdminCacheTime = now
    return { success: true, metricas: data }
  } catch (error) {
    console.warn('metricas_clube não disponível:', error.message)
    return { success: false, metricas: null, error: error.message }
  }
}

/**
 * Invalida o cache de métricas
 */
export function invalidateMetricasAdminCache() {
  _metricasAdminCache = null
  _metricasAdminCacheTime = 0
}

/**
 * Calcula o nível baseado nos pontos
 */
function calculateLevelFromPoints(points) {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].minPoints) {
      return levels[i]
    }
  }
  return levels[0]
}

// ============================================
// USUÁRIOS
// ============================================

/**
 * Sanitiza input de busca para prevenir injeção
 * @param {string} input - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
function sanitizeSearchInput(input) {
  if (!input) return ''
  // Remove caracteres especiais do PostgREST/SQL
  return input
    .replace(/[%_\\'"(){}[\]<>]/g, '')
    .trim()
    .slice(0, 100) // Limita tamanho
}

/**
 * Busca todos os usuários (clientes) do sistema
 * @param {string} searchQuery - Filtro por nome ou email
 */
export async function fetchAllUsers(searchQuery = '') {
  let query = supabase
    .from('profiles')
    .select('id, name, email, phone, points, role, status_acesso, origem_acesso, is_teste, created_at')
    .order('created_at', { ascending: false })

  const sanitizedQuery = sanitizeSearchInput(searchQuery)
  if (sanitizedQuery) {
    query = query.or(`name.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    return { success: false, error: error.message, users: [] }
  }

  // Adicionar informações de nível
  const usersWithLevel = data.map(user => {
    const level = calculateLevelFromPoints(user.points || 0)
    return {
      ...user,
      points: user.points || 0,
      levelId: level.id,
      levelName: level.name,
      levelShortName: level.shortName,
      joinDate: new Date(user.created_at).toLocaleDateString('pt-BR'),
      status: 'active' // TODO: implementar bloqueio de usuários se necessário
    }
  })

  return { success: true, users: usersWithLevel }
}

/**
 * Busca um usuário específico pelo ID
 */
export async function fetchUserById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, points, role, created_at')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Erro ao buscar usuário:', error)
    return { success: false, error: error.message }
  }

  const level = calculateLevelFromPoints(data.points || 0)
  return {
    success: true,
    user: {
      ...data,
      points: data.points || 0,
      levelId: level.id,
      levelName: level.name,
      levelShortName: level.shortName
    }
  }
}

// ============================================
// CREDITAR/AJUSTAR PONTOS
// ============================================

/**
 * Credita ou debita pontos de um usuário
 * A verificação de admin é feita NO BANCO (seguro)
 *
 * @param {string} userId - ID do usuário que receberá os pontos
 * @param {number} amount - Quantidade (positivo = crédito, negativo = débito)
 * @param {string} reason - Motivo da operação
 * @param {string} type - Tipo: 'credit', 'debit', 'referral', 'task'
 */
export async function creditPoints(userId, amount, reason, type = 'credit') {
  // Validações básicas no frontend (o banco valida de novo)
  if (!userId) {
    return { success: false, error: 'Usuário não informado' }
  }

  if (amount === 0) {
    return { success: false, error: 'Quantidade não pode ser zero' }
  }

  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Motivo é obrigatório' }
  }

  // Chamar a função segura do banco
  // A função verifica se quem está chamando é admin
  const { data, error } = await supabase.rpc('admin_credit_points', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason.trim(),
    p_type: type
  })

  if (error) {
    console.error('Erro ao creditar pontos:', error)
    return { success: false, error: error.message }
  }

  // A função retorna um JSON com success/error
  if (!data.success) {
    return { success: false, error: data.error }
  }

  return {
    success: true,
    transaction: {
      id: data.transaction_id,
      userId: data.user_id,
      userName: data.user_name,
      baseAmount: data.base_amount,
      multiplier: parseFloat(data.multiplier),
      finalAmount: data.final_amount,
      balanceBefore: data.balance_before,
      balanceAfter: data.balance_after,
      reason: data.reason
    }
  }
}

/**
 * Busca preview do crédito com valores do plano
 * Usado pelo modal para mostrar o valor correto antes de confirmar
 *
 * @param {string} userId - ID do usuário
 * @param {number} baseAmount - Valor base (R$ para viagem, count para indicação)
 * @param {string} type - Tipo: 'credit' (viagem), 'referral' (indicação), 'birthday', 'task'
 */
export async function getCreditPreview(userId, baseAmount, type = 'credit') {
  try {
    const { data, error } = await supabase.rpc('get_credit_preview', {
      p_user_id: userId,
      p_base_amount: baseAmount,
      p_type: type
    })

    if (error) throw error

    return {
      success: true,
      preview: {
        plano: data.plano,
        ciclo: data.ciclo,
        isPrime: data.is_prime,
        baseAmount: data.base_amount,
        unitValue: data.unit_value,
        multiplier: parseFloat(data.multiplier || 1),
        finalAmount: data.final_amount,
        hasBonus: data.has_bonus,
        // Valores do plano para referência
        pontos_indicacao: data.pontos_indicacao,
        pontos_checkin: data.pontos_checkin,
        pontos_aniversario: data.pontos_aniversario
      }
    }
  } catch (error) {
    console.error('Erro ao buscar preview:', error)
    return {
      success: false,
      preview: {
        baseAmount,
        multiplier: 1.0,
        finalAmount: baseAmount,
        hasBonus: false
      }
    }
  }
}

// ============================================
// HISTÓRICO DE TRANSAÇÕES
// ============================================

/**
 * Busca o histórico de transações de um usuário específico
 */
export async function fetchUserTransactions(userId) {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('id, admin_id, amount, balance_before, balance_after, type, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar transações:', error)
    return { success: false, error: error.message, transactions: [] }
  }

  if (!data || data.length === 0) {
    return { success: true, transactions: [] }
  }

  // Buscar nomes dos admins
  const adminIds = [...new Set(data.map(t => t.admin_id).filter(Boolean))]
  let adminsMap = {}

  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', adminIds)

    if (admins) {
      adminsMap = admins.reduce((acc, a) => {
        acc[a.id] = a.name
        return acc
      }, {})
    }
  }

  const transactions = data.map(t => ({
    id: t.id,
    amount: t.amount,
    balanceBefore: t.balance_before || 0,
    balanceAfter: t.balance_after || 0,
    type: t.type,
    reason: t.reason || 'Sem descrição',
    adminName: adminsMap[t.admin_id] || 'Sistema',
    createdAt: new Date(t.created_at).toLocaleString('pt-BR')
  }))

  return { success: true, transactions }
}

/**
 * Busca todas as transações (para o admin)
 * Usa função RPC segura que bypassa RLS
 */
export async function fetchAllTransactions(filters = {}) {
  // Primeiro, buscar as transações
  let query = supabase
    .from('point_transactions')
    .select('id, user_id, admin_id, amount, balance_before, balance_after, type, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar transações:', error)
    return { success: false, error: error.message, transactions: [] }
  }

  if (!data || data.length === 0) {
    return { success: true, transactions: [] }
  }

  // Buscar nomes dos usuários e admins em uma segunda query
  const userIds = [...new Set(data.map(t => t.user_id).filter(Boolean))]
  const adminIds = [...new Set(data.map(t => t.admin_id).filter(Boolean))]
  const allIds = [...new Set([...userIds, ...adminIds])]

  let profilesMap = {}
  if (allIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', allIds)

    if (profiles) {
      profilesMap = profiles.reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})
    }
  }

  const transactions = data.map(t => ({
    id: t.id,
    amount: t.amount,
    balanceBefore: t.balance_before || 0,
    balanceAfter: t.balance_after || 0,
    type: t.type,
    reason: t.reason || 'Sem descrição',
    userId: t.user_id,
    userName: profilesMap[t.user_id]?.name || 'Usuário',
    userEmail: profilesMap[t.user_id]?.email || '',
    adminName: profilesMap[t.admin_id]?.name || 'Sistema',
    createdAt: new Date(t.created_at).toLocaleString('pt-BR')
  }))

  return { success: true, transactions }
}

// ============================================
// PERFIL DO CLIENTE (ADMIN)
// ============================================

/**
 * Busca perfil completo do cliente (admin-only)
 * CPF retorna MASCARADO (ex: ***.***.**9-21)
 * @param {string} userId - ID do cliente
 */
export async function fetchClientProfile(userId) {
  const { data, error } = await supabase.rpc('admin_get_client_profile', {
    p_user_id: userId
  })

  if (error) {
    console.error('Erro ao buscar perfil do cliente:', error)
    return { success: false, error: error.message }
  }

  return data
}

/**
 * Revela CPF completo do cliente (admin-only)
 * Registra no audit log para conformidade
 * @param {string} userId - ID do cliente
 */
export async function revealClientCpf(userId) {
  const { data, error } = await supabase.rpc('admin_reveal_cpf', {
    p_user_id: userId
  })

  if (error) {
    console.error('Erro ao revelar CPF:', error)
    return { success: false, error: error.message }
  }

  return data
}

// ============================================
// ESTATÍSTICAS
// ============================================

// ============================================
// ASSINATURAS
// ============================================

/**
 * Busca todas as assinaturas Prime ativas
 */
export async function fetchAllSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, profiles(name, email)')
    .eq('status', 'active')
    .order('current_period_end', { ascending: true })

  if (error) {
    console.error('Erro ao buscar assinaturas:', error)
    return { success: false, error: error.message, subscriptions: [] }
  }

  return { success: true, subscriptions: data || [] }
}

// ============================================
// ESTATÍSTICAS
// ============================================

/**
 * Busca estatísticas gerais para o dashboard admin
 */
export async function fetchAdminStats() {
  // Total de usuários
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Total de pontos distribuídos
  const { data: pointsData } = await supabase
    .from('profiles')
    .select('points')

  const totalPointsDistributed = pointsData?.reduce((sum, u) => sum + (u.points || 0), 0) || 0

  // Total de transações
  const { count: totalTransactions } = await supabase
    .from('point_transactions')
    .select('*', { count: 'exact', head: true })

  return {
    success: true,
    stats: {
      totalUsers: totalUsers || 0,
      totalPointsDistributed,
      totalTransactions: totalTransactions || 0
    }
  }
}

/**
 * Busca métricas detalhadas do admin
 * - Free vs Prime (TOTAL e novos no mês)
 * - Conversão Free→Prime no mês
 * - Pontos emitidos vs resgatados no mês
 * Usa metricas_clube() como fonte principal quando disponível
 */
export async function fetchAdminMetrics() {
  try {
    // Início do mês atual
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

    // Tenta usar metricas_clube() como fonte única
    const metricasResult = await getMetricasClubeAdmin()
    let totalClientes, freeCount, primeCount

    if (metricasResult.success && metricasResult.metricas) {
      const m = metricasResult.metricas
      totalClientes = m.total_usuarios || 0
      freeCount = m.usuarios_free || 0
      primeCount = m.usuarios_prime || 0
    } else {
      // Fallback: queries individuais
      // 1. Total de clientes
      const { count: tc } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin')
      totalClientes = tc || 0

      // 2. Clientes Prime (assinaturas ativas)
      const { data: assinaturasPrime } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active')

      const primeUserIds = new Set(assinaturasPrime?.map(s => s.user_id) || [])
      primeCount = primeUserIds.size
      freeCount = totalClientes - primeCount
    }

    // 3. Novos clientes no mês
    const { count: novosNoMes } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'admin')
      .gte('created_at', inicioMes)

    // 4. Conversões Free→Prime no mês (assinaturas criadas no mês)
    const { count: conversoesNoMes } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', inicioMes)
      .eq('status', 'active')

    // % conversão = conversões no mês / (Free no início do mês + conversões) * 100
    // Free no início = Free atual + conversões (eles eram Free antes)
    const freeNoInicioMes = freeCount + (conversoesNoMes || 0)
    const percentualConversao = freeNoInicioMes > 0
      ? ((conversoesNoMes || 0) / freeNoInicioMes * 100).toFixed(1)
      : 0

    // 5. Pontos emitidos no mês (soma de amount > 0)
    const { data: pontosEmitidos } = await supabase
      .from('point_transactions')
      .select('amount')
      .gt('amount', 0)
      .gte('created_at', inicioMes)

    const totalEmitido = pontosEmitidos?.reduce((sum, t) => sum + t.amount, 0) || 0

    // 6. Pontos resgatados no mês (soma de amount < 0, em valor absoluto)
    const { data: pontosResgatados } = await supabase
      .from('point_transactions')
      .select('amount')
      .lt('amount', 0)
      .gte('created_at', inicioMes)

    const totalResgatado = Math.abs(pontosResgatados?.reduce((sum, t) => sum + t.amount, 0) || 0)

    // 7. Receita de assinaturas no mês
    const { data: assinaturasMes } = await supabase
      .from('subscriptions')
      .select('metadata')
      .gte('created_at', inicioMes)
      .eq('status', 'active')

    let receitaAssinaturasMes = 0
    assinaturasMes?.forEach(a => {
      // Verificar se é fundador (pelo metadata)
      if (a.metadata?.numero_fundador) {
        const lote = a.metadata?.lote || 1
        const precos = { 1: 497, 2: 597, 3: 697 }
        receitaAssinaturasMes += precos[lote] || 497
      } else {
        // Assinatura regular
        const valor = a.metadata?.valor || a.metadata?.price
        if (valor) {
          receitaAssinaturasMes += valor
        } else {
          // Estimar pelo ciclo
          const ciclo = a.metadata?.ciclo || 'mensal'
          receitaAssinaturasMes += ciclo === 'anual' ? 299 : 29.90
        }
      }
    })

    // 8. Resgates no mês
    const { count: resgatesNoMes } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', inicioMes)

    return {
      success: true,
      metrics: {
        totalClientes: totalClientes || 0,
        freeCount,
        primeCount,
        novosNoMes: novosNoMes || 0,
        conversoesNoMes: conversoesNoMes || 0,
        percentualConversao,
        pontosEmitidosMes: totalEmitido,
        pontosResgatadosMes: totalResgatado,
        receitaAssinaturasMes,
        resgatesNoMes: resgatesNoMes || 0
      }
    }
  } catch (error) {
    console.error('Erro ao buscar métricas:', error)
    return { success: false, metrics: null, error: error.message }
  }
}

/**
 * Busca métricas de fundadores
 * - Total vendidas
 * - Por lote
 * - Vagas restantes (100 - vendidas)
 */
export async function fetchFundadoresMetrics() {
  try {
    // Buscar fundadores da tabela fundadores (fonte real)
    const { data: fundadoresData } = await supabase
      .from('fundadores')
      .select('id, vaga_numero, selo_ativado, created_at')
      .eq('selo_ativado', true)

    const totalVendidas = fundadoresData?.length || 0

    // Buscar lotes do banco de dados
    const { data: lotesDb } = await supabase
      .from('fundadores_lotes')
      .select('lote_numero, vagas_total, preco')
      .order('lote_numero')

    // Agrupar vendas por lote baseado no vaga_numero
    const porLote = {}
    let acumulado = 0
    const lotesConfig = lotesDb || [
      { lote_numero: 1, vagas_total: 20, preco: 497 },
      { lote_numero: 2, vagas_total: 40, preco: 597 },
      { lote_numero: 3, vagas_total: 40, preco: 697 }
    ]

    // Mapear cada vaga_numero para seu lote
    fundadoresData?.forEach(f => {
      const vagaNum = f.vaga_numero
      let vagaAcumulada = 0
      for (const lote of lotesConfig) {
        vagaAcumulada += lote.vagas_total
        if (vagaNum <= vagaAcumulada) {
          porLote[lote.lote_numero] = (porLote[lote.lote_numero] || 0) + 1
          break
        }
      }
    })

    // Definir lotes e preços
    // Lote 1: 20 vagas a R$ 497
    // Lote 2: 40 vagas a R$ 597
    // Lote 3: 40 vagas a R$ 697
    // Total: 100 vagas
    const lotes = [
      { numero: 1, vagas: 20, preco: 497 },
      { numero: 2, vagas: 40, preco: 597 },
      { numero: 3, vagas: 40, preco: 697 }
    ]

    // Determinar lote atual baseado em quantas vagas foram vendidas
    let vagasVendidas = 0
    let loteAtual = 1
    let precoAtual = 497
    let vagasNoLoteAtual = 0

    for (const lote of lotes) {
      const vendidasNoLote = porLote[lote.numero] || 0
      vagasVendidas += vendidasNoLote
      vagasNoLoteAtual = vendidasNoLote

      if (vendidasNoLote < lote.vagas) {
        loteAtual = lote.numero
        precoAtual = lote.preco
        break
      }
    }

    // Vagas restantes no total (100 - vendidas)
    const vagasRestantes = Math.max(0, 100 - totalVendidas)

    // Vagas restantes no lote atual
    const loteConfig = lotes.find(l => l.numero === loteAtual) || lotes[0]
    const vagasRestantesNoLote = loteConfig.vagas - (porLote[loteAtual] || 0)

    return {
      success: true,
      fundadores: {
        loteAtual,
        precoAtual,
        vagasRestantes,
        vagasRestantesNoLote,
        totalVendidas,
        porLote,
        lotes // Informações de todos os lotes
      }
    }
  } catch (error) {
    console.error('Erro ao buscar fundadores:', error)
    return { success: false, fundadores: null, error: error.message }
  }
}

/**
 * Busca erros detalhados da leitura de cards IA
 * - Mostra taxa de sucesso dos últimos 7 dias e 30 dias
 * - Mostra modelo usado em cada erro
 * - Mostra mensagem real de erro (não "Outro")
 */
export async function fetchIAErrorDetails() {
  try {
    const hoje = new Date()
    const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Buscar dados dos últimos 30 dias
    const { data, error } = await supabase
      .from('ia_uso')
      .select('id, created_at, sucesso, erro, modelo, emissao_id, tokens_entrada, tokens_saida')
      .gte('created_at', trintaDiasAtras)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Separar por status - 30 dias
    const erros30d = data?.filter(d => !d.sucesso) || []
    const sucessos30d = data?.filter(d => d.sucesso) || []
    const total30d = data?.length || 0
    const taxaSucesso30d = total30d > 0 ? ((sucessos30d.length / total30d) * 100).toFixed(1) : 0

    // Separar por status - 7 dias
    const dados7d = data?.filter(d => d.created_at >= seteDiasAtras) || []
    const erros7d = dados7d.filter(d => !d.sucesso)
    const sucessos7d = dados7d.filter(d => d.sucesso)
    const total7d = dados7d.length
    const taxaSucesso7d = total7d > 0 ? ((sucessos7d.length / total7d) * 100).toFixed(1) : 0

    // Agrupar erros por modelo
    const errosPorModelo = {}
    erros30d.forEach(e => {
      const modelo = e.modelo || 'desconhecido'
      errosPorModelo[modelo] = (errosPorModelo[modelo] || 0) + 1
    })

    // Agrupar erros por tipo (com mensagem real)
    const errosPorTipo = {}
    erros30d.forEach(e => {
      const tipoErro = categorizarErroIA(e.erro)
      errosPorTipo[tipoErro] = (errosPorTipo[tipoErro] || 0) + 1
    })

    return {
      success: true,
      iaErrors: {
        // 30 dias
        total30d,
        erros30d: erros30d.length,
        sucessos30d: sucessos30d.length,
        taxaSucesso30d,
        taxaErro30d: total30d > 0 ? ((erros30d.length / total30d) * 100).toFixed(1) : 0,
        // 7 dias
        total7d,
        erros7d: erros7d.length,
        sucessos7d: sucessos7d.length,
        taxaSucesso7d,
        taxaErro7d: total7d > 0 ? ((erros7d.length / total7d) * 100).toFixed(1) : 0,
        // Agrupamentos
        errosPorTipo,
        errosPorModelo,
        // Detalhes (com modelo)
        detalhes: erros30d.slice(0, 10).map(e => ({
          id: e.id,
          data: new Date(e.created_at).toLocaleString('pt-BR'),
          erro: e.erro,
          tipo: categorizarErroIA(e.erro),
          modelo: e.modelo || 'desconhecido',
          emissaoId: e.emissao_id
        }))
      }
    }
  } catch (error) {
    console.error('Erro ao buscar erros IA:', error)
    return { success: false, iaErrors: null, error: error.message }
  }
}

/**
 * Categoriza o erro da IA em tipos conhecidos
 * Se não reconhecer, retorna a mensagem resumida (não "Outro")
 */
function categorizarErroIA(erro) {
  if (!erro) return 'Sem mensagem'
  const erroLower = erro.toLowerCase()

  if (erroLower.includes('credit') || erroLower.includes('balance') || erroLower.includes('billing')) {
    return 'Créditos insuficientes'
  }
  if (erroLower.includes('rate limit') || erroLower.includes('too many')) {
    return 'Rate limit'
  }
  if (erroLower.includes('timeout') || erroLower.includes('timed out')) {
    return 'Timeout'
  }
  if (erroLower.includes('invalid') && (erroLower.includes('model') || erroLower.includes('id'))) {
    return 'Modelo inválido'
  }
  if (erroLower.includes('parse') || erroLower.includes('json')) {
    return 'Erro de parse'
  }
  if (erroLower.includes('image') || erroLower.includes('file') || erroLower.includes('upload')) {
    return 'Erro de imagem'
  }
  if (erroLower.includes('network') || erroLower.includes('connection') || erroLower.includes('fetch')) {
    return 'Erro de rede'
  }
  if (erroLower.includes('not found') || erroLower.includes('404')) {
    return 'Não encontrado'
  }
  // Retornar resumo da mensagem real (primeiros 40 chars)
  return erro.length > 40 ? erro.slice(0, 40) + '...' : erro
}

// ============================================
// VERIFICAÇÃO DE DISCREPÂNCIAS
// ============================================

/**
 * Verifica discrepâncias entre saldo (profile.points) e soma de transações
 * Retorna lista de usuários com saldo inconsistente
 */
export async function fetchBalanceDiscrepancies() {
  const { data, error } = await supabase.rpc('admin_check_balance_discrepancies')

  if (error) {
    console.error('Erro ao verificar discrepâncias:', error)
    return { success: false, error: error.message, discrepancies: [] }
  }

  return {
    success: true,
    discrepancies: (data || []).map(d => ({
      userId: d.user_id,
      userName: d.user_name,
      userEmail: d.user_email,
      profilePoints: d.profile_points,
      transactionsSum: d.transactions_sum,
      discrepancy: d.discrepancy
    }))
  }
}

// ============================================
// PONTOS PENDENTES
// ============================================

/**
 * Busca pontos pendentes de liberação de um usuário
 */
export async function fetchUserPendingPoints(userId) {
  const { data, error } = await supabase.rpc('get_user_pending_points', {
    p_user_id: userId
  })

  if (error) {
    console.error('Erro ao buscar pontos pendentes:', error)
    return { success: false, error: error.message, pendingPoints: [] }
  }

  return {
    success: true,
    pendingPoints: (data || []).map(p => ({
      id: p.id,
      pontos: p.pontos,
      motivo: p.motivo,
      liberarEm: p.liberar_em,
      diasRestantes: p.dias_restantes
    }))
  }
}

/**
 * Busca total de pontos pendentes de um usuário
 */
export async function fetchUserPendingPointsTotal(userId = null) {
  const { data, error } = await supabase.rpc('get_user_pending_points_total', {
    p_user_id: userId
  })

  if (error) {
    console.error('Erro ao buscar total pendente:', error)
    return { success: false, total: 0 }
  }

  return { success: true, total: data || 0 }
}

// ============================================
// CHECK-INS DE VOOS
// ============================================

/**
 * Busca check-ins das próximas 48h para o dashboard admin
 */
export async function fetchCheckinsProximos() {
  const { data, error } = await supabase.rpc('get_checkins_proximos')

  if (error) {
    console.error('Erro ao buscar check-ins próximos:', error)
    return { success: false, error: error.message, checkins: [] }
  }

  return {
    success: true,
    checkins: (data || []).map(c => ({
      vooId: c.voo_id,
      viagemId: c.viagem_id,
      userId: c.user_id,
      clienteNome: c.cliente_nome,
      clienteEmail: c.cliente_email,
      origemCidade: c.origem_cidade,
      destinoCidade: c.destino_cidade,
      origemIata: c.origem_iata,
      destinoIata: c.destino_iata,
      numeroVoo: c.numero_voo,
      companhia: c.companhia,
      localizador: c.localizador,
      partidaEm: c.partida_em,
      partidaLocal: c.partida_local,
      sentido: c.sentido,
      checkinFeitoEm: c.checkin_feito_em,
      checkinFeitoPor: c.checkin_feito_por,
      checkinFeitoPorNome: c.checkin_feito_por_nome
    }))
  }
}

/**
 * Marca check-in de um voo como feito
 */
export async function marcarCheckinFeito(vooId, adminId) {
  const { data, error } = await supabase.rpc('marcar_checkin_feito', {
    p_voo_id: vooId,
    p_admin_id: adminId
  })

  if (error) {
    console.error('Erro ao marcar check-in:', error)
    return { success: false, error: error.message }
  }

  return data
}

// ============================================
// PENDÊNCIAS DO DASHBOARD
// ============================================

/**
 * Busca contagem de pendências em cada área
 * Para exibir links com badges no dashboard
 */
export async function fetchPendencias() {
  try {
    // Emissões pendentes (não entregues)
    const { count: emissoesPendentes } = await supabase
      .from('emissoes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pendente', 'em_processamento'])

    // Indicações pendentes
    const { count: indicacoesPendentes } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Resgates pendentes (não entregues)
    const { count: resgatesPendentes } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pendente', 'aprovado', 'em_preparo'])

    // Missões/tarefas pendentes de aprovação
    const { count: missoesPendentes } = await supabase
      .from('solicitacoes_tarefa')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente')

    // Assinaturas com problema (canceladas recentemente ou em atraso)
    const { count: assinaturasPendentes } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['past_due', 'unpaid'])

    return {
      success: true,
      pendencias: {
        emissoes: emissoesPendentes || 0,
        indicacoes: indicacoesPendentes || 0,
        resgates: resgatesPendentes || 0,
        missoes: missoesPendentes || 0,
        assinaturas: assinaturasPendentes || 0
      }
    }
  } catch (error) {
    console.error('Erro ao buscar pendências:', error)
    return {
      success: false,
      pendencias: { emissoes: 0, indicacoes: 0, resgates: 0, missoes: 0, assinaturas: 0 }
    }
  }
}

// ============================================
// EXCLUIR USUÁRIO
// ============================================

/**
 * Exclui conta de usuário completamente (admin-only)
 * Remove: auth, profile, pontos, transações, indicações, etc.
 * @param {string} userId - ID do usuário a ser excluído
 */
export async function excluirUsuario(userId) {
  try {
    const { data, error } = await supabase.rpc('admin_excluir_usuario', {
      p_user_id: userId
    })

    if (error) {
      console.error('Erro ao excluir usuário:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    // Invalidar cache de métricas
    invalidateMetricasAdminCache()

    return {
      success: true,
      message: data.message,
      usuarioExcluido: data.usuario_excluido
    }
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Busca falhas de IA nas últimas 24h
 * Para o alerta discreto no dashboard (só aparece se >= 3)
 */
export async function fetchIAFalhas24h() {
  try {
    const vintequatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('ia_uso')
      .select('id, erro, created_at')
      .eq('sucesso', false)
      .gte('created_at', vintequatroHorasAtras)
      .order('created_at', { ascending: false })

    if (error) throw error

    const count = data?.length || 0
    const ultimoErro = data?.[0]?.erro || null

    return {
      success: true,
      count,
      ultimoErro
    }
  } catch (error) {
    console.error('Erro ao buscar falhas IA 24h:', error)
    return { success: false, count: 0, ultimoErro: null }
  }
}

/**
 * Busca métricas resumidas do mês para o dashboard enxuto
 * - novos clientes
 * - novos Prime
 * - receita de assinaturas
 * - resgates
 */
export async function fetchDashboardMetricsMes() {
  try {
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

    // Novos clientes no mês
    const { count: novosClientes } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'admin')
      .gte('created_at', inicioMes)

    // Novos Prime no mês (assinaturas criadas no mês)
    const { count: novosPrime } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', inicioMes)
      .eq('status', 'active')

    // Receita de assinaturas no mês
    // Buscar assinaturas criadas no mês e somar valores
    const { data: assinaturasMes } = await supabase
      .from('subscriptions')
      .select('metadata')
      .gte('created_at', inicioMes)
      .eq('status', 'active')

    let receitaAssinaturas = 0
    assinaturasMes?.forEach(a => {
      // Valor pode estar no metadata
      const valor = a.metadata?.valor || a.metadata?.price || 0
      receitaAssinaturas += valor
    })

    // Se não tiver valor no metadata, estimar pelos lotes de fundadores
    // ou assumir R$ 29,90 por assinatura regular
    if (receitaAssinaturas === 0 && assinaturasMes?.length > 0) {
      // Fundadores: verificar lote
      let receitaEstimada = 0
      assinaturasMes.forEach(a => {
        if (a.metadata?.numero_fundador) {
          // É fundador - verificar lote
          const lote = a.metadata?.lote || 1
          const precos = { 1: 497, 2: 597, 3: 697 }
          receitaEstimada += precos[lote] || 497
        } else {
          // Assinatura regular (mensal ou anual)
          const ciclo = a.metadata?.ciclo || 'mensal'
          receitaEstimada += ciclo === 'anual' ? 299 : 29.90
        }
      })
      receitaAssinaturas = receitaEstimada
    }

    // Resgates no mês
    const { count: resgatesNoMes } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', inicioMes)

    return {
      success: true,
      metrics: {
        novosClientes: novosClientes || 0,
        novosPrime: novosPrime || 0,
        receitaAssinaturas: receitaAssinaturas,
        resgatesNoMes: resgatesNoMes || 0
      }
    }
  } catch (error) {
    console.error('Erro ao buscar métricas do mês:', error)
    return {
      success: false,
      metrics: { novosClientes: 0, novosPrime: 0, receitaAssinaturas: 0, resgatesNoMes: 0 }
    }
  }
}
