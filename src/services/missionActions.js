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
// Valor: { type, route, external, requiresApproval }
export const MISSION_ACTIONS = {
  // === MISSÕES INTERNAS (navegam dentro do site) ===
  'completar perfil': {
    type: 'internal',
    route: '/perfil',
    label: 'Ir ao Perfil',
    requiresApproval: false // Pode verificar automaticamente
  },
  'explorar experiências': {
    type: 'internal',
    route: '/recompensas',
    label: 'Ver Experiências',
    requiresApproval: false
  },
  'compartilhar código': {
    type: 'share',
    route: null, // Ação especial de compartilhamento
    label: 'Compartilhar',
    requiresApproval: false
  },
  'compartilhar 3 vezes': {
    type: 'share',
    route: null,
    label: 'Compartilhar',
    requiresApproval: true // Não dá pra verificar automaticamente
  },
  'indicar': {
    type: 'internal',
    route: '/dashboard', // Seção de indicação no dashboard
    label: 'Indicar Amigos',
    requiresApproval: false // Sistema verifica automaticamente
  },
  'primeira indicação': {
    type: 'internal',
    route: '/dashboard',
    label: 'Indicar Amigos',
    requiresApproval: false
  },
  'indicações': {
    type: 'internal',
    route: '/dashboard',
    label: 'Indicar Amigos',
    requiresApproval: false
  },

  // === MISSÕES EXTERNAS (abrem em nova aba, requerem aprovação) ===
  'seguir no instagram': {
    type: 'external',
    route: EXTERNAL_LINKS.instagram,
    label: 'Seguir',
    requiresApproval: true // Admin precisa aprovar
  },
  'avaliar no google': {
    type: 'external',
    route: EXTERNAL_LINKS.google_review,
    label: 'Avaliar',
    requiresApproval: true // Admin precisa aprovar
  },

  // === MISSÕES DE CONVERSÃO (dependem de vendas reais) ===
  'primeira venda': {
    type: 'internal',
    route: '/dashboard',
    label: 'Ver Indicações',
    requiresApproval: false // Sistema verifica automaticamente
  },
  'converter': {
    type: 'internal',
    route: '/dashboard',
    label: 'Ver Indicações',
    requiresApproval: false
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

  // Fallback: rota padrão para missões
  return {
    type: 'internal',
    route: '/tarefas',
    label: 'Ver Missões',
    requiresApproval: true
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
 * @param {string} missionName - Nome da missão
 * @returns {boolean}
 */
export function requiresApproval(missionName) {
  const action = getMissionAction(missionName)
  return action?.requiresApproval ?? true
}
