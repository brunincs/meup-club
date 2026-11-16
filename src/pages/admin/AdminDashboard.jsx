import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AdminLayout, AdminPageHeader, AdminCard, AdminButton } from '@/components/admin/AdminLayout'
import { fetchAdminStats, fetchAllUsers, fetchAllTransactions, fetchBalanceDiscrepancies, fetchCheckinsProximos, marcarCheckinFeito, fetchAdminMetrics, fetchPendencias, fetchIAFalhas24h } from '@/services/adminService'
import { useAuth } from '@/contexts/AuthContext'
import { format } from '@/services/copy'

// ============================================
// CARD DE NÚMERO DO MÊS
// ============================================
function MonthStatCard({ label, value, icon, color = 'purple' }) {
  const colorClasses = {
    purple: 'bg-[#32113f]/5 border-[#32113f]/10 text-[#32113f]',
    green: 'bg-green-50 border-green-100 text-green-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700'
  }

  return (
    <div className={`text-center p-4 rounded-xl border ${colorClasses[color]}`}>
      <span className="text-2xl mb-2 block">{icon}</span>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-xs text-[#a39695] mt-1">{label}</p>
    </div>
  )
}

// ============================================
// CARD DE PENDÊNCIA
// ============================================
function PendenciaCard({ label, count, link, icon }) {
  return (
    <Link to={link} className="block">
      <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${
        count > 0
          ? 'bg-amber-50 border-amber-200 hover:border-amber-400'
          : 'bg-gray-50 border-gray-200 hover:border-gray-400'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-heading font-medium text-graphite">{label}</span>
          </div>
          <span className={`text-2xl font-display font-bold ${count > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
            {count}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ============================================
// DASHBOARD PRINCIPAL
// ============================================
export function AdminDashboard() {
  const { profile } = useAuth()
  const [topUsers, setTopUsers] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [discrepancies, setDiscrepancies] = useState([])
  const [checkins, setCheckins] = useState([])
  const [checkinsLoading, setCheckinsLoading] = useState(false)
  const [adminMetrics, setAdminMetrics] = useState(null)
  const [pendencias, setPendencias] = useState(null)
  const [iaFalhas, setIaFalhas] = useState({ count: 0, ultimoErro: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      // Carregar dados em paralelo
      const [
        usersResult,
        transResult,
        discResult,
        checkinsResult,
        metricsResult,
        pendenciasResult,
        iaFalhasResult
      ] = await Promise.all([
        fetchAllUsers(),
        fetchAllTransactions(),
        fetchBalanceDiscrepancies(),
        fetchCheckinsProximos(),
        fetchAdminMetrics(),
        fetchPendencias(),
        fetchIAFalhas24h()
      ])

      if (usersResult.success) {
        const sorted = [...usersResult.users].sort((a, b) => b.points - a.points)
        setTopUsers(sorted.slice(0, 5))
      }
      if (transResult.success) {
        setRecentTransactions(transResult.transactions.slice(0, 5))
      }
      if (discResult.success) {
        setDiscrepancies(discResult.discrepancies)
      }
      if (checkinsResult.success) {
        setCheckins(checkinsResult.checkins)
      }
      if (metricsResult.success) {
        setAdminMetrics(metricsResult.metrics)
      }
      if (pendenciasResult.success) {
        setPendencias(pendenciasResult.pendencias)
      }
      if (iaFalhasResult.success) {
        setIaFalhas(iaFalhasResult)
      }

      setLoading(false)
    }
    loadData()
  }, [])

  // Função para marcar check-in como feito
  async function handleMarcarCheckin(vooId) {
    if (!profile?.id) return
    setCheckinsLoading(true)
    const result = await marcarCheckinFeito(vooId, profile.id)
    if (result.success) {
      setCheckins(prev => prev.map(c =>
        c.vooId === vooId
          ? { ...c, checkinFeitoEm: new Date().toISOString(), checkinFeitoPorNome: profile.name }
          : c
      ))
    }
    setCheckinsLoading(false)
  }

  // Formatar horário local do voo
  function formatHorarioVoo(checkin) {
    if (checkin.partidaLocal) return checkin.partidaLocal
    if (checkin.partidaEm) {
      return new Date(checkin.partidaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return '--:--'
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
          />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="Dashboard"
          subtitle="O que exige ação hoje"
        />

        {/* ════════════════════════════════════════════════════════════
            ALERTAS (discrepâncias e IA)
            ════════════════════════════════════════════════════════════ */}
        {(discrepancies.length > 0 || iaFalhas.count >= 3) && (
          <div className="space-y-3">
            {/* Alerta de discrepâncias */}
            {discrepancies.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="text-sm font-heading font-semibold text-red-800">
                      Discrepância de saldo
                    </h3>
                    <p className="text-xs text-red-700 mt-1">
                      {discrepancies.length} usuário(s) com saldo inconsistente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta de IA (só se 3+ falhas nas últimas 24h) */}
            {iaFalhas.count >= 3 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🤖</span>
                  <div className="flex-1">
                    <h3 className="text-sm font-heading font-semibold text-amber-800">
                      Leitura de cards com falhas ({iaFalhas.count} nas últimas 24h)
                    </h3>
                    {iaFalhas.ultimoErro && (
                      <p className="text-xs text-amber-700 mt-1 truncate">
                        Último erro: {iaFalhas.ultimoErro}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            PENDÊNCIAS (links para cada área)
            ════════════════════════════════════════════════════════════ */}
        {pendencias && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AdminCard>
              <h2 className="text-sm font-heading font-semibold text-[#1f1f1f] mb-4">
                Pendências
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <PendenciaCard
                  label="Emissões"
                  count={pendencias.emissoes || 0}
                  link="/admin/emissoes"
                  icon="✈️"
                />
                <PendenciaCard
                  label="Indicações"
                  count={pendencias.indicacoes || 0}
                  link="/admin/indicacoes"
                  icon="👥"
                />
                <PendenciaCard
                  label="Resgates"
                  count={pendencias.resgates || 0}
                  link="/admin/resgates"
                  icon="🎁"
                />
                <PendenciaCard
                  label="Missões"
                  count={pendencias.missoes || 0}
                  link="/admin/missoes"
                  icon="🎯"
                />
                <PendenciaCard
                  label="Assinaturas"
                  count={pendencias.assinaturas || 0}
                  link="/admin/assinaturas"
                  icon="💳"
                />
              </div>
            </AdminCard>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════
            4 NÚMEROS DO MÊS
            ════════════════════════════════════════════════════════════ */}
        {adminMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <AdminCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-heading font-semibold text-[#1f1f1f]">
                  Este mês
                </h2>
                <Link
                  to="/admin/metricas"
                  className="text-xs text-[#32113f] hover:text-[#5c005a] transition-colors font-heading"
                >
                  Ver métricas completas →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MonthStatCard
                  label="Novos clientes"
                  value={adminMetrics.novosNoMes || 0}
                  icon="👤"
                  color="purple"
                />
                <MonthStatCard
                  label="Novos Prime"
                  value={adminMetrics.conversoesNoMes || 0}
                  icon="⭐"
                  color="amber"
                />
                <MonthStatCard
                  label="Receita assinaturas"
                  value={`R$ ${(adminMetrics.receitaAssinaturasMes || 0).toLocaleString('pt-BR')}`}
                  icon="💰"
                  color="green"
                />
                <MonthStatCard
                  label="Resgates"
                  value={adminMetrics.resgatesNoMes || 0}
                  icon="🎁"
                  color="blue"
                />
              </div>
            </AdminCard>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════
            CHECK-INS DAS PRÓXIMAS 48H
            ════════════════════════════════════════════════════════════ */}
        {checkins.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <AdminCard>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-heading font-semibold text-[#1f1f1f] flex items-center gap-2">
                    <span className="text-lg">✈️</span>
                    Check-ins das próximas 48h
                  </h2>
                  <p className="text-xs text-[#a39695] mt-1">
                    {checkins.filter(c => !c.checkinFeitoEm).length} pendentes de {checkins.length} voos
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {checkins.map((checkin) => (
                  <div
                    key={checkin.vooId}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      checkin.checkinFeitoEm
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-heading font-medium text-[#1f1f1f]">
                          {checkin.clienteNome}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#32113f]/10 text-[#32113f] uppercase">
                          {checkin.sentido || 'trecho'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#a39695]">
                        <span className="font-medium text-[#1f1f1f]">
                          {checkin.origemIata} → {checkin.destinoIata}
                        </span>
                        <span>·</span>
                        <span>{checkin.companhia}{checkin.numeroVoo}</span>
                        <span>·</span>
                        <span className="font-mono">{formatHorarioVoo(checkin)}</span>
                        {checkin.localizador && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-[#32113f]">{checkin.localizador}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {checkin.checkinFeitoEm ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                            <span>✓</span> Feito
                          </span>
                          <p className="text-[10px] text-green-600 mt-0.5">
                            por {checkin.checkinFeitoPorNome}
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarcarCheckin(checkin.vooId)}
                          disabled={checkinsLoading}
                          className="px-3 py-1.5 rounded-lg bg-[#32113f] text-white text-xs font-heading font-medium hover:bg-[#421e53] transition-colors disabled:opacity-50"
                        >
                          Check-in feito
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════
            ÚLTIMAS TRANSAÇÕES
            ════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AdminCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-heading font-semibold text-[#1f1f1f]">
                Últimas transações
              </h2>
              <Link
                to="/admin/historico"
                className="text-xs text-[#32113f] hover:text-[#5c005a] transition-colors font-heading"
              >
                Ver histórico →
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="text-sm text-[#a39695] text-center py-6">
                Nenhuma transação ainda
              </p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading font-medium text-graphite truncate">{t.userName}</p>
                      <p className="text-xs text-[#a39695] truncate">{t.reason}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-sm font-mono font-semibold ${
                        t.amount > 0 ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-[#a39695]">{t.createdAt.split(',')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </motion.div>

        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <AdminCard>
            <h2 className="text-sm font-heading font-semibold text-[#1f1f1f] mb-4">Ações Rápidas</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin/usuarios">
                <AdminButton variant="primary">Creditar Pontos</AdminButton>
              </Link>
              <Link to="/admin/emissoes">
                <AdminButton variant="secondary">Lançar Emissão</AdminButton>
              </Link>
              <Link to="/admin/metricas">
                <AdminButton variant="secondary">Ver Métricas</AdminButton>
              </Link>
            </div>
          </AdminCard>
        </motion.div>
      </div>
    </AdminLayout>
  )
}
