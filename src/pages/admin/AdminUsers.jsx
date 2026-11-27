import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout, AdminPageHeader, AdminCard } from '@/components/admin/AdminLayout'
import { CreditAdjustModal } from '@/components/admin/CreditAdjustModal'
import { ExcluirContaModal } from '@/components/admin/ExcluirContaModal'
import { fetchAllUsers, creditPoints, fetchUserTransactions, fetchClientProfile, revealClientCpf, invalidateMetricasAdminCache } from '@/services/adminService'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSolicitacoesCliente } from '@/services/experienciasService'
import { ativarPrime, cancelarPrime, fetchSubscriptionStatus, formatCiclo, fetchPlanosConfig } from '@/services/subscriptionService'
import { aprovarUsuario, colocarEmEspera, recusarUsuario, abrirWhatsAppAprovacao, aprovarLote } from '@/services/acessoService'
import { formatPrice } from '@/config/contact'
import { levels } from '@/services/pointsSystem'
import { format } from '@/services/copy'
import toast from 'react-hot-toast'

// ============================================
// MODAL DE HISTÓRICO DE TRANSAÇÕES
// ============================================
function TransactionsModal({ user, onClose }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await fetchUserTransactions(user.id)
      if (result.success) {
        setTransactions(result.transactions)
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6 max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold text-graphite">Histórico de Transações</h3>
            <p className="text-sm text-graphite/70 font-heading">{user.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-graphite/50 hover:text-graphite transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-graphite/70">Carregando...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-graphite/70">
              Nenhuma transação registrada
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t, index) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-xl border ${
                    t.amount > 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-graphite">{t.reason}</p>
                      <p className="text-xs text-graphite/60 mt-1">
                        por {t.adminName} · {t.createdAt}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-mono font-semibold ${
                        t.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-graphite/60">
                        {t.balanceBefore.toLocaleString('pt-BR')} → {t.balanceAfter.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-dusty-rose/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// MODAL DE TAREFAS DO CLIENTE
// ============================================
function TasksModal({ user, onClose }) {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await fetchSolicitacoesCliente(user.id)
      if (result.success) {
        setSolicitacoes(result.solicitacoes)
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  const statusConfig = {
    pendente: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    aprovada: { label: 'Aprovada', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
    rejeitada: { label: 'Rejeitada', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  }

  const pendentes = solicitacoes.filter(s => s.status === 'pendente').length
  const aprovadas = solicitacoes.filter(s => s.status === 'aprovada').length
  const rejeitadas = solicitacoes.filter(s => s.status === 'rejeitada').length

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6 max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold text-graphite">Tarefas do Cliente</h3>
            <p className="text-sm text-graphite/70 font-heading">{user.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-graphite/50 hover:text-graphite transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Resumo */}
        <div className="flex gap-4 mb-4 text-xs font-heading">
          <span className="text-amber-600">{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>
          <span className="text-green-600">{aprovadas} aprovada{aprovadas !== 1 ? 's' : ''}</span>
          <span className="text-red-600">{rejeitadas} rejeitada{rejeitadas !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-graphite/70">Carregando...</div>
          ) : solicitacoes.length === 0 ? (
            <div className="text-center py-8 text-graphite/70">
              Nenhuma tarefa solicitada
            </div>
          ) : (
            <div className="space-y-3">
              {solicitacoes.map((s, index) => {
                const status = statusConfig[s.status] || statusConfig.pendente

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-4 rounded-xl border ${status.bg}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{s.tarefaIcone}</span>
                          <p className="text-sm font-heading font-medium text-graphite">{s.tarefaNome}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-lg ${status.color} bg-white/50`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-graphite/60 mt-1">
                          Solicitado em {s.createdAt}
                        </p>
                        {s.adminComentario && (
                          <p className="text-xs text-graphite/70 mt-1 italic">
                            "{s.adminComentario}"
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-mono font-semibold ${
                          s.status === 'aprovada' ? 'text-green-600' : 'text-graphite/40'
                        }`}>
                          {s.status === 'aprovada' ? '+' : ''}{s.tarefaPontos.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-graphite/60">pontos</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-dusty-rose/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// MODAL DE ASSINATURA PRIME
// ============================================
function PrimeModal({ user, onClose, onSuccess }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [planosConfig, setPlanosConfig] = useState(null)

  useEffect(() => {
    async function load() {
      const [statusResult, configResult] = await Promise.all([
        fetchSubscriptionStatus(user.id),
        fetchPlanosConfig()
      ])
      if (statusResult.success) {
        setStatus(statusResult.status)
      }
      if (configResult.success) {
        setPlanosConfig(configResult.planos)
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  const primeConfig = planosConfig?.prime || {}
  // Apenas plano anual disponível
  const precoAnual = primeConfig.precoAnual || 497

  const handleAtivar = async (ciclo) => {
    setProcessing(true)
    const result = await ativarPrime(user.id, ciclo)
    if (result.success) {
      toast.success(`Prime ${formatCiclo(ciclo)} ativado para ${user.name}!`)
      onSuccess()
      onClose()
    } else {
      toast.error(result.error || 'Erro ao ativar Prime')
    }
    setProcessing(false)
  }

  const handleCancelar = async () => {
    if (!window.confirm(`Cancelar Prime de ${user.name}?\n\nO cliente voltará para o plano Free.`)) return

    setProcessing(true)
    const result = await cancelarPrime(user.id)
    if (result.success) {
      toast.success(`Prime cancelado. ${user.name} voltou para Free.`)
      onSuccess()
      onClose()
    } else {
      toast.error(result.error || 'Erro ao cancelar Prime')
    }
    setProcessing(false)
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-display font-bold text-graphite">Gerenciar Assinatura</h3>
            <p className="text-sm text-graphite/70 font-heading">{user.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-graphite/50 hover:text-graphite transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-graphite/70">Carregando...</div>
        ) : (
          <div className="space-y-6">
            {/* Status Atual */}
            <div className={`p-4 rounded-xl ${status?.isPrime ? 'bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-graphite/60 uppercase tracking-wide">Plano Atual</p>
                  <p className={`text-xl font-display font-bold ${status?.isPrime ? 'text-amber-700' : 'text-graphite'}`}>
                    {status?.isPrime ? `Me,up Prime ${formatCiclo(status.ciclo)}` : 'Free'}
                  </p>
                </div>
                {status?.isPrime && (
                  <span className="text-3xl">👑</span>
                )}
              </div>
              {status?.isPrime && status?.daysRemaining !== null && (
                <p className="text-xs text-amber-700 mt-2">
                  {status.daysRemaining} dias restantes
                </p>
              )}
            </div>

            {/* Benefícios */}
            <div className="text-xs space-y-1.5 text-graphite/70">
              <p>• Check-in: <span className="font-semibold text-graphite">{status?.pontosCheckin || 10} pts/dia</span></p>
              <p>• Indicação: <span className="font-semibold text-graphite">{status?.pontosIndicacao?.toLocaleString('pt-BR') || '3.000'} pts</span></p>
              <p>• Aniversário: <span className="font-semibold text-graphite">{status?.pontosAniversario?.toLocaleString('pt-BR') || 0} pts</span></p>
              <p>• Multiplicador viagem: <span className="font-semibold text-graphite">{status?.multiplicadorViagem || 1}x</span>
                {status?.isAnual && <span className="text-amber-600 ml-1">(Prime Anual)</span>}
              </p>
            </div>

            {/* Ações */}
            {status?.isPrime ? (
              <div className="space-y-3">
                <div className="py-3 text-center text-amber-600 font-heading font-semibold bg-amber-50 rounded-xl">
                  ✓ Prime Anual Ativo
                </div>
                {/* Cancelar */}
                <button
                  onClick={handleCancelar}
                  disabled={processing}
                  className="w-full px-4 py-3 rounded-xl border border-red-300 text-red-600 font-heading font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processando...' : 'Cancelar Prime (voltar para Free)'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-graphite/60 font-heading text-center">Ativar Me,up Prime:</p>
                <button
                  onClick={() => handleAtivar('anual')}
                  disabled={processing}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-heading font-semibold hover:from-amber-600 hover:to-amber-700 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Ativando...' : 'Ativar Prime Anual'}
                  <span className="block text-xs font-normal opacity-80">R${formatPrice(precoAnual, false)}/ano (1.5x)</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite transition-colors font-heading"
            >
              Fechar
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ============================================
// MODAL DE PERFIL DO CLIENTE (READ-ONLY)
// ============================================
function ProfileModal({ user, onClose, onViewTransactions, onViewTasks }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revealedCpf, setRevealedCpf] = useState(null)
  const [revealingCpf, setRevealingCpf] = useState(false)

  useEffect(() => {
    async function load() {
      const result = await fetchClientProfile(user.id)
      if (result.success) {
        setProfile(result.profile)
      } else {
        toast.error(result.error || 'Erro ao carregar perfil')
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  const handleRevealCpf = async () => {
    if (revealingCpf) return

    const confirmed = window.confirm(
      'Você está prestes a revelar o CPF completo deste cliente.\n\n' +
      'Esta ação será registrada no log de auditoria.\n\n' +
      'Continuar?'
    )

    if (!confirmed) return

    setRevealingCpf(true)
    const result = await revealClientCpf(user.id)

    if (result.success) {
      setRevealedCpf(result.cpf)
      toast.success('CPF revelado. Ação registrada no audit log.')
    } else {
      toast.error(result.error || 'Erro ao revelar CPF')
    }
    setRevealingCpf(false)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('pt-BR')
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl border border-dusty-rose/20 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dusty-rose/20">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-antique-gold/30"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-deep-purple/10 flex items-center justify-center text-deep-purple text-xl font-bold">
                {profile?.name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <h3 className="text-lg font-display font-bold text-graphite">
                {loading ? 'Carregando...' : profile?.name || 'Cliente'}
              </h3>
              <p className="text-sm text-graphite/70 font-heading">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-graphite/50 hover:text-graphite transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-graphite/70">Carregando perfil...</div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Classe e Pontos */}
              <div className="flex items-center gap-4 p-4 bg-deep-purple/5 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs text-graphite/60 font-heading uppercase tracking-wide">Classe</p>
                  <p className="text-lg font-display font-bold text-deep-purple">{profile.level_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-graphite/60 font-heading uppercase tracking-wide">Saldo</p>
                  <p className="text-2xl font-mono font-bold text-antique-gold">
                    {profile.points?.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Dados Pessoais */}
              <div>
                <h4 className="text-sm font-heading font-semibold text-graphite/70 uppercase tracking-wide mb-3">
                  Dados Pessoais
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-graphite/60">Telefone</p>
                    <p className="text-sm text-graphite font-heading">{profile.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-graphite/60">Cidade/Estado</p>
                    <p className="text-sm text-graphite font-heading">
                      {profile.city && profile.state ? `${profile.city}/${profile.state}` : profile.city || profile.state || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-graphite/60">Data de Nascimento</p>
                    <p className="text-sm text-graphite font-heading">{formatDate(profile.birth_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-graphite/60">Cliente desde</p>
                    <p className="text-sm text-graphite font-heading">{formatDate(profile.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* CPF */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 font-heading uppercase tracking-wide mb-1">CPF</p>
                    <p className="text-lg font-mono text-graphite">
                      {revealedCpf || profile.cpf_masked || '—'}
                    </p>
                  </div>
                  {profile.has_cpf && !revealedCpf && (
                    <button
                      onClick={handleRevealCpf}
                      disabled={revealingCpf}
                      className="px-4 py-2 rounded-xl text-xs font-heading font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {revealingCpf ? 'Revelando...' : '🔓 Ver CPF para emissão'}
                    </button>
                  )}
                  {revealedCpf && (
                    <span className="text-xs text-amber-700 font-heading">
                      ✓ Registrado no audit log
                    </span>
                  )}
                </div>
              </div>

              {/* Indicações */}
              <div>
                <h4 className="text-sm font-heading font-semibold text-graphite/70 uppercase tracking-wide mb-3">
                  Indicações
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-graphite/60">Código de Indicação</p>
                    <p className="text-sm text-graphite font-mono">{profile.referral_code || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-graphite/60">Indicações Aprovadas</p>
                    <p className="text-sm text-graphite font-heading">{profile.total_referrals || 0}</p>
                  </div>
                </div>
              </div>

              {/* Preferências de Viagem */}
              {(profile.dream_destinations || profile.travel_preferences) && (
                <div>
                  <h4 className="text-sm font-heading font-semibold text-graphite/70 uppercase tracking-wide mb-3">
                    Preferências de Viagem
                  </h4>
                  <div className="space-y-3">
                    {profile.dream_destinations && (
                      <div>
                        <p className="text-xs text-graphite/60">Destinos dos Sonhos</p>
                        <p className="text-sm text-graphite font-heading">{profile.dream_destinations}</p>
                      </div>
                    )}
                    {profile.travel_preferences && (
                      <div>
                        <p className="text-xs text-graphite/60">Preferências</p>
                        <p className="text-sm text-graphite font-heading">{profile.travel_preferences}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ações Rápidas */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-dusty-rose/20">
                <button
                  onClick={() => { onClose(); onViewTransactions(user); }}
                  className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-sm font-heading text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10 transition-colors border border-dusty-rose/30"
                >
                  Ver Histórico de Pontos
                </button>
                <button
                  onClick={() => { onClose(); onViewTasks(user); }}
                  className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-sm font-heading text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10 transition-colors border border-dusty-rose/30"
                >
                  Ver Tarefas
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-graphite/70">Perfil não encontrado</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dusty-rose/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// PÁGINA ADMIN USERS
// ============================================
export function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [adjustingUser, setAdjustingUser] = useState(null)
  const [viewingTransactions, setViewingTransactions] = useState(null)
  const [viewingTasks, setViewingTasks] = useState(null)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [managingPrime, setManagingPrime] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [approvalMenuOpen, setApprovalMenuOpen] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [ocultarTeste, setOcultarTeste] = useState(true)

  // Buscar usuários do Supabase
  const loadUsers = useCallback(async () => {
    setLoading(true)
    const result = await fetchAllUsers(searchQuery)
    if (result.success) {
      setUsers(result.users)
    } else {
      toast.error('Erro ao carregar usuários')
    }
    setLoading(false)
  }, [searchQuery])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Ajustar créditos (chama o banco via RPC seguro)
  // type: 'credit' (viagem), 'referral' (indicação), 'birthday', 'debit', 'task'
  const handleAdjustCredits = async (userId, amount, reason, type = null) => {
    // Se type não foi passado, inferir pelo sinal do amount
    const finalType = type || (amount > 0 ? 'credit' : 'debit')
    const result = await creditPoints(userId, amount, reason, finalType)

    if (result.success) {
      const transaction = result.transaction
      const pointsText = transaction?.finalAmount || Math.abs(amount)
      toast.success(`+${pointsText.toLocaleString('pt-BR')} pontos creditados!`)
      setAdjustingUser(null)
      loadUsers() // Recarregar lista
    } else {
      toast.error(result.error || 'Erro ao ajustar créditos')
    }
  }

  // Handlers de aprovação
  const handleAprovar = async (user, plano, criarAssinatura = false) => {
    setActionLoading(user.id)
    setApprovalMenuOpen(null)
    const result = await aprovarUsuario(user.id, plano, criarAssinatura)
    if (result.success) {
      toast.success(`${user.name} aprovado como ${plano === 'prime' ? 'Prime Fundador' : 'Free'}!`)
      loadUsers()
    } else {
      toast.error(result.error || 'Erro ao aprovar')
    }
    setActionLoading(null)
  }

  const handleEspera = async (user) => {
    setActionLoading(user.id)
    setApprovalMenuOpen(null)
    const result = await colocarEmEspera(user.id)
    if (result.success) {
      toast.success(`${user.name} colocado em espera`)
      loadUsers()
    } else {
      toast.error(result.error || 'Erro')
    }
    setActionLoading(null)
  }

  const handleRecusar = async (user) => {
    const motivo = prompt('Motivo da recusa (opcional):')
    setActionLoading(user.id)
    setApprovalMenuOpen(null)
    const result = await recusarUsuario(user.id, motivo)
    if (result.success) {
      toast.success(`${user.name} recusado`)
      loadUsers()
    } else {
      toast.error(result.error || 'Erro ao recusar')
    }
    setActionLoading(null)
  }

  // Filtrar e ordenar usuários
  // Handler para aprovação em lote
  const handleAprovarLote = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um usuário')
      return
    }

    setBatchLoading(true)
    const resultado = await aprovarLote(selectedUsers)

    if (resultado?.success) {
      toast.success(`${resultado.aprovados} usuário(s) aprovado(s)!`)
      if (resultado.ficaram_de_fora > 0) {
        toast.info(`${resultado.ficaram_de_fora} ficaram de fora por falta de vagas`)
      }
      setSelectedUsers([])
      loadUsers()
    } else {
      toast.error(resultado?.error || 'Erro ao aprovar em lote')
    }
    setBatchLoading(false)
  }

  // Selecionar/deselecionar usuário
  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Selecionar todos em análise
  const selectAllEmAnalise = () => {
    const emAnaliseIds = filteredUsers
      .filter(u => u.status_acesso === 'em_analise')
      .map(u => u.id)
    setSelectedUsers(emAnaliseIds)
  }

  // Filtrar e ordenar usuários
  const filteredUsers = users
    .filter(user => {
      // Filtro de teste/equipe (mas sempre mostrar o próprio usuário logado)
      if (ocultarTeste && user.is_teste && user.id !== currentUser?.id) return false
      // Filtro de status
      if (statusFilter === 'todos') return true
      if (statusFilter === 'em_analise') return user.status_acesso === 'em_analise'
      if (statusFilter === 'em_espera') return user.status_acesso === 'em_espera'
      if (statusFilter === 'aprovados') return user.status_acesso === 'aprovado' || !user.status_acesso
      return true
    })
    .sort((a, b) => {
      // em_analise primeiro, depois em_espera, depois resto
      const order = { 'em_analise': 0, 'em_espera': 1, 'aprovado': 2 }
      const aOrder = order[a.status_acesso] ?? 2
      const bOrder = order[b.status_acesso] ?? 2
      return aOrder - bOrder
    })

  // Contagem de selecionados em análise
  const emAnaliseCount = filteredUsers.filter(u => u.status_acesso === 'em_analise').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="Clientes"
          subtitle={`${users.length} cliente${users.length !== 1 ? 's' : ''} cadastrado${users.length !== 1 ? 's' : ''}`}
        />

        {/* Search + Filters */}
        <div className="space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#ddd1d0]/50 text-[#1f1f1f] placeholder:text-[#a39695] focus:outline-none focus:border-[#a27937]/50 focus:ring-2 focus:ring-[#a27937]/20 transition-all font-heading"
          />
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'todos', label: 'Todos' },
              { value: 'em_analise', label: 'Em análise' },
              { value: 'em_espera', label: 'Em espera' },
              { value: 'aprovados', label: 'Aprovados' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-medium transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-deep-purple text-white'
                    : 'bg-white border border-dusty-rose/30 text-graphite/70 hover:bg-dusty-rose/10'
                }`}
              >
                {filter.label}
              </button>
            ))}
            <div className="flex-1" />
            <label className="flex items-center gap-2 text-xs font-heading text-graphite/70 cursor-pointer">
              <input
                type="checkbox"
                checked={ocultarTeste}
                onChange={(e) => setOcultarTeste(e.target.checked)}
                className="w-4 h-4 rounded border-dusty-rose/30"
              />
              Ocultar teste/equipe
            </label>
          </div>

          {/* Ações em lote */}
          {emAnaliseCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <button
                onClick={selectAllEmAnalise}
                className="px-3 py-1.5 rounded-lg text-xs font-heading font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Selecionar {emAnaliseCount} em análise
              </button>
              {selectedUsers.length > 0 && (
                <>
                  <span className="text-xs text-blue-700 font-heading">
                    {selectedUsers.length} selecionado(s)
                  </span>
                  <button
                    onClick={handleAprovarLote}
                    disabled={batchLoading}
                    className="px-4 py-1.5 rounded-lg text-xs font-heading font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    {batchLoading ? 'Aprovando...' : 'Aprovar selecionados (Free)'}
                  </button>
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-1.5 rounded-lg text-xs font-heading text-graphite/60 hover:text-graphite"
                  >
                    Limpar
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-dusty-rose/20 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-graphite/70">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
              />
              Carregando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dusty-rose/20 bg-ice-white">
                    <th className="w-10 px-2 py-3">
                      <span className="sr-only">Selecionar</span>
                    </th>
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Cliente</th>
                    <th className="hidden sm:table-cell text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Classe</th>
                    <th className="text-right text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Pontos</th>
                    <th className="hidden md:table-cell text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Origem</th>
                    <th className="hidden lg:table-cell text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Desde</th>
                    <th className="text-right text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dusty-rose/10">
                  {filteredUsers.map((user, index) => {
                    const needsApproval = user.status_acesso === 'em_analise' || user.status_acesso === 'em_espera'
                    const isLoading = actionLoading === user.id

                    return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className={`hover:bg-ice-white/50 transition-colors ${selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-2 py-4">
                        {needsApproval && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            className="w-4 h-4 rounded border-dusty-rose/30 text-antique-gold focus:ring-antique-gold/50"
                          />
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-heading font-medium text-graphite">{user.name}</p>
                            <p className="text-xs text-graphite/60">{user.email}</p>
                          </div>
                          {user.status_acesso === 'em_analise' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-medium bg-blue-100 text-blue-700">
                              Em análise
                            </span>
                          )}
                          {user.status_acesso === 'em_espera' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-medium bg-amber-100 text-amber-700">
                              Em espera
                            </span>
                          )}
                          {user.status_acesso === 'recusado' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-medium bg-gray-100 text-gray-600">
                              Recusado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-deep-purple/10 text-deep-purple font-heading font-medium">
                          {user.levelName}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-mono font-semibold text-antique-gold">
                          {format.pointsShort(user.points)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-heading ${
                          user.origem_acesso === 'link_lista' ? 'bg-purple-100 text-purple-700' :
                          user.origem_acesso === 'convite' ? 'bg-green-100 text-green-700' :
                          user.origem_acesso === 'admin' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {user.origem_acesso === 'link_lista' ? 'Link' :
                           user.origem_acesso === 'convite' ? 'Convite' :
                           user.origem_acesso === 'admin' ? 'Admin' : 'Site'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-4">
                        <span className="text-sm text-graphite/70 font-heading">{user.joinDate}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-1.5 sm:gap-2">
                          {needsApproval ? (
                            <div className="relative">
                              <button
                                onClick={() => setApprovalMenuOpen(approvalMenuOpen === user.id ? null : user.id)}
                                disabled={isLoading}
                                className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading font-semibold bg-antique-gold text-deep-purple hover:bg-accent-light transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
                              >
                                {isLoading ? '...' : 'Aprovar ▾'}
                              </button>
                              {approvalMenuOpen === user.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-dusty-rose/20 py-1 z-20">
                                  <button
                                    onClick={() => handleAprovar(user, 'free')}
                                    className="w-full px-4 py-2 text-left text-sm font-heading hover:bg-green-50 text-green-700"
                                  >
                                    Aprovar Free
                                  </button>
                                  <button
                                    onClick={() => handleAprovar(user, 'prime', true)}
                                    className="w-full px-4 py-2 text-left text-sm font-heading hover:bg-purple-50 text-purple-700"
                                  >
                                    Aprovar Prime Fundador
                                  </button>
                                  <hr className="my-1 border-dusty-rose/20" />
                                  <button
                                    onClick={() => handleEspera(user)}
                                    className="w-full px-4 py-2 text-left text-sm font-heading hover:bg-amber-50 text-amber-700"
                                  >
                                    Colocar em espera
                                  </button>
                                  <button
                                    onClick={() => handleRecusar(user)}
                                    className="w-full px-4 py-2 text-left text-sm font-heading hover:bg-red-50 text-red-600"
                                  >
                                    Recusar
                                  </button>
                                  {user.phone && (
                                    <>
                                      <hr className="my-1 border-dusty-rose/20" />
                                      <button
                                        onClick={() => { abrirWhatsAppAprovacao(user.phone, user.name); setApprovalMenuOpen(null) }}
                                        className="w-full px-4 py-2 text-left text-sm font-heading hover:bg-green-50 text-green-600"
                                      >
                                        📱 WhatsApp
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setAdjustingUser(user)}
                              className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading font-semibold bg-antique-gold text-deep-purple hover:bg-accent-light transition-colors shadow-sm whitespace-nowrap"
                            >
                              Creditar
                            </button>
                          )}
                          <div className="flex gap-1.5 sm:gap-2">
                            <button
                              onClick={() => setManagingPrime(user)}
                              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 transition-colors whitespace-nowrap"
                            >
                              Prime
                            </button>
                            <button
                              onClick={() => setViewingProfile(user)}
                              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading font-medium text-deep-purple hover:text-deep-purple/80 hover:bg-deep-purple/10 transition-colors whitespace-nowrap"
                            >
                              Perfil
                            </button>
                            <button
                              onClick={() => setViewingTasks(user)}
                              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10 transition-colors whitespace-nowrap"
                            >
                              Tarefas
                            </button>
                            <button
                              onClick={() => setViewingTransactions(user)}
                              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10 transition-colors whitespace-nowrap"
                            >
                              Histórico
                            </button>
                            {/* Botão Excluir - escondido para admins e si mesmo */}
                            {user.role !== 'admin' && user.id !== currentUser?.id && (
                              <button
                                onClick={() => setDeletingUser(user)}
                                className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 rounded-xl text-xs font-heading font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors whitespace-nowrap"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )})}

                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-graphite/70 font-heading">
                {searchQuery || statusFilter !== 'todos' ? 'Nenhum cliente encontrado com esses filtros' : 'Nenhum cliente cadastrado ainda'}
              </p>
            </div>
          )}
        </div>

        {/* Dica */}
        <p className="text-xs text-graphite/60 text-center font-heading">
          Os pontos creditados atualizam automaticamente a classe do cliente.
        </p>
      </div>

      {/* Modal de Ajuste de Créditos */}
      {adjustingUser && (
        <CreditAdjustModal
          user={adjustingUser}
          onClose={() => setAdjustingUser(null)}
          onAdjust={handleAdjustCredits}
        />
      )}

      {/* Modal de Histórico */}
      {viewingTransactions && (
        <TransactionsModal
          user={viewingTransactions}
          onClose={() => setViewingTransactions(null)}
        />
      )}

      {/* Modal de Tarefas */}
      {viewingTasks && (
        <TasksModal
          user={viewingTasks}
          onClose={() => setViewingTasks(null)}
        />
      )}

      {/* Modal de Perfil Completo */}
      {viewingProfile && (
        <ProfileModal
          user={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onViewTransactions={setViewingTransactions}
          onViewTasks={setViewingTasks}
        />
      )}

      {/* Modal de Assinatura Prime */}
      {managingPrime && (
        <PrimeModal
          user={managingPrime}
          onClose={() => setManagingPrime(null)}
          onSuccess={loadUsers}
        />
      )}

      {/* Modal de Exclusão de Conta */}
      <AnimatePresence>
        {deletingUser && (
          <ExcluirContaModal
            user={deletingUser}
            onClose={() => setDeletingUser(null)}
            onSuccess={loadUsers}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
