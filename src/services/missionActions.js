// ============================================
// CONFIGURAÇÃO DE AÇÕES DAS MISSÕES - Meup Club
// Links externos e rotas internas para cada missão
// ============================================

// Links externos (abrem em nova aba)
// FÁCIL DE EDITAR: mude aqui quando precisar atualizar os links
export const EXTERNAL_LINKS = {
  instagram: 'https://www.instagram.com/meup.viagens/',
  google_review: 'https://share.google/36FFEc6vFwKCR1dxo'
}

// Mapeamento de missões para ações
// Chave: nome da tarefa (normalizado) ou parte do nome
// Valor: { type, route, label, requiresApproval, isAutomatic }
//
// IMPORTANTE:
// - requiresApproval: true = mostra botão "Fiz isso" e vai pra fila do admin
// - requiresApproval: false = NÃO mostra "Fiz isso", credita automaticamente
// - isAutomatic: true = credita via trigger no banco, sem ação do usuário
export const MISSION_ACTIONS = {
  // === CHECK-IN (tem card dedicado, não deve aparecer como missão) ===
  'check-in': {
    type: 'checkin',
    route: null,
    label: 'Fazer Check-in',
    requiresApproval: false,
    isAutomatic: false,
    hideFromList: true // Não mostrar na lista de missões
  },

  // === MISSÕES AUTOMÁTICAS (creditam via TRIGGER no banco) ===
  'completar perfil': {
    type: 'automatic',
    route: '/perfil',
    label: 'Ir ao Perfil',
    requiresApproval: false,
    isAutomatic: true // Trigger credita quando perfil completo
  },
  'primeira indicação': {
    type: 'automatic',
    route: '/dashboard',
    label: 'Indicar Amigos',
    requiresApproval: false,
    isAutomatic: true // Trigger credita quando total_referrals = 1
  },
  '10 indicações': {
    type: 'automatic',
    route: '/dashboard',
    label: 'Indicar Amigos',
    requiresApproval: false,
    isAutomatic: true // Trigger credita quando total_referrals >= 10
  },
  'classe': {
    type: 'automatic',
    route: '/dashboard',
    label: 'Ver Progresso',
    requiresApproval: false,
    isAutomatic: true // Trigger credita quando atinge nível
  },

  // === AÇÕES (creditam na hora ao fazer, sem aprovação) ===
  'explorar experiências': {
    type: 'action',
    route: '/recompensas',
    label: 'Ver Experiências',
    requiresApproval: false,
    isAutomatic: false // Credita via RPC ao visitar página
  },
  'compartilhar código': {
    type: 'share',
    route: null,
    label: 'Compartilhar',
    requiresApproval: false,
    isAutomatic: false,
    hideFromList: true // Removido - fácil demais, gameável
  },

  // === INDICAÇÕES (sistema verifica automaticamente) ===
  'indicar': {
    type: 'internal',
    route: '/dashboard',
    label: 'Indicar Amigos',
    requiresApproval: false,
    isAutomatic: true
  },
  'indicações': {
    type: 'internal',
    route: '/dashboard',
    label: 'Indicar Amigos',
    requiresApproval: false,
    isAutomatic: true
  },

  // === EXTERNAS (únicas que precisam de aprovação do admin) ===
  'seguir no instagram': {
    type: 'external',
    route: EXTERNAL_LINKS.instagram,
    label: 'Seguir',
    requiresApproval: true, // ÚNICA que vai pra fila do admin
    isAutomatic: false
  },
  'instagram': {
    type: 'external',
    route: EXTERNAL_LINKS.instagram,
    label: 'Seguir',
    requiresApproval: true,
    isAutomatic: false
  },
  'avaliar no google': {
    type: 'external',
    route: EXTERNAL_LINKS.google_review,
    label: 'Avaliar',
    requiresApproval: true, // ÚNICA que vai pra fila do admin
    isAutomatic: false
  },
  'google': {
    type: 'external',
    route: EXTERNAL_LINKS.google_review,
    label: 'Avaliar',
    requiresApproval: true,
    isAutomatic: false
  },

  // === VENDAS (sistema verifica automaticamente) ===
  'primeira venda': {
    type: 'automatic',
    route: '/dashboard',
    label: 'Ver Indicações',
    requiresApproval: false,
    isAutomatic: true
  },
  'converter': {
    type: 'automatic',
    route: '/dashboard',
    label: 'Ver Indicações',
    requiresApproval: false,
    isAutomatic: true
  }
}

/**
 * Encontra a ação correspondente a uma missão pelo nome
 * @param {string} missionName - Nome da missão
 * @returns {object|null} Configuração da ação ou null
 */
export function getMissionAction(missionName) {
  if (!missionName) return null

  const normalizedName = missionName.toLowerCase().trim()

  // Busca exata primeiro
  if (MISSION_ACTIONS[normalizedName]) {
    return MISSION_ACTIONS[normalizedName]
  }

  // Busca parcial (ex: "Indicar 2 pessoas" casa com "indicar")
  for (const [key, action] of Object.entries(MISSION_ACTIONS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return action
    }
  }

  // Fallback: rota padrão - NÃO requer aprovação por padrão
  // Só Instagram e Google (configurados acima) vão pra fila do admin
  return {
    type: 'internal',
    route: '/tarefas',
    label: 'Ver Missões',
    requiresApproval: false,
    isAutomatic: false
  }
}

/**
 * Verifica se a missão é externa (requer aprovação manual)
 * @param {string} missionName - Nome da missão
 * @returns {boolean}
 */
export function isExternalMission(missionName) {
  const action = getMissionAction(missionName)
  return action?.type === 'external'
}

/**
 * Verifica se a missão requer aprovação do admin
 * SÓ retorna true para Instagram e Google
 * @param {string} missionName - Nome da missão
 * @returns {boolean}
 */
export function requiresApproval(missionName) {
  const action = getMissionAction(missionName)
  return action?.requiresApproval ?? false // Padrão: NÃO requer aprovação
}

/**
 * Verifica se a missão é automática (credita via trigger, sem ação do usuário)
 * @param {string} missionName - Nome da missão
 * @returns {boolean}
 */
export function isAutomaticMission(missionName) {
  const action = getMissionAction(missionName)
  return action?.isAutomatic ?? false
}

/**
 * Verifica se a missão deve ser escondida da lista (ex: check-in tem card dedicado)
 * @param {string} missionName - Nome da missão
 * @returns {boolean}
 */
export function shouldHideFromList(missionName) {
  const action = getMissionAction(missionName)
  return action?.hideFromList ?? false
}
