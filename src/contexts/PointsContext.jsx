import { createContext, useContext, useState, useCallback } from 'react'
import { demoUser } from '@/services/mockData'

/**
 * PointsContext - Fonte única de verdade para pontos do usuário
 *
 * Por que isso existe?
 * Antes, cada página tinha seu próprio estado de pontos. Quando você resgatava
 * uma experiência, apenas a página de Experiências atualizava - o header e outras
 * páginas continuavam mostrando o valor antigo.
 *
 * Agora, todas as páginas leem deste contexto. Quando os pontos mudam,
 * TODAS as páginas atualizam automaticamente.
 */

const PointsContext = createContext(null)

export function PointsProvider({ children }) {
  // Estado único de pontos - começa com os pontos do usuário demo
  const [points, setPoints] = useState(demoUser.points)

  // IDs das experiências já resgatadas (para evitar resgate duplo)
  const [redeemedIds, setRedeemedIds] = useState([])

  /**
   * Debita pontos do saldo
   * @param {number} amount - Quantidade a debitar
   * @returns {boolean} - true se teve sucesso, false se saldo insuficiente
   */
  const deductPoints = useCallback((amount) => {
    if (points < amount) {
      return false
    }
    setPoints(prev => prev - amount)
    return true
  }, [points])

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
