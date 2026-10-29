import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard'
import { calculateLevel } from '@/services/pointsSystem'
import {
  updateUserProfile,
  fetchReferralStats,
  fetchApprovedTasks,
  fetchRedeemedExperiences,
  fetchRecentActivity,
  maskCPF,
  formatCPF,
  formatPhone,
  formatMemberSince,
  isValidCPFFormat
} from '@/services/passportService'
import { levels as levelCopy, format } from '@/services/copy'
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
  { id: 'lazer', label: 'Lazer', icon: '☀️' },
  { id: 'negocios', label: 'Negócios', icon: '💼' },
  { id: 'aventura', label: 'Aventura', icon: '🏔️' },
  { id: 'romantico', label: 'Romântico', icon: '💕' },
  { id: 'familia', label: 'Família', icon: '👨‍👩‍👧‍👦' },
  { id: 'cultural', label: 'Cultural', icon: '🏛️' }
]

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: CABEÇALHO DO PASSAPORTE
// ══════════════════════════════════════════════════════════════════════════════

function PassportHeader({ profile, levelData, userPoints }) {
  const userName = profile?.name || 'Viajante'
  const currentLevelId = levelData?.current?.id ?? 1
  const memberSince = formatMemberSince(profile?.created_at)

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
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#a27937] mb-1">
            República Federativa do Brasil
          </p>
          <h2 className="font-display text-lg text-[#edf0f1] tracking-wide">
            PASSAPORTE DE VIAGEM
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#ddd1d0]/60 mt-1">
            Meup Club
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
                  <span className="text-base">{levelCopy.icons[currentLevelId]}</span>
                  <span className="text-sm text-[#ddd1d0]">{levelCopy.names[currentLevelId]}</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#a39695] mb-1">
                  Membro desde / Member since
                </p>
                <p className="text-sm text-[#ddd1d0] capitalize">{memberSince}</p>
              </div>
            </div>
          </div>

          {/* Pontos acumulados */}
          <div className="text-center md:text-right flex-shrink-0">
            <p className="text-[9px] uppercase tracking-wider text-[#a39695] mb-1">
              Milhas / Points
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

  const statItems = [
    {
      label: 'Indicações',
      value: stats.referrals?.total ?? 0,
      subvalue: stats.referrals?.total > 0 ? `${stats.referrals.approved} aprovadas` : 'Nenhuma ainda',
      icon: '◇'
    },
    {
      label: 'Classe Atual',
      value: levelCopy.shortNames[currentLevelId],
      subvalue: levelData?.next ? `${levelData.progress}% para próxima` : 'Nível máximo',
      icon: levelCopy.icons[currentLevelId]
    },
    {
      label: 'Tarefas',
      value: stats.tasks?.total ?? 0,
      subvalue: stats.tasks?.total > 0 ? `+${format.pointsShort(stats.tasks.points)} pts` : 'Nenhuma concluída',
      icon: '✓'
    },
    {
      label: 'Experiências',
      value: stats.experiences?.total ?? 0,
      subvalue: stats.experiences?.total > 0 ? 'resgatadas' : 'Nenhuma ainda',
      icon: '★'
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
              <span className="text-[#5c005a]">{stat.icon}</span>
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
              <label className="block text-xs text-[#32113f] font-medium mb-2">
                Estado
              </label>
              <select
                value={form.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className={`${inputClass} ${inputNormalClass}`}
              >
                <option value="">Selecione</option>
                {BRAZILIAN_STATES.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documento - OPCIONAL */}
        <div className="rounded-xl bg-white border border-[#ddd1d0]/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] uppercase tracking-wider text-[#5c005a] flex items-center gap-2 font-medium">
              <span>🔒</span> Documento (opcional)
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
            <span>🌍</span> Preferências de Viagem
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
                  {type.icon} {type.label}
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

function RecentActivity({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#32113f] to-[#5c005a] p-6">
        <h3 className="text-[10px] uppercase tracking-wider text-[#a27937] mb-4 font-medium">
          Atividades Recentes
        </h3>
        <p className="text-sm text-[#ddd1d0]/60 text-center py-8">
          Nenhuma atividade registrada ainda.
        </p>
      </div>
    )
  }

  const typeConfig = {
    credit: { icon: '+', color: 'text-green-400' },
    debit: { icon: '-', color: 'text-red-400' },
    task: { icon: '✓', color: 'text-[#a27937]' },
    referral: { icon: '◇', color: 'text-[#a27937]' },
    redemption: { icon: '★', color: 'text-purple-400' },
    admin: { icon: '⚡', color: 'text-blue-400' }
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#32113f] to-[#5c005a] p-6">
      <h3 className="text-[10px] uppercase tracking-wider text-[#a27937] mb-4 font-medium">
        Atividades Recentes
      </h3>

      <div className="space-y-3">
        {activities.slice(0, 5).map((activity, index) => {
          const config = typeConfig[activity.type] || { icon: '•', color: 'text-[#ddd1d0]' }
          const date = new Date(activity.created_at)
          const isPositive = activity.amount > 0

          return (
            <motion.div
              key={activity.id || index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0"
            >
              <div className={`w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center ${config.color}`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#edf0f1] truncate">
                  {activity.reason || 'Transação'}
                </p>
                <p className="text-[10px] text-[#ddd1d0]/60">
                  {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{format.pointsShort(activity.amount)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth()
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
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border border-neutral-600 border-t-[#a27937] rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  const userPoints = profile?.points || 0
  const levelData = calculateLevel(userPoints)

  return (
    <div className="min-h-screen bg-dark-900">
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
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-400 transition-colors"
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
            <RecentActivity activities={activities} />

            {/* Próxima classe */}
            {levelData?.next && (
              <div className="rounded-2xl bg-gradient-to-br from-[#32113f] to-[#5c005a] p-6">
                <h3 className="text-[10px] uppercase tracking-wider text-[#a27937] mb-4 font-medium">
                  Próxima Classe
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{levelCopy.icons[levelData.next.id]}</span>
                  <span className="text-[#edf0f1]">{levelCopy.names[levelData.next.id]}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelData.progress}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-[#a27937] rounded-full"
                  />
                </div>
                <p className="text-xs text-[#ddd1d0]/60">
                  {format.pointsShort(levelData.pointsToNext)} pontos restantes
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
