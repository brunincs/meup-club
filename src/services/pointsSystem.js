// Sistema de Pontuação e Recompensas - Meup Club
// Economia interna equilibrada e sustentável

// ============================================
// CONFIGURAÇÃO DE MULTIPLICADORES
// ============================================
export const multipliers = {
  padrao: { value: 1, label: 'Padrão', description: 'Indicação nacional' },
  internacional: { value: 1.5, label: 'Internacional', description: 'Viagens internacionais' },
  recorrente: { value: 1.3, label: 'Recorrente', description: 'Cliente que já viajou antes' },
  alta_margem: { value: 2, label: 'Alta Margem', description: 'Pacotes premium' },
  primeira_classe: { value: 2.5, label: 'Primeira Classe', description: 'Viagens em primeira classe' }
}

// ============================================
// SISTEMA DE NÍVEIS
// ============================================
export const levels = [
  {
    id: 1,
    name: 'Iniciante',
    minPoints: 0,
    maxPoints: 599,
    bonusMultiplier: 1,
    perks: ['Acesso ao programa', 'Código de indicação']
  },
  {
    id: 2,
    name: 'Explorador',
    minPoints: 600,
    maxPoints: 1799,
    bonusMultiplier: 1.05,
    perks: ['5% bônus nos pontos', 'Prioridade no atendimento']
  },
  {
    id: 3,
    name: 'Navegador',
    minPoints: 1800,
    maxPoints: 3999,
    bonusMultiplier: 1.1,
    perks: ['10% bônus nos pontos', 'Acesso a ofertas exclusivas']
  },
  {
    id: 4,
    name: 'Elite',
    minPoints: 4000,
    maxPoints: 7999,
    bonusMultiplier: 1.15,
    perks: ['15% bônus nos pontos', 'Suporte VIP', 'Cashback extra']
  },
  {
    id: 5,
    name: 'Aristocrata',
    minPoints: 8000,
    maxPoints: Infinity,
    bonusMultiplier: 1.25,
    perks: ['25% bônus nos pontos', 'Gerente dedicado', 'Eventos exclusivos']
  }
]

// ============================================
// MAPEAMENTO TIER -> NÍVEL REQUERIDO
// ============================================
export const tierToLevelRequirement = {
  1: 1, // Tier 1 = Iniciante (todos têm acesso)
  2: 2, // Tier 2 = Explorador
  3: 3, // Tier 3 = Navegador
  4: 4, // Tier 4 = Elite
  5: 5  // Tier 5 = Aristocrata
}

// ============================================
// TABELA DE RECOMPENSAS (Com requisito de nível)
// ============================================
export const rewardsTable = [
  // NÍVEL 1 — ENTRADA (Iniciante - todos têm acesso)
  {
    id: '1',
    tier: 1,
    requiredLevel: 1, // Iniciante
    name: 'Crédito Inicial',
    description: 'Seu primeiro resgate - R$30 em crédito para usar como quiser',
    points_required: 600,
    category: 'cash',
    realCost: 30,
    perceivedValue: 30,
    badge: 'hot',
    available: true
  },
  {
    id: '2',
    tier: 1,
    requiredLevel: 1, // Iniciante
    name: 'Crédito Bronze',
    description: 'R$45 em crédito para sua próxima aventura',
    points_required: 900,
    category: 'cash',
    realCost: 45,
    perceivedValue: 45,
    badge: null,
    available: true
  },

  // NÍVEL 2 — CONSOLIDAÇÃO (Explorador)
  {
    id: '3',
    tier: 2,
    requiredLevel: 2, // Explorador
    name: 'Crédito Prata',
    description: 'R$90 em crédito - valor significativo para sua viagem',
    points_required: 1800,
    category: 'cash',
    realCost: 90,
    perceivedValue: 90,
    badge: null,
    available: true
  },
  {
    id: '4',
    tier: 2,
    requiredLevel: 2, // Explorador
    name: 'Upgrade de Assento',
    description: 'Upgrade para assento com mais espaço em voos selecionados',
    points_required: 2500,
    category: 'travel',
    realCost: 80,
    perceivedValue: 150,
    badge: 'recommended',
    available: true
  },

  // NÍVEL 3 — DESEJO (Navegador)
  {
    id: '5',
    tier: 3,
    requiredLevel: 3, // Navegador
    name: 'Crédito Ouro',
    description: 'R$180 em crédito premium para experiências incríveis',
    points_required: 4000,
    category: 'cash',
    realCost: 180,
    perceivedValue: 180,
    badge: null,
    available: true
  },
  {
    id: '6',
    tier: 3,
    requiredLevel: 3, // Navegador
    name: 'Jantar Premium',
    description: 'Experiência gastronômica para 2 em restaurante estrelado',
    points_required: 5500,
    category: 'experience',
    realCost: 200,
    perceivedValue: 400,
    badge: 'limited',
    available: true
  },

  // NÍVEL 4 — ELITE
  {
    id: '7',
    tier: 4,
    requiredLevel: 4, // Elite
    name: 'Upgrade Classe Executiva',
    description: 'Voe com todo conforto em sua próxima viagem internacional',
    points_required: 8000,
    category: 'travel',
    realCost: 350,
    perceivedValue: 1200,
    badge: 'recommended',
    featured: true,
    available: true
  },
  {
    id: '8',
    tier: 4,
    requiredLevel: 4, // Elite
    name: 'Acesso VIP Lounge Anual',
    description: 'Acesso ilimitado a lounges premium por 1 ano',
    points_required: 10000,
    category: 'travel',
    realCost: 400,
    perceivedValue: 1500,
    badge: 'exclusive',
    available: true
  },

  // NÍVEL 5 — ARISTOCRATA
  {
    id: '9',
    tier: 5,
    requiredLevel: 5, // Aristocrata
    name: 'Weekend Exclusivo',
    description: 'Final de semana com aéreo e hotel 5 estrelas incluso',
    points_required: 15000,
    category: 'premium',
    realCost: 800,
    perceivedValue: 3000,
    badge: 'exclusive',
    featured: true,
    available: true
  },
  {
    id: '10',
    tier: 5,
    requiredLevel: 5, // Aristocrata
    name: 'Experiência Máxima',
    description: 'Pacote completo: voo executivo + resort all-inclusive 5 noites',
    points_required: 20000,
    category: 'premium',
    realCost: 1500,
    perceivedValue: 8000,
    badge: 'exclusive',
    featured: true,
    available: true
  }
]

// ============================================
// SISTEMA DE PONTOS EXTRAS
// ============================================
export const extraPointsConfig = {
  // CPA - Pontos por indicação criada (pendente até conversão)
  cpa: {
    points: 20,
    status: 'pending', // Fica pendente até a venda ser confirmada
    description: 'Bônus por indicação registrada'
  },

  // Tasks - Engajamento
  tasks: [
    { id: 'complete_profile', points: 50, name: 'Completar perfil', oneTime: true },
    { id: 'first_referral', points: 100, name: 'Primeira indicação', oneTime: true },
    { id: 'share_social', points: 30, name: 'Compartilhar nas redes', cooldown: 7 }, // dias
    { id: 'invite_5', points: 150, name: 'Convidar 5 amigos', oneTime: true },
    { id: 'monthly_active', points: 50, name: 'Ativo no mês', cooldown: 30 },
    { id: 'review_trip', points: 75, name: 'Avaliar viagem', perTrip: true },
    { id: 'anniversary', points: 200, name: 'Aniversário no programa', yearly: true }
  ],

  // Limite de segurança: pontos extras máximo 25% do total
  maxExtraPointsRatio: 0.25
}

// ============================================
// FUNÇÕES DE CÁLCULO
// ============================================

/**
 * Calcula pontos base de uma venda (sem mostrar valores financeiros)
 * @param {number} profit - Lucro da venda em reais
 * @param {string} type - Tipo de multiplicador
 * @param {number} userLevel - Nível atual do usuário
 * @returns {object} - Pontos calculados e detalhes
 */
export function calculateSalePoints(profit, type = 'padrao', userLevel = 1) {
  const multiplier = multipliers[type]?.value || 1
  const level = levels.find(l => l.id === userLevel) || levels[0]

  // Base: 1 real = 1 ponto
  const basePoints = Math.floor(profit)

  // Aplicar multiplicador de tipo
  const withTypeMultiplier = Math.floor(basePoints * multiplier)

  // Aplicar bônus de nível
  const finalPoints = Math.floor(withTypeMultiplier * level.bonusMultiplier)

  return {
    basePoints,
    typeMultiplier: multiplier,
    levelBonus: level.bonusMultiplier,
    finalPoints,
    // Não retornamos o valor em reais - apenas pontos
  }
}

/**
 * Calcula o nível atual baseado nos pontos
 * @param {number} points - Total de pontos do usuário
 * @returns {object} - Nível atual e progresso
 */
export function calculateLevel(points) {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].minPoints) {
      const currentLevel = levels[i]
      const nextLevel = levels[i + 1]

      let progress = 100
      let pointsToNext = 0

      if (nextLevel) {
        const pointsInLevel = points - currentLevel.minPoints
        const levelRange = nextLevel.minPoints - currentLevel.minPoints
        progress = Math.min((pointsInLevel / levelRange) * 100, 100)
        pointsToNext = nextLevel.minPoints - points
      }

      return {
        current: currentLevel,
        next: nextLevel,
        progress: Math.round(progress),
        pointsToNext
      }
    }
  }
  return {
    current: levels[0],
    next: levels[1],
    progress: 0,
    pointsToNext: levels[1].minPoints
  }
}

/**
 * Valida se pontos extras estão dentro do limite de segurança
 * @param {number} salePoints - Pontos de vendas
 * @param {number} extraPoints - Pontos extras (CPA + tasks)
 * @returns {object} - Validação e pontos ajustados
 */
export function validateExtraPoints(salePoints, extraPoints) {
  const maxAllowed = salePoints * extraPointsConfig.maxExtraPointsRatio
  const isValid = extraPoints <= maxAllowed

  return {
    isValid,
    maxAllowed: Math.floor(maxAllowed),
    extraPoints,
    adjustedExtra: Math.min(extraPoints, Math.floor(maxAllowed)),
    excess: isValid ? 0 : extraPoints - Math.floor(maxAllowed)
  }
}

/**
 * Verifica se uma recompensa está desbloqueada pelo nível do usuário
 * @param {object} reward - Recompensa
 * @param {number} userLevelId - ID do nível do usuário
 * @returns {boolean} - Se está desbloqueada
 */
export function isRewardUnlockedByLevel(reward, userLevelId) {
  return userLevelId >= reward.requiredLevel
}

/**
 * Obtém o nível requerido para uma recompensa
 * @param {object} reward - Recompensa
 * @returns {object} - Nível requerido com detalhes
 */
export function getRequiredLevel(reward) {
  return levels.find(l => l.id === reward.requiredLevel) || levels[0]
}

/**
 * Calcula progresso para cada recompensa (com verificação de nível)
 * @param {number} userPoints - Pontos do usuário
 * @param {number} userLevelId - ID do nível do usuário (opcional, calculado se não fornecido)
 * @returns {array} - Recompensas com status de progresso e desbloqueio
 */
export function calculateRewardsProgress(userPoints, userLevelId = null) {
  // Se não foi passado o nível, calcular
  if (userLevelId === null) {
    const levelData = calculateLevel(userPoints)
    userLevelId = levelData.current.id
  }

  return rewardsTable.map(reward => {
    const progress = Math.min((userPoints / reward.points_required) * 100, 100)
    const pointsNeeded = Math.max(reward.points_required - userPoints, 0)
    const hasEnoughPoints = userPoints >= reward.points_required
    const isUnlockedByLevel = userLevelId >= reward.requiredLevel
    const canRedeem = hasEnoughPoints && isUnlockedByLevel
    const requiredLevelData = getRequiredLevel(reward)

    let status = 'locked_level' // Bloqueado por nível
    if (!isUnlockedByLevel) {
      status = 'locked_level'
    } else if (canRedeem) {
      status = 'available'
    } else if (progress >= 70) {
      status = 'almost'
    } else if (progress >= 40) {
      status = 'progress'
    } else {
      status = 'locked_points'
    }

    return {
      ...reward,
      progress: Math.round(progress),
      pointsNeeded,
      hasEnoughPoints,
      isUnlockedByLevel,
      canRedeem,
      status,
      requiredLevelName: requiredLevelData.name,
      requiredLevelId: reward.requiredLevel
    }
  })
}

/**
 * Obtém recompensas recém-desbloqueadas ao subir de nível
 * @param {number} previousLevelId - Nível anterior
 * @param {number} newLevelId - Novo nível
 * @returns {array} - Recompensas desbloqueadas
 */
export function getNewlyUnlockedRewards(previousLevelId, newLevelId) {
  return rewardsTable.filter(reward =>
    reward.requiredLevel > previousLevelId && reward.requiredLevel <= newLevelId
  )
}

/**
 * Obtém recompensas bloqueadas por nível
 * @param {number} userLevelId - ID do nível do usuário
 * @returns {array} - Recompensas bloqueadas
 */
export function getLockedRewardsByLevel(userLevelId) {
  return rewardsTable.filter(reward => reward.requiredLevel > userLevelId)
}

/**
 * Obtém próximo nível que desbloqueia novas recompensas
 * @param {number} userLevelId - ID do nível do usuário
 * @returns {object} - Próximo nível e recompensas que serão desbloqueadas
 */
export function getNextLevelRewards(userLevelId) {
  const nextLevel = levels.find(l => l.id === userLevelId + 1)
  if (!nextLevel) return null

  const rewardsToUnlock = rewardsTable.filter(r => r.requiredLevel === nextLevel.id)

  return {
    level: nextLevel,
    rewards: rewardsToUnlock
  }
}

/**
 * Agrupa recompensas por tier
 * @param {array} rewards - Lista de recompensas com progresso
 * @returns {object} - Recompensas agrupadas por tier
 */
export function groupRewardsByTier(rewards) {
  const tierNames = {
    1: 'Entrada',
    2: 'Consolidação',
    3: 'Desejo',
    4: 'Elite',
    5: 'Aristocrata'
  }

  return rewards.reduce((acc, reward) => {
    const tierKey = `tier_${reward.tier}`
    if (!acc[tierKey]) {
      acc[tierKey] = {
        id: reward.tier,
        name: tierNames[reward.tier],
        rewards: []
      }
    }
    acc[tierKey].rewards.push(reward)
    return acc
  }, {})
}

/**
 * Verifica sustentabilidade financeira de uma recompensa
 * Regra: custo real <= 10% do valor gerado em pontos
 * @param {object} reward - Recompensa
 * @returns {boolean} - Se está dentro do limite sustentável
 */
export function isRewardSustainable(reward) {
  // Assumindo 1 ponto = R$1 de lucro gerado
  const valueGenerated = reward.points_required
  const maxCost = valueGenerated * 0.10 // 10% máximo

  return reward.realCost <= maxCost
}

/**
 * Calcula próximas recompensas alcançáveis
 * @param {number} userPoints - Pontos do usuário
 * @param {number} limit - Quantidade de recompensas a retornar
 * @returns {array} - Próximas recompensas
 */
export function getNextRewards(userPoints, limit = 3) {
  const sorted = [...rewardsTable]
    .filter(r => r.points_required > userPoints && r.available)
    .sort((a, b) => a.points_required - b.points_required)
    .slice(0, limit)

  return sorted.map(reward => ({
    ...reward,
    pointsNeeded: reward.points_required - userPoints,
    progress: Math.round((userPoints / reward.points_required) * 100)
  }))
}

/**
 * Estima indicações necessárias para alcançar uma recompensa
 * @param {number} pointsNeeded - Pontos necessários
 * @param {number} avgPointsPerReferral - Média de pontos por indicação
 * @returns {number} - Estimativa de indicações
 */
export function estimateReferralsNeeded(pointsNeeded, avgPointsPerReferral = 300) {
  return Math.ceil(pointsNeeded / avgPointsPerReferral)
}
