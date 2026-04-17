// Copy Centralizado - Meup Club
// Comunicação premium, elegante e aspiracional
// Variações naturais para evitar repetição

// ============================================
// VARIAÇÕES DE TERMINOLOGIA (evitar repetição)
// ============================================
export const variations = {
  // Alternativas para "benefícios"
  benefits: ['experiências', 'vantagens', 'acessos', 'oportunidades', 'benefícios'],
  // Alternativas para "pontos"
  points: ['créditos', 'progressos', 'avanços'],

  // Função para obter variação aleatória
  get: (type, index = null) => {
    const options = variations[type] || variations.benefits
    if (index !== null) return options[index % options.length]
    return options[Math.floor(Math.random() * options.length)]
  },

  // Variações por contexto
  forContext: {
    dashboard: 'vantagens',
    rewards: 'experiências',
    rotating: 'acessos',
    tasks: 'benefícios',
    profile: 'conquistas'
  }
}

// ============================================
// TERMOS BASE
// ============================================
export const terms = {
  points: 'créditos acumulados',
  pointsShort: 'créditos',
  rewards: 'experiências',
  ranking: 'posição',
  missions: 'ações disponíveis',
  earn: 'acumular',
  redeem: 'ativar',
  tasks: 'ações',
  streak: 'consistência',
  level: 'nível',
  referral: 'convite',
  referrals: 'convites',
  profile: 'seu espaço',
  dashboard: 'início'
}

// ============================================
// SAUDAÇÕES SOFISTICADAS
// ============================================
export const greetings = {
  welcome: (name) => `Bem-vinda, ${name}`,
  welcomeNeutral: (name) => `Bem-vindo, ${name}`,
  moment: 'Seu momento atual',
  subtitle: 'Sua evolução no clube'
}

// ============================================
// MENSAGENS DE PROGRESSO (sofisticadas)
// ============================================
export const progress = {
  // Variações sofisticadas (evitar "continue assim")
  motivational: [
    'Seu progresso segue ativo',
    'Você está em movimento',
    'Evolução consistente',
    'Trajetória ascendente',
    'Caminho de conquistas'
  ],
  getMotivational: () => {
    const options = progress.motivational
    return options[Math.floor(Math.random() * options.length)]
  },

  closeToUnlock: 'Próxima de novas experiências',
  closeToUnlockNeutral: 'Próximo de novas experiências',
  toNextLevel: (points) => `${points.toLocaleString('pt-BR')} para evoluir`,
  toNextPosition: (name) => `Supere ${name} para avançar`,
  almostThere: 'Quase lá',
  keepGoing: 'Continue evoluindo',

  // Indicadores de conquista
  unlockedCount: (n) => `${n} ${n === 1 ? 'experiência desbloqueada' : 'experiências desbloqueadas'}`,
  usedCount: (n) => `${n} ${n === 1 ? 'vantagem aproveitada' : 'vantagens aproveitadas'}`,
  activeFor: (n) => `Ativa há ${n} dias`
}

// ============================================
// BOTÕES E AÇÕES (variadas)
// ============================================
export const buttons = {
  // Variações de ação principal
  actions: ['Ativar', 'Aproveitar', 'Explorar', 'Usar', 'Acessar'],
  getAction: (index = 0) => buttons.actions[index % buttons.actions.length],

  // Ações específicas
  activate: 'Ativar',
  enjoy: 'Aproveitar',
  explore: 'Explorar',
  use: 'Usar',
  access: 'Acessar',

  // Navegação
  continueEvolving: 'Continuar evoluindo',
  unlockExperiences: 'Desbloquear experiências',
  discoverMore: 'Descobrir mais',
  seeAll: 'Ver tudo',
  exploreMore: 'Explorar',
  back: 'Voltar',
  confirm: 'Confirmar',
  cancel: 'Cancelar',

  // Ações de convite
  copyAccess: 'Copiar',
  shareInvite: 'Compartilhar',
  completeAction: 'Concluir'
}

// ============================================
// EXPERIÊNCIAS (RECOMPENSAS) - linguagem premium
// ============================================
export const benefits = {
  title: 'Suas experiências',
  showcaseTitle: 'Escolha sua próxima experiência',
  showcaseSubtitle: 'Acessos exclusivos selecionados para você',

  // Status variados
  available: 'Disponível',
  locked: 'Em breve',
  lockedByLevel: (level) => `A partir do nível ${level}`,
  nextLevel: 'Próximo nível',
  activating: 'Ativando',
  activated: 'Ativado com sucesso',
  inProgress: 'Em andamento',
  accumulating: 'Acumulando',

  // Crédito
  creditAvailable: 'Crédito disponível',
  creditDescription: 'Utilize da forma que preferir.',
  valueAvailable: 'Valor liberado',

  // Tempo limitado - mensagens de exclusividade
  limitedTime: 'Por tempo limitado',
  weekOffer: 'Selecionado para você',
  fewSpots: 'Acesso especial',
  expiresIn: 'Disponível por mais',
  exclusive: 'Exclusivo',
  selectedForYou: 'Preparado para você',
  specialAccess: 'Acesso privilegiado',

  // Contadores de conquista
  alreadyUnlocked: (n) => `Você já desbloqueou ${n} experiências`,
  alreadyUsed: (n) => `${n} vantagens aproveitadas`
}

// ============================================
// AÇÕES (TASKS) - linguagem natural
// ============================================
export const actions = {
  title: 'Ações disponíveis',
  subtitle: 'Oportunidades de evolução',
  daily: 'Diárias',
  weekly: 'Semanais',
  oneTime: 'Especiais',
  completed: 'Concluída',
  pending: 'Disponível',
  pointsFormat: (pts) => `+${pts} créditos`,
  dailyAccess: 'Acesso diário',
  shareCode: 'Compartilhar convite',
  checkRewards: 'Explorar experiências',
  checkRanking: 'Ver posição'
}

// ============================================
// POSIÇÃO - linguagem elegante
// ============================================
export const position = {
  title: 'Sua posição',
  subtitle: 'Entre os membros do clube',
  yourPosition: 'Posição atual',
  closeToAdvance: 'Próxima de avançar',
  closeToAdvanceNeutral: 'Próximo de avançar',
  weeklyReset: 'Atualização semanal',
  general: 'Geral',
  weekly: 'Semanal',
  membersSuffix: 'membros',
  toAdvance: 'para avançar',
  climbing: 'Em ascensão',
  stable: 'Estável',
  topPerformer: 'Destaque'
}

// ============================================
// CONSISTÊNCIA (STREAK) - tom natural
// ============================================
export const consistency = {
  title: 'Sua consistência',
  days: (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`,
  daysConsecutive: (n) => `${n} dias consecutivos`,
  activeFor: (n) => `Ativa há ${n} dias`,
  activeForNeutral: (n) => `Ativo há ${n} dias`,
  keepIt: 'Mantenha seu ritmo',
  bonus: 'Bônus de consistência',
  milestone: 'Próximo marco',
  record: 'Seu melhor'
}

// ============================================
// ATIVIDADE - tom discreto e elegante
// ============================================
export const activity = {
  title: 'Atividade recente',
  newActivity: 'Nova atividade',
  experienceActivated: 'Nova experiência ativada',
  benefitActivated: (name) => `${name} ativou uma experiência`,
  levelUp: (name, level) => `${name} evoluiu para ${level}`,
  newInvite: (name) => `${name} fez um convite`,
  consistency: (name, days) => `${name} mantém ${days} dias de consistência`,
  topPosition: (name) => `${name} está em destaque`,
  live: 'Agora'
}

// ============================================
// NÍVEIS - nomes premium
// ============================================
export const levels = {
  names: {
    1: 'Início',
    2: 'Descoberta',
    3: 'Experiência',
    4: 'Destaque',
    5: 'Excelência'
  },
  unlockNew: 'Desbloqueia novas experiências',
  current: 'Seu nível',
  next: 'Próximo',
  perks: 'Vantagens exclusivas'
}

// ============================================
// ALERTAS - tom suave
// ============================================
export const alerts = {
  success: 'Pronto',
  error: 'Algo não funcionou',
  copied: 'Copiado',
  linkCopied: 'Link copiado',
  benefitActivated: 'Experiência ativada',
  actionCompleted: 'Ação concluída',
  tryAgain: 'Tente novamente',
  loading: 'Carregando'
}

// ============================================
// PERFIL - linguagem pessoal
// ============================================
export const profile = {
  title: 'Seu espaço',
  status: 'Seu status',
  evolution: 'Sua evolução',
  history: 'Histórico',
  benefitsOrigin: 'Origem dos créditos',
  statistics: 'Números',
  achievements: 'Conquistas',
  memberSince: 'Membro desde'
}

// ============================================
// CONVITES
// ============================================
export const invites = {
  title: 'Convites',
  code: 'Seu código',
  copyCode: 'Copiar',
  shareInvite: 'Compartilhar',
  inviteSent: 'Convite enviado',
  history: 'Histórico',
  pending: 'Aguardando',
  converted: 'Convertido',
  benefits: 'Créditos gerados'
}

// ============================================
// MENSAGENS MOTIVACIONAIS SOFISTICADAS
// ============================================
export const motivation = {
  closeToLevel: 'Sua evolução está próxima',
  closeToPosition: 'Você está em ascensão',
  consistency: 'Sua dedicação faz diferença',
  general: 'Aproveite suas vantagens exclusivas',

  // Variações contextuais
  dashboard: [
    'Seu progresso está ativo',
    'Evolução em andamento',
    'Trajetória consistente'
  ],
  getDashboard: () => {
    const options = motivation.dashboard
    return options[Math.floor(Math.random() * options.length)]
  }
}

// ============================================
// FORMATADORES
// ============================================
export const format = {
  points: (n) => `${n.toLocaleString('pt-BR')} créditos`,
  pointsShort: (n) => n.toLocaleString('pt-BR'),
  currency: (n) => `R$ ${n.toLocaleString('pt-BR')}`,
  percentage: (n) => `${Math.round(n)}%`,
  time: {
    days: (n) => `${n}d`,
    hours: (n) => `${n}h`,
    minutes: (n) => `${n}min`,
    daysHours: (d, h) => `${d}d ${h}h`
  }
}

// ============================================
// HELPER: Obter variação por índice
// ============================================
export function getVariation(type, index) {
  return variations.get(type, index)
}

// ============================================
// HELPER: Texto contextual
// ============================================
export function getContextualTerm(context) {
  return variations.forContext[context] || 'experiências'
}
