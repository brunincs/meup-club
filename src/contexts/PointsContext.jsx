import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { demoUser } from '@/services/mockData'
import {
  resgatarExperiencia,
  buscarExperienciasResgatadas
} from '@/services/resgateService'
import { supabase } from '@/lib/supabase'

/**
 * PointsContext - Fonte única de verdade para pontos do usuário
 *
 * Quando logado com conta real: usa pontos do profile (Supabase)
 * Quando em modo demo: usa pontos do demoUser
 *
 * RESGATE: Agora integrado com Supabase real!
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

  // IDs das experiências já resgatadas (para evitar resgate duplo)
  const [redeemedIds, setRedeemedIds] = useState([])

  // Carregar experiências já resgatadas do Supabase
  useEffect(() => {
    async function loadRedeemedIds() {
      if (!user || useMock) return
      const ids = await buscarExperienciasResgatadas()
      setRedeemedIds(ids)
    }
    loadRedeemedIds()
  }, [user, useMock])

  /**
   * Resgata uma experiência - INTEGRAÇÃO REAL COM SUPABASE
   * @param {string} experienciaId - ID da experiência
   * @param {string} experienciaNome - Nome da experiência (para histórico)
   * @param {number} pontosNecessarios - Custo em pontos
   * @returns {Object} { success, error, novoSaldo }
   */
  const resgatar = useCallback(async (experienciaId, experienciaNome, pontosNecessarios) => {
    if (useMock) {
      // Modo demo: usa lógica local
      if (points < pontosNecessarios) {
        return { success: false, error: 'Saldo insuficiente.' }
      }
      setPoints(prev => prev - pontosNecessarios)
      setRedeemedIds(prev => [...prev, experienciaId])
      return { success: true, novoSaldo: points - pontosNecessarios }
    }

    // Modo real: chama o serviço Supabase
    setIsLoading(true)
    try {
      const result = await resgatarExperiencia(experienciaId, experienciaNome, pontosNecessarios)

      if (result.success) {
        // Atualiza estado local imediatamente
        setPoints(result.novoSaldo)
        setRedeemedIds(prev => [...prev, experienciaId])
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
   * Debita pontos do saldo (DEPRECATED - use resgatar para integração real)
   * Mantido para compatibilidade com outros componentes
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
   * @param {number} amount - Quantidade a adicionar
   */
  const addPoints = useCallback((amount) => {
    setPoints(prev => prev + amount)
  }, [])

  /**
   * Marca uma experiência como resgatada
   * @param {string} rewardId - ID da experiência
   */
  const markAsRedeemed = useCallback((rewardId) => {
    setRedeemedIds(prev => {
      if (prev.includes(rewardId)) return prev
      return [...prev, rewardId]
    })
  }, [])

  /**
   * Verifica se uma experiência já foi resgatada
   * @param {string} rewardId - ID da experiência
   * @returns {boolean}
   */
  const isRedeemed = useCallback((rewardId) => {
    return redeemedIds.includes(rewardId)
  }, [redeemedIds])

  const value = {
    points,
    redeemedIds,
    isLoading,
    resgatar,        // NOVO: integração real com Supabase
    refreshPoints,   // NOVO: sincroniza pontos do banco
    deductPoints,    // deprecated - use resgatar
    addPoints,
    markAsRedeemed,
    isRedeemed
  }

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  )
}

/**
 * Hook para usar o contexto de pontos
 * Use assim: const { points, deductPoints } = usePoints()
 */
export function usePoints() {
  const context = useContext(PointsContext)
  if (!context) {
    throw new Error('usePoints deve ser usado dentro de um PointsProvider')
  }
  return context
}
