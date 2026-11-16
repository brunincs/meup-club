import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useUserLevel } from '@/hooks/useUserLevel'
import { usePWA } from '@/hooks/usePWA'
import { DashboardHeader } from '@/components/dashboard'
import { CustomSelect } from '@/components/ui'
import { PushDeniedHelp } from '@/components/pwa'
import {
  updateUserProfile,
  fetchReferralStats,
  fetchApprovedTasks,
  fetchRedeemedExperiences,
  fetchRecentActivity,
  fetchAllTransactions,
  maskCPF,
  formatCPF,
  formatPhone,
  formatMemberSince,
  isValidCPFFormat
} from '@/services/passportService'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  subscribeToPush,
  unsubscribeFromPush
} from '@/services/pushService'
import { levels as levelCopy, format } from '@/services/copy'
import {
  SunIcon,
  BriefcaseIcon,
  MountainIcon,
  HeartIcon,
  FamilyIcon,
  MuseumIcon,
  LockIcon,
  GlobeIcon,
  ClipboardIcon,
  TargetIcon,
  CheckIcon,
  StarIcon,
  getClassIcon
} from '@/components/ui/Icons'
import toast from 'react-hot-toast'

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES E UTILITÁRIOS
// ══════════════════════════════════════════════════════════════════════════════

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

const TRAVEL_TYPES = [
  { id: 'lazer', label: 'Lazer', Icon: SunIcon },
  { id: 'negocios', label: 'Negócios', Icon: BriefcaseIcon },
  { id: 'aventura', label: 'Aventura', Icon: MountainIcon },
  { id: 'romantico', label: 'Romântico', Icon: HeartIcon },
  { id: 'familia', label: 'Família', Icon: FamilyIcon },
  { id: 'cultural', label: 'Cultural', Icon: MuseumIcon }
]

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: CABEÇALHO DO PASSAPORTE
// ══════════════════════════════════════════════════════════════════════════════

// Verifica se perfil está completo (dados principais preenchidos)
function isProfileComplete(profile) {
  if (!profile) return false
  const { name, phone, city, state, birth_date } = profile
  return !!(name?.trim() && phone?.trim() && city?.trim() && state?.trim() && birth_date)
}

function PassportHeader({ profile, levelData, userPoints }) {
  const userName = profile?.name || 'Viajante'
  const currentLevelId = levelData?.current?.id ?? 1
  const memberSince = formatMemberSince(profile?.created_at)
  const profileComplete = isProfileComplete(profile)

  return (
    <div className="relative">
      {/* Fundo decorativo com padrão de passaporte */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#32113f] via-[#5c005a] to-[#32113f]" />
        {/* Padrão sutil de "selos" */}
        <div className="absolute top-4 right-4 w-24 h-24 rounded-full border border-[#a27937]/20 opacity-30" />
        <div className="absolute top-8 right-8 w-16 h-16 rounded-full border border-[#a27937]/20 opacity-20" />
        <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full border-2 border-dashed border-[#a27937]/10 opacity-30" />
      </div>

      <div className="relative p-6 md:p-8">
        {/* Título do passaporte */}
        <div className="text-center mb-6">
          <h2 className="font-display text-lg text-[#edf0f1] tracking-wide">
            PASSAPORTE ME,UP CLUB
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#ddd1d0]/60 mt-1">
            Sua jornada de viagens
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Foto tipo documento */}
          <div className="relative flex-shrink-0">
            <div className="w-28 h-36 md:w-32 md:h-40 rounded-lg bg-[#edf0f1]/10 border-2 border-[#a27937]/30 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Foto"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#edf0f1]/40">
                  <span className="text-4xl mb-1">
                    {userName?.charAt(0)?.toUpperCase() || 'V'}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider">Foto</span>
                </div>
              )}
            </div>
            {/* Badge de classe */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#a27937] text-[#1f1f1f] text-[10px] font-medium uppercase tracking-wider whitespace-nowrap">
              {levelCopy.shortNames[currentLevelId]}
            </div>
          </div>

          {/* Dados do passaporte */}
          <div className="flex-1 text-center md:text-left">
            <div className="mb-4">
              <p className="text-[9px] uppercase tracking-wider text-[#a39695] mb-1">
                Nome / Name
              </p>
              <h1 className="font-display text-2xl md:text-3xl text-[#edf0f1] font-light">
                {userName}
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#a39695] mb-1">
                  Classe / Class
                </p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const ClassIcon = getClassIcon(currentLevelId)
                    return <ClassIcon size={18} color="#a27937" />
                  })()}
                  <span className="text-sm text-[#ddd1d0]">{levelCopy.names[currentLevelId]}</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#a39695] mb-1">
                  Membro desde / Member since
                </p>
                <p className="text-sm text-[#ddd1d0] first-letter:uppercase">{memberSince}</p>
              </div>
            </div>

            {/* Indicador de perfil completo */}
            {profileComplete && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30">
                <CheckIcon size={14} color="#22c55e" />
                <span className="text-xs text-[#22c55e] font-medium">Perfil completo</span>
              </div>
            )}
          </div>

          {/* Pontos acumulados */}
          <div className="text-center md:text-right flex-shrink-0">
            <p className="text-[9px] uppercase tracking-wider text-[#a39695] mb-1">
              PONTOS
            </p>
            <p className="font-display text-4xl md:text-5xl text-[#a27937] font-light">
              {format.pointsShort(userPoints)}
            </p>
          </div>
        </div>

        {/* Linha decorativa */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#a27937]/30 to-transparent" />
          <span className="text-[#a27937]/40 text-lg">✈</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#a27937]/30 to-transparent" />
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: ESTATÍSTICAS REAIS (FUNDO CLARO)
// ══════════════════════════════════════════════════════════════════════════════

function RealStats({ stats, levelData }) {
  const currentLevelId = levelData?.current?.id ?? 1
  const ClassIcon = getClassIcon(currentLevelId)

  const statItems = [
    {
      label: 'Indicações',
      value: stats.referrals?.total ?? 0,
      subvalue: stats.referrals?.total > 0 ? `${stats.referrals.approved} aprovadas` : 'Nenhuma ainda',
      IconComponent: () => (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#5c005a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L20 12L12 22L4 12L12 2Z" />
        </svg>
      )
    },
    {
      label: 'Classe Atual',
      value: levelCopy.shortNames[currentLevelId],
      subvalue: levelData?.next ? `${levelData.progress}% para próxima` : 'Nível máximo',
      IconComponent: () => <ClassIcon size={16} color="#5c005a" />
    },
    {
      label: 'Tarefas',
      value: stats.tasks?.total ?? 0,
      subvalue: stats.tasks?.total > 0 ? `+${format.pointsShort(stats.tasks.points)} pts` : 'Nenhuma concluída',
      IconComponent: () => <CheckIcon size={16} color="#5c005a" />
    },
    {
      label: 'Experiências',
      value: stats.experiences?.total ?? 0,
      subvalue: stats.experiences?.total > 0 ? 'resgatadas' : 'Nenhuma ainda',
      IconComponent: () => <StarIcon size={16} color="#5c005a" />
    }
  ]

  return (
    <div className="rounded-2xl bg-[#edf0f1] p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="p-4 rounded-xl bg-white border border-[#ddd1d0]/50 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.IconComponent />
              <span className="text-[10px] uppercase tracking-wider text-[#a39695]">
                {stat.label}
              </span>
            </div>
            <p className="text-xl font-light text-[#32113f]">{stat.value}</p>
            <p className="text-xs text-[#a39695] mt-1">{stat.subvalue}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: FORMULÁRIO DE EDIÇÃO
// ══════════════════════════════════════════════════════════════════════════════

function EditProfileForm({ profile, onSave, saving }) {
  const [form, setForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    state: profile?.state || '',
    birth_date: profile?.birth_date || '',
    cpf: profile?.cpf || '',
    dream_destinations: profile?.dream_destinations || '',
    travel_preferences: profile?.travel_preferences || ''
  })

  const [showCPF, setShowCPF] = useState(false)
  const [errors, setErrors] = useState({})

  // Atualizar form quando profile mudar
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        state: profile.state || '',
        birth_date: profile.birth_date || '',
        cpf: profile.cpf || '',
        dream_destinations: profile.dream_destinations || '',
        travel_preferences: profile.travel_preferences || ''
      })
    }
  }, [profile])

  const handleChange = (field, value) => {
    let processedValue = value

    // Formatar campos especiais
    if (field === 'phone') {
      processedValue = formatPhone(value)
    } else if (field === 'cpf') {
      processedValue = formatCPF(value)
    } else if (field === 'state') {
      processedValue = value.toUpperCase().slice(0, 2)
    }

    setForm(prev => ({ ...prev, [field]: processedValue }))

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const toggleTravelPref = (typeId) => {
    const current = form.travel_preferences.split(',').filter(Boolean)
    const updated = current.includes(typeId)
      ? current.filter(t => t !== typeId)
      : [...current, typeId]
    handleChange('travel_preferences', updated.join(','))
  }

  const validate = () => {
    const newErrors = {}

    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    if (form.cpf && !isValidCPFFormat(form.cpf)) {
      newErrors.cpf = 'CPF deve ter 11 dígitos'
    }

    if (form.phone && form.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Telefone incompleto'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) {
      onSave(form)
    }
  }

  const selectedPrefs = form.travel_preferences.split(',').filter(Boolean)

  // Classes de input para fundo claro
  const inputClass = `w-full px-4 py-3 rounded-lg bg-white border text-[#1f1f1f] placeholder:text-[#a39695] focus:outline-none focus:ring-2 focus:ring-[#5c005a]/30 focus:border-[#5c005a] transition-all`
  const inputErrorClass = `border-red-500`
  const inputNormalClass = `border-[#ddd1d0]`

  return (
    <form onSubmit={handleSubmit}>
      {/* Container com fundo claro para o formulário */}
      <div className="rounded-2xl bg-[#edf0f1] p-6 space-y-6">
        {/* Dados Básicos */}
        <div className="rounded-xl bg-white border border-[#ddd1d0]/50 p-6 shadow-sm">
          <h3 className="text-[10px] uppercase tracking-wider text-[#5c005a] mb-4 flex items-center gap-2 font-medium">
            <span>✈</span> Dados do Viajante
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-xs text-[#32113f] font-medium mb-2">
                Nome completo *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`${inputClass} ${errors.name ? inputErrorClass : inputNormalClass}`}
                placeholder="Como consta no documento"
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs text-[#32113f] font-medium mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`${inputClass} ${errors.phone ? inputErrorClass : inputNormalClass}`}
                placeholder="(11) 99999-9999"
              />
              {errors.phone && (
                <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="block text-xs text-[#32113f] font-medium mb-2">
                Data de nascimento
              </label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
                className={`${inputClass} ${inputNormalClass}`}
              />
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-xs text-[#32113f] font-medium mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className={`${inputClass} ${inputNormalClass}`}
                placeholder="Sua cidade"
              />
            </div>

            {/* Estado */}
            <div>
              <CustomSelect
                label="Estado"
                value={form.state}
                onChange={(val) => handleChange('state', val)}
                options={BRAZILIAN_STATES.map(uf => ({ value: uf, label: uf }))}
                placeholder="Selecione"
                variant="light"
              />
            </div>
          </div>
        </div>

        {/* Documento - OPCIONAL */}
        <div className="rounded-xl bg-white border border-[#ddd1d0]/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] uppercase tracking-wider text-[#5c005a] flex items-center gap-2 font-medium">
              <LockIcon size={14} color="#5c005a" /> Documento (opcional)
            </h3>
            <span className="text-[10px] text-[#a39695]">
              Apenas para emissão de passagens
            </span>
          </div>

          <div className="relative">
            <label className="block text-xs text-[#32113f] font-medium mb-2">
              CPF
            </label>
            <div className="relative">
              <input
                type={showCPF ? 'text' : 'password'}
                value={showCPF ? form.cpf : (form.cpf ? maskCPF(form.cpf) : '')}
                onChange={(e) => showCPF && handleChange('cpf', e.target.value)}
                onFocus={() => setShowCPF(true)}
                className={`${inputClass} pr-20 ${errors.cpf ? inputErrorClass : inputNormalClass}`}
                placeholder="000.000.000-00"
              />
              <button
                type="button"
                onClick={() => setShowCPF(!showCPF)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5c005a] hover:text-[#32113f] transition-colors font-medium"
              >
                {showCPF ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.cpf && (
              <p className="text-xs text-red-600 mt-1">{errors.cpf}</p>
            )}
            <p className="text-[10px] text-[#a39695] mt-2">
              Seu CPF é armazenado com segurança e nunca será compartilhado.
            </p>
          </div>
        </div>

        {/* Preferências de Viagem */}
        <div className="rounded-xl bg-white border border-[#ddd1d0]/50 p-6 shadow-sm">
          <h3 className="text-[10px] uppercase tracking-wider text-[#5c005a] mb-4 flex items-center gap-2 font-medium">
            <GlobeIcon size={14} color="#5c005a" /> Preferências de Viagem
          </h3>

          {/* Tipos de viagem */}
          <div className="mb-6">
            <label className="block text-xs text-[#32113f] font-medium mb-3">
              Tipo de viagem preferido (selecione quantos quiser)
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleTravelPref(type.id)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedPrefs.includes(type.id)
                      ? 'bg-[#5c005a] text-white'
                      : 'bg-[#edf0f1] text-[#32113f] hover:bg-[#ddd1d0] border border-[#ddd1d0]'
                  }`}
                >
                  <type.Icon size={14} color="currentColor" /> {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Destinos dos sonhos */}
          <div>
            <label className="block text-xs text-[#32113f] font-medium mb-2">
              Destinos dos sonhos
            </label>
            <textarea
              value={form.dream_destinations}
              onChange={(e) => handleChange('dream_destinations', e.target.value)}
              className={`${inputClass} ${inputNormalClass} resize-none`}
              rows={3}
              placeholder="Ex: Maldivas, Japão, Patagônia..."
            />
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end gap-4 pt-2">
          <motion.button
            type="submit"
            disabled={saving}
            whileHover={{ scale: saving ? 1 : 1.02 }}
            whileTap={{ scale: saving ? 1 : 0.98 }}
            className="px-8 py-3 rounded-xl bg-[#5c005a] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#5c005a]/20 hover:bg-[#32113f] transition-colors"
          >
            {saving ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Salvando...
              </>
            ) : (
              <>
                ✓ Salvar alterações
              </>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: HISTÓRICO RECENTE
// ══════════════════════════════════════════════════════════════════════════════

function RecentActivity({ activities, userId }) {
  const [expanded, setExpanded] = useState(false)
  const [allTransactions, setAllTransactions] = useState([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [filter, setFilter] = useState('all')

  // Carregar todas as transações quando expandir
  const handleExpand = async () => {
    if (!expanded && allTransactions.length === 0) {
      setLoadingAll(true)
      const res = await fetchAllTransactions(userId)
      if (res.success) {
        setAllTransactions(res.transactions)
      }
      setLoadingAll(false)
    }
    setExpanded(!expanded)
  }

  const typeConfig = {
    credit: { icon: '+', color: 'text-green-400', bg: 'bg-green-400/20', label: 'Crédito' },
    debit: { icon: '-', color: 'text-red-400', bg: 'bg-red-400/20', label: 'Débito' },
    task: { icon: '✓', color: 'text-[#a27937]', bg: 'bg-[#a27937]/20', label: 'Missão' },
    referral: { icon: '◇', color: 'text-[#a27937]', bg: 'bg-[#a27937]/20', label: 'Indicação' },
    welcome_referral: { icon: '✦', color: 'text-[#a27937]', bg: 'bg-[#a27937]/20', label: 'Boas-vindas' },
    redemption: { icon: '★', color: 'text-purple-400', bg: 'bg-purple-400/20', label: 'Resgate' },
    adjustment: { icon: '⚙', color: 'text-blue-400', bg: 'bg-blue-400/20', label: 'Ajuste' },
    admin: { icon: '⚡', color: 'text-blue-400', bg: 'bg-blue-400/20', label: 'Admin' }
  }

  // Filtros disponíveis
  const filters = [
    { id: 'all', label: 'Todos' },
    { id: 'gains', label: 'Ganhos', check: (t) => t.amount > 0 },
    { id: 'redemption', label: 'Resgates', check: (t) => t.type === 'redemption' },
    { id: 'referral', label: 'Indicações', check: (t) => t.type === 'referral' || t.type === 'welcome_referral' },
    { id: 'task', label: 'Missões', check: (t) => t.type === 'task' }
  ]

  // Transações a mostrar
  const displayTransactions = expanded ? allTransactions : (activities || [])
  const filteredTransactions = displayTransactions.filter(t => {
    if (filter === 'all') return true
    const filterObj = filters.find(f => f.id === filter)
    return filterObj?.check ? filterObj.check(t) : true
  })

  // Formatar data e hora
  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#32113f] to-[#5c005a] p-6">
        <h3 className="text-[10px] uppercase tracking-wider text-[#a27937] mb-4 font-medium flex items-center gap-2">
          <ClipboardIcon size={14} color="currentColor" /> Extrato de Pontos
        </h3>
        <p className="text-sm text-[#ddd1d0]/60 text-center py-8">
          Nenhuma transação registrada ainda.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#32113f] to-[#5c005a] p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-wider text-[#a27937] font-medium flex items-center gap-2">
          <ClipboardIcon size={14} color="currentColor" /> {expanded ? 'Extrato Completo' : 'Atividades Recentes'}
        </h3>
        <button
          onClick={handleExpand}
          className="text-[10px] text-[#a27937] hover:text-[#a27937]/80 transition-colors flex items-center gap-1"
        >
          {loadingAll ? (
            <span className="animate-pulse">Carregando...</span>
          ) : (
            <>
              {expanded ? 'Recolher' : 'Ver tudo'}
              <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
            </>
          )}
        </button>
      </div>

      {/* Filtros (só quando expandido) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                    filter === f.id
                      ? 'bg-[#a27937] text-white'
                      : 'bg-white/10 text-[#ddd1d0]/80 hover:bg-white/20'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de transações */}
      <div className={`space-y-2 ${expanded ? 'max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent' : ''}`}>
        {filteredTransactions.length === 0 ? (
          <p className="text-sm text-[#ddd1d0]/60 text-center py-4">
            Nenhuma transação encontrada com este filtro.
          </p>
        ) : (
          filteredTransactions.slice(0, expanded ? undefined : 5).map((activity, index) => {
            const config = typeConfig[activity.type] || { icon: '•', color: 'text-[#ddd1d0]', bg: 'bg-white/10', label: 'Outro' }
            const { date, time } = formatDateTime(activity.created_at)
            const isPositive = activity.amount > 0

            return (
              <motion.div
                key={activity.id || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/5 border border-white/10"
              >
                {/* Ícone do tipo */}
                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center ${config.color} flex-shrink-0`}>
                  {config.icon}
                </div>

                {/* Descrição e data */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#edf0f1] line-clamp-2">
                    {activity.reason || config.label}
                  </p>
                  <p className="text-[10px] text-[#ddd1d0]/60">
                    {date} às {time}
                  </p>
                </div>

                {/* Valor e saldo */}
                <div className="text-right flex-shrink-0">
                  <span className={`text-sm font-semibold block ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{format.pointsShort(activity.amount)}
                  </span>
                  {expanded && activity.balance_after !== undefined && (
                    <span className="text-[9px] text-[#ddd1d0]/50">
                      saldo: {format.pointsShort(activity.balance_after)}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Total de transações quando expandido */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 pt-3 border-t border-white/10 text-center"
        >
          <span className="text-[10px] text-[#ddd1d0]/50">
            {filteredTransactions.length} transaç{filteredTransactions.length === 1 ? 'ão' : 'ões'} {filter !== 'all' && 'encontradas'}
          </span>
        </motion.div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: CONFIGURAÇÕES DE NOTIFICAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

function NotificationSettings() {
  const { pushEnabled, pushDenied, enablePush, canReceivePush, needsIOSInstallFirst, openInstallPrompt } = usePWA()
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    const data = await getNotificationPreferences()
    if (data) {
      setPrefs(data)
    }
    setLoading(false)
  }

  const handleToggle = async (key) => {
    if (!prefs) return

    const newPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(newPrefs)

    setSaving(true)
    const result = await updateNotificationPreferences(newPrefs)
    setSaving(false)

    if (!result.success) {
      // Revert on error
      setPrefs(prefs)
      toast.error('Erro ao salvar preferencias')
    }
  }

  const handleEnablePush = async () => {
    if (needsIOSInstallFirst) {
      openInstallPrompt()
      return
    }

    const result = await enablePush()
    if (result.success) {
      await subscribeToPush()
      toast.success('Notificações ativadas!')
    }
  }

  const handleDisableAll = async () => {
    await unsubscribeFromPush()
    const newPrefs = {
      viagens: false,
      pontos: false,
      missoes: false,
      novidades: false
    }
    setPrefs(newPrefs)
    await updateNotificationPreferences(newPrefs)
    toast.success('Notificações desativadas')
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-[#ddd1d0]/50 p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-[#ddd1d0] rounded" />
          <div className="h-10 bg-[#ddd1d0] rounded" />
          <div className="h-10 bg-[#ddd1d0] rounded" />
        </div>
      </div>
    )
  }

  const notifTypes = [
    { key: 'viagens', label: 'Viagens', desc: 'Check-in, atualizações de voo' },
    { key: 'pontos', label: 'Pontos', desc: 'Pontos liberados, bônus' },
    { key: 'missoes', label: 'Missões', desc: 'Aprovações, novas missões' },
    { key: 'novidades', label: 'Novidades', desc: 'Dicas, promoções' }
  ]

  return (
    <div className="rounded-2xl bg-white border border-[#ddd1d0]/50 p-6 shadow-sm">
      <h3 className="text-[10px] uppercase tracking-wider text-[#5c005a] mb-4 font-medium flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Notificações
      </h3>

      {/* Push permission status */}
      {!pushEnabled && !pushDenied && canReceivePush && (
        <button
          onClick={handleEnablePush}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-[#5c005a] to-[#32113f] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Ativar notificações
        </button>
      )}

      {needsIOSInstallFirst && !pushEnabled && (
        <button
          onClick={openInstallPrompt}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-[#edf0f1] text-[#32113f] text-sm font-medium hover:bg-[#ddd1d0] transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Instale o app para receber avisos
        </button>
      )}

      {/* Push denied help */}
      {pushDenied && (
        <div className="mb-4">
          <PushDeniedHelp />
        </div>
      )}

      {/* Notification type toggles */}
      {prefs && (
        <div className="space-y-3">
          {notifTypes.map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2"
            >
              <div>
                <p className="text-sm font-medium text-[#32113f]">{label}</p>
                <p className="text-[10px] text-[#a39695]">{desc}</p>
              </div>
              <button
                onClick={() => handleToggle(key)}
                disabled={saving || !pushEnabled}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  prefs[key] && pushEnabled
                    ? 'bg-[#5c005a]'
                    : 'bg-[#ddd1d0]'
                } ${!pushEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    prefs[key] ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}

          {/* Disable all */}
          {pushEnabled && (
            <button
              onClick={handleDisableAll}
              className="w-full mt-4 pt-4 border-t border-[#ddd1d0]/50 text-xs text-[#a39695] hover:text-red-500 transition-colors"
            >
              Desativar todas
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { balance: userPoints, current: currentLevel, next: nextLevel, progress: levelProgress, pointsToNext, currentId } = useUserLevel()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    referrals: { total: 0, approved: 0, pending: 0 },
    tasks: { total: 0, points: 0 },
    experiences: { total: 0 }
  })
  const [activities, setActivities] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)

  // Redirecionar se não logado
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  // Carregar dados reais
  useEffect(() => {
    async function loadRealData() {
      if (!user?.id) return

      setLoadingStats(true)
      try {
        const [referralRes, tasksRes, expRes, activityRes] = await Promise.all([
          fetchReferralStats(user.id),
          fetchApprovedTasks(user.id),
          fetchRedeemedExperiences(user.id),
          fetchRecentActivity(user.id)
        ])

        setStats({
          referrals: referralRes.stats,
          tasks: tasksRes.stats,
          experiences: expRes.stats
        })
        setActivities(activityRes.activities)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    loadRealData()
  }, [user?.id])

  // Salvar perfil
  const handleSave = useCallback(async (formData) => {
    if (!user?.id) return

    setSaving(true)
    try {
      const result = await updateUserProfile(user.id, formData)

      if (result.success) {
        toast.success('Perfil atualizado com sucesso!')
        // Atualizar o contexto
        if (refreshProfile) {
          await refreshProfile()
        }
      } else {
        toast.error(result.error || 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }, [user?.id, refreshProfile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-[#ddd1d0] border-t-[#5c005a] rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  // Dados de nível vêm do useUserLevel (baseado em total_points_earned)
  const levelData = {
    current: currentLevel,
    next: nextLevel,
    progress: levelProgress,
    pointsToNext
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20 md:pb-0">
      <DashboardHeader />

      <main className="container-premium py-8 md:py-12">
        {/* Voltar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#5c005a] hover:text-[#32113f] transition-colors"
          >
            ← Voltar ao clube
          </Link>
        </motion.div>

        {/* Cabeçalho do Passaporte */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl overflow-hidden"
        >
          <PassportHeader
            profile={profile}
            levelData={levelData}
            userPoints={userPoints}
          />
        </motion.div>

        {/* Estatísticas Reais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          {loadingStats ? (
            <div className="rounded-2xl bg-[#edf0f1] p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-4 rounded-xl bg-white border border-[#ddd1d0]/50 animate-pulse">
                    <div className="h-4 w-20 bg-[#ddd1d0] rounded mb-3" />
                    <div className="h-6 w-12 bg-[#ddd1d0] rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <RealStats stats={stats} levelData={levelData} />
          )}
        </motion.div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Edição (2 colunas) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <EditProfileForm
              profile={profile}
              onSave={handleSave}
              saving={saving}
            />
          </motion.div>

          {/* Sidebar (1 coluna) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <RecentActivity activities={activities} userId={user?.id} />

            {/* Próxima classe */}
            {levelData?.next && (
              <div className="rounded-2xl bg-white border border-[#ddd1d0]/50 p-6 shadow-sm">
                <h3 className="text-[10px] uppercase tracking-wider text-[#5c005a] mb-4 font-medium flex items-center gap-2">
                  <TargetIcon size={14} color="#5c005a" /> Próxima Classe
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  {(() => {
                    const NextClassIcon = getClassIcon(levelData.next.id)
                    return <NextClassIcon size={28} color="#a27937" />
                  })()}
                  <span className="text-[#32113f] font-medium">{levelCopy.names[levelData.next.id]}</span>
                </div>
                <div className="h-2.5 bg-[#edf0f1] rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelData.progress}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-[#5c005a] to-[#a27937] rounded-full"
                  />
                </div>
                <p className="text-xs text-[#a39695]">
                  {format.pointsShort(levelData.pointsToNext)} pontos restantes
                </p>
              </div>
            )}

            {/* Configurações de Notificação */}
            <NotificationSettings />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
