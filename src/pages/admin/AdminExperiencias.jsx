import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  fetchExperiencias,
  createExperiencia,
  updateExperiencia,
  toggleExperienciaAtiva
} from '@/services/experienciasService'
import { levels } from '@/services/pointsSystem'
import toast from 'react-hot-toast'

// Configuração de selos
const seloConfig = {
  popular: { label: 'Popular', color: 'text-green-600', bgColor: 'bg-green-100' },
  limitado: { label: 'Limitado', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  sonhos: { label: 'Sonhos', color: 'text-purple-600', bgColor: 'bg-purple-100' }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL DE CRIAR/EDITAR EXPERIÊNCIA
// ══════════════════════════════════════════════════════════════════════════════
function ExperienciaModal({ experiencia, onClose, onSave }) {
  const isEditing = !!experiencia?.id
  const [formData, setFormData] = useState({
    nome: experiencia?.nome || '',
    descricao: experiencia?.descricao || '',
    pontos: experiencia?.pontos || '',
    classe_minima: experiencia?.classe_minima || 1,
    selo: experiencia?.selo || '',
    imagem_url: experiencia?.imagem_url || '',
    ordem: experiencia?.ordem || 0
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
      classe_minima: parseInt(formData.classe_minima),
      ordem: parseInt(formData.ordem) || 0,
      selo: formData.selo || null
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
            {isEditing ? 'Editar Experiência' : 'Nova Experiência'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Nome */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Upgrade de voo"
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
              placeholder="Descreva a experiência..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all resize-none font-heading"
              required
            />
          </div>

          {/* Pontos e Classe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Custo em pontos <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.pontos}
                onChange={(e) => setFormData({ ...formData, pontos: e.target.value })}
                placeholder="Ex: 10000"
                min="1"
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Classe mínima
              </label>
              <select
                value={formData.classe_minima}
                onChange={(e) => setFormData({ ...formData, classe_minima: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              >
                {levels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selo e Ordem */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Selo (opcional)
              </label>
              <select
                value={formData.selo}
                onChange={(e) => setFormData({ ...formData, selo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              >
                <option value="">Nenhum</option>
                <option value="popular">Popular</option>
                <option value="limitado">Limitado</option>
                <option value="sonhos">Sonhos</option>
              </select>
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

          {/* URL da Imagem */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              URL da imagem (Unsplash)
            </label>
            <input
              type="url"
              value={formData.imagem_url}
              onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
            />
            {formData.imagem_url && (
              <div className="mt-2 rounded-xl overflow-hidden border border-dusty-rose/20">
                <img
                  src={formData.imagem_url}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
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
export function AdminExperiencias() {
  const [experiencias, setExperiencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExperiencia, setEditingExperiencia] = useState(null)

  // Carregar experiências
  const loadExperiencias = async () => {
    setLoading(true)
    const result = await fetchExperiencias(true) // incluir inativas
    if (result.success) {
      setExperiencias(result.experiencias)
    } else {
      toast.error('Erro ao carregar experiências')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadExperiencias()
  }, [])

  // Filtrar experiências
  const filteredExperiencias = experiencias.filter(exp => {
    if (filter === 'all') return true
    if (filter === 'ativas') return exp.ativa
    if (filter === 'inativas') return !exp.ativa
    return true
  })

  // Criar/Editar experiência
  const handleSave = async (data) => {
    let result
    if (editingExperiencia?.id) {
      result = await updateExperiencia(editingExperiencia.id, data)
    } else {
      result = await createExperiencia(data)
    }

    if (result.success) {
      toast.success(editingExperiencia ? 'Experiência atualizada!' : 'Experiência criada!')
      setModalOpen(false)
      setEditingExperiencia(null)
      loadExperiencias()
    } else {
      toast.error(result.error || 'Erro ao salvar')
    }
  }

  // Toggle ativa/inativa
  const handleToggle = async (exp) => {
    const result = await toggleExperienciaAtiva(exp.id, !exp.ativa)
    if (result.success) {
      toast.success(exp.ativa ? 'Experiência desativada' : 'Experiência ativada')
      loadExperiencias()
    } else {
      toast.error('Erro ao alterar status')
    }
  }

  const openCreate = () => {
    setEditingExperiencia(null)
    setModalOpen(true)
  }

  const openEdit = (exp) => {
    setEditingExperiencia(exp)
    setModalOpen(true)
  }

  const ativasCount = experiencias.filter(e => e.ativa).length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">Experiências</h1>
            <p className="text-sm text-graphite/70 mt-1 font-heading">
              <span className="text-green-600 font-medium">{ativasCount} ativas</span>
              <span> · {experiencias.length} total</span>
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 rounded-xl bg-antique-gold text-deep-purple text-sm font-heading font-semibold hover:bg-accent-light transition-colors shadow-sm"
          >
            + Nova Experiência
          </button>
        </div>

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

        {/* Lista de Experiências */}
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
          ) : filteredExperiencias.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
              <p className="text-sm text-graphite/70 font-heading">
                Nenhuma experiência encontrada
              </p>
            </div>
          ) : (
            filteredExperiencias.map((exp, index) => {
              const level = levels.find(l => l.id === exp.classe_minima)
              const selo = exp.selo ? seloConfig[exp.selo] : null

              return (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-2xl border bg-white shadow-sm transition-all ${
                    exp.ativa
                      ? 'border-dusty-rose/20 hover:border-dusty-rose/40'
                      : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Imagem */}
                    {exp.imagem_url && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-ice-white">
                        <img
                          src={exp.imagem_url}
                          alt={exp.nome}
                          className="w-full h-full object-cover"
                          onError={(e) => e.target.parentElement.style.display = 'none'}
                        />
                      </div>
                    )}

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-heading font-semibold text-graphite">
                          {exp.nome}
                        </h3>
                        {selo && (
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-heading font-medium ${selo.bgColor} ${selo.color}`}>
                            {selo.label}
                          </span>
                        )}
                        {!exp.ativa && (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-heading font-medium bg-gray-100 text-gray-500">
                            Inativa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-graphite/70 line-clamp-1 font-heading mb-2">
                        {exp.descricao}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-graphite/60 font-heading">
                        <span className="font-mono font-semibold text-antique-gold">
                          {exp.pontos.toLocaleString('pt-BR')} pts
                        </span>
                        <span>Classe: {level?.shortName || 'Todas'}</span>
                        <span>Ordem: {exp.ordem}</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEdit(exp)}
                        className="px-3 py-1.5 rounded-xl text-xs font-heading text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggle(exp)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${
                          exp.ativa
                            ? 'text-gray-500 hover:bg-gray-100'
                            : 'text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {exp.ativa ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ExperienciaModal
            experiencia={editingExperiencia}
            onClose={() => {
              setModalOpen(false)
              setEditingExperiencia(null)
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
