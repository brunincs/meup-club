// ============================================
// ADMIN MÉTRICAS v2 - 30 Fundadores, origens, funil VSL
// ============================================

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Paleta da marca
const CORES = {
  roxo: '#32113f',
  ouro: '#a27937',
  verde: '#22c55e',
  vermelho: '#ef4444'
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

  // Estados por seção (loading/error independentes)
  const [visaoGeral, setVisaoGeral] = useState({ loading: true, error: null, data: null })
  const [primeFundador, setPrimeFundador] = useState({ loading: true, error: null, data: null })
  const [aquisicao, setAquisicao] = useState({ loading: true, error: null, data: null })
  const [vslFunil, setVslFunil] = useState({ loading: true, error: null, data: null })
  const [pontos, setPontos] = useState({ loading: true, error: null, data: null })
  const [engajamento, setEngajamento] = useState({ loading: true, error: null, data: null })
  const [receita, setReceita] = useState({ loading: true, error: null, data: null })

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
        inicio = new Date('2024-01-01')
        fim = hoje
    }

    return { inicio: inicio.toISOString(), fim: fim.toISOString() }
  }, [periodo])

  // Carregar todas as métricas
  useEffect(() => {
    loadVisaoGeral()
  }, [])

  useEffect(() => {
    loadPrimeFundador(datas)
    loadAquisicao(datas)
    loadVslFunil(datas)
    loadPontos(datas)
    loadEngajamento(datas)
    loadReceita(datas)
  }, [datas])

  // Loaders individuais
  const loadVisaoGeral = async () => {
    setVisaoGeral(s => ({ ...s, loading: true }))
    try {
      const { data, error } = await supabase.rpc('metricas_visao_geral')
      if (error) throw error
      setVisaoGeral({ loading: false, error: null, data })
    } catch (err) {
      setVisaoGeral({ loading: false, error: err.message, data: null })
    }
  }

  const loadPrimeFundador = async (datas) => {
    setPrimeFundador(s => ({ ...s, loading: true }))
    try {
      const { data, error } = await supabase.rpc('metricas_prime_fundador', {
        p_inicio: datas.inicio,
        p_fim: datas.fim
      })
      if (error) throw error
      setPrimeFundador({ loading: false, error: null, data })
    } catch (err) {
      setPrimeFundador({ loading: false, error: err.message, data: null })
    }
  }

  const loadAquisicao = async (datas) => {
    setAquisicao(s => ({ ...s, loading: true }))
    try {
      const { data, error } = await supabase.rpc('metricas_aquisicao', {
        p_inicio: datas.inicio,
        p_fim: datas.fim
      })
      if (error) throw error
      setAquisicao({ loading: false, error: null, data })
    } catch (err) {
      setAquisicao({ loading: false, error: err.message, data: null })
    }
  }

  const loadVslFunil = async (datas) => {
    setVslFunil(s => ({ ...s, loading: true }))
    try {
      const { data, error } = await supabase.rpc('metricas_vsl', {
        p_inicio: datas.inicio,
        p_fim: datas.fim
      })
      if (error) throw error
      setVslFunil({ loading: false, error: null, data })
    } catch (err) {
      setVslFunil({ loading: false, error: err.message, data: null })
    }
  }

  const loadPontos = async (datas) => {
    setPontos(s => ({ ...s, loading: true }))
    try {
      const { data, error } = await supabase.rpc('metricas_pontos', {
        p_inicio: datas.inicio,
        p_fim: datas.fim
      })
      if (error) throw error
      setPontos({ loading: false, error: null, data })
    } catch (err) {
      setPontos({ loading: false, error: err.message, data: null })
    }
  }

  const loadEngajamento = async (datas) => {
    setEngajamento(s => ({ ...s, loading: true }))
    try {
      const { data, error } = await supabase.rpc('metricas_engajamento', {
        p_inicio: datas.inicio,
        p_fim: datas.fim
      })
      if (error) throw error
      setEngajamento({ loading: false, error: null, data })
    } catch (err) {
      setEngajamento({ loading: false, error: err.message, data: null })
    }
  }

  const loadReceita = async (datas) => {
    setReceita(s => ({ ...s, loading: true }))
    try {
      const { data, error } = await supabase.rpc('metricas_receita_periodo', {
        p_inicio: datas.inicio,
        p_fim: datas.fim
      })
      if (error) throw error
      setReceita({ loading: false, error: null, data })
    } catch (err) {
      setReceita({ loading: false, error: err.message, data: null })
    }
  }

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

        {/* 1. VISÃO GERAL */}
        <Section title="Visão Geral" icon="📊">
          <SectionContent state={visaoGeral}>
            {visaoGeral.data && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard
                  label="Free"
                  value={visaoGeral.data.free}
                  suffix={`/ ${visaoGeral.data.vagas_free_total}`}
                  color="gray"
                />
                <MetricCard
                  label="Prime"
                  value={visaoGeral.data.prime}
                  color="purple"
                />
                <MetricCard
                  label="Vagas Free"
                  value={visaoGeral.data.vagas_free}
                  suffix="/ 70"
                  color="green"
                />
                <MetricCard
                  label="Vagas Fundador"
                  value={visaoGeral.data.vagas_fundador}
                  suffix="/ 30"
                  color="amber"
                />
                <MetricCard
                  label="Na lista"
                  value={visaoGeral.data.na_lista}
                  color="gray"
                />
              </div>
            )}
          </SectionContent>

          {/* Receita no período */}
          <SectionContent state={receita}>
            {receita.data && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-xs font-heading text-green-700/70 uppercase">Receita Prime no período</p>
                <p className="text-2xl font-display font-bold text-green-700">
                  {formatCurrency(receita.data.receita || 0)}
                </p>
              </div>
            )}
          </SectionContent>
        </Section>

        {/* 2. PRIME FUNDADOR */}
        <Section title="Prime Fundador" icon="👑">
          <SectionContent state={primeFundador}>
            {primeFundador.data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <MetricCard
                    label="Fundadores"
                    value={primeFundador.data.fundadores}
                    suffix="/ 30"
                    color="amber"
                  />
                  <MetricCard
                    label="Vagas restantes"
                    value={primeFundador.data.vagas_restantes}
                    color="gray"
                  />
                  <MetricCard
                    label="Receita"
                    value={formatCurrency(primeFundador.data.receita || 0)}
                    color="green"
                  />
                  <MetricCard
                    label="Free → Prime"
                    value={primeFundador.data.conversoes_free_prime}
                    color="purple"
                  />
                </div>

                {/* Links Prime */}
                <div className="p-4 bg-white rounded-xl border border-dusty-rose/20">
                  <h4 className="text-sm font-heading font-semibold text-graphite mb-3">Links Prime</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-ice-white rounded-lg">
                      <p className="text-lg font-display font-bold text-graphite">{primeFundador.data.links_gerados}</p>
                      <p className="text-xs text-graphite/60">Gerados</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-lg font-display font-bold text-green-700">{primeFundador.data.links_usados}</p>
                      <p className="text-xs text-green-700/60">Usados</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-lg font-display font-bold text-amber-700">{primeFundador.data.links_ativos_sem_uso}</p>
                      <p className="text-xs text-amber-700/60">Ativos s/ uso</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-lg font-display font-bold text-red-700">{primeFundador.data.links_expirados}</p>
                      <p className="text-xs text-red-700/60">Expirados</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SectionContent>
        </Section>

        {/* 3. AQUISIÇÃO */}
        <Section title="Aquisição" icon="🎯">
          <SectionContent state={aquisicao}>
            {aquisicao.data && (
              <>
                {/* Gráfico de barras por origem */}
                {aquisicao.data.por_origem && Object.keys(aquisicao.data.por_origem).length > 0 && (
                  <div className="mb-4 p-4 bg-white rounded-xl border border-dusty-rose/20">
                    <h4 className="text-sm font-heading font-semibold text-graphite mb-4">
                      Cadastros por origem ({aquisicao.data.total} total)
                    </h4>
                    <div className="h-48">
                      <Bar
                        data={{
                          labels: Object.keys(aquisicao.data.por_origem).map(formatOrigem),
                          datasets: [{
                            label: 'Cadastros',
                            data: Object.values(aquisicao.data.por_origem),
                            backgroundColor: CORES.ouro,
                            borderRadius: 4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Indicações */}
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard
                    label="Indicações cadastradas"
                    value={aquisicao.data.indicacoes_cadastradas}
                    color="gray"
                  />
                  <MetricCard
                    label="Com 1ª viagem"
                    value={aquisicao.data.indicacoes_1a_viagem}
                    color="green"
                  />
                  <MetricCard
                    label="Pontos pagos"
                    value={aquisicao.data.indicacoes_pontos_pagos}
                    color="amber"
                  />
                </div>
              </>
            )}
          </SectionContent>
        </Section>

        {/* 4. FUNIL VSL */}
        <Section title="Funil da VSL" icon="🎬">
          <SectionContent state={vslFunil}>
            {vslFunil.data && (
              <div className="space-y-4">
                {/* Funil visual */}
                <div className="p-4 bg-white rounded-xl border border-dusty-rose/20">
                  <div className="space-y-2">
                    <FunnelStep label="Play" value={vslFunil.data.play} total={vslFunil.data.play} />
                    <FunnelStep label="30s" value={vslFunil.data.progress_30s} total={vslFunil.data.play} />
                    <FunnelStep label="60s (liberou)" value={vslFunil.data.progress_60s} total={vslFunil.data.play} />
                    <FunnelStep label="Fim" value={vslFunil.data.complete} total={vslFunil.data.play} />
                    <div className="border-t border-dusty-rose/20 pt-2 mt-2">
                      <FunnelStep label="Clique FREE" value={vslFunil.data.click_free} total={vslFunil.data.play} color="green" />
                      <FunnelStep label="Clique PRIME" value={vslFunil.data.click_prime} total={vslFunil.data.play} color="amber" />
                    </div>
                    <div className="border-t border-dusty-rose/20 pt-2 mt-2">
                      <FunnelStep label="Cadastros VSL" value={vslFunil.data.cadastros_vsl} total={vslFunil.data.play} color="purple" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SectionContent>
        </Section>

        {/* 5. PONTOS */}
        <Section title="Pontos" icon="⭐">
          <SectionContent state={pontos}>
            {pontos.data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <MetricCard
                    label="Emitidos"
                    value={formatNumber(pontos.data.emitidos)}
                    color="green"
                  />
                  <MetricCard
                    label="Resgatados"
                    value={formatNumber(pontos.data.resgatados)}
                    color="amber"
                  />
                  <MetricCard
                    label="Bloqueados"
                    value={formatNumber(pontos.data.bloqueados)}
                    color="red"
                  />
                  <MetricCard
                    label="Em circulação"
                    value={formatNumber(pontos.data.saldo_total)}
                    color="purple"
                  />
                </div>

                {/* Por tipo */}
                {pontos.data.por_tipo && Object.keys(pontos.data.por_tipo).length > 0 && (
                  <div className="p-4 bg-white rounded-xl border border-dusty-rose/20">
                    <h4 className="text-sm font-heading font-semibold text-graphite mb-3">Emitidos por tipo</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(pontos.data.por_tipo).map(([tipo, valor]) => (
                        <div key={tipo} className="flex justify-between items-center p-2 bg-ice-white rounded-lg">
                          <span className="text-sm text-graphite/70 capitalize">{tipo.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-heading font-semibold text-graphite">{formatNumber(valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </SectionContent>
        </Section>

        {/* 6. ENGAJAMENTO */}
        <Section title="Engajamento" icon="📈">
          <SectionContent state={engajamento}>
            {engajamento.data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <MetricCard
                    label="Emissões enviadas"
                    value={engajamento.data.emissoes_enviadas}
                    color="gray"
                  />
                  <MetricCard
                    label="Emissões aprovadas"
                    value={engajamento.data.emissoes_aprovadas}
                    color="green"
                  />
                  <MetricCard
                    label="Missões concluídas"
                    value={engajamento.data.missoes_concluidas}
                    color="purple"
                  />
                  <MetricCard
                    label="Check-ins/dia"
                    value={engajamento.data.checkins_dia}
                    color="amber"
                  />
                </div>

                {/* Resgates por status */}
                {engajamento.data.resgates_por_status && Object.keys(engajamento.data.resgates_por_status).length > 0 && (
                  <div className="p-4 bg-white rounded-xl border border-dusty-rose/20 mb-4">
                    <h4 className="text-sm font-heading font-semibold text-graphite mb-3">Resgates por status</h4>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(engajamento.data.resgates_por_status).map(([status, qtd]) => (
                        <div key={status} className="px-3 py-2 bg-ice-white rounded-lg">
                          <span className="text-sm text-graphite/70 capitalize">{status}: </span>
                          <span className="text-sm font-heading font-semibold text-graphite">{qtd}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Destaque Reels */}
                {engajamento.data.missao_reels > 0 && (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-sm text-purple-700">
                      <span className="font-semibold">{engajamento.data.missao_reels}</span> pessoas concluíram a missão do Reels "Estou dentro"
                    </p>
                  </div>
                )}
              </>
            )}
          </SectionContent>
        </Section>
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
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </motion.div>
  )
}

function SectionContent({ state, children }) {
  if (state.loading) {
    return (
      <div className="flex items-center gap-2 text-graphite/50 py-4">
        <div className="w-4 h-4 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-sm text-red-700">
        Erro: {state.error}
      </div>
    )
  }

  return <>{children}</>
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

function FunnelStep({ label, value, total, color = 'gray' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const colorMap = {
    gray: 'bg-gray-200',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500'
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-graphite/70">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color]} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-sm font-heading font-semibold text-graphite">
        {value} <span className="text-xs text-graphite/50">({pct}%)</span>
      </span>
    </div>
  )
}

// ============================================
// FORMATAÇÃO
// ============================================

function formatNumber(num) {
  if (num == null) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toLocaleString('pt-BR')
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0)
}

function formatOrigem(origem) {
  const map = {
    site: 'Site',
    vsl: 'VSL',
    link_lista: 'Link lista',
    indicacao: 'Indicação',
    link_pagamento: 'Link Prime',
    admin: 'Admin',
    convite: 'Convite'
  }
  return map[origem] || origem
}

export default AdminMetricas
