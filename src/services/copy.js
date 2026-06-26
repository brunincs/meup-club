// Copy Centralizado - Meup Club
// Comunicação premium, elegante e aspiracional
// Inspirado em: Amex Platinum, Nomad, XP Visa Infinite, LATAM Pass Black

// ============================================
// CLASSES DE VOO (NÍVEIS)
// ============================================
export const levels = {
  names: {
    1: 'Classe Econômica',
    2: 'Premium Economy',
    3: 'Classe Executiva',
    4: 'Primeira Classe',
    5: 'Meup Exclusive'
  },
  shortNames: {
    1: 'Economy',
    2: 'Premium',
    3: 'Business',
    4: 'First',
    5: 'Exclusive'
  },
  icons: {
    1: '✈️',
    2: '🌟',
    3: '💼',
    4: '👑',
    5: '💎'
  },
  descriptions: {
    1: 'Início da sua jornada',
    2: 'Conforto elevado',
    3: 'Experiência refinada',
    4: 'Exclusividade absoluta',
    5: 'O ápice do privilégio'
  },
  unlockNew: 'Desbloqueia novas experiências',
  current: 'Sua classe',
  next: 'Próxima classe',
  perks: 'Privilégios exclusivos'
}

// ============================================
// VARIAÇÕES DE TERMINOLOGIA
// ============================================
export const variations = {
  benefits: ['experiências', 'privilégios', 'vantagens', 'acessos'],
  points: ['benefícios', 'progressos', 'conquistas'],

  get: (type, index = null) => {
    const options = variations[type] || variations.benefits
    if (index !== null) return options[index % options.length]
    return options[Math.floor(Math.random() * options.length)]
  },

  forContext: {
    dashboard: 'privilégios',
    rewards: 'experiências',
    ranking: 'conquistas',
    tasks: 'missões',
    profile: 'jornada'
  }
}

// ============================================
// TERMOS BASE
// ============================================
export const terms = {
  points: 'benefícios acumulados',
  pointsShort: 'benefícios',
  rewards: 'experiências',
  ranking: 'posição no clube',
  missions: 'missões disponíveis',
  earn: 'acumular',
  redeem: 'ativar',
  tasks: 'missões',
  streak: 'dias consecutivos',
  level: 'classe',
  referral: 'indicação',
  referrals: 'indicações',
  profile: 'passaporte',
  dashboard: 'clube'
}

// ============================================
// SAUDAÇÕES - CONCIERGE DE VIAGENS
// ============================================
export const greetings = {
  welcome: (name) => `${name}`,
  tagline: 'Sua próxima viagem começa antes do embarque.',
  subtitle: 'Bem-vindo ao Meup Club.',
  moment: 'Seu momento no clube',

  // Saudações por período
  morning: 'Bom dia',
  afternoon: 'Boa tarde',
  evening: 'Boa noite',

  getGreeting: () => {
    const hour = new Date().getHours()
    if (hour < 12) return greetings.morning
    if (hour < 18) return greetings.afternoon
    return greetings.evening
  }
}

// ============================================
// MENSAGENS DE PROGRESSÃO (JORNADA)
// ============================================
export const progress = {
  motivational: [
    'Sua jornada continua',
    'Evolução em andamento',
    'Sua trajetória no clube',
    'Rumo à próxima classe'
  ],
  getMotivational: () => {
    const options = progress.motivational
    return options[Math.floor(Math.random() * options.length)]
  },

  closeToUnlock: 'Próximo de novas experiências',
  toNextLevel: (points) => `${points.toLocaleString('pt-BR')} benefícios para a próxima classe`,
  toNextPosition: (name) => `Supere ${name} para avançar`,
  almostThere: 'Quase lá',
  keepGoing: 'Continue sua jornada',

  // Indicadores de conquista
  unlockedCount: (n) => `${n} ${n === 1 ? 'experiência disponível' : 'experiências disponíveis'}`,
  usedCount: (n) => `${n} ${n === 1 ? 'experiência ativada' : 'experiências ativadas'}`,
  activeFor: (n) => `${n} dias consecutivos`
}

// ============================================
// BOTÕES E AÇÕES
// ============================================
export const buttons = {
  actions: ['Ativar', 'Acessar', 'Explorar', 'Desbloquear'],
  getAction: (index = 0) => buttons.actions[index % buttons.actions.length],

  // Ações específicas
  activate: 'Ativar Experiência',
  enjoy: 'Aproveitar',
  explore: 'Explorar Catálogo',
  access: 'Acessar',

  // Navegação
  continueJourney: 'Continuar jornada',
  unlockExperiences: 'Ver Experiências',
  viewCatalog: 'Catálogo de Experiências',
  seeAll: 'Ver todos',
  exploreMore: 'Explorar',
  back: 'Voltar',
  confirm: 'Confirmar',
  cancel: 'Cancelar',

  // Ações de convite
  copyCode: 'Copiar código',
  shareInvite: 'Compartilhar',
  inviteTraveler: 'Convidar viajante'
}

// ============================================
// CATÁLOGO DE EXPERIÊNCIAS
// ============================================
export const benefits = {
  title: 'Catálogo de Experiências',
  showcaseTitle: 'Experiências Exclusivas',
  showcaseSubtitle: 'Privilégios selecionados para membros do clube',

  // Status
  available: 'Disponível',
  locked: 'Em breve',
  lockedByLevel: (level) => `Disponível a partir de ${levels.names[level]}`,
  nextLevel: 'Próxima classe',
  activating: 'Ativando',
  activated: 'Experiência ativada',
  inProgress: 'Em processamento',

  // Crédito
  creditAvailable: 'Créditos disponíveis',
  creditDescription: 'Use em qualquer experiência',
  valueAvailable: 'Valor liberado',

  // Exclusividade
  limitedTime: 'Por tempo limitado',
  exclusive: 'Exclusivo',
  selectedForYou: 'Selecionado para você',
  specialAccess: 'Acesso privilegiado',
  fewSpots: 'Vagas limitadas',

  // Contadores
  alreadyUnlocked: (n) => `${n} experiências desbloqueadas`,
  alreadyUsed: (n) => `${n} experiências ativadas`
}

// ============================================
// MISSÕES (TASKS)
// ============================================
export const missions = {
  title: 'Missões',
  subtitle: 'Acumule benefícios completando missões',
  daily: 'Missões do Dia',
  weekly: 'Missões da Semana',
  special: 'Missões Especiais',
  completed: 'Concluída',
  pending: 'Disponível',
  inProgress: 'Em andamento',
  benefitsFormat: (pts) => `+${pts} benefícios`,
  startMission: 'Iniciar missão'
}

// Alias para compatibilidade
export const actions = missions

// ============================================
// RANKING DO CLUBE
// ============================================
export const position = {
  title: 'Ranking do Clube',
  subtitle: 'Principais viajantes',
  yourPosition: 'Sua posição',
  closeToAdvance: 'Próximo de avançar',
  weeklyReset: 'Atualização semanal',
  general: 'Geral',
  weekly: 'Semanal',
  membersSuffix: 'membros',
  toAdvance: 'benefícios para o próximo',
  climbing: 'Subindo',
  stable: 'Estável',
  topPerformer: 'Destaque',
  rewardAtGoal: 'Ao alcançar:'
}

// ============================================
// CONSISTÊNCIA (STREAK)
// ============================================
export const consistency = {
  title: 'Dias Consecutivos',
  days: (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`,
  daysConsecutive: (n) => `${n} dias consecutivos`,
  activeFor: (n) => `${n} dias ativos`,
  keepIt: 'Mantenha sua sequência',
  bonus: 'Bônus de consistência',
  milestone: 'Próximo marco',
  record: 'Seu recorde'
}

// ============================================
// HISTÓRICO (TIMELINE)
// ============================================
export const history = {
  title: 'Sua Jornada',
  today: 'Hoje',
  yesterday: 'Ontem',
  thisWeek: 'Esta semana',
  thisMonth: 'Este mês',
  earlier: 'Anteriormente',

  // Tipos de eventos
  purchase: 'Compra confirmada',
  experienceActivated: 'Experiência ativada',
  referralApproved: 'Indicação aprovada',
  levelUp: 'Nova classe alcançada',
  benefitsEarned: 'Benefícios recebidos'
}

// ============================================
// ATIVIDADE DO CLUBE
// ============================================
export const activity = {
  title: 'Atividade do Clube',
  newActivity: 'Nova atividade',
  experienceActivated: 'Nova experiência ativada',
  benefitActivated: (name) => `${name} ativou uma experiência`,
  levelUp: (name, level) => `${name} alcançou ${level}`,
  newInvite: (name) => `${name} fez uma indicação`,
  consistency: (name, days) => `${name} mantém ${days} dias consecutivos`,
  topPosition: (name) => `${name} está em destaque`,
  live: 'Agora'
}

// ============================================
// ALERTAS
// ============================================
export const alerts = {
  success: 'Pronto',
  error: 'Algo não funcionou',
  copied: 'Copiado',
  linkCopied: 'Código copiado',
  benefitActivated: 'Experiência ativada com sucesso',
  actionCompleted: 'Missão concluída',
  tryAgain: 'Tente novamente',
  loading: 'Carregando'
}

// ============================================
// PERFIL (PASSAPORTE DIGITAL)
// ============================================
export const profile = {
  title: 'Seu Passaporte',
  header: 'Passaporte Digital',
  status: 'Sua classe',
  evolution: 'Sua jornada',
  history: 'Histórico',
  benefitsOrigin: 'Origem dos benefícios',
  statistics: 'Estatísticas',
  achievements: 'Conquistas',
  memberSince: 'Membro desde',
  journeys: 'Jornadas realizadas',
  experiences: 'Experiências ativadas',
  ranking: 'Posição no clube',
  streak: 'Maior sequência'
}

// ============================================
// INDICAÇÕES
// ============================================
export const invites = {
  title: 'Indicações',
  subtitle: 'Convide viajantes para o clube',
  code: 'Seu código exclusivo',
  copyCode: 'Copiar',
  shareInvite: 'Compartilhar',
  inviteSent: 'Indicação enviada',
  history: 'Histórico de indicações',
  pending: 'Aguardando',
  converted: 'Aprovada',
  benefits: 'Benefícios gerados'
}

// ============================================
// MENSAGENS MOTIVACIONAIS
// ============================================
export const motivation = {
  closeToLevel: 'Próximo da nova classe',
  closeToPosition: 'Em ascensão no clube',
  consistency: 'Sua dedicação faz diferença',
  general: 'Aproveite seus privilégios exclusivos',

  dashboard: [
    'Sua próxima viagem começa aqui',
    'Privilégios esperando por você',
    'Continue sua jornada no clube'
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
  points: (n) => `${n.toLocaleString('pt-BR')} benefícios`,
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
// HELPERS
// ============================================
export function getVariation(type, index) {
  return variations.get(type, index)
}

export function getContextualTerm(context) {
  return variations.forContext[context] || 'experiências'
}

export function getClassName(levelId) {
  return levels.names[levelId] || levels.names[1]
}

export function getClassIcon(levelId) {
  return levels.icons[levelId] || levels.icons[1]
}
