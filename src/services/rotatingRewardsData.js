// Sistema de Recompensas Rotativas - Meup Club
// Cria urgência e incentiva retorno constante

// ============================================
// POOL DE RECOMPENSAS ROTATIVAS
// ============================================
export const rotatingRewardsPool = [
  {
    id: 'rot_1',
    name: 'Upgrade Grátis para Suite',
    description: 'Upgrade para suite em hotéis parceiros na próxima reserva',
    points_required: 800,
    category: 'travel',
    realCost: 50,
    perceivedValue: 300,
    requiredLevel: 1,
    tag: 'week_offer', // 🔥 Oferta da semana
    slots: null, // Sem limite de vagas
    rotationDays: 7
  },
  {
    id: 'rot_2',
    name: 'Cashback Dobrado',
    description: 'Receba cashback em dobro na sua próxima indicação convertida',
    points_required: 500,
    category: 'cash',
    realCost: 25,
    perceivedValue: 100,
    requiredLevel: 1,
    tag: 'limited_time', // ⏳ Tempo limitado
    slots: null,
    rotationDays: 3
  },
  {
    id: 'rot_3',
    name: 'Acesso Lounge VIP',
    description: 'Acesso único a lounge VIP em aeroporto selecionado',
    points_required: 1200,
    category: 'travel',
    realCost: 80,
    perceivedValue: 200,
    requiredLevel: 2,
    tag: 'few_slots', // ⚠️ Restam poucas vagas
    slots: 5, // Apenas 5 vagas
    rotationDays: 5
  },
  {
    id: 'rot_4',
    name: 'Jantar para Dois',
    description: 'Experiência gastronômica exclusiva em restaurante parceiro',
    points_required: 2000,
    category: 'experience',
    realCost: 120,
    perceivedValue: 350,
    requiredLevel: 2,
    tag: 'week_offer',
    slots: 3,
    rotationDays: 7
  },
  {
    id: 'rot_5',
    name: 'Transfer Aeroporto',
    description: 'Transfer executivo de ida e volta ao aeroporto',
    points_required: 600,
    category: 'travel',
    realCost: 40,
    perceivedValue: 150,
    requiredLevel: 1,
    tag: 'limited_time',
    slots: null,
    rotationDays: 2
  },
  {
    id: 'rot_6',
    name: 'Early Check-in + Late Checkout',
    description: 'Check-in às 10h e checkout às 18h em hotéis parceiros',
    points_required: 400,
    category: 'travel',
    realCost: 30,
    perceivedValue: 120,
    requiredLevel: 1,
    tag: 'few_slots',
    slots: 10,
    rotationDays: 4
  },
  {
    id: 'rot_7',
    name: 'Seguro Viagem Premium',
    description: 'Cobertura premium de seguro viagem por 7 dias',
    points_required: 900,
    category: 'travel',
    realCost: 60,
    perceivedValue: 180,
    requiredLevel: 2,
    tag: 'week_offer',
    slots: null,
    rotationDays: 7
  },
  {
    id: 'rot_8',
    name: 'Pontos em Dobro',
    description: 'Multiplique por 2 os pontos da próxima venda convertida',
    points_required: 700,
    category: 'cash',
    realCost: 35,
    perceivedValue: 200,
    requiredLevel: 1,
    tag: 'limited_time',
    slots: 8,
    rotationDays: 3
  },
  {
    id: 'rot_9',
    name: 'Spa Day',
    description: 'Dia de spa com massagem e tratamentos em parceiro premium',
    points_required: 1500,
    category: 'experience',
    realCost: 100,
    perceivedValue: 300,
    requiredLevel: 3,
    tag: 'few_slots',
    slots: 3,
    rotationDays: 5
  },
  {
    id: 'rot_10',
    name: 'City Tour Exclusivo',
    description: 'Tour guiado privativo em cidade destino',
    points_required: 1800,
    category: 'experience',
    realCost: 90,
    perceivedValue: 400,
    requiredLevel: 3,
    tag: 'week_offer',
    slots: 5,
    rotationDays: 7
  }
]

// ============================================
// CONFIGURAÇÃO DE TAGS
// ============================================
export const rotatingTagConfig = {
  week_offer: {
    label: 'Oferta da semana',
    icon: '🔥',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400'
  },
  limited_time: {
    label: 'Tempo limitado',
    icon: '⏳',
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400'
  },
  few_slots: {
    label: 'Restam poucas vagas',
    icon: '⚠️',
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400'
  }
}

// ============================================
// SIMULAÇÃO DE ROTAÇÃO (baseada em data)
// ============================================

/**
 * Gera uma seed baseada na data atual para rotação determinística
 * Isso garante que todos os usuários vejam as mesmas ofertas no mesmo período
 */
function getDateSeed() {
  const now = new Date()
  // Reset para meia-noite para consistência
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

/**
 * Gerador de números pseudo-aleatórios determinístico
 */
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

/**
 * Calcula quando uma recompensa rotativa expira
 * @param {object} reward - Recompensa rotativa
 * @param {number} startSeed - Seed de início
 * @returns {Date} - Data de expiração
 */
function calculateExpiration(reward, startSeed) {
  const startDate = new Date(startSeed)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + reward.rotationDays)
  return endDate
}

/**
 * Obtém as recompensas rotativas ativas no momento
 * Seleciona 2-3 recompensas do pool baseado na data atual
 * @param {number} userLevelId - Nível do usuário para filtrar
 * @returns {array} - Recompensas rotativas ativas com tempo restante
 */
export function getActiveRotatingRewards(userLevelId = 1) {
  const seed = getDateSeed()
  const now = new Date()

  // Embaralhar pool de forma determinística
  const shuffled = [...rotatingRewardsPool]
    .map((reward, index) => ({
      reward,
      sort: seededRandom(seed + index)
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(item => item.reward)

  // Selecionar 3 recompensas (rotação a cada ciclo)
  const cycleLength = 3 // dias entre rotações parciais
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
  const cycleIndex = Math.floor(dayOfYear / cycleLength) % Math.floor(shuffled.length / 3)

  const startIndex = (cycleIndex * 2) % shuffled.length
  const selectedRewards = []

  for (let i = 0; i < 3; i++) {
    const index = (startIndex + i) % shuffled.length
    selectedRewards.push(shuffled[index])
  }

  // Calcular tempo restante e slots para cada recompensa
  return selectedRewards.map((reward, index) => {
    // Cada recompensa tem seu próprio ciclo de expiração
    const rewardSeed = seed + (index * 1000000)
    const cycleStart = new Date(seed)

    // Ajustar início baseado no índice para escalonar expirações
    cycleStart.setHours(cycleStart.getHours() + (index * 8))

    const expiration = calculateExpiration(reward, cycleStart.getTime())
    const timeRemaining = expiration.getTime() - now.getTime()

    // Se expirou, calcular próximo ciclo
    let finalExpiration = expiration
    if (timeRemaining <= 0) {
      finalExpiration = new Date(expiration)
      finalExpiration.setDate(finalExpiration.getDate() + reward.rotationDays)
    }

    const finalTimeRemaining = Math.max(0, finalExpiration.getTime() - now.getTime())

    // Simular slots restantes (diminui ao longo do tempo se houver limite)
    let remainingSlots = reward.slots
    if (reward.slots) {
      const elapsedRatio = 1 - (finalTimeRemaining / (reward.rotationDays * 24 * 60 * 60 * 1000))
      const slotsUsed = Math.floor(reward.slots * elapsedRatio * 0.7) // 70% max usage
      remainingSlots = Math.max(1, reward.slots - slotsUsed)
    }

    // Verificar se está desbloqueado pelo nível
    const isUnlockedByLevel = userLevelId >= reward.requiredLevel

    return {
      ...reward,
      expiration: finalExpiration,
      timeRemaining: finalTimeRemaining,
      remainingSlots,
      isUnlockedByLevel,
      isRotating: true,
      tagConfig: rotatingTagConfig[reward.tag]
    }
  }).filter(r => r.timeRemaining > 0) // Só retorna se ainda não expirou
}

/**
 * Formata o tempo restante para exibição
 * @param {number} milliseconds - Tempo em milissegundos
 * @returns {object} - Tempo formatado
 */
export function formatTimeRemaining(milliseconds) {
  if (milliseconds <= 0) {
    return { text: 'Expirado', urgent: true, expired: true }
  }

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return {
      text: `${days}d ${hours % 24}h`,
      days,
      hours: hours % 24,
      urgent: days <= 1,
      expired: false
    }
  }

  if (hours > 0) {
    return {
      text: `${hours}h ${minutes % 60}m`,
      hours,
      minutes: minutes % 60,
      urgent: hours <= 6,
      expired: false
    }
  }

  if (minutes > 0) {
    return {
      text: `${minutes}m ${seconds % 60}s`,
      minutes,
      seconds: seconds % 60,
      urgent: true,
      expired: false
    }
  }

  return {
    text: `${seconds}s`,
    seconds,
    urgent: true,
    expired: false
  }
}

/**
 * Verifica se uma recompensa rotativa pode ser resgatada
 * @param {object} reward - Recompensa rotativa
 * @param {number} userPoints - Pontos do usuário
 * @param {number} userLevelId - Nível do usuário
 * @returns {object} - Status de resgate
 */
export function canRedeemRotatingReward(reward, userPoints, userLevelId) {
  const hasEnoughPoints = userPoints >= reward.points_required
  const isUnlockedByLevel = userLevelId >= reward.requiredLevel
  const hasSlots = reward.remainingSlots === null || reward.remainingSlots > 0
  const notExpired = reward.timeRemaining > 0

  return {
    canRedeem: hasEnoughPoints && isUnlockedByLevel && hasSlots && notExpired,
    hasEnoughPoints,
    isUnlockedByLevel,
    hasSlots,
    notExpired,
    pointsNeeded: Math.max(0, reward.points_required - userPoints)
  }
}

/**
 * Obtém próximas recompensas rotativas (preview)
 * @returns {array} - Próximas recompensas que entrarão em rotação
 */
export function getUpcomingRotatingRewards() {
  const seed = getDateSeed()
  const shuffled = [...rotatingRewardsPool]
    .map((reward, index) => ({
      reward,
      sort: seededRandom(seed + index + 1000)
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(item => item.reward)

  // Retorna as próximas 2 que não estão ativas
  const active = getActiveRotatingRewards()
  const activeIds = active.map(r => r.id)

  return shuffled
    .filter(r => !activeIds.includes(r.id))
    .slice(0, 2)
    .map(r => ({
      ...r,
      tagConfig: rotatingTagConfig[r.tag]
    }))
}
