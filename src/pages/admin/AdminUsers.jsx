import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { CreditAdjustModal } from '@/components/admin/CreditAdjustModal'
import { fetchAllUsers, creditPoints, fetchUserTransactions, fetchClientProfile, revealClientCpf } from '@/services/adminService'
import { fetchSolicitacoesCliente } from '@/services/experienciasService'
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
              <div className="flex gap-3 pt-4 border-t border-dusty-rose/20">
                <button
                  onClick={() => { onClose(); onViewTransactions(user); }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-heading text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10 transition-colors border border-dusty-rose/30"
                >
                  Ver Histórico de Pontos
                </button>
                <button
                  onClick={() => { onClose(); onViewTasks(user); }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-heading text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10 transition-colors border border-dusty-rose/30"
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
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [adjustingUser, setAdjustingUser] = useState(null)
  const [viewingTransactions, setViewingTransactions] = useState(null)
  const [viewingTasks, setViewingTasks] = useState(null)
  const [viewingProfile, setViewingProfile] = useState(null)

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
  const handleAdjustCredits = async (userId, amount, reason) => {
    const type = amount > 0 ? 'credit' : 'debit'
    const result = await creditPoints(userId, amount, reason, type)

    if (result.success) {
      toast.success(
        `${amount > 0 ? 'Crédito' : 'Débito'} de ${Math.abs(amount)} pontos registrado!`
      )
      setAdjustingUser(null)
      loadUsers() // Recarregar lista
    } else {
      toast.error(result.error || 'Erro ao ajustar créditos')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-graphite">Clientes</h1>
          <p className="text-sm text-graphite/70 mt-1 font-heading">
            {users.length} cliente{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full px-4 py-3 rounded-xl bg-white border border-dusty-rose/30 text-graphite placeholder:text-dusty-rose/60 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
          />
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
                    <th className="text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Cliente</th>
                    <th className="hidden sm:table-cell text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Classe</th>
                    <th className="text-right text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Pontos</th>
                    <th className="hidden md:table-cell text-left text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Desde</th>
                    <th className="text-right text-xs font-heading font-semibold text-graphite/70 uppercase tracking-wide px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dusty-rose/10">
                  {users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-ice-white/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-heading font-medium text-graphite">{user.name}</p>
                          <p className="text-xs text-graphite/60">{user.email}</p>
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
                        <span className="text-sm text-graphite/70 font-heading">{user.joinDate}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-1.5 sm:gap-2">
                          <button
                            onClick={() => setAdjustingUser(user)}
                            className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-heading font-semibold bg-antique-gold text-deep-purple hover:bg-accent-light transition-colors shadow-sm whitespace-nowrap"
                          >
                            Creditar
                          </button>
                          <div className="flex gap-1.5 sm:gap-2">
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
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-graphite/70 font-heading">
                {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
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
    </AdminLayout>
  )
}
