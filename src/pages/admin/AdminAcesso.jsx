import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  adminGetWaitlist,
  adminUpdateWaitlistStatus,
  adminExportCSV,
  adminGetWaitlistStats
} from '@/services/waitlistService'
import { getSlotsStatus } from '@/services/slotsService'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

/**
 * AdminAcesso - Gestão do modelo exclusivo
 * 5 Abas: Lista de Espera, Base de Clientes, Vagas, Convites, Configurações
 */
export default function AdminAcesso() {
  const [activeTab, setActiveTab] = useState('waitlist')

  const tabs = [
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
      {activeTab === 'waitlist' && <WaitlistTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'slots' && <SlotsTab />}
      {activeTab === 'invites' && <InvitesTab />}
      {activeTab === 'config' && <ConfigTab />}
    </AdminLayout>
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
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('plano_config')
        .select('*')
        .order('key')

      if (error) throw error
      setConfigs(data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleSave = async (key) => {
    try {
      const { error } = await supabase
        .from('plano_config')
        .update({ value: editValue, updated_at: new Date().toISOString() })
        .eq('key', key)

      if (error) throw error

      setEditing(null)
      loadConfigs()
      toast.success('Configuração atualizada')
    } catch (err) {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chave</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                Carregando...
              </td>
            </tr>
          ) : (
            configs.map(config => (
              <tr key={config.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-700">{config.key}</td>
                <td className="px-4 py-3">
                  {editing === config.key ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm">{config.value}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{config.description}</td>
                <td className="px-4 py-3">
                  {editing === config.key ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSave(config.key)}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditing(config.key)
                        setEditValue(config.value)
                      }}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
