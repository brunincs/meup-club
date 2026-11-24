import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  adminGetWaitlist,
  adminUpdateWaitlistStatus,
  adminExportCSV,
  adminGetWaitlistStats
} from '@/services/waitlistService'
import { getSlotsStatus, invalidateMetricasCache } from '@/services/slotsService'
import { APP_URL, getMetricasClube } from '@/services/acessoService'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

/**
 * AdminAcesso - Gestão do modelo exclusivo
 * 6 Abas: Solicitações, Lista de Espera, Base de Clientes, Vagas, Convites, Configurações
 */
export default function AdminAcesso() {
  const [activeTab, setActiveTab] = useState('solicitacoes')

  const tabs = [
    { id: 'solicitacoes', label: 'Solicitações' },
    { id: 'waitlist', label: 'Lista de Espera' },
    { id: 'clients', label: 'Base de Clientes' },
    { id: 'slots', label: 'Vagas' },
    { id: 'invites', label: 'Convites' },
    { id: 'config', label: 'Configurações' }
  ]

  return (
    <AdminLayout title="Gestão de Acesso" subtitle="Modelo Exclusivo">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-antique-gold text-antique-gold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'solicitacoes' && <SolicitacoesTab />}
      {activeTab === 'waitlist' && <WaitlistTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'slots' && <SlotsTab />}
      {activeTab === 'invites' && <InvitesTab />}
      {activeTab === 'config' && <ConfigTab />}
    </AdminLayout>
  )
}

// ============================================
// ABA: SOLICITAÇÕES DE ACESSO
// ============================================
function SolicitacoesTab() {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [vagas, setVagas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Buscar solicitações pendentes
      const { data: solic, error: solicError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, cpf, status_acesso, solicitacao_acesso_em, created_at, convidado_por')
        .in('status_acesso', ['em_analise', 'em_espera'])
        .order('solicitacao_acesso_em', { ascending: true })

      if (solicError) throw solicError

      // Calcular etiquetas para cada solicitação
      const solicComEtiquetas = await Promise.all(
        (solic || []).map(async (s) => {
          const { data: etiqueta } = await supabase.rpc('calcular_etiqueta_acesso', { p_user_id: s.id })
          const horasAguardando = s.solicitacao_acesso_em
            ? (Date.now() - new Date(s.solicitacao_acesso_em).getTime()) / (1000 * 60 * 60)
            : 0
          return {
            ...s,
            etiqueta: etiqueta || 'nao_cliente',
            horas_aguardando: horasAguardando,
            urgente: horasAguardando > 24
          }
        })
      )

      setSolicitacoes(solicComEtiquetas)

      // Buscar contagem de vagas via serviço centralizado
      const slotsResult = await getSlotsStatus()
      if (slotsResult.success) {
        setVagas({
          free: slotsResult.free,
          prime: slotsResult.prime,
          convites: slotsResult.convites
        })
      }
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err)
      toast.error('Erro ao carregar dados')
    }
    setLoading(false)
  }

  const handleAprovar = async (userId, plano = 'free', criarAssinatura = false) => {
    setActionLoading(userId)
    try {
      const { data, error } = await supabase.rpc('admin_aprovar_usuario', {
        p_user_id: userId,
        p_plano: plano,
        p_criar_assinatura: criarAssinatura
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Erro ao aprovar')

      toast.success('Usuário aprovado!')
      loadData()
    } catch (err) {
      toast.error(err.message || 'Erro ao aprovar')
    }
    setActionLoading(null)
  }

  const handleRecusar = async (userId) => {
    const motivo = prompt('Motivo da recusa (opcional):')
    setActionLoading(userId)
    try {
      const { data, error } = await supabase.rpc('admin_recusar_usuario', {
        p_user_id: userId,
        p_motivo: motivo || null
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Erro ao recusar')

      toast.success('Usuário recusado')
      loadData()
    } catch (err) {
      toast.error(err.message || 'Erro ao recusar')
    }
    setActionLoading(null)
  }

  const handleEspera = async (userId) => {
    setActionLoading(userId)
    try {
      const { data, error } = await supabase.rpc('admin_espera_usuario', {
        p_user_id: userId,
        p_motivo: null
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Erro')

      toast.success('Colocado em espera')
      loadData()
    } catch (err) {
      toast.error(err.message || 'Erro')
    }
    setActionLoading(null)
  }

  const abrirWhatsApp = (phone, name) => {
    const msg = encodeURIComponent(
      `Olá${name ? ' ' + name.split(' ')[0] : ''}! Sua conta no Me,up Club foi aprovada! 🎉\n\nAcesse: ${APP_URL}/login`
    )
    window.open(`https://wa.me/55${phone?.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  const getEtiquetaStyle = (etiqueta) => {
    if (etiqueta?.startsWith('convidado_de:')) {
      return { bg: 'bg-purple-100', text: 'text-purple-700', label: etiqueta.replace('convidado_de:', 'Convidado de ') }
    }
    switch (etiqueta) {
      case 'cliente_emissao':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Cliente com emissão' }
      case 'cliente_base':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Cliente da base' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Não cliente' }
    }
  }

  return (
    <div>
      {/* Contadores de vagas */}
      {vagas && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <p className="text-xs font-medium text-green-600 mb-1">Free</p>
            <p className="text-2xl font-bold text-green-700">
              {vagas.free?.ocupadas || 0}/{vagas.free?.total || 70}
            </p>
            <p className="text-xs text-green-600">{vagas.free?.disponiveis || 0} disponíveis</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
            <p className="text-xs font-medium text-purple-600 mb-1">Prime</p>
            <p className="text-2xl font-bold text-purple-700">
              {vagas.prime?.ocupadas || 0}/{vagas.prime?.total || 30}
            </p>
            <p className="text-xs text-purple-600">{vagas.prime?.disponiveis || 0} disponíveis</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-xs font-medium text-blue-600 mb-1">Convites</p>
            <p className="text-2xl font-bold text-blue-700">
              {vagas.convites?.usados || 0}/{vagas.convites?.total || 60}
            </p>
            <p className="text-xs text-blue-600">{vagas.convites?.disponiveis || 0} disponíveis</p>
          </div>
        </div>
      )}

      {/* Alerta de pendentes */}
      {solicitacoes.filter(s => s.urgente).length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <span className="text-sm text-red-700">
            {solicitacoes.filter(s => s.urgente).length} solicitação(ões) aguardando há mais de 24h
          </span>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Etiqueta</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aguardando</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : solicitacoes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma solicitação pendente
                </td>
              </tr>
            ) : (
              solicitacoes.map(s => {
                const etiquetaStyle = getEtiquetaStyle(s.etiqueta)
                const isLoading = actionLoading === s.id

                return (
                  <tr key={s.id} className={`hover:bg-gray-50 ${s.urgente ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{s.name || 'Sem nome'}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                        {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${etiquetaStyle.bg} ${etiquetaStyle.text}`}>
                        {etiquetaStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status_acesso === 'em_espera' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {s.status_acesso === 'em_espera' ? 'Em espera' : 'Em análise'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${s.urgente ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {Math.floor(s.horas_aguardando)}h
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => handleAprovar(s.id, 'free')}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                        >
                          {isLoading ? '...' : 'Free'}
                        </button>
                        <button
                          onClick={() => handleAprovar(s.id, 'prime', true)}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                        >
                          Prime
                        </button>
                        <button
                          onClick={() => handleEspera(s.id)}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                        >
                          Espera
                        </button>
                        <button
                          onClick={() => handleRecusar(s.id)}
                          disabled={isLoading}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          Recusar
                        </button>
                        {s.phone && (
                          <button
                            onClick={() => abrirWhatsApp(s.phone, s.name)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            title="Enviar boas-vindas no WhatsApp"
                          >
                            📱
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// ABA: LISTA DE ESPERA
// ============================================
function WaitlistTab() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', e_cliente: '', search: '' })

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    setLoading(true)
    const result = await adminGetWaitlist({
      status: filter.status || undefined,
      e_cliente: filter.e_cliente === 'true' ? true : filter.e_cliente === 'false' ? false : undefined,
      search: filter.search || undefined
    })
    setItems(result.items)
    setStats(result.stats)
    setLoading(false)
  }

  const handleExport = async () => {
    const result = await adminExportCSV(filter.status || null)
    if (result.success) {
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lista-espera-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      toast.success('CSV exportado!')
    } else {
      toast.error('Erro ao exportar')
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    const result = await adminUpdateWaitlistStatus(id, newStatus)
    if (result.success) {
      loadData()
      toast.success('Status atualizado')
    } else {
      toast.error('Erro ao atualizar')
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total || 0} />
        <StatCard label="Aguardando" value={stats.aguardando || 0} color="amber" />
        <StatCard label="Clientes" value={stats.clientes || 0} color="green" />
        <StatCard label="Não clientes" value={stats.nao_clientes || 0} color="gray" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filter.status}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Todos os status</option>
          <option value="aguardando">Aguardando</option>
          <option value="convidado">Convidado</option>
          <option value="cadastrado">Cadastrado</option>
          <option value="descartado">Descartado</option>
        </select>

        <select
          value={filter.e_cliente}
          onChange={(e) => setFilter(f => ({ ...f, e_cliente: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Cliente ou não</option>
          <option value="true">Clientes</option>
          <option value="false">Não clientes</option>
        </select>

        <input
          type="text"
          placeholder="Buscar nome/whatsapp..."
          value={filter.search}
          onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 min-w-[200px]"
        />

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-antique-gold text-deep-purple rounded-lg text-sm font-medium"
        >
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhum item encontrado
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{item.nome}</td>
                  <td className="px-4 py-3 text-sm font-mono">{item.whatsapp}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.e_cliente ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-300 text-gray-900'
                    }`}>
                      {item.e_cliente ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      <option value="aguardando">Aguardando</option>
                      <option value="convidado">Convidado</option>
                      <option value="cadastrado">Cadastrado</option>
                      <option value="descartado">Descartado</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================
// ABA: BASE DE CLIENTES
// ============================================
function ClientsTab() {
  const [stats, setStats] = useState({ total: 0, elegíveis: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('base_clientes')
        .select('id', { count: 'exact' })
        .eq('ativo', true)

      setStats({
        total: data?.length || 0,
        elegiveis: data?.length || 0 // Simplificado
      })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Total na Base" value={stats.total} />
        <StatCard label="Elegíveis" value={stats.elegiveis} color="green" />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-medium text-amber-800 mb-2">Importar Base de Clientes</h3>
        <p className="text-sm text-amber-700 mb-4">
          Importe um CSV com colunas: cpf, nome, email, whatsapp, ultima_compra
        </p>

        <div className="flex gap-3">
          <input
            type="file"
            accept=".csv"
            className="text-sm"
            onChange={(e) => {
              // TODO: Implementar import
              toast.success('Funcionalidade em desenvolvimento')
            }}
          />
          <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium">
            Importar CSV
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ABA: VAGAS
// ============================================
function SlotsTab() {
  const [slots, setSlots] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSlots()
  }, [])

  const loadSlots = async () => {
    setLoading(true)
    const result = await getSlotsStatus()
    setSlots(result)
    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando...</div>
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Prime */}
      <div className="bg-gradient-to-br from-deep-purple to-purple-900 rounded-xl p-6 text-white">
        <h3 className="font-heading font-semibold text-antique-gold mb-4">Prime Fundador</h3>
        <div className="text-4xl font-display font-bold mb-2">
          {slots?.prime?.ocupadas || 0}/{slots?.prime?.total || 30}
        </div>
        <p className="text-ice-white/70 text-sm mb-4">vagas ocupadas</p>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-antique-gold rounded-full"
            style={{ width: `${((slots?.prime?.ocupadas || 0) / (slots?.prime?.total || 30)) * 100}%` }}
          />
        </div>
        <p className="text-sm text-ice-white/60 mt-2">
          {slots?.prime?.disponiveis || 0} disponíveis
        </p>
      </div>

      {/* Free */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-heading font-semibold text-deep-purple mb-4">Free (Clientes)</h3>
        <div className="text-4xl font-display font-bold text-deep-purple mb-2">
          {slots?.free?.ocupadas || 0}/{slots?.free?.total || 70}
        </div>
        <p className="text-gray-500 text-sm mb-4">vagas ocupadas</p>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${((slots?.free?.ocupadas || 0) / (slots?.free?.total || 70)) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {slots?.free?.disponiveis || 0} disponíveis
        </p>
      </div>

      {/* Convites */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-heading font-semibold text-blue-800 mb-4">Convites</h3>
        <div className="text-4xl font-display font-bold text-blue-800 mb-2">
          {slots?.convites?.aceitos || 0}/{slots?.convites?.total || 0}
        </div>
        <p className="text-blue-600 text-sm mb-4">aceitos</p>
        <div className="space-y-1 text-sm text-blue-700">
          <p>Emitidos: {slots?.convites?.emitidos || 0}</p>
          <p>Pendentes: {(slots?.convites?.emitidos || 0) - (slots?.convites?.aceitos || 0)}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ABA: CONVITES
// ============================================
function InvitesTab() {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInvites()
  }, [])

  const loadInvites = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('convites')
        .select(`
          id,
          codigo,
          nome_convidado,
          status,
          criado_em,
          aceito_em,
          fundador:fundador_id (id, name, fundador_numero)
        `)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setInvites(data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Agrupar por fundador
  const byFundador = invites.reduce((acc, inv) => {
    const fid = inv.fundador?.id || 'unknown'
    if (!acc[fid]) {
      acc[fid] = {
        fundador: inv.fundador,
        convites: []
      }
    }
    acc[fid].convites.push(inv)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      ) : Object.keys(byFundador).length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nenhum convite emitido</div>
      ) : (
        Object.values(byFundador).map(({ fundador, convites }) => (
          <div key={fundador?.id || 'unknown'} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-medium">{fundador?.name || 'Desconhecido'}</span>
                {fundador?.fundador_numero && (
                  <span className="ml-2 text-xs text-antique-gold">
                    Fundador #{fundador.fundador_numero}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {convites.length} emitidos
                </span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                  {convites.filter(c => c.status === 'aceito').length} aceitos
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {convites.map(conv => (
                <div key={conv.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{conv.nome_convidado}</span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">{conv.codigo}</span>
                  </div>
                  <StatusBadge status={conv.status} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ============================================
// ABA: CONFIGURAÇÕES
// ============================================
function ConfigTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [linkAtivo, setLinkAtivo] = useState(true)
  const [linkCodigo, setLinkCodigo] = useState('LISTA27')
  const [linkExpira, setLinkExpira] = useState('')
  const [vagasFree, setVagasFree] = useState('70')
  const [vagasPrime, setVagasPrime] = useState('30')
  const [vagasConvites, setVagasConvites] = useState('60')
  const [entradasPorLink, setEntradasPorLink] = useState(0)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    setLoading(true)
    try {
      // Buscar configurações do app_config
      const { data: configs, error } = await supabase
        .from('app_config')
        .select('key, value')

      if (error) throw error

      // Mapear valores
      const configMap = {}
      configs?.forEach(c => { configMap[c.key] = c.value })

      setLinkAtivo(configMap.link_lista_ativo === 'true')
      setLinkCodigo(configMap.link_lista_codigo || 'LISTA27')
      setLinkExpira(configMap.link_lista_expira_em?.split('T')[0] || '2026-11-30')
      setVagasFree(configMap.vagas_free_total || '70')
      setVagasPrime(configMap.vagas_prime_total || '30')
      setVagasConvites(configMap.vagas_convidados_total || '60')

      // Contar entradas pelo link
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('origem_acesso', 'link_lista')

      setEntradasPorLink(count || 0)
    } catch (err) {
      console.error('Erro ao carregar configs:', err)
      toast.error('Erro ao carregar configurações')
    }
    setLoading(false)
  }

  const saveConfig = async (key, value) => {
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

      if (error) throw error
      return true
    } catch (err) {
      console.error('Erro ao salvar:', err)
      return false
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const updates = [
        saveConfig('link_lista_ativo', linkAtivo.toString()),
        saveConfig('link_lista_codigo', linkCodigo.toUpperCase()),
        saveConfig('link_lista_expira_em', `${linkExpira}T23:59:59-03:00`),
        saveConfig('vagas_free_total', vagasFree),
        saveConfig('vagas_prime_total', vagasPrime),
        saveConfig('vagas_convidados_total', vagasConvites)
      ]

      await Promise.all(updates)
      toast.success('Configurações salvas!')
    } catch (err) {
      toast.error('Erro ao salvar')
    }
    setSaving(false)
  }

  const copyLink = () => {
    const url = `${window.location.origin}/entrar?c=${linkCodigo}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Link de Entrada */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-graphite">Link de Entrada Automática</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            linkAtivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {linkAtivo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <button
              onClick={() => setLinkAtivo(!linkAtivo)}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                linkAtivo
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {linkAtivo ? 'Desativar Link' : 'Ativar Link'}
            </button>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Código</label>
            <input
              type="text"
              value={linkCodigo}
              onChange={(e) => setLinkCodigo(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              placeholder="LISTA27"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Expira em</label>
            <input
              type="date"
              value={linkExpira}
              onChange={(e) => setLinkExpira(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Entradas pelo link</label>
            <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-semibold text-purple-700">
              {entradasPorLink} usuário(s)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <code className="flex-1 text-sm text-gray-700 font-mono truncate">
            {window.location.origin}/entrar?c={linkCodigo}
          </code>
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-antique-gold text-deep-purple rounded-lg text-sm font-semibold hover:bg-antique-gold/90"
          >
            Copiar Link
          </button>
        </div>
      </div>

      {/* Vagas */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-heading font-semibold text-graphite mb-4">Configuração de Vagas</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vagas Free (total)</label>
            <input
              type="number"
              value={vagasFree}
              onChange={(e) => setVagasFree(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vagas Prime/Fundador (total)</label>
            <input
              type="number"
              value={vagasPrime}
              onChange={(e) => setVagasPrime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vagas Convites (total)</label>
            <input
              type="number"
              value={vagasConvites}
              onChange={(e) => setVagasConvites(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-6 py-3 bg-antique-gold text-deep-purple rounded-xl text-sm font-semibold hover:bg-antique-gold/90 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================
function StatCard({ label, value, color = 'purple' }) {
  const colors = {
    purple: 'bg-deep-purple/5 border-deep-purple/20 text-deep-purple',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  }

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-display font-bold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const statusConfig = {
    aguardando: { label: 'Aguardando', bg: 'bg-amber-100', text: 'text-amber-700' },
    convidado: { label: 'Convidado', bg: 'bg-blue-100', text: 'text-blue-700' },
    cadastrado: { label: 'Cadastrado', bg: 'bg-green-100', text: 'text-green-700' },
    descartado: { label: 'Descartado', bg: 'bg-gray-100', text: 'text-gray-600' },
    disponivel: { label: 'Disponível', bg: 'bg-blue-100', text: 'text-blue-700' },
    enviado: { label: 'Enviado', bg: 'bg-amber-100', text: 'text-amber-700' },
    aceito: { label: 'Aceito', bg: 'bg-green-100', text: 'text-green-700' },
    expirado: { label: 'Expirado', bg: 'bg-gray-100', text: 'text-gray-600' }
  }

  const config = statusConfig[status] || statusConfig.aguardando

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}
