import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { demoUser } from '@/services/mockData'

/**
 * PointsContext - Fonte única de verdade para pontos do usuário
 *
 * Quando logado com conta real: usa pontos do profile (Supabase)
 * Quando em modo demo: usa pontos do demoUser
 */

const PointsContext = createContext(null)

export function PointsProvider({ children }) {
  const { profile, useMock } = useAuth()

  // Pontos: vem do profile real ou do demo
  const [points, setPoints] = useState(0)

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

  /**
   * Debita pontos do saldo
   * @param {number} amount - Quantidade a debitar
   * @returns {boolean} - true se teve sucesso, false se saldo insuficiente
   *
   * IMPORTANTE: Usa uma variável de controle para garantir que a verificação
   * seja feita com o valor ATUAL dos pontos, não um valor "congelado".
   */
  const deductPoints = useCallback((amount) => {
    let success = false
    setPoints(prev => {
      // Verificar saldo DENTRO do setState garante que usamos o valor atual
      if (prev >= amount) {
        success = true
        return prev - amount
      }
      // Saldo insuficiente - não altera nada
      return prev
    })
    return success
  }, []) // Sem dependências - a verificação acontece dentro do setState

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
    deductPoints,
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
