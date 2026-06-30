// Sistema de Pontuação e Recompensas - Meup Club
// Economia interna equilibrada e sustentável

// ============================================
// CONFIGURAÇÃO PRINCIPAL DE CRÉDITOS
// ============================================
export const creditsConfig = {
  // Distribuição de créditos (% do lucro)
  referrerPercentage: 1.0,    // 100% do lucro para o indicador
  buyerPercentage: 0.30,      // 30% do lucro para o comprador

  // Condição mínima para gerar créditos
  minProfitToGenerateCredits: 50, // R$50 mínimo de lucro

  // Limite mensal de saque
  monthlyWithdrawalLimit: 300, // R$300 máximo por mês

  // Limite de bônus extras (% do total de créditos de vendas)
  maxExtraBonusPercentage: 0.20, // 20% máximo

  // Custo real estimado por crédito (para cálculo de sustentabilidade)
  creditCostRatio: 0.05 // R$0.05 por crédito
}

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
// SISTEMA DE CLASSES (NÍVEIS)
// Inspirado nas classes de voo para experiência premium
// ============================================
export const levels = [
  {
    id: 1,
    name: 'Classe Econômica',
    shortName: 'Economy',
    minPoints: 0,
    maxPoints: 599,
    bonusMultiplier: 1,
    icon: '✈️',
    color: 'slate',
    perks: ['Acesso ao clube', 'Código de indicação exclusivo', 'Catálogo de experiências']
  },
  {
    id: 2,
    name: 'Premium Economy',
    shortName: 'Premium',
    minPoints: 600,
    maxPoints: 1799,
    bonusMultiplier: 1.05,
    icon: '🌟',
    color: 'blue',
    perks: ['5% bônus em pontos', 'Atendimento prioritário', 'Experiências exclusivas']
  },
  {
    id: 3,
    name: 'Classe Executiva',
    shortName: 'Business',
    minPoints: 1800,
    maxPoints: 3999,
    bonusMultiplier: 1.1,
    icon: '💼',
    color: 'violet',
    perks: ['10% bônus em pontos', 'Ofertas antecipadas', 'Concierge de viagem']
  },
  {
    id: 4,
    name: 'Primeira Classe',
    shortName: 'First',
    minPoints: 4000,
    maxPoints: 7999,
    bonusMultiplier: 1.15,
    icon: '👑',
    color: 'amber',
    perks: ['15% bônus em pontos', 'Suporte VIP dedicado', 'Upgrades preferenciais']
  },
  {
    id: 5,
    name: 'Meup Exclusive',
    shortName: 'Exclusive',
    minPoints: 8000,
    maxPoints: Infinity,
    bonusMultiplier: 1.25,
    icon: '💎',
    color: 'slate-900',
    perks: ['25% bônus em pontos', 'Gerente pessoal', 'Experiências sob medida', 'Eventos privados']
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
// SISTEMA DE RARIDADE
// ============================================
export const rarityConfig = {
  common: {
    id: 'common',
    label: 'Comum',
    color: '#9ca3af',
    glowClass: '',
    borderClass: 'border-neutral-500/30'
  },
  rare: {
    id: 'rare',
    label: 'Raro',
    color: '#3b82f6',
    glowClass: 'animate-glow-blue',
    borderClass: 'border-blue-500/40'
  },
  epic: {
    id: 'epic',
    label: 'Épico',
    color: '#a855f7',
    glowClass: 'animate-glow-purple',
    borderClass: 'border-purple-500/40'
  },
  legendary: {
    id: 'legendary',
    label: 'Lendário',
    color: '#f59e0b',
    glowClass: 'animate-glow-gold',
    borderClass: 'border-amber-500/50'
  }
}

// ============================================
// CATÁLOGO DE EXPERIÊNCIAS (Com requisito de classe e raridade)
// ============================================
export const rewardsTable = [
  // CLASSE ECONÔMICA — Primeiras conquistas
  {
    id: '1',
    tier: 1,
    requiredLevel: 1,
    name: 'Crédito de Boas-Vindas',
    subtitle: 'Sua primeira conquista',
    description: 'R$30 em créditos para iniciar sua jornada no clube',
    points_required: 600,
    category: 'cash',
    realCost: 30,
    perceivedValue: 30,
    badge: 'hot',
    rarity: 'common',
    available: true
  },
  {
    id: '2',
    tier: 1,
    requiredLevel: 1,
    name: 'Crédito Viajante',
    subtitle: 'Para sua próxima aventura',
    description: 'R$45 em créditos para sua próxima experiência',
    points_required: 900,
    category: 'cash',
    realCost: 45,
    perceivedValue: 45,
    badge: null,
    rarity: 'common',
    available: true
  },

  // PREMIUM ECONOMY — Conforto elevado
  {
    id: '3',
    tier: 2,
    requiredLevel: 2,
    name: 'Crédito Explorador',
    subtitle: 'Destinos mais distantes',
    description: 'R$90 em créditos para experiências memoráveis',
    points_required: 1800,
    category: 'cash',
    realCost: 90,
    perceivedValue: 90,
    badge: null,
    rarity: 'common',
    available: true
  },
  {
    id: '4',
    tier: 2,
    requiredLevel: 2,
    name: 'Upgrade de Conforto',
    subtitle: 'Mais espaço, mais conforto',
    description: 'Assento com espaço extra em voos selecionados',
    points_required: 2500,
    category: 'travel',
    realCost: 80,
    perceivedValue: 150,
    badge: 'recommended',
    rarity: 'rare',
    available: true
  },

  // CLASSE EXECUTIVA — Experiência refinada
  {
    id: '5',
    tier: 3,
    requiredLevel: 3,
    name: 'Crédito Premium',
    subtitle: 'Experiências extraordinárias',
    description: 'R$180 em créditos para momentos especiais',
    points_required: 4000,
    category: 'cash',
    realCost: 180,
    perceivedValue: 180,
    badge: null,
    rarity: 'rare',
    available: true
  },
  {
    id: '6',
    tier: 3,
    requiredLevel: 3,
    name: 'Experiência Gastronômica',
    subtitle: 'Mesa para dois',
    description: 'Jantar exclusivo em restaurante estrelado',
    points_required: 5500,
    category: 'experience',
    realCost: 200,
    perceivedValue: 400,
    badge: 'limited',
    rarity: 'epic',
    available: true
  },

  // PRIMEIRA CLASSE — Exclusividade absoluta
  {
    id: '7',
    tier: 4,
    requiredLevel: 4,
    name: 'Upgrade Executivo',
    subtitle: 'Voe como merece',
    description: 'Upgrade para Classe Executiva em voo internacional',
    points_required: 8000,
    category: 'travel',
    realCost: 350,
    perceivedValue: 1200,
    badge: 'recommended',
    rarity: 'epic',
    featured: true,
    available: true
  },
  {
    id: '8',
    tier: 4,
    requiredLevel: 4,
    name: 'Acesso Lounge Anual',
    subtitle: 'Seu refúgio nos aeroportos',
    description: 'Acesso ilimitado a lounges premium por 12 meses',
    points_required: 10000,
    category: 'lounge',
    realCost: 400,
    perceivedValue: 1500,
    badge: 'exclusive',
    rarity: 'epic',
    available: true
  },

  // MEUP EXCLUSIVE — O ápice do privilégio
  {
    id: '9',
    tier: 5,
    requiredLevel: 5,
    name: 'Escapada Exclusiva',
    subtitle: 'Final de semana inesquecível',
    description: 'Aéreo + hotel 5 estrelas para um fim de semana perfeito',
    points_required: 15000,
    category: 'premium',
    realCost: 800,
    perceivedValue: 3000,
    badge: 'exclusive',
    rarity: 'legendary',
    featured: true,
    available: true
  },
  {
    id: '10',
    tier: 5,
    requiredLevel: 5,
    name: 'A Grande Experiência',
    subtitle: 'O melhor que oferecemos',
    description: 'Voo executivo + resort all-inclusive por 5 noites',
    points_required: 20000,
    category: 'premium',
    realCost: 1500,
    perceivedValue: 8000,
    badge: 'exclusive',
    rarity: 'legendary',
    featured: true,
    available: true
  }
]

/**
 * Obtém configuração de raridade de uma recompensa
 * @param {string} rarity - ID da raridade
 * @returns {object} - Configuração da raridade
 */
export function getRarityConfig(rarity) {
  return rarityConfig[rarity] || rarityConfig.common
}

// ============================================
// SISTEMA DE PONTOS EXTRAS
// ============================================
export const extraPointsConfig = {
  // CPA - Pontos por indicação criada (pendente até conversão)
  cpa: {
    points: 20,
    status: 'pending',
    description: 'Bônus por indicação registrada'
  },

  // Missões - Engajamento
  missions: [
    {
      id: 'complete_profile',
      points: 50,
      name: 'Complete seu perfil',
      description: 'Adicione suas informações para uma experiência personalizada',
      category: 'onboarding',
      oneTime: true
    },
    {
      id: 'first_referral',
      points: 100,
      name: 'Primeira indicação',
      description: 'Convide seu primeiro viajante para o clube',
      category: 'referral',
      oneTime: true
    },
    {
      id: 'share_social',
      points: 30,
      name: 'Compartilhe o clube',
      description: 'Divulgue o Meup Club nas suas redes',
      category: 'social',
      cooldown: 7
    },
    {
      id: 'invite_5',
      points: 150,
      name: 'Convide 5 viajantes',
      description: 'Traga mais membros para o clube',
      category: 'referral',
      oneTime: true
    },
    {
      id: 'monthly_active',
      points: 50,
      name: 'Mantenha-se ativo',
      description: 'Acesse o clube regularmente',
      category: 'engagement',
      cooldown: 30
    },
    {
      id: 'review_trip',
      points: 75,
      name: 'Avalie sua experiência',
      description: 'Compartilhe como foi sua viagem',
      category: 'feedback',
      perTrip: true
    },
    {
      id: 'anniversary',
      points: 200,
      name: 'Aniversário no clube',
      description: 'Celebre mais um ano como membro',
      category: 'milestone',
      yearly: true
    }
  ],

  // Alias para compatibilidade
  get tasks() { return this.missions },

  // Limite de segurança: pontos extras máximo 20% do total
  maxExtraPointsRatio: creditsConfig.maxExtraBonusPercentage
}

// ============================================
// CÁLCULO DE CRÉDITOS POR VENDA
// ============================================

/**
 * Calcula os créditos gerados por uma venda
 * @param {number} profit - Lucro da venda em reais
 * @param {string} type - Tipo de multiplicador (opcional)
 * @returns {object} - Detalhamento dos créditos
 */
export function calculateSaleCredits(profit, type = 'padrao') {
  const config = creditsConfig
  const multiplier = multipliers[type]?.value || 1

  // Verificar lucro mínimo
  if (profit < config.minProfitToGenerateCredits) {
    return {
      eligible: false,
      reason: `Lucro mínimo de R$${config.minProfitToGenerateCredits} não atingido`,
      profit,
      referrerCredits: 0,
      buyerCredits: 0,
      totalCredits: 0,
      estimatedCost: 0,
      costPercentage: 0
    }
  }

  // Calcular créditos base
  const baseReferrerCredits = Math.floor(profit * config.referrerPercentage * multiplier)
  const baseBuyerCredits = Math.floor(profit * config.buyerPercentage * multiplier)
  const totalCredits = baseReferrerCredits + baseBuyerCredits

  // Calcular custo estimado
  const estimatedCost = totalCredits * config.creditCostRatio
  const costPercentage = (estimatedCost / profit) * 100

  return {
    eligible: true,
    profit,
    multiplier,
    multiplierLabel: multipliers[type]?.label || 'Padrão',
    referrerCredits: baseReferrerCredits,
    buyerCredits: baseBuyerCredits,
    totalCredits,
    estimatedCost,
    costPercentage: Math.round(costPercentage * 10) / 10,
    marginRetained: Math.round((100 - costPercentage) * 10) / 10
  }
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
 * Valida se pontos extras estão dentro do limite de segurança (20%)
 * @param {number} saleCredits - Créditos de vendas
 * @param {number} extraCredits - Créditos extras (CPA + tasks)
 * @returns {object} - Validação e créditos ajustados
 */
export function validateExtraCredits(saleCredits, extraCredits) {
  const maxAllowed = saleCredits * creditsConfig.maxExtraBonusPercentage
  const isValid = extraCredits <= maxAllowed

  return {
    isValid,
    maxAllowed: Math.floor(maxAllowed),
    extraCredits,
    adjustedExtra: Math.min(extraCredits, Math.floor(maxAllowed)),
    excess: isValid ? 0 : extraCredits - Math.floor(maxAllowed),
    limitPercentage: creditsConfig.maxExtraBonusPercentage * 100
  }
}

// Alias para compatibilidade
export const validateExtraPoints = validateExtraCredits

/**
 * Verifica o limite de saque mensal do usuário
 * @param {number} currentMonthWithdrawals - Total já sacado no mês
 * @param {number} requestedAmount - Valor solicitado para saque
 * @returns {object} - Validação e valores permitidos
 */
export function validateMonthlyWithdrawal(currentMonthWithdrawals, requestedAmount) {
  const limit = creditsConfig.monthlyWithdrawalLimit
  const remaining = Math.max(0, limit - currentMonthWithdrawals)
  const canWithdraw = requestedAmount <= remaining
  const allowedAmount = Math.min(requestedAmount, remaining)

  return {
    canWithdraw,
    monthlyLimit: limit,
    alreadyWithdrawn: currentMonthWithdrawals,
    remainingLimit: remaining,
    requestedAmount,
    allowedAmount,
    exceededBy: canWithdraw ? 0 : requestedAmount - remaining
  }
}

/**
 * Calcula o resumo financeiro de uma venda para exibição no admin
 * @param {number} profit - Lucro da venda
 * @param {string} type - Tipo de multiplicador
 * @returns {object} - Resumo completo para exibição
 */
export function getSaleFinancialSummary(profit, type = 'padrao') {
  const credits = calculateSaleCredits(profit, type)

  if (!credits.eligible) {
    return {
      ...credits,
      summary: {
        profit: `R$ ${profit.toFixed(2)}`,
        referrerCredits: '0 (lucro insuficiente)',
        buyerCredits: '0 (lucro insuficiente)',
        totalCost: 'R$ 0,00',
        costPercentage: '0%'
      }
    }
  }

  return {
    ...credits,
    summary: {
      profit: `R$ ${profit.toFixed(2)}`,
      referrerCredits: `${credits.referrerCredits} créditos`,
      buyerCredits: `${credits.buyerCredits} créditos`,
      totalCost: `R$ ${credits.estimatedCost.toFixed(2)}`,
      costPercentage: `${credits.costPercentage}%`,
      marginRetained: `${credits.marginRetained}%`
    }
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
 * Agrupa experiências por classe
 * @param {array} rewards - Lista de experiências com progresso
 * @returns {object} - Experiências agrupadas por classe
 */
export function groupRewardsByTier(rewards) {
  const tierNames = {
    1: 'Classe Econômica',
    2: 'Premium Economy',
    3: 'Classe Executiva',
    4: 'Primeira Classe',
    5: 'Meup Exclusive'
  }

  const tierIcons = {
    1: '✈️',
    2: '🌟',
    3: '💼',
    4: '👑',
    5: '💎'
  }

  return rewards.reduce((acc, reward) => {
    const tierKey = `tier_${reward.tier}`
    if (!acc[tierKey]) {
      acc[tierKey] = {
        id: reward.tier,
        name: tierNames[reward.tier],
        icon: tierIcons[reward.tier],
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
