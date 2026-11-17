// ============================================
// SERVIÇO DE ELEGIBILIDADE - Meup Club
// Verifica se CPF é elegível para o clube
// ============================================

import { supabase } from '@/lib/supabase'

/**
 * Gera hash SHA-256 do CPF (client-side)
 * @param {string} cpf - CPF (pode ter formatação)
 * @returns {Promise<string>} - Hash SHA-256
 */
export async function hashCPF(cpf) {
  if (!cpf) return null

  const cpfClean = cpf.replace(/\D/g, '')
  if (cpfClean.length !== 11) return null

  const encoder = new TextEncoder()
  const data = encoder.encode(cpfClean)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verifica elegibilidade de um CPF para cadastro no clube
 * @param {string} cpf - CPF (pode ter formatação)
 * @returns {Promise<{
 *   elegivel: boolean,
 *   motivo: string,
 *   fonte: 'base_clientes' | 'emissoes' | 'nenhum',
 *   nome_encontrado?: string,
 *   ultima_atividade?: string
 * }>}
 */
export async function checkEligibility(cpf) {
  try {
    const cpfHash = await hashCPF(cpf)

    if (!cpfHash) {
      return {
        elegivel: false,
        motivo: 'CPF inválido',
        fonte: 'nenhum'
      }
    }

    const { data, error } = await supabase.rpc('verificar_elegibilidade_cpf', {
      p_cpf_hash: cpfHash
    })

    if (error) {
      console.error('Erro ao verificar elegibilidade:', error)
      throw error
    }

    const result = data?.[0] || {
      elegivel: false,
      motivo: 'CPF não encontrado na base de clientes',
      fonte: 'nenhum'
    }

    return {
      elegivel: result.elegivel,
      motivo: result.motivo,
      fonte: result.fonte,
      nome_encontrado: result.nome_encontrado,
      ultima_atividade: result.ultima_atividade
    }
  } catch (error) {
    console.error('Erro ao verificar elegibilidade:', error)
    return {
      elegivel: false,
      motivo: 'Erro ao verificar. Tente novamente.',
      fonte: 'nenhum',
      error: error.message
    }
  }
}

/**
 * Verifica se um CPF já está cadastrado no sistema
 * @param {string} cpf - CPF (pode ter formatação)
 * @returns {Promise<{exists: boolean, userId?: string}>}
 */
export async function checkCPFExists(cpf) {
  try {
    const cpfHash = await hashCPF(cpf)
    if (!cpfHash) {
      return { exists: false }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('cpf_hash', cpfHash)
      .limit(1)

    if (error) throw error

    return {
      exists: data?.length > 0,
      userId: data?.[0]?.id
    }
  } catch (error) {
    console.error('Erro ao verificar CPF:', error)
    return { exists: false, error: error.message }
  }
}

/**
 * Busca configurações de elegibilidade
 * @returns {Promise<{
 *   meses_cliente: number,
 *   abertura_clube: Date,
 *   modo_prelancamento: boolean
 * }>}
 */
export async function getEligibilityConfig() {
  try {
    const { data, error } = await supabase
      .from('config_exclusivo')
      .select('chave, valor')
      .in('chave', ['meses_cliente', 'abertura_clube', 'modo_prelancamento'])

    if (error) throw error

    const config = {}
    data?.forEach(item => {
      if (item.chave === 'meses_cliente') {
        config.meses_cliente = parseInt(item.valor) || 15
      } else if (item.chave === 'abertura_clube') {
        config.abertura_clube = new Date(item.valor)
      } else if (item.chave === 'modo_prelancamento') {
        config.modo_prelancamento = item.valor === 'true'
      }
    })

    return {
      meses_cliente: config.meses_cliente || 15,
      abertura_clube: config.abertura_clube || new Date('2026-11-27T09:00:00-03:00'),
      modo_prelancamento: config.modo_prelancamento ?? true
    }
  } catch (error) {
    console.error('Erro ao buscar config de elegibilidade:', error)
    return {
      meses_cliente: 15,
      abertura_clube: new Date('2026-11-27T09:00:00-03:00'),
      modo_prelancamento: true
    }
  }
}

/**
 * Verifica se o clube está aberto para cadastros
 * @returns {Promise<{isOpen: boolean, openingDate: Date, isPreLaunch: boolean}>}
 */
export async function checkClubeStatus() {
  try {
    const config = await getEligibilityConfig()

    const now = new Date()
    const isOpen = now >= config.abertura_clube
    const isPreLaunch = config.modo_prelancamento && !isOpen

    return {
      isOpen,
      openingDate: config.abertura_clube,
      isPreLaunch
    }
  } catch (error) {
    console.error('Erro ao verificar status do clube:', error)
    return {
      isOpen: false,
      openingDate: new Date('2026-11-27T09:00:00-03:00'),
      isPreLaunch: true
    }
  }
}

/**
 * Valida CPF (algoritmo de validação)
 * @param {string} cpf - CPF (pode ter formatação)
 * @returns {boolean}
 */
export function validateCPF(cpf) {
  if (!cpf) return false

  const cpfClean = cpf.replace(/\D/g, '')

  if (cpfClean.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfClean)) return false

  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpfClean[i]) * (10 - i)
  }
  let digit1 = 11 - (sum % 11)
  if (digit1 >= 10) digit1 = 0

  if (parseInt(cpfClean[9]) !== digit1) return false

  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpfClean[i]) * (11 - i)
  }
  let digit2 = 11 - (sum % 11)
  if (digit2 >= 10) digit2 = 0

  if (parseInt(cpfClean[10]) !== digit2) return false

  return true
}

/**
 * Formata CPF para exibição
 * @param {string} cpf - CPF limpo
 * @returns {string} - CPF formatado (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf) {
  if (!cpf) return ''
  const cpfClean = cpf.replace(/\D/g, '')
  if (cpfClean.length !== 11) return cpf
  return cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Mascara CPF para exibição parcial
 * @param {string} cpf - CPF (pode ter formatação)
 * @returns {string} - CPF mascarado (***.***.XXX-XX)
 */
export function maskCPF(cpf) {
  if (!cpf) return ''
  const cpfClean = cpf.replace(/\D/g, '')
  if (cpfClean.length !== 11) return cpf
  return `***.***. ${cpfClean.slice(6, 9)}-${cpfClean.slice(9)}`
}
