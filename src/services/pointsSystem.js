// Sistema de Pontuação e Recompensas - Meup Club
// Economia interna equilibrada e sustentável

// ============================================
// FONTE DE VERDADE: CONSTANTES DE PONTOS
// Importadas de experiences.js (única fonte)
// ============================================
import { PONTOS_POR_REAL, PONTOS_POR_INDICACAO } from '@/config/experiences'

// Re-exportar para compatibilidade
export { PONTOS_POR_REAL, PONTOS_POR_INDICACAO }

// ============================================
// CONFIGURAÇÃO PRINCIPAL DE CRÉDITOS
// ============================================
export const creditsConfig = {
  // REGRAS SIMPLIFICADAS (fonte: experiences.js)
  // - Viagem: 1 ponto por R$1 gasto (PONTOS_POR_REAL)
  // - Indicação: 3000 pontos fixos (PONTOS_POR_INDICACAO)
  pontosPoReal: PONTOS_POR_REAL,
  pontosPorIndicacao: PONTOS_POR_INDICACAO,

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
// ALINHADO COM siteConfig.classes da landing
// ============================================
export const levels = [
  {
    id: 1,
    name: 'Econômica',
    shortName: 'Econômica',
    minPoints: 0,
    maxPoints: 4999,
    bonusMultiplier: 1,
    icon: '✈️',
    color: 'slate',
    perks: ['Entrada no clube', 'Acumula pontos', 'Troca por recompensas']
  },
  {
    id: 2,
    name: 'Econômica Premium',
    shortName: 'Econ. Premium',
    minPoints: 5000,
    maxPoints: 19999,
    bonusMultiplier: 1.05,
    icon: '🌟',
    color: 'blue',
    perks: ['Bônus de 1.000 pts ao subir', '5% de desconto em experiências']
  },
  {
    id: 3,
    name: 'Executiva',
    shortName: 'Executiva',
    minPoints: 20000,
    maxPoints: 49999,
    bonusMultiplier: 1.1,
    icon: '💼',
    color: 'violet',
    perks: ['Bônus de 3.000 pts ao subir', '10% de desconto em upgrades e experiências', 'Prioridade no atendimento']
  },
  {
    id: 4,
    name: 'Primeira Classe',
    shortName: 'Primeira',
    minPoints: 50000,
    maxPoints: 99999,
    bonusMultiplier: 1.15,
    icon: '👑',
    color: 'amber',
    perks: ['Bônus de 5.000 pts ao subir', '15% de desconto', 'Acesso a experiências exclusivas']
  },
  {
    id: 5,
    name: 'Meup Exclusive',
    shortName: 'Exclusive',
    minPoints: 100000,
    maxPoints: Infinity,
    bonusMultiplier: 1.25,
    icon: '💎',
    color: 'slate-900',
    perks: ['Bônus de 10.000 pts ao subir', 'Maior desconto', 'Atendimento VIP', 'Consultor dedicado']
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
// NOTA: O catálogo de experiências agora vem do Supabase
// Use o hook useExperiencias() para carregar as experiências
// ============================================

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
 * Calcula pontos de viagem (1 ponto por R$1)
 * @param {number} valorEmReais - Valor gasto em reais
 * @returns {number} - Pontos calculados
 */
export function calcularPontosViagem(valorEmReais) {
  return Math.floor(valorEmReais * PONTOS_POR_REAL)
}

/**
 * Calcula pontos de indicação (valor fixo por indicação)
 * @param {number} quantidade - Número de indicações
 * @returns {number} - Pontos calculados
 */
export function calcularPontosIndicacao(quantidade = 1) {
  return Math.floor(quantidade) * PONTOS_POR_INDICACAO
}

/**
 * Calcula os créditos gerados por uma venda
 * REGRA SIMPLIFICADA: 1 ponto por R$1 gasto
 * @param {number} valorGasto - Valor gasto em reais
 * @param {string} type - Tipo de multiplicador (opcional, para viagens especiais)
 * @returns {object} - Detalhamento dos créditos
 */
export function calculateSaleCredits(valorGasto, type = 'padrao') {
  const multiplier = multipliers[type]?.value || 1

  // Regra simplificada: 1 ponto por R$1
  const basePoints = Math.floor(valorGasto * PONTOS_POR_REAL)
  const totalCredits = Math.floor(basePoints * multiplier)

  // Calcular custo estimado
  const estimatedCost = totalCredits * creditsConfig.creditCostRatio
  const costPercentage = valorGasto > 0 ? (estimatedCost / valorGasto) * 100 : 0

  return {
    eligible: true,
    valorGasto,
    multiplier,
    multiplierLabel: multipliers[type]?.label || 'Padrão',
    basePoints,
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
 * REGRA: 1 ponto por R$1 (usando PONTOS_POR_REAL)
 * @param {number} valorGasto - Valor gasto em reais
 * @param {string} type - Tipo de multiplicador
 * @param {number} userLevel - Nível atual do usuário
 * @returns {object} - Pontos calculados e detalhes
 */
export function calculateSalePoints(valorGasto, type = 'padrao', userLevel = 1) {
  const multiplier = multipliers[type]?.value || 1
  const level = levels.find(l => l.id === userLevel) || levels[0]

  // REGRA PRINCIPAL: 1 ponto por R$1 (fonte: experiences.js)
  const basePoints = Math.floor(valorGasto * PONTOS_POR_REAL)

  // Aplicar multiplicador de tipo (viagens especiais)
  const withTypeMultiplier = Math.floor(basePoints * multiplier)

  // Aplicar bônus de nível do usuário
  const finalPoints = Math.floor(withTypeMultiplier * level.bonusMultiplier)

  return {
    basePoints,
    typeMultiplier: multiplier,
    levelBonus: level.bonusMultiplier,
    finalPoints,
    // IMPORTANTE: Nunca retornamos o valor em reais - apenas pontos
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
 * NOTA: Nunca exibe o valor em reais na interface do cliente
 * @param {number} valorGasto - Valor gasto em reais
 * @param {string} type - Tipo de multiplicador
 * @returns {object} - Resumo completo para exibição
 */
export function getSaleFinancialSummary(valorGasto, type = 'padrao') {
  const credits = calculateSaleCredits(valorGasto, type)

  return {
    ...credits,
    summary: {
      // ADMIN ONLY: pode ver o valor base
      valorBase: `R$ ${valorGasto.toFixed(2)}`,
      pontosGerados: `${credits.totalCredits} pontos`,
      taxa: `${PONTOS_POR_REAL} pt/R$`,
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
  const reqLevel = reward.requiredLevelId || reward.classeMinima || 1
  return userLevelId >= reqLevel
}

/**
 * Obtém o nível requerido para uma recompensa
 * @param {object} reward - Recompensa
 * @returns {object} - Nível requerido com detalhes
 */
export function getRequiredLevelData(reward) {
  const reqLevel = reward.requiredLevelId || reward.classeMinima || 1
  return levels.find(l => l.id === reqLevel) || levels[0]
}

/**
 * Calcula progresso para cada recompensa (com verificação de nível)
 * @param {number} userPoints - Pontos do usuário
 * @param {number} userLevelId - ID do nível do usuário (opcional, calculado se não fornecido)
 * @param {array} experiencias - Lista de experiências do Supabase (obrigatório)
 * @returns {array} - Recompensas com status de progresso e desbloqueio
 */
export function calculateRewardsProgress(userPoints, userLevelId = null, experiencias = []) {
  // Se não foi passado o nível, calcular
  if (userLevelId === null) {
    const levelData = calculateLevel(userPoints)
    userLevelId = levelData.current.id
  }

  // Usar experiências passadas como parâmetro
  if (!experiencias || experiencias.length === 0) {
    return []
  }

  return experiencias.map(reward => {
    const progress = Math.min((userPoints / reward.points_required) * 100, 100)
    const pointsNeeded = Math.max(reward.points_required - userPoints, 0)
    const hasEnoughPoints = userPoints >= reward.points_required
    // Suporta classeMinima (Supabase) ou requiredLevelId (mapeado)
    const reqLevel = reward.classeMinima || reward.requiredLevelId || 1
    const isUnlockedByLevel = userLevelId >= reqLevel
    const canRedeem = hasEnoughPoints && isUnlockedByLevel
    const reqLevelData = levels.find(l => l.id === reqLevel) || levels[0]

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
      reqLevelName: reqLevelData.name,
      requiredLevelId: reqLevel
    }
  })
}

/**
 * Obtém recompensas recém-desbloqueadas ao subir de nível
 * @param {number} previousLevelId - Nível anterior
 * @param {number} newLevelId - Novo nível
 * @param {array} experiencias - Lista de experiências do Supabase
 * @returns {array} - Recompensas desbloqueadas
 */
export function getNewlyUnlockedRewards(previousLevelId, newLevelId, experiencias = []) {
  return experiencias.filter(reward => {
    const reqLevel = reward.requiredLevelId || reward.classeMinima || 1
    return reqLevel > previousLevelId && reqLevel <= newLevelId
  })
}

/**
 * Obtém recompensas bloqueadas por nível
 * @param {number} userLevelId - ID do nível do usuário
 * @param {array} experiencias - Lista de experiências do Supabase
 * @returns {array} - Recompensas bloqueadas
 */
export function getLockedRewardsByLevel(userLevelId, experiencias = []) {
  return experiencias.filter(reward => {
    const reqLevel = reward.requiredLevelId || reward.classeMinima || 1
    return reqLevel > userLevelId
  })
}

/**
 * Obtém próximo nível que desbloqueia novas recompensas
 * @param {number} userLevelId - ID do nível do usuário
 * @param {array} experiencias - Lista de experiências do Supabase
 * @returns {object} - Próximo nível e recompensas que serão desbloqueadas
 */
export function getNextLevelRewards(userLevelId, experiencias = []) {
  const nextLevel = levels.find(l => l.id === userLevelId + 1)
  if (!nextLevel) return null

  const rewardsToUnlock = experiencias.filter(r => {
    const reqLevel = r.requiredLevelId || r.classeMinima || 1
    return reqLevel === nextLevel.id
  })

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
 * @param {array} experiencias - Lista de experiências do Supabase
 * @param {number} limit - Quantidade de recompensas a retornar
 * @returns {array} - Próximas recompensas
 */
export function getNextRewards(userPoints, experiencias = [], limit = 3) {
  // GUARDA: garantir que é array
  if (!Array.isArray(experiencias) || experiencias.length === 0) {
    return []
  }

  const sorted = [...experiencias]
    .filter(r => (r.points_required || r.points) > userPoints)
    .sort((a, b) => (a.points_required || a.points) - (b.points_required || b.points))
    .slice(0, limit)

  return sorted.map(reward => {
    const pointsRequired = reward.points_required || reward.points
    return {
      ...reward,
      points_required: pointsRequired,
      pointsNeeded: pointsRequired - userPoints,
      progress: Math.round((userPoints / pointsRequired) * 100)
    }
  })
}

/**
 * Estima indicações necessárias para alcançar uma recompensa
 * Usa PONTOS_POR_INDICACAO como valor padrão (fonte: experiences.js)
 * @param {number} pointsNeeded - Pontos necessários
 * @param {number} pontosPoIndicacao - Pontos por indicação (default: PONTOS_POR_INDICACAO)
 * @returns {number} - Estimativa de indicações
 */
export function estimateReferralsNeeded(pointsNeeded, pontosPoIndicacao = PONTOS_POR_INDICACAO) {
  return Math.ceil(pointsNeeded / pontosPoIndicacao)
}
