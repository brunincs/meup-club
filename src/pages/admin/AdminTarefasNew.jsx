import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  fetchTarefas,
  createTarefa,
  updateTarefa,
  toggleTarefaAtiva,
  fetchSolicitacoesPendentes,
  aprovarSolicitacao,
  rejeitarSolicitacao
} from '@/services/experienciasService'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

// Configuração de tipos
const tipoConfig = {
  diaria: { label: 'Diária', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  semanal: { label: 'Semanal', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  unica: { label: 'Única', color: 'text-amber-600', bgColor: 'bg-amber-100' }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL DE CRIAR/EDITAR TAREFA
// ══════════════════════════════════════════════════════════════════════════════
function TarefaModal({ tarefa, onClose, onSave }) {
  const isEditing = !!tarefa?.id
  const [formData, setFormData] = useState({
    nome: tarefa?.nome || '',
    descricao: tarefa?.descricao || '',
    pontos: tarefa?.pontos || '',
    tipo: tarefa?.tipo || 'unica',
    icone: tarefa?.icone || '✓',
    ordem: tarefa?.ordem || 0
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome || !formData.descricao || !formData.pontos) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    await onSave({
      ...formData,
      pontos: parseInt(formData.pontos),
      ordem: parseInt(formData.ordem) || 0
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-dusty-rose/20 shadow-xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10">
          <h3 className="text-lg font-display font-bold text-graphite">
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Completar perfil"
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Descrição <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva a tarefa..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all resize-none font-heading"
              required
            />
          </div>

          {/* Pontos e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Pontos <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.pontos}
                onChange={(e) => setFormData({ ...formData, pontos: e.target.value })}
                placeholder="Ex: 100"
                min="1"
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Tipo
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              >
                <option value="diaria">Diária</option>
                <option value="semanal">Semanal</option>
                <option value="unica">Única</option>
              </select>
            </div>
          </div>

          {/* Ícone e Ordem */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Ícone (emoji)
              </label>
              <input
                type="text"
                value={formData.icone}
                onChange={(e) => setFormData({ ...formData, icone: e.target.value })}
                placeholder="✓"
                maxLength={2}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite text-center text-xl focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Ordem de exibição
              </label>
              <input
                type="number"
                value={formData.ordem}
                onChange={(e) => setFormData({ ...formData, ordem: e.target.value })}
                placeholder="0"
                min="0"
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function AdminTarefasNew() {
  const { user } = useAuth()
  const [tarefas, setTarefas] = useState([])
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(true)
  const [filter, setFilter] = useState('all')
  const [tab, setTab] = useState('tarefas') // 'tarefas' ou 'pendentes'
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTarefa, setEditingTarefa] = useState(null)

  // Carregar tarefas
  const loadTarefas = async () => {
    setLoading(true)
    const result = await fetchTarefas(true)
    if (result.success) {
      setTarefas(result.tarefas)
    } else {
      toast.error('Erro ao carregar tarefas')
    }
    setLoading(false)
  }

  // Carregar solicitações pendentes
  const loadSolicitacoes = async () => {
    setLoadingSolicitacoes(true)
    const result = await fetchSolicitacoesPendentes()
    if (result.success) {
      setSolicitacoes(result.solicitacoes)
    }
    setLoadingSolicitacoes(false)
  }

  useEffect(() => {
    loadTarefas()
    loadSolicitacoes()
  }, [])

  // Filtrar tarefas
  const filteredTarefas = tarefas.filter(t => {
    if (filter === 'all') return true
    if (filter === 'ativas') return t.ativa
    if (filter === 'inativas') return !t.ativa
    return true
  })

  // Criar/Editar tarefa
  const handleSave = async (data) => {
    let result
    if (editingTarefa?.id) {
      result = await updateTarefa(editingTarefa.id, data)
    } else {
      result = await createTarefa(data)
    }

    if (result.success) {
      toast.success(editingTarefa ? 'Tarefa atualizada!' : 'Tarefa criada!')
      setModalOpen(false)
      setEditingTarefa(null)
      loadTarefas()
    } else {
      toast.error(result.error || 'Erro ao salvar')
    }
  }

  // Toggle ativa/inativa
  const handleToggle = async (tarefa) => {
    const result = await toggleTarefaAtiva(tarefa.id, !tarefa.ativa)
    if (result.success) {
      toast.success(tarefa.ativa ? 'Tarefa desativada' : 'Tarefa ativada')
      loadTarefas()
    } else {
      toast.error('Erro ao alterar status')
    }
  }

  // Aprovar solicitação
  const handleAprovar = async (solicitacao) => {
    const result = await aprovarSolicitacao(solicitacao.id, user?.id)
    if (result.success) {
      toast.success(`Aprovado! ${result.pontos} pontos creditados`)
      loadSolicitacoes()
    } else {
      toast.error(result.error || 'Erro ao aprovar')
    }
  }

  // Rejeitar solicitação
  const handleRejeitar = async (solicitacao) => {
    const result = await rejeitarSolicitacao(solicitacao.id, user?.id)
    if (result.success) {
      toast.success('Solicitação rejeitada')
      loadSolicitacoes()
    } else {
      toast.error(result.error || 'Erro ao rejeitar')
    }
  }

  const openCreate = () => {
    setEditingTarefa(null)
    setModalOpen(true)
  }

  const openEdit = (tarefa) => {
    setEditingTarefa(tarefa)
    setModalOpen(true)
  }

  const ativasCount = tarefas.filter(t => t.ativa).length
  const pendentesCount = solicitacoes.length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">Tarefas</h1>
            <p className="text-sm text-graphite/70 mt-1 font-heading">
              <span className="text-green-600 font-medium">{ativasCount} ativas</span>
              <span> · {tarefas.length} total</span>
              {pendentesCount > 0 && (
                <span className="text-amber-600 font-medium"> · {pendentesCount} pendentes</span>
              )}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 rounded-xl bg-antique-gold text-deep-purple text-sm font-heading font-semibold hover:bg-accent-light transition-colors shadow-sm"
          >
            + Nova Tarefa
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dusty-rose/20 pb-3">
          <button
            onClick={() => setTab('tarefas')}
            className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors ${
              tab === 'tarefas'
                ? 'bg-deep-purple text-ice-white'
                : 'text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10'
            }`}
          >
            Catálogo de Tarefas
          </button>
          <button
            onClick={() => setTab('pendentes')}
            className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors relative ${
              tab === 'pendentes'
                ? 'bg-deep-purple text-ice-white'
                : 'text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10'
            }`}
          >
            Pendentes de Aprovação
            {pendentesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-semibold">
                {pendentesCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab: Catálogo de Tarefas */}
        {tab === 'tarefas' && (
          <>
            {/* Filtros */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'ativas', label: 'Ativas' },
                { value: 'inativas', label: 'Inativas' }
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-heading font-medium transition-colors ${
                    filter === f.value
                      ? 'bg-antique-gold text-deep-purple shadow-sm'
                      : 'bg-white text-graphite/70 border border-dusty-rose/30 hover:text-graphite hover:border-dusty-rose/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Lista de Tarefas */}
            <div className="space-y-3">
              {loading ? (
                <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
                  />
                  <p className="text-sm text-graphite/70 font-heading">Carregando...</p>
                </div>
              ) : filteredTarefas.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
                  <p className="text-sm text-graphite/70 font-heading">
                    Nenhuma tarefa encontrada
                  </p>
                </div>
              ) : (
                filteredTarefas.map((tarefa, index) => {
                  const tipo = tipoConfig[tarefa.tipo]

                  return (
                    <motion.div
                      key={tarefa.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-4 rounded-2xl border bg-white shadow-sm transition-all ${
                        tarefa.ativa
                          ? 'border-dusty-rose/20 hover:border-dusty-rose/40'
                          : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Ícone */}
                        <span className="w-12 h-12 rounded-xl bg-deep-purple/10 flex items-center justify-center text-2xl flex-shrink-0">
                          {tarefa.icone}
                        </span>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-heading font-semibold text-graphite">
                              {tarefa.nome}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-heading font-medium ${tipo.bgColor} ${tipo.color}`}>
                              {tipo.label}
                            </span>
                            {!tarefa.ativa && (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-heading font-medium bg-gray-100 text-gray-500">
                                Inativa
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-graphite/70 line-clamp-1 font-heading">
                            {tarefa.descricao}
                          </p>
                        </div>

                        {/* Pontos */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-mono font-bold text-antique-gold">
                            +{tarefa.pontos.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-graphite/60 font-heading">pontos</p>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEdit(tarefa)}
                            className="px-3 py-1.5 rounded-xl text-xs font-heading text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggle(tarefa)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${
                              tarefa.ativa
                                ? 'text-gray-500 hover:bg-gray-100'
                                : 'text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {tarefa.ativa ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* Tab: Pendentes de Aprovação */}
        {tab === 'pendentes' && (
          <div className="space-y-3">
            {loadingSolicitacoes ? (
              <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
                />
                <p className="text-sm text-graphite/70 font-heading">Carregando...</p>
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
                <p className="text-lg mb-2">✨</p>
                <p className="text-sm text-graphite/70 font-heading">
                  Nenhuma solicitação pendente
                </p>
              </div>
            ) : (
              solicitacoes.map((sol, index) => (
                <motion.div
                  key={sol.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    {/* Ícone */}
                    <span className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {sol.tarefaIcone}
                    </span>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-heading font-semibold text-graphite mb-1">
                        {sol.tarefaNome}
                      </h3>
                      <p className="text-xs text-graphite/70 font-heading">
                        <span className="font-medium">{sol.userName}</span>
                        {sol.userEmail && <span className="text-graphite/50"> · {sol.userEmail}</span>}
                      </p>
                      <p className="text-xs text-graphite/50 font-heading mt-1">
                        Solicitado em {sol.createdAt}
                      </p>
                    </div>

                    {/* Pontos */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-mono font-bold text-amber-600">
                        +{sol.tarefaPontos.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-graphite/60 font-heading">pontos</p>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAprovar(sol)}
                        className="px-4 py-2 rounded-xl text-xs font-heading font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleRejeitar(sol)}
                        className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <TarefaModal
            tarefa={editingTarefa}
            onClose={() => {
              setModalOpen(false)
              setEditingTarefa(null)
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
