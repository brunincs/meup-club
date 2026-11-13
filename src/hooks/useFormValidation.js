// ============================================
// HOOK: useFormValidation
// Validação de formulários com scroll para erro
// ============================================

import { useState, useCallback, useRef } from 'react'

// ============================================
// VALIDADORES
// ============================================

/**
 * Valida CPF brasileiro
 * @param {string} cpf
 * @returns {boolean}
 */
export function isValidCPF(cpf) {
  if (!cpf) return false

  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '')

  // Deve ter 11 dígitos
  if (cleaned.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false

  // Validação dos dígitos verificadores
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit > 9) digit = 0
  if (digit !== parseInt(cleaned.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit > 9) digit = 0
  if (digit !== parseInt(cleaned.charAt(10))) return false

  return true
}

/**
 * Valida nome completo (mínimo 2 palavras)
 * @param {string} name
 * @returns {boolean}
 */
export function isValidFullName(name) {
  if (!name || typeof name !== 'string') return false

  const trimmed = name.trim()
  const words = trimmed.split(/\s+/).filter(w => w.length >= 2)

  return words.length >= 2
}

/**
 * Valida email
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida data (não pode ser no passado para datas futuras)
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @param {Object} options
 * @param {boolean} options.allowPast - Permitir datas passadas
 * @param {boolean} options.allowFuture - Permitir datas futuras
 * @returns {boolean}
 */
export function isValidDate(dateStr, options = { allowPast: true, allowFuture: true }) {
  if (!dateStr) return false

  const date = new Date(dateStr + 'T12:00:00')
  if (isNaN(date.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!options.allowPast && date < today) return false
  if (!options.allowFuture && date > today) return false

  return true
}

/**
 * Valida telefone brasileiro
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (!phone) return false
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 11
}

/**
 * Valida CEP brasileiro
 * @param {string} cep
 * @returns {boolean}
 */
export function isValidCEP(cep) {
  if (!cep) return false
  const cleaned = cep.replace(/\D/g, '')
  return cleaned.length === 8
}

// ============================================
// MENSAGENS DE ERRO PADRÃO
// ============================================

const DEFAULT_MESSAGES = {
  required: 'Preencha este campo',
  email: 'Email inválido',
  cpf: 'CPF inválido',
  fullName: 'Informe nome e sobrenome',
  date: 'Data inválida',
  dateFuture: 'A data deve ser futura',
  datePast: 'A data não pode ser futura',
  phone: 'Telefone inválido',
  cep: 'CEP inválido',
  minLength: (min) => `Mínimo de ${min} caracteres`,
  maxLength: (max) => `Máximo de ${max} caracteres`,
  min: (min) => `Valor mínimo: ${min}`,
  max: (max) => `Valor máximo: ${max}`
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para validação de formulários
 *
 * @param {Object} validationRules - Regras de validação por campo
 * @returns {Object} - { errors, validate, validateField, clearError, clearErrors, setFieldRef }
 *
 * @example
 * const rules = {
 *   nome: { required: true, fullName: true },
 *   email: { required: true, email: true },
 *   cpf: { cpf: true }, // opcional mas deve ser válido se preenchido
 *   dataIda: { required: true, date: true, dateFuture: true }
 * }
 *
 * const { errors, validate, setFieldRef } = useFormValidation(rules)
 */
export function useFormValidation(validationRules = {}) {
  const [errors, setErrors] = useState({})
  const fieldRefs = useRef({})

  /**
   * Registra ref de um campo para scroll automático
   */
  const setFieldRef = useCallback((fieldName, ref) => {
    if (ref) {
      fieldRefs.current[fieldName] = ref
    }
  }, [])

  /**
   * Valida um único campo
   */
  const validateField = useCallback((fieldName, value, rules) => {
    const fieldRules = rules || validationRules[fieldName]
    if (!fieldRules) return null

    const trimmedValue = typeof value === 'string' ? value.trim() : value

    // Required
    if (fieldRules.required) {
      if (trimmedValue === '' || trimmedValue === null || trimmedValue === undefined) {
        return fieldRules.message || DEFAULT_MESSAGES.required
      }
    }

    // Se não é required e está vazio, não valida mais
    if (!trimmedValue && trimmedValue !== 0) return null

    // Email
    if (fieldRules.email && !isValidEmail(trimmedValue)) {
      return DEFAULT_MESSAGES.email
    }

    // CPF
    if (fieldRules.cpf && !isValidCPF(trimmedValue)) {
      return DEFAULT_MESSAGES.cpf
    }

    // Nome completo
    if (fieldRules.fullName && !isValidFullName(trimmedValue)) {
      return DEFAULT_MESSAGES.fullName
    }

    // Data
    if (fieldRules.date && !isValidDate(trimmedValue)) {
      return DEFAULT_MESSAGES.date
    }

    // Data futura
    if (fieldRules.dateFuture && !isValidDate(trimmedValue, { allowPast: false })) {
      return DEFAULT_MESSAGES.dateFuture
    }

    // Data passada
    if (fieldRules.datePast && !isValidDate(trimmedValue, { allowFuture: false })) {
      return DEFAULT_MESSAGES.datePast
    }

    // Telefone
    if (fieldRules.phone && !isValidPhone(trimmedValue)) {
      return DEFAULT_MESSAGES.phone
    }

    // CEP
    if (fieldRules.cep && !isValidCEP(trimmedValue)) {
      return DEFAULT_MESSAGES.cep
    }

    // Min length
    if (fieldRules.minLength && trimmedValue.length < fieldRules.minLength) {
      return DEFAULT_MESSAGES.minLength(fieldRules.minLength)
    }

    // Max length
    if (fieldRules.maxLength && trimmedValue.length > fieldRules.maxLength) {
      return DEFAULT_MESSAGES.maxLength(fieldRules.maxLength)
    }

    // Min value
    if (fieldRules.min !== undefined && parseFloat(trimmedValue) < fieldRules.min) {
      return DEFAULT_MESSAGES.min(fieldRules.min)
    }

    // Max value
    if (fieldRules.max !== undefined && parseFloat(trimmedValue) > fieldRules.max) {
      return DEFAULT_MESSAGES.max(fieldRules.max)
    }

    // Custom validator
    if (fieldRules.custom && typeof fieldRules.custom === 'function') {
      const customError = fieldRules.custom(trimmedValue)
      if (customError) return customError
    }

    return null
  }, [validationRules])

  /**
   * Valida todos os campos do formulário
   * @param {Object} formData - Dados do formulário
   * @returns {boolean} - true se válido
   */
  const validate = useCallback((formData) => {
    const newErrors = {}
    let firstErrorField = null

    for (const fieldName of Object.keys(validationRules)) {
      const error = validateField(fieldName, formData[fieldName])
      if (error) {
        newErrors[fieldName] = error
        if (!firstErrorField) {
          firstErrorField = fieldName
        }
      }
    }

    setErrors(newErrors)

    // Scroll para o primeiro erro
    if (firstErrorField && fieldRefs.current[firstErrorField]) {
      const element = fieldRefs.current[firstErrorField]
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        element.focus?.()
      }, 300)
    }

    return Object.keys(newErrors).length === 0
  }, [validationRules, validateField])

  /**
   * Limpa erro de um campo específico
   */
  const clearError = useCallback((fieldName) => {
    setErrors(prev => {
      const { [fieldName]: _, ...rest } = prev
      return rest
    })
  }, [])

  /**
   * Limpa todos os erros
   */
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  /**
   * Valida um campo em tempo real (onChange)
   * Só mostra erro se já tinha erro antes (não atrapalha UX)
   */
  const validateOnChange = useCallback((fieldName, value) => {
    if (errors[fieldName]) {
      const error = validateField(fieldName, value)
      if (!error) {
        clearError(fieldName)
      }
    }
  }, [errors, validateField, clearError])

  return {
    errors,
    validate,
    validateField,
    validateOnChange,
    clearError,
    clearErrors,
    setFieldRef,
    hasErrors: Object.keys(errors).length > 0
  }
}

export default useFormValidation
