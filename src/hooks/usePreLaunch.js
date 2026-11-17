import { useState, useEffect, useCallback } from 'react'
import { getEligibilityConfig, checkClubeStatus } from '@/services/eligibilityService'

/**
 * Hook para controlar estado de pré-lançamento do clube
 * @returns {{
 *   isPreLaunch: boolean,
 *   isOpen: boolean,
 *   openingDate: Date,
 *   countdown: { days: number, hours: number, minutes: number, seconds: number },
 *   loading: boolean,
 *   refresh: () => void
 * }}
 */
export function usePreLaunch() {
  const [state, setState] = useState({
    isPreLaunch: true,
    isOpen: false,
    openingDate: new Date('2026-11-27T09:00:00-03:00'),
    loading: true
  })

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Função para calcular countdown
  const calculateCountdown = useCallback((targetDate) => {
    const now = new Date()
    const diff = targetDate.getTime() - now.getTime()

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { days, hours, minutes, seconds }
  }, [])

  // Carrega status inicial
  const loadStatus = useCallback(async () => {
    try {
      const status = await checkClubeStatus()

      setState({
        isPreLaunch: status.isPreLaunch,
        isOpen: status.isOpen,
        openingDate: status.openingDate,
        loading: false
      })

      // Calcula countdown inicial
      setCountdown(calculateCountdown(status.openingDate))
    } catch (error) {
      console.error('Erro ao carregar status do clube:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [calculateCountdown])

  // Carrega na montagem
  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Atualiza countdown a cada segundo
  useEffect(() => {
    if (state.isOpen || state.loading) return

    const timer = setInterval(() => {
      const newCountdown = calculateCountdown(state.openingDate)
      setCountdown(newCountdown)

      // Verifica se abriu
      if (newCountdown.days === 0 && newCountdown.hours === 0 &&
          newCountdown.minutes === 0 && newCountdown.seconds === 0) {
        setState(prev => ({
          ...prev,
          isPreLaunch: false,
          isOpen: true
        }))
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [state.isOpen, state.loading, state.openingDate, calculateCountdown])

  return {
    ...state,
    countdown,
    refresh: loadStatus
  }
}

/**
 * Hook simplificado para verificar se está em pré-lançamento
 * @returns {boolean}
 */
export function useIsPreLaunch() {
  const { isPreLaunch, loading } = usePreLaunch()
  return loading ? true : isPreLaunch
}

/**
 * Formata countdown para exibição
 * @param {{ days: number, hours: number, minutes: number, seconds: number }} countdown
 * @returns {string}
 */
export function formatCountdown(countdown) {
  if (countdown.days > 0) {
    return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
  }

  if (countdown.hours > 0) {
    return `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`
  }

  return `${countdown.minutes}m ${countdown.seconds}s`
}

/**
 * Formata data de abertura para exibição
 * @param {Date} date
 * @returns {string}
 */
export function formatOpeningDate(date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
