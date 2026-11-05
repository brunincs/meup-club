import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { demoUser } from '@/services/mockData'
import {
  solicitarResgate,
  buscarExperienciasResgatadas,
  buscarStatusResgates
} from '@/services/resgateService'
import { supabase } from '@/lib/supabase'

/**
 * PointsContext - Fonte única de verdade para pontos do usuário
 *
 * Quando logado com conta real: usa pontos do profile (Supabase)
 * Quando em modo demo: usa pontos do demoUser
 *
 * RESGATE: Agora com fluxo de APROVAÇÃO!
 * - Cliente solicita → pendente
 * - Admin aprova → só então debita
 */

const PointsContext = createContext(null)

export function PointsProvider({ children }) {
  const { profile, useMock, user } = useAuth()

  // Pontos: vem do profile real ou do demo
  const [points, setPoints] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Sincroniza pontos quando o profile carrega
  useEffect(() => {
    if (profile?.points !== undefined) {
      setPoints(profile.points)
    } else if (useMock) {
      setPoints(demoUser.points)
    }
  }, [profile, useMock])

  // IDs das experiências já resgatadas (APROVADAS)
  const [redeemedIds, setRedeemedIds] = useState([])
  // IDs das experiências com pedido pendente
  const [pendingIds, setPendingIds] = useState([])

  // Carregar status dos resgates do Supabase
  useEffect(() => {
    async function loadResgateStatus() {
      if (!user || useMock) return

      // Buscar IDs aprovados
      const ids = await buscarExperienciasResgatadas()
      setRedeemedIds(ids)

      // Buscar mapa de status (para identificar pendentes)
      const statusMap = await buscarStatusResgates()
      const pending = Object.entries(statusMap)
        .filter(([_, status]) => status === 'pendente')
        .map(([id]) => id)
      setPendingIds(pending)
    }
    loadResgateStatus()
  }, [user, useMock])

  /**
   * Solicita resgate de uma experiência
   * NÃO debita imediatamente - cria pedido PENDENTE
   *
   * @param {string} experienciaId - ID da experiência
   * @param {string} experienciaNome - Nome da experiência
   * @param {number} pontosNecessarios - Custo em pontos
   * @param {number} classeMinima - Classe mínima exigida
   * @returns {Object} { success, error, message }
   */
  const resgatar = useCallback(async (experienciaId, experienciaNome, pontosNecessarios, classeMinima = 1) => {
    if (useMock) {
      // Modo demo: simula solicitação
      if (points < pontosNecessarios) {
        return { success: false, error: 'Saldo insuficiente.' }
      }
      setPendingIds(prev => [...prev, experienciaId])
      return { success: true, message: 'Solicitação enviada! Aguarde aprovação.' }
    }

    // Modo real: chama o serviço Supabase
    setIsLoading(true)
    try {
      const result = await solicitarResgate(experienciaId, experienciaNome, pontosNecessarios, classeMinima)

      if (result.success) {
        // Marca como pendente (NÃO como resgatado ainda)
        setPendingIds(prev => [...prev, experienciaId])
      }

      return result
    } finally {
      setIsLoading(false)
    }
  }, [useMock, points])

  /**
   * Atualiza pontos do Supabase (para sincronizar após operações)
   */
  const refreshPoints = useCallback(async () => {
    if (!user || useMock) return

    const { data, error } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      setPoints(data.points)
    }
  }, [user, useMock])

  /**
   * Recarrega status dos resgates (chamado após aprovação/rejeição)
   */
  const refreshResgates = useCallback(async () => {
    if (!user || useMock) return

    const ids = await buscarExperienciasResgatadas()
    setRedeemedIds(ids)

    const statusMap = await buscarStatusResgates()
    const pending = Object.entries(statusMap)
      .filter(([_, status]) => status === 'pendente')
      .map(([id]) => id)
    setPendingIds(pending)
  }, [user, useMock])

  /**
   * Debita pontos do saldo (DEPRECATED)
   */
  const deductPoints = useCallback((amount) => {
    let success = false
    setPoints(prev => {
      if (prev >= amount) {
        success = true
        return prev - amount
      }
      return prev
    })
    return success
  }, [])

  /**
   * Adiciona pontos ao saldo (para missões, indicações, etc)
   */
  const addPoints = useCallback((amount) => {
    setPoints(prev => prev + amount)
  }, [])

  /**
   * Marca uma experiência como resgatada
   */
  const markAsRedeemed = useCallback((rewardId) => {
    setRedeemedIds(prev => {
      if (prev.includes(rewardId)) return prev
      return [...prev, rewardId]
    })
  }, [])

  /**
   * Verifica se uma experiência já foi resgatada (aprovada)
   */
  const isRedeemed = useCallback((rewardId) => {
    return redeemedIds.includes(rewardId)
  }, [redeemedIds])

  /**
   * Verifica se uma experiência tem pedido pendente
   */
  const isPending = useCallback((rewardId) => {
    return pendingIds.includes(rewardId)
  }, [pendingIds])

  const value = {
    points,
    redeemedIds,
    pendingIds,
    isLoading,
    resgatar,         // Solicita resgate (pendente)
    refreshPoints,    // Sincroniza pontos do banco
    refreshResgates,  // Sincroniza status dos resgates
    deductPoints,     // deprecated
    addPoints,
    markAsRedeemed,
    isRedeemed,
    isPending
  }

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  )
}

/**
 * Hook para usar o contexto de pontos
 */
export function usePoints() {
  const context = useContext(PointsContext)
  if (!context) {
    throw new Error('usePoints deve ser usado dentro de um PointsProvider')
  }
  return context
}
