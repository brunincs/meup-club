// ============================================
// MEUP CLUB - LINGUAGEM PREMIUM
// Constantes de texto para experiência de clube exclusivo
// ============================================

// Terminologia do Clube
export const CLUB_TERMS = {
  // Substituições principais
  points: 'benefícios',
  rewards: 'experiências',
  store: 'Catálogo de Experiências',
  balance: 'benefícios disponíveis',
  redeem: 'ativar',
  tasks: 'missões',
  level: 'classe',

  // Ações
  earnPoints: 'acumular benefícios',
  redeemReward: 'ativar experiência',
  levelUp: 'evoluir de classe',

  // Status
  locked: 'em breve',
  unlocked: 'disponível',
  available: 'pronto para ativar',
  completed: 'ativado',
  pending: 'em processamento'
}

// Mensagens do Dashboard
export const DASHBOARD_MESSAGES = {
  welcome: {
    morning: 'Bom dia',
    afternoon: 'Boa tarde',
    evening: 'Boa noite'
  },
  tagline: 'Sua próxima viagem começa antes do embarque.',
  subtitle: 'Bem-vindo ao Meup Club.',
  memberSince: 'Membro desde',
  currentClass: 'Sua classe atual',
  nextClass: 'Próxima classe',
  benefitsAvailable: 'benefícios disponíveis',
  experiencesUnlocked: 'experiências desbloqueadas',
  consecutiveDays: 'dias consecutivos',
  nextExperience: 'Próxima experiência',
  journeyProgress: 'Sua jornada'
}

// Níveis como Classes de Voo
export const CLASS_NAMES = {
  1: {
    name: 'Classe Econômica',
    shortName: 'Economy',
    icon: '✈️',
    color: 'from-slate-400 to-slate-500',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    description: 'Início da sua jornada'
  },
  2: {
    name: 'Premium Economy',
    shortName: 'Premium',
    icon: '🌟',
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    description: 'Conforto elevado'
  },
  3: {
    name: 'Classe Executiva',
    shortName: 'Business',
    icon: '💼',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-600',
    borderColor: 'border-violet-200',
    description: 'Experiência refinada'
  },
  4: {
    name: 'Primeira Classe',
    shortName: 'First',
    icon: '👑',
    color: 'from-amber-400 to-yellow-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    description: 'Exclusividade absoluta'
  },
  5: {
    name: 'Meup Exclusive',
    shortName: 'Exclusive',
    icon: '💎',
    color: 'from-slate-800 to-slate-900',
    bgColor: 'bg-slate-900',
    textColor: 'text-white',
    borderColor: 'border-slate-700',
    description: 'O ápice do privilégio'
  }
}

// Categorias de Experiências
export const EXPERIENCE_CATEGORIES = {
  cash: {
    label: 'Créditos de Viagem',
    icon: '💳',
    description: 'Créditos para usar em qualquer experiência'
  },
  travel: {
    label: 'Upgrades & Voos',
    icon: '✈️',
    description: 'Eleve sua experiência de voo'
  },
  experience: {
    label: 'Experiências Gastronômicas',
    icon: '🍽️',
    description: 'Momentos únicos à mesa'
  },
  premium: {
    label: 'Experiências Premium',
    icon: '⭐',
    description: 'O melhor que podemos oferecer'
  },
  lounge: {
    label: 'Acesso VIP',
    icon: '🛋️',
    description: 'Conforto antes do embarque'
  }
}

// Nomes das Experiências (substituindo rewards)
export const EXPERIENCE_NAMES = {
  // Tier 1
  'Crédito Inicial': {
    name: 'Crédito de Boas-Vindas',
    subtitle: 'Sua primeira conquista',
    description: 'R$30 em créditos para iniciar sua jornada no clube'
  },
  'Crédito Bronze': {
    name: 'Crédito Viajante',
    subtitle: 'Para sua próxima aventura',
    description: 'R$45 em créditos para sua próxima experiência'
  },

  // Tier 2
  'Crédito Prata': {
    name: 'Crédito Explorador',
    subtitle: 'Destinos mais distantes',
    description: 'R$90 em créditos para experiências memoráveis'
  },
  'Upgrade de Assento': {
    name: 'Upgrade de Conforto',
    subtitle: 'Mais espaço, mais conforto',
    description: 'Assento com espaço extra em voos selecionados'
  },

  // Tier 3
  'Crédito Ouro': {
    name: 'Crédito Premium',
    subtitle: 'Experiências extraordinárias',
    description: 'R$180 em créditos para momentos especiais'
  },
  'Jantar Premium': {
    name: 'Experiência Gastronômica',
    subtitle: 'Mesa para dois',
    description: 'Jantar exclusivo em restaurante estrelado'
  },

  // Tier 4
  'Upgrade Classe Executiva': {
    name: 'Upgrade Executivo',
    subtitle: 'Voe como merece',
    description: 'Upgrade para Classe Executiva em voo internacional'
  },
  'Acesso VIP Lounge Anual': {
    name: 'Acesso Lounge Anual',
    subtitle: 'Seu refúgio nos aeroportos',
    description: 'Acesso ilimitado a lounges premium por 12 meses'
  },

  // Tier 5
  'Weekend Exclusivo': {
    name: 'Escapada Exclusiva',
    subtitle: 'Final de semana inesquecível',
    description: 'Aéreo + hotel 5 estrelas para um fim de semana perfeito'
  },
  'Experiência Máxima': {
    name: 'A Grande Experiência',
    subtitle: 'O melhor que oferecemos',
    description: 'Voo executivo + resort all-inclusive por 5 noites'
  }
}

// Badges das Experiências
export const EXPERIENCE_BADGES = {
  hot: { label: 'Popular', color: 'bg-rose-500' },
  new: { label: 'Novidade', color: 'bg-emerald-500' },
  limited: { label: 'Limitado', color: 'bg-amber-500' },
  exclusive: { label: 'Exclusivo', color: 'bg-violet-500' },
  recommended: { label: 'Recomendado', color: 'bg-blue-500' }
}

// Mensagens de Progressão
export const PROGRESSION_MESSAGES = {
  levelUp: (className) => `Parabéns! Você alcançou ${className}`,
  almostThere: (points) => `Apenas ${points} benefícios para a próxima classe`,
  nextExperience: (name) => `Próxima experiência: ${name}`,
  unlocked: (name) => `${name} está disponível para ativação`,
  milestone: (count) => `${count} experiências ativadas`
}

// Seções do Perfil (Passaporte Digital)
export const PROFILE_SECTIONS = {
  header: 'Seu Passaporte',
  memberInfo: 'Informações do Membro',
  class: 'Classe Atual',
  memberSince: 'Membro desde',
  journeys: 'Jornadas Realizadas',
  benefits: 'Benefícios Acumulados',
  experiences: 'Experiências Ativadas',
  ranking: 'Posição no Clube',
  streak: 'Maior Sequência',
  achievements: 'Conquistas'
}

// Missões (substituindo Tasks)
export const MISSION_TYPES = {
  daily: 'Missões do Dia',
  weekly: 'Missões da Semana',
  special: 'Missões Especiais',
  completed: 'Missões Concluídas'
}

export const MISSION_LABELS = {
  complete_profile: 'Complete seu perfil',
  first_referral: 'Faça sua primeira indicação',
  share_social: 'Compartilhe o clube',
  invite_5: 'Convide 5 viajantes',
  monthly_active: 'Mantenha-se ativo',
  review_trip: 'Avalie sua experiência',
  anniversary: 'Aniversário no clube'
}

// Ranking
export const RANKING_LABELS = {
  title: 'Ranking do Clube',
  yourPosition: 'Sua posição',
  topTravelers: 'Principais viajantes',
  benefitsToNext: 'benefícios para o próximo',
  rewardAtGoal: 'Ao alcançar:',
  weeklyProgress: 'Progresso semanal'
}

// Histórico (Timeline)
export const HISTORY_LABELS = {
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

// Botões e CTAs
export const CTA_LABELS = {
  activateExperience: 'Ativar Experiência',
  viewCatalog: 'Ver Catálogo',
  shareCode: 'Compartilhar Código',
  inviteFriend: 'Convidar Viajante',
  viewBenefits: 'Ver Benefícios',
  startMission: 'Iniciar Missão',
  seeAll: 'Ver todos',
  continue: 'Continuar',
  back: 'Voltar'
}

// Função helper para obter saudação baseada na hora
export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return DASHBOARD_MESSAGES.welcome.morning
  if (hour < 18) return DASHBOARD_MESSAGES.welcome.afternoon
  return DASHBOARD_MESSAGES.welcome.evening
}

// Função helper para formatar classe
export function getClassInfo(levelId) {
  return CLASS_NAMES[levelId] || CLASS_NAMES[1]
}

// Função helper para obter nome premium da experiência
export function getExperienceName(originalName) {
  return EXPERIENCE_NAMES[originalName] || {
    name: originalName,
    subtitle: '',
    description: ''
  }
}
