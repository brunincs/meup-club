// ============================================
// HOOK CENTRALIZADO PARA CLASSE DO USUÁRIO
// Usa total_points_earned (não saldo) para determinar classe
// ============================================

import { useMemo } from 'react'
import { usePoints } from '@/contexts/PointsContext'
import { levels } from '@/services/pointsSystem'

/**
 * Hook que retorna dados de classe do usuário baseado em total_points_earned
 * ÚNICA FONTE DE VERDADE para classe em todo o app
 */
export function useUserLevel() {
  const { totalPointsEarned, levelId, points } = usePoints()

  return useMemo(() => {
    // Usa levelId do banco (já calculado pelo backend)
    const currentLevel = levels.find(l => l.id === levelId) || levels[0]
    const nextLevel = levels.find(l => l.id === levelId + 1) || null

    // Calcular progresso baseado em total_points_earned
    const pointsInLevel = totalPointsEarned - currentLevel.minPoints
    const pointsForLevel = nextLevel ? (nextLevel.minPoints - currentLevel.minPoints) : 0
    const progress = nextLevel ? Math.min(100, Math.round((pointsInLevel / pointsForLevel) * 100)) : 100
    const pointsToNext = nextLevel ? Math.max(0, nextLevel.minPoints - totalPointsEarned) : 0

    return {
      // Dados da classe atual
      current: currentLevel,
      currentId: levelId,
      currentName: currentLevel.name,
      currentShortName: currentLevel.shortName,

      // Dados da próxima classe
      next: nextLevel,
      nextId: nextLevel?.id || null,
      nextName: nextLevel?.name || null,

      // Progresso
      progress,
      pointsToNext,
      totalPointsEarned,

      // Saldo atual (para exibição)
      balance: points,

      // Lista de níveis para visualização
      levels,

      // Helpers
      isMaxLevel: !nextLevel,
      bonusMultiplier: currentLevel.bonusMultiplier || 1
    }
  }, [levelId, totalPointsEarned, points])
}

/**
 * Calcula quantas experiências estão disponíveis para o nível atual
 */
export function countAvailableExperiences(experiences, levelId) {
  if (!experiences || !Array.isArray(experiences)) return 0
  return experiences.filter(exp => {
    const minClass = exp.classeMinima || exp.classe_minima || 1
    return minClass <= levelId && exp.ativa !== false
  }).length
}
