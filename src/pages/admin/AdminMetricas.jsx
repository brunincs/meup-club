// ============================================
// ADMIN MÉTRICAS - Dashboard analítico completo
// ============================================

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

// Paleta da marca
const CORES = {
  roxo: '#32113f',
  roxoBrilhante: '#5c005a',
  ouro: '#a27937',
  grafite: '#1f1f1f',
  gelo: '#edf0f1'
}

// Opções de período
const PERIODOS = [
  { id: 'mes', label: 'Este mês' },
  { id: 'mes-passado', label: 'Mês passado' },
  { id: '90dias', label: 'Últimos 90 dias' },
  { id: 'tudo', label: 'Desde o início' }
]

export function AdminMetricas() {
  const [periodo, setPeriodo] = useState('mes')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    clientes: null,
    fundadores: null,
    pontos: null,
    aquisicao: null,
    engajamento: null
  })

  // Calcular datas baseado no período
  const datas = useMemo(() => {
    const hoje = new Date()
    let inicio, fim

    switch (periodo) {
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'mes-passado':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59)
        break
      case '90dias':
        inicio = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000)
        fim = hoje
        break
      case 'tudo':
      default:
        inicio = new Date('2024-01-01') // Data de início do sistema
        fim = hoje
    }

    return { inicio: inicio.toISOString(), fim: fim.toISOString() }
  }, [periodo])

  // Buscar todas as métricas
  useEffect(() => {
    async function loadMetrics() {
      setLoading(true)

      const [clientes, fundadores, pontos, aquisicao, engajamento] = await Promise.all([
        fetchClientesMetrics(datas),
        fetchFundadoresMetrics(datas),
        fetchPontosMetrics(datas),
        fetchAquisicaoMetrics(datas),
        fetchEngajamentoMetrics(datas)
      ])

      setMetrics({ clientes, fundadores, pontos, aquisicao, engajamento })
      setLoading(false)
    }

    loadMetrics()
  }, [datas])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">Métricas</h1>
            <p className="text-sm text-graphite/70 mt-1 font-heading">
              Análise detalhada do Me,up Club
            </p>
          </div>

          {/* Filtro de período */}
          <div className="flex flex-wrap gap-2">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-all ${
                  periodo === p.id
                    ? 'bg-deep-purple text-white'
                    : 'bg-ice-white text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-graphite/70">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-4"
            />
            Carregando métricas...
          </div>
        ) : (
          <div className="space-y-8">
            {/* CLIENTES */}
            <Section title="Clientes" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard
                  label="Total Free"
                  value={metrics.clientes?.freeCount || 0}
                  color="gray"
                />
                <MetricCard
                  label="Total Prime"
                  value={metrics.clientes?.primeCount || 0}
                  color="purple"
                />
                <MetricCard
                  label="Novos no período"
                  value={metrics.clientes?.novosNoPeriodo || 0}
                  color="green"
                />
                <MetricCard
                  label="Conversão Free→Prime"
                  value={metrics.clientes?.taxaConversao === '—' ? '—' : `${metrics.clientes?.taxaConversao || 0}%`}
                  color="amber"
                />
                <MetricCard
                  label="Cancelamentos"
                  value={metrics.clientes?.cancelamentos || 0}
                  color="red"
                />
              </div>

              {/* Gráfico de novos clientes por semana */}
              {metrics.clientes?.graficoSemanal?.length > 0 && (
                <div className="mt-6 p-4 bg-white rounded-xl border border-dusty-rose/20">
                  <h4 className="text-sm font-heading font-semibold text-graphite mb-4">
                    Novos clientes por semana
                  </h4>
                  <div className="h-48">
                    <Line
                      data={{
                        labels: metrics.clientes.graficoSemanal.map(d => d.semana),
                        datasets: [{
                          label: 'Novos clientes',
                          data: metrics.clientes.graficoSemanal.map(d => d.count),
                          borderColor: CORES.roxo,
                          backgroundColor: CORES.roxo + '20',
                          tension: 0.3,
                          fill: true
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true, ticks: { stepSize: 1 } }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </Section>

            {/* AÇÃO FUNDADORES */}
            <Section title="Ação Fundadores" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-antique-gold"><path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7l3-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <MetricCard
                  label="Total vendidas"
                  value={metrics.fundadores?.totalVendidas || 0}
                  suffix="/ 100"
                  color="amber"
                />
                <MetricCard
                  label="Lote atual"
                  value={`Lote ${metrics.fundadores?.loteAtual || 1}`}
                  color="purple"
                />
                <MetricCard
                  label="Vagas restantes"
                  value={metrics.fundadores?.vagasRestantes || 0}
                  color="gray"
                />
                <MetricCard
                  label="Receita total"
                  value={formatCurrency(metrics.fundadores?.receitaTotal || 0)}
                  color="green"
                />
              </div>

              {/* Lotes detalhados */}
              <div className="p-4 bg-white rounded-xl border border-dusty-rose/20">
                <h4 className="text-sm font-heading font-semibold text-graphite mb-4">
                  Vendas por lote
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {metrics.fundadores?.lotes?.map(lote => (
                    <div
                      key={lote.numero}
                      className={`p-3 rounded-lg border ${
                        lote.numero === metrics.fundadores?.loteAtual
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-ice-white border-dusty-rose/20'
                      }`}
                    >
                      <p className="text-xs font-heading text-graphite/60">Lote {lote.numero}</p>
                      <p className="text-lg font-display font-bold text-graphite">
                        {lote.vendidas}/{lote.vagas}
                      </p>
                      <p className="text-xs text-graphite/60">R$ {lote.preco}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* PONTOS */}
            <Section title="Pontos" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <MetricCard
                  label="Emitidos no período"
                  value={formatNumber(metrics.pontos?.emitidos || 0)}
                  color="green"
                />
                <MetricCard
                  label="Resgatados no período"
                  value={formatNumber(metrics.pontos?.resgatados || 0)}
                  color="amber"
                />
                <MetricCard
                  label="Expirados no período"
                  value={formatNumber(metrics.pontos?.expirados || 0)}
                  color="red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-dusty-rose/20">
                  <h4 className="text-sm font-heading font-semibold text-graphite mb-2">
                    Saldo total em aberto (passivo)
                  </h4>
                  <p className="text-2xl font-display font-bold text-deep-purple">
                    {formatNumber(metrics.pontos?.saldoTotal || 0)} pts
                  </p>
                  <p className="text-sm text-graphite/60 mt-1">
                    Custo estimado: {formatCurrency(metrics.pontos?.custoEstimado || 0)}
                  </p>
                  <p className="text-xs text-graphite/40 mt-1">
                    (pontos ÷ fator médio × 80%)
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-dusty-rose/20">
                  <h4 className="text-sm font-heading font-semibold text-graphite mb-2">
                    Bloqueados a liberar
                  </h4>
                  <p className="text-2xl font-display font-bold text-amber-600">
                    {formatNumber(metrics.pontos?.bloqueados || 0)} pts
                  </p>
                  <p className="text-sm text-graphite/60 mt-1">
                    Bônus Prime (boas-vindas e indicação)
                  </p>
                  <p className="text-xs text-graphite/40 mt-1">
                    Viagem e indicação de compra liberam na hora
                  </p>
                </div>
              </div>

              {/* Gráfico de pontos por semana */}
              {metrics.pontos?.graficoSemanal?.length > 0 && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-dusty-rose/20">
                  <h4 className="text-sm font-heading font-semibold text-graphite mb-4">
                    Emissão vs Resgate por semana
                  </h4>
                  <div className="h-48">
                    <Line
                      data={{
                        labels: metrics.pontos.graficoSemanal.map(d => d.semana),
                        datasets: [
                          {
                            label: 'Emitidos',
                            data: metrics.pontos.graficoSemanal.map(d => d.emitidos),
                            borderColor: CORES.ouro,
                            backgroundColor: 'transparent',
                            tension: 0.3
                          },
                          {
                            label: 'Resgatados',
                            data: metrics.pontos.graficoSemanal.map(d => d.resgatados),
                            borderColor: CORES.roxo,
                            backgroundColor: 'transparent',
                            tension: 0.3
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                        scales: { y: { beginAtZero: true } }
                      }}
                    />
                  </div>
                </div>
              )}
            </Section>

            {/* AQUISIÇÃO */}
            <Section title="Aquisição" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Indicações convertidas"
                  value={metrics.aquisicao?.indicacoesConvertidas || 0}
                  color="green"
                />
                <MetricCard
                  label="Pontos pagos em indicação"
                  value={formatNumber(metrics.aquisicao?.pontosPagos || 0)}
                  color="amber"
                />
                <MetricCard
                  label="CAC em pontos"
                  value={formatNumber(metrics.aquisicao?.cacPontos || 0)}
                  suffix=" pts"
                  color="purple"
                />
                <MetricCard
                  label="CAC em R$"
                  value={formatCurrency(metrics.aquisicao?.cacReais || 0)}
                  color="gray"
                />
              </div>
            </Section>

            {/* ENGAJAMENTO */}
            <Section title="Engajamento" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" strokeLinejoin="round"/><line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <MetricCard
                  label="Check-ins/dia (média)"
                  value={(metrics.engajamento?.checkinsMediaDia || 0).toFixed(1)}
                  color="purple"
                />
                <MetricCard
                  label="Missões concluídas"
                  value={metrics.engajamento?.missoesConcluidas || 0}
                  color="green"
                />
                <MetricCard
                  label="Instalações do app"
                  value={metrics.engajamento?.instalacoes || 0}
                  color="amber"
                />
                <MetricCard
                  label="Push ativos"
                  value={metrics.engajamento?.pushAtivos || 0}
                  color="gray"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Missões por tipo */}
                {metrics.engajamento?.missoesPorTipo && (
                  <div className="p-4 bg-white rounded-xl border border-dusty-rose/20">
                    <h4 className="text-sm font-heading font-semibold text-graphite mb-3">
                      Missões por tipo
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(metrics.engajamento.missoesPorTipo).map(([tipo, count]) => (
                        <div key={tipo} className="flex justify-between items-center">
                          <span className="text-sm text-graphite/70 capitalize">
                            {tipo.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-heading font-semibold text-graphite">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top 5 experiências resgatadas */}
                {metrics.engajamento?.topExperiencias?.length > 0 && (
                  <div className="p-4 bg-white rounded-xl border border-dusty-rose/20">
                    <h4 className="text-sm font-heading font-semibold text-graphite mb-3">
                      Top 5 experiências resgatadas
                    </h4>
                    <div className="space-y-2">
                      {metrics.engajamento.topExperiencias.map((exp, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-sm text-graphite/70 truncate max-w-[200px]">
                            {i + 1}. {exp.nome}
                          </span>
                          <span className="text-sm font-heading font-semibold text-graphite">
                            {exp.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico de resgates */}
              {metrics.engajamento?.topExperiencias?.length > 0 && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-dusty-rose/20">
                  <h4 className="text-sm font-heading font-semibold text-graphite mb-4">
                    Resgates por experiência
                  </h4>
                  <div className="h-48">
                    <Bar
                      data={{
                        labels: metrics.engajamento.topExperiencias.map(e =>
                          e.nome.length > 20 ? e.nome.slice(0, 20) + '...' : e.nome
                        ),
                        datasets: [{
                          label: 'Resgates',
                          data: metrics.engajamento.topExperiencias.map(e => e.count),
                          backgroundColor: CORES.ouro,
                          borderRadius: 4
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true, ticks: { stepSize: 1 } }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function Section({ title, icon, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dusty-rose/20 bg-white/50 p-6"
    >
      <h3 className="text-lg font-display font-bold text-graphite flex items-center gap-2 mb-4">
        {typeof icon === 'string' ? <span>{icon}</span> : icon}
        {title}
      </h3>
      {children}
    </motion.div>
  )
}

function MetricCard({ label, value, suffix = '', color = 'gray' }) {
  const colorClasses = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700'
  }

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <p className="text-xs font-heading uppercase opacity-70">{label}</p>
      <p className="text-2xl font-display font-bold">
        {value}
        {suffix && <span className="text-sm opacity-50 ml-1">{suffix}</span>}
      </p>
    </div>
  )
}

// ============================================
// FUNÇÕES DE FORMATAÇÃO
// ============================================

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toLocaleString('pt-BR')
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// ============================================
// FUNÇÕES DE BUSCA DE MÉTRICAS
// ============================================

async function fetchClientesMetrics(datas) {
  try {
    // Total de clientes (não-admin)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role')
      .neq('role', 'admin')

    const totalClientes = profiles?.length || 0
    const clienteIds = new Set(profiles?.map(p => p.id) || [])

    // Clientes Prime (assinaturas ativas de não-admins)
    const { data: assinaturas } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')

    // Filtrar apenas assinaturas de não-admins
    const primeUserIds = new Set(
      (assinaturas || [])
        .filter(s => clienteIds.has(s.user_id))
        .map(s => s.user_id)
    )
    const primeCount = primeUserIds.size
    const freeCount = totalClientes - primeCount

    // Novos no período
    const { count: novosNoPeriodo } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'admin')
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)

    // Conversões no período (assinaturas criadas no período)
    const { count: conversoes } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)

    // Taxa de conversão = conversões / Free no início do período
    // Free no início = Free atual + conversões no período
    const freeNoInicio = freeCount + (conversoes || 0)
    const taxaConversao = freeNoInicio > 0
      ? ((conversoes || 0) / freeNoInicio * 100).toFixed(1)
      : '—'

    // Cancelamentos no período
    const { count: cancelamentos } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'canceled')
      .gte('updated_at', datas.inicio)
      .lte('updated_at', datas.fim)

    // Gráfico semanal - novos clientes
    const { data: novosData } = await supabase
      .from('profiles')
      .select('created_at')
      .neq('role', 'admin')
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)
      .order('created_at')

    const graficoSemanal = agruparPorSemana(novosData || [], 'created_at')

    return {
      totalClientes,
      freeCount,
      primeCount,
      novosNoPeriodo: novosNoPeriodo || 0,
      taxaConversao,
      cancelamentos: cancelamentos || 0,
      graficoSemanal
    }
  } catch (error) {
    console.error('Erro ao buscar métricas de clientes:', error)
    return null
  }
}

async function fetchFundadoresMetrics(datas) {
  try {
    // Buscar fundadores da tabela fundadores (fonte real)
    const { data: fundadoresData } = await supabase
      .from('fundadores')
      .select('id, vaga_numero, selo_ativado, created_at')
      .eq('selo_ativado', true)

    const totalVendidas = fundadoresData?.length || 0

    // Buscar lotes do banco de dados
    const { data: lotesDb } = await supabase
      .from('fundadores_lotes')
      .select('lote_numero, vagas_total, preco')
      .order('lote_numero')

    // Definir lotes (3 lotes: 20/40/40 = 100 total)
    const lotesConfig = lotesDb?.length > 0
      ? lotesDb.map(l => ({ numero: l.lote_numero, vagas: l.vagas_total, preco: parseFloat(l.preco) }))
      : [
          { numero: 1, vagas: 20, preco: 497 },
          { numero: 2, vagas: 40, preco: 597 },
          { numero: 3, vagas: 40, preco: 697 }
        ]

    // Agrupar vendas por lote baseado no vaga_numero
    const porLote = {}
    fundadoresData?.forEach(f => {
      const vagaNum = f.vaga_numero
      let vagaAcumulada = 0
      for (const lote of lotesConfig) {
        vagaAcumulada += lote.vagas
        if (vagaNum <= vagaAcumulada) {
          porLote[lote.numero] = (porLote[lote.numero] || 0) + 1
          break
        }
      }
    })

    // Calcular lote atual e receita
    let loteAtual = 1
    let receitaTotal = 0
    const lotes = lotesConfig.map(lote => {
      const vendidas = porLote[lote.numero] || 0
      receitaTotal += vendidas * lote.preco
      if (vendidas < lote.vagas && loteAtual === lote.numero) {
        loteAtual = lote.numero
      } else if (vendidas >= lote.vagas && loteAtual === lote.numero) {
        loteAtual = lote.numero + 1
      }
      return { ...lote, vendidas }
    })

    return {
      totalVendidas,
      loteAtual: Math.min(loteAtual, 3),
      vagasRestantes: 100 - totalVendidas,
      receitaTotal,
      lotes
    }
  } catch (error) {
    console.error('Erro ao buscar métricas de fundadores:', error)
    return null
  }
}

async function fetchPontosMetrics(datas) {
  try {
    // Buscar fatores de conversão do banco
    const { data: configData } = await supabase
      .from('plano_config')
      .select('chave, valor')
      .in('chave', ['fator_pontos_free', 'fator_pontos_prime'])

    const config = {}
    configData?.forEach(c => { config[c.chave] = c.valor })
    const fatorFree = config.fator_pontos_free || 150
    const fatorPrime = config.fator_pontos_prime || 125

    // Pontos emitidos no período
    const { data: emitidosData } = await supabase
      .from('point_transactions')
      .select('amount, created_at')
      .gt('amount', 0)
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)

    const emitidos = emitidosData?.reduce((sum, t) => sum + t.amount, 0) || 0

    // Pontos resgatados no período
    const { data: resgatesData } = await supabase
      .from('point_transactions')
      .select('amount, created_at')
      .lt('amount', 0)
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)

    const resgatados = Math.abs(resgatesData?.reduce((sum, t) => sum + t.amount, 0) || 0)

    // Pontos expirados (se houver tabela)
    const expirados = 0 // TODO: implementar se houver controle de expiração

    // Saldo por usuário com plano
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, points')
      .neq('role', 'admin')

    // Buscar assinaturas ativas para saber quem é Prime
    const { data: assinaturas } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')

    const primeUserIds = new Set(assinaturas?.map(s => s.user_id) || [])

    // Calcular saldo total e custo por plano
    let saldoTotal = 0
    let custoEstimado = 0

    profilesData?.forEach(p => {
      const pontos = p.points || 0
      saldoTotal += pontos

      // Custo = pontos / fator × 0.80
      const fator = primeUserIds.has(p.id) ? fatorPrime : fatorFree
      custoEstimado += (pontos / fator) * 0.80
    })

    // Pontos bloqueados (pendentes de liberação)
    const { data: bloqueadosData } = await supabase
      .from('pending_points')
      .select('pontos')
      .eq('status', 'pendente')
      .gt('liberar_em', new Date().toISOString())

    const bloqueados = bloqueadosData?.reduce((sum, p) => sum + (p.pontos || 0), 0) || 0

    // Gráfico semanal
    const todasTransacoes = [...(emitidosData || []), ...(resgatesData || [])]
    const graficoSemanal = agruparPontosPorSemana(todasTransacoes)

    return {
      emitidos,
      resgatados,
      expirados,
      saldoTotal,
      custoEstimado,
      bloqueados,
      graficoSemanal
    }
  } catch (error) {
    console.error('Erro ao buscar métricas de pontos:', error)
    return null
  }
}

async function fetchAquisicaoMetrics(datas) {
  try {
    // Buscar fator médio (usar Prime como padrão pois indicações geralmente são de Prime)
    const { data: configData } = await supabase
      .from('plano_config')
      .select('chave, valor')
      .in('chave', ['fator_pontos_free', 'fator_pontos_prime'])

    const config = {}
    configData?.forEach(c => { config[c.chave] = c.valor })
    const fatorPrime = config.fator_pontos_prime || 125

    // Indicações convertidas (com viagem ou Prime ativado no período)
    const { data: indicacoesData } = await supabase
      .from('referrals')
      .select('id, primeira_viagem_em, prime_anual_ativado_em')
      .or(`primeira_viagem_em.gte.${datas.inicio},prime_anual_ativado_em.gte.${datas.inicio}`)

    // Filtrar indicações que tiveram conversão no período
    const indicacoesConvertidas = indicacoesData?.filter(r => {
      const viagemNoPeriodo = r.primeira_viagem_em &&
        r.primeira_viagem_em >= datas.inicio && r.primeira_viagem_em <= datas.fim
      const primeNoPeriodo = r.prime_anual_ativado_em &&
        r.prime_anual_ativado_em >= datas.inicio && r.prime_anual_ativado_em <= datas.fim
      return viagemNoPeriodo || primeNoPeriodo
    })?.length || 0

    // Pontos pagos em indicação
    const { data: pontosIndicacao } = await supabase
      .from('point_transactions')
      .select('amount')
      .eq('type', 'referral')
      .gt('amount', 0)
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)

    const pontosPagos = pontosIndicacao?.reduce((sum, t) => sum + t.amount, 0) || 0

    // CAC em pontos = pontos pagos / indicações convertidas
    const cacPontos = indicacoesConvertidas > 0
      ? Math.round(pontosPagos / indicacoesConvertidas)
      : 0

    // CAC em R$ = pontos / fator × 0.80
    const cacReais = (cacPontos / fatorPrime) * 0.80

    return {
      indicacoesConvertidas,
      pontosPagos,
      cacPontos,
      cacReais
    }
  } catch (error) {
    console.error('Erro ao buscar métricas de aquisição:', error)
    return null
  }
}

async function fetchEngajamentoMetrics(datas) {
  try {
    // Check-ins no período (tabela checkins, não voos)
    const { data: checkinsData } = await supabase
      .from('checkins')
      .select('created_at')
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)

    const totalCheckins = checkinsData?.length || 0
    const diasNoPeriodo = Math.max(1, Math.ceil(
      (new Date(datas.fim) - new Date(datas.inicio)) / (1000 * 60 * 60 * 24)
    ))
    const checkinsMediaDia = totalCheckins / diasNoPeriodo

    // Missões manuais concluídas (tarefa_solicitacoes)
    const { data: tarefasData } = await supabase
      .from('tarefa_solicitacoes')
      .select('tarefa_id')
      .eq('status', 'aprovada')
      .gte('updated_at', datas.inicio)
      .lte('updated_at', datas.fim)

    // Missões automáticas concluídas
    const { data: missoesAutoData } = await supabase
      .from('missoes_automaticas_concluidas')
      .select('missao_tipo')
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)

    const missoesManuais = tarefasData?.length || 0
    const missoesAuto = missoesAutoData?.length || 0
    const missoesConcluidas = missoesManuais + missoesAuto

    // Agrupar missões por tipo
    const missoesPorTipo = {}
    tarefasData?.forEach(m => {
      missoesPorTipo['manual'] = (missoesPorTipo['manual'] || 0) + 1
    })
    missoesAutoData?.forEach(m => {
      const tipo = m.missao_tipo || 'outro'
      missoesPorTipo[tipo] = (missoesPorTipo[tipo] || 0) + 1
    })

    // Top 5 experiências resgatadas (tabela resgate_solicitacoes)
    const { data: resgatesData } = await supabase
      .from('resgate_solicitacoes')
      .select('experiencia_id, experiencias:experiencia_id(nome)')
      .eq('status', 'aprovado')
      .gte('created_at', datas.inicio)
      .lte('created_at', datas.fim)

    const expCounts = {}
    resgatesData?.forEach(r => {
      const nome = r.experiencias?.nome || 'Desconhecida'
      expCounts[nome] = (expCounts[nome] || 0) + 1
    })

    const topExperiencias = Object.entries(expCounts)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Instalações do app (app_eventos)
    const { count: instalacoes } = await supabase
      .from('app_eventos')
      .select('*', { count: 'exact', head: true })
      .eq('evento', 'pwa_installed')
      .gte('criado_em', datas.inicio)
      .lte('criado_em', datas.fim)

    // Push ativos
    const { count: pushAtivos } = await supabase
      .from('push_inscricoes')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)

    return {
      checkinsMediaDia,
      missoesConcluidas,
      missoesPorTipo,
      topExperiencias,
      instalacoes: instalacoes || 0,
      pushAtivos: pushAtivos || 0
    }
  } catch (error) {
    console.error('Erro ao buscar métricas de engajamento:', error)
    return null
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function agruparPorSemana(dados, campoData) {
  const semanas = {}

  dados.forEach(item => {
    const data = new Date(item[campoData])
    const semana = getWeekString(data)
    semanas[semana] = (semanas[semana] || 0) + 1
  })

  return Object.entries(semanas)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([semana, count]) => ({ semana, count }))
}

function agruparPontosPorSemana(transacoes) {
  const semanas = {}

  transacoes.forEach(t => {
    const data = new Date(t.created_at)
    const semana = getWeekString(data)

    if (!semanas[semana]) {
      semanas[semana] = { emitidos: 0, resgatados: 0 }
    }

    if (t.amount > 0) {
      semanas[semana].emitidos += t.amount
    } else {
      semanas[semana].resgatados += Math.abs(t.amount)
    }
  })

  return Object.entries(semanas)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([semana, dados]) => ({
      semana,
      emitidos: dados.emitidos,
      resgatados: dados.resgatados
    }))
}

function getWeekString(data) {
  const startOfYear = new Date(data.getFullYear(), 0, 1)
  const weekNum = Math.ceil((((data - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7)
  return `S${weekNum.toString().padStart(2, '0')}`
}
