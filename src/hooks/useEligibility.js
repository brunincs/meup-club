import { useState, useCallback } from 'react'
import {
  checkEligibility,
  checkCPFExists,
  validateCPF,
  hashCPF
} from '@/services/eligibilityService'

/**
 * Hook para verificar elegibilidade de CPF
 * @returns {{
 *   checkCPF: (cpf: string) => Promise<EligibilityResult>,
 *   isEligible: boolean | null,
 *   eligibilitySource: string | null,
 *   eligibilityMessage: string | null,
 *   loading: boolean,
 *   error: string | null,
 *   reset: () => void
 * }}
 *
 * @typedef {{
 *   elegivel: boolean,
 *   motivo: string,
 *   fonte: 'base_clientes' | 'emissoes' | 'nenhum',
 *   nome_encontrado?: string,
 *   ultima_atividade?: string,
 *   cpf_exists?: boolean
 * }} EligibilityResult
 */
export function useEligibility() {
  const [state, setState] = useState({
    isEligible: null,
    eligibilitySource: null,
    eligibilityMessage: null,
    loading: false,
    error: null
  })

  const checkCPF = useCallback(async (cpf) => {
    // Valida formato do CPF
    if (!validateCPF(cpf)) {
      const result = {
        elegivel: false,
        motivo: 'CPF inválido. Verifique os números.',
        fonte: 'nenhum'
      }

      setState({
        isEligible: false,
        eligibilitySource: null,
        eligibilityMessage: result.motivo,
        loading: false,
        error: result.motivo
      })

      return result
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Verifica se CPF já está cadastrado
      const existsResult = await checkCPFExists(cpf)

      if (existsResult.exists) {
        const result = {
          elegivel: false,
          motivo: 'Este CPF já está cadastrado no clube.',
          fonte: 'nenhum',
          cpf_exists: true,
          userId: existsResult.userId
        }

        setState({
          isEligible: false,
          eligibilitySource: null,
          eligibilityMessage: result.motivo,
          loading: false,
          error: null
        })

        return result
      }

      // Verifica elegibilidade (se é cliente)
      const eligibility = await checkEligibility(cpf)

      setState({
        isEligible: eligibility.elegivel,
        eligibilitySource: eligibility.fonte,
        eligibilityMessage: eligibility.motivo,
        loading: false,
        error: null
      })

      return {
        ...eligibility,
        cpf_exists: false
      }
    } catch (error) {
      console.error('Erro ao verificar CPF:', error)

      setState({
        isEligible: null,
        eligibilitySource: null,
        eligibilityMessage: null,
        loading: false,
        error: 'Erro ao verificar CPF. Tente novamente.'
      })

      return {
        elegivel: false,
        motivo: 'Erro ao verificar',
        fonte: 'nenhum',
        error: error.message
      }
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      isEligible: null,
      eligibilitySource: null,
      eligibilityMessage: null,
      loading: false,
      error: null
    })
  }, [])

  return {
    ...state,
    checkCPF,
    reset
  }
}

/**
 * Hook para validação de CPF em tempo real (apenas formato)
 * @returns {{
 *   isValid: boolean | null,
 *   validate: (cpf: string) => boolean,
 *   format: (cpf: string) => string
 * }}
 */
export function useCPFValidation() {
  const [isValid, setIsValid] = useState(null)

  const validate = useCallback((cpf) => {
    if (!cpf || cpf.replace(/\D/g, '').length < 11) {
      setIsValid(null)
      return false
    }

    const valid = validateCPF(cpf)
    setIsValid(valid)
    return valid
  }, [])

  const format = useCallback((cpf) => {
    if (!cpf) return ''

    const numbers = cpf.replace(/\D/g, '').slice(0, 11)

    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
  }, [])

  return { isValid, validate, format }
}

/**
 * Hook para gerar hash de CPF
 * @returns {{ hash: (cpf: string) => Promise<string> }}
 */
export function useCPFHash() {
  const hash = useCallback(async (cpf) => {
    return await hashCPF(cpf)
  }, [])

  return { hash }
}
