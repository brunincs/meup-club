// ============================================
// SERVIÇO DE VAGAS - Meup Club
// Gerencia vagas do clube exclusivo
// Fonte única: metricas_clube() RPC
// ============================================

import { supabase } from '@/lib/supabase'

// Cache para evitar múltiplas chamadas
let _metricasCache = null
let _metricasCacheTime = 0
const CACHE_TTL = 30000 // 30 segundos

/**
 * Busca métricas do clube (fonte única de verdade)
 * Com cache de 30 segundos
 */
async function getMetricasCached() {
  const now = Date.now()
  if (_metricasCache && (now - _metricasCacheTime) < CACHE_TTL) {
    return _metricasCache
  }

  try {
    const { data, error } = await supabase.rpc('metricas_clube')
    if (error) throw error
    _metricasCache = data
    _metricasCacheTime = now
    return data
  } catch (error) {
    // Fallback para RPC antiga se metricas_clube não existir
    console.warn('metricas_clube não disponível, usando fallback:', error.message)
    return null
  }
}

/**
 * Busca status atual das vagas
 * @returns {Promise<{
 *   success: boolean,
 *   prime: { total: number, ocupadas: number, disponiveis: number },
 *   free: { total: number, ocupadas: number, disponiveis: number },
 *   convites: { total: number, emitidos: number, aceitos: number },
 *   totais: { membros: number, fundadores: number }
 * }>}
 */
export async function getSlotsStatus() {
  try {
    // Tenta usar metricas_clube() primeiro
    const metricas = await getMetricasCached()

    if (metricas) {
      return {
        success: true,
        prime: {
          total: metricas.vagas_prime_total || 30,
          ocupadas: metricas.vagas_prime_ocupadas || 0,
          disponiveis: metricas.vagas_prime_disponiveis || 30
        },
        free: {
          total: metricas.vagas_free_total || 70,
          ocupadas: metricas.vagas_free_ocupadas || 0,
          disponiveis: metricas.vagas_free_disponiveis || 70
        },
        convites: {
          total: metricas.convites_vagas_total || 0,
          emitidos: metricas.convites_emitidos || 0,
          aceitos: metricas.convites_aceitos || 0
        },
        totais: {
          membros: metricas.total_usuarios || 0,
          fundadores: metricas.prime_fundadores || 0
        }
      }
    }

    // Fallback: RPC antiga
    const { data, error } = await supabase.rpc('get_vagas_status')

    if (error) throw error

    const result = data?.[0] || {
      vagas_prime_total: 30,
      vagas_prime_ocupadas: 0,
      vagas_prime_disponiveis: 30,
      vagas_free_total: 70,
      vagas_free_ocupadas: 0,
      vagas_free_disponiveis: 70,
      convites_total: 0,
      convites_emitidos: 0,
      convites_aceitos: 0
    }

    return {
      success: true,
      prime: {
        total: result.vagas_prime_total,
        ocupadas: result.vagas_prime_ocupadas,
        disponiveis: result.vagas_prime_disponiveis
      },
      free: {
        total: result.vagas_free_total,
        ocupadas: result.vagas_free_ocupadas,
        disponiveis: result.vagas_free_disponiveis
      },
      convites: {
        total: result.convites_total,
        emitidos: result.convites_emitidos,
        aceitos: result.convites_aceitos
      },
      totais: {
        membros: result.vagas_prime_ocupadas + result.vagas_free_ocupadas + result.convites_aceitos,
        fundadores: result.vagas_prime_ocupadas
      }
    }
  } catch (error) {
    console.error('Erro ao buscar status de vagas:', error)
    return {
      success: false,
      prime: { total: 30, ocupadas: 0, disponiveis: 30 },
      free: { total: 70, ocupadas: 0, disponiveis: 70 },
      convites: { total: 0, emitidos: 0, aceitos: 0 },
      totais: { membros: 0, fundadores: 0 },
      error: error.message
    }
  }
}

/**
 * Invalida o cache de métricas (usar após operações que alteram dados)
 */
export function invalidateMetricasCache() {
  _metricasCache = null
  _metricasCacheTime = 0
}

/**
 * Verifica disponibilidade de vagas
 * @param {string} tipo - 'prime' | 'free'
 * @returns {Promise<{ available: boolean, remaining: number, total: number }>}
 */
export async function checkAvailability(tipo = 'free') {
  try {
    const status = await getSlotsStatus()

    if (!status.success) {
      return { available: false, remaining: 0, total: 0 }
    }

    if (tipo === 'prime') {
      return {
        available: status.prime.disponiveis > 0,
        remaining: status.prime.disponiveis,
        total: status.prime.total
      }
    } else {
      return {
        available: status.free.disponiveis > 0,
        remaining: status.free.disponiveis,
        total: status.free.total
      }
    }
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error)
    return { available: false, remaining: 0, total: 0 }
  }
}

/**
 * Verifica se Prime está esgotado
 * @returns {Promise<boolean>}
 */
export async function isPrimeEsgotado() {
  const { available } = await checkAvailability('prime')
  return !available
}

/**
 * Verifica se Free está esgotado
 * @returns {Promise<boolean>}
 */
export async function isFreeEsgotado() {
  const { available } = await checkAvailability('free')
  return !available
}

/**
 * Busca preço Prime atual (único, sem lotes)
 * @returns {Promise<{ preco: number, vagas_restantes: number, total_vendidas: number }>}
 */
export async function getPrimePrice() {
  try {
    // Busca preço da config
    const { data: configData } = await supabase
      .from('config_exclusivo')
      .select('valor')
      .eq('chave', 'preco_prime_fundador')
      .single()

    const preco = parseInt(configData?.valor) || 597

    // Busca status de vagas
    const status = await getSlotsStatus()

    return {
      preco,
      vagas_restantes: status.prime?.disponiveis || 0,
      total_vendidas: status.prime?.ocupadas || 0,
      total_vagas: status.prime?.total || 30
    }
  } catch (error) {
    console.error('Erro ao buscar preço Prime:', error)
    return { preco: 597, vagas_restantes: 30, total_vendidas: 0, total_vagas: 30 }
  }
}

/**
 * Busca dados completos para exibição de vagas
 * @returns {Promise<{
 *   prime: { preco: number, vagas: number, restantes: number, esgotado: boolean },
 *   free: { vagas: number, restantes: number, esgotado: boolean },
 *   premio: number,
 *   abertura: Date
 * }>}
 */
export async function getFullSlotsData() {
  try {
    // Busca configs
    const { data: configs } = await supabase
      .from('config_exclusivo')
      .select('chave, valor')
      .in('chave', ['preco_prime_fundador', 'premio_fundadores', 'abertura_clube', 'vagas_prime_fundador', 'vagas_free'])

    const configMap = {}
    configs?.forEach(c => { configMap[c.chave] = c.valor })

    // Busca status de vagas
    const status = await getSlotsStatus()

    return {
      prime: {
        preco: parseInt(configMap.preco_prime_fundador) || 597,
        vagas: parseInt(configMap.vagas_prime_fundador) || 30,
        restantes: status.prime?.disponiveis || 0,
        vendidas: status.prime?.ocupadas || 0,
        esgotado: (status.prime?.disponiveis || 0) <= 0
      },
      free: {
        vagas: parseInt(configMap.vagas_free) || 70,
        restantes: status.free?.disponiveis || 0,
        ocupadas: status.free?.ocupadas || 0,
        esgotado: (status.free?.disponiveis || 0) <= 0
      },
      premio: parseInt(configMap.premio_fundadores) || 200000,
      abertura: new Date(configMap.abertura_clube || '2026-11-27T09:00:00-03:00'),
      convites: status.convites
    }
  } catch (error) {
    console.error('Erro ao buscar dados de vagas:', error)
    return {
      prime: { preco: 597, vagas: 30, restantes: 30, vendidas: 0, esgotado: false },
      free: { vagas: 70, restantes: 70, ocupadas: 0, esgotado: false },
      premio: 200000,
      abertura: new Date('2026-11-27T09:00:00-03:00'),
      convites: { total: 0, emitidos: 0, aceitos: 0 }
    }
  }
}

/**
 * @deprecated Não usado no modelo de sorteio. Mantido para compatibilidade.
 * Anteriormente calculava pontos por fundador quando era divisão.
 * @returns {Promise<number>}
 */
export async function getPointsPerFounder() {
  try {
    const data = await getFullSlotsData()

    const fundadores = data.prime.vendidas || 0
    const premio = data.premio || 200000

    if (fundadores <= 0) {
      return premio / 30 // Valor máximo se ninguém ainda
    }

    return Math.floor(premio / fundadores)
  } catch (error) {
    console.error('Erro ao calcular pontos por fundador:', error)
    return 6667 // 200000 / 30
  }
}

/**
 * Formata número de vagas para exibição
 * @param {number} restantes - Vagas restantes
 * @param {number} total - Total de vagas
 * @returns {string}
 */
export function formatSlotsDisplay(restantes, total) {
  if (restantes <= 0) {
    return 'Esgotado'
  }

  const percentual = Math.round((restantes / total) * 100)

  if (percentual <= 10) {
    return `Últimas ${restantes}!`
  }

  if (percentual <= 30) {
    return `${restantes} restantes`
  }

  return `${restantes} disponíveis`
}

/**
 * Calcula urgência para exibição visual
 * @param {number} restantes - Vagas restantes
 * @param {number} total - Total de vagas
 * @returns {'high' | 'medium' | 'low' | 'none'}
 */
export function calculateUrgency(restantes, total) {
  if (restantes <= 0) return 'none'

  const percentual = (restantes / total) * 100

  if (percentual <= 10) return 'high'
  if (percentual <= 30) return 'medium'
  return 'low'
}
