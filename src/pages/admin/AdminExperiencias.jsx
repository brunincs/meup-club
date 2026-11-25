import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout, AdminPageHeader, AdminButton } from '@/components/admin/AdminLayout'
import {
  fetchExperiencias,
  createExperiencia,
  updateExperiencia,
  toggleExperienciaAtiva
} from '@/services/experienciasService'
import { levels } from '@/services/pointsSystem'
import { CustomSelect } from '@/components/ui'
import toast from 'react-hot-toast'

// Configuração de selos
const seloConfig = {
  popular: { label: 'Popular', color: 'text-green-600', bgColor: 'bg-green-100' },
  limitado: { label: 'Limitado', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  sonhos: { label: 'Sonhos', color: 'text-purple-600', bgColor: 'bg-purple-100' }
}

// ══════════════════════════════════════════════════════════════════════════════
// CÁLCULO DE PONTOS (mesma lógica do SQL: calcular_pontos_experiencia)
// ══════════════════════════════════════════════════════════════════════════════
// Fatores oficiais (fonte: plano_config)
const FATOR_PRIME = 125
const FATOR_FREE = 150
const ARREDONDAMENTO = 250

// Calcula pontos arredondando para cima ao múltiplo de 250
function calcularPontos(valorReais, fator) {
  if (!valorReais || valorReais <= 0) return 0
  const pontos = valorReais * fator
  return Math.ceil(pontos / ARREDONDAMENTO) * ARREDONDAMENTO
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL DE CRIAR/EDITAR EXPERIÊNCIA
// ══════════════════════════════════════════════════════════════════════════════

function ExperienciaModal({ experiencia, onClose, onSave }) {
  const isEditing = !!experiencia?.id
  const [formData, setFormData] = useState({
    nome: experiencia?.nome || '',
    descricao: experiencia?.descricao || '',
    valor_referencia_reais: experiencia?.valor_referencia_reais || '',
    tipo: experiencia?.tipo || 'fixo',
    classe_minima: experiencia?.classe_minima || 1,
    selo: experiencia?.selo || '',
    imagem_url: experiencia?.imagem_url || '',
    ordem: experiencia?.ordem || 0,
    tipo_entrega: experiencia?.tipo_entrega || 'voucher',
    subtipo_entrega: experiencia?.subtipo_entrega || ''
  })
  const [saving, setSaving] = useState(false)

  // Ajuste manual de pontos (libera edição direta de Prime/Free)
  const [ajusteManual, setAjusteManual] = useState(false)
  const [pontosManual, setPontosManual] = useState({
    prime: experiencia?.pontos_prime || '',
    free: experiencia?.pontos_free || ''
  })

  // Calcular pontos em tempo real (com arredondamento correto)
  const valorReais = parseFloat(formData.valor_referencia_reais) || 0
  const pontosPrimeCalc = calcularPontos(valorReais, FATOR_PRIME)
  const pontosFreeCalc = calcularPontos(valorReais, FATOR_FREE)

  // Pontos finais (manual ou calculado)
  const pontosPrime = ajusteManual ? (parseInt(pontosManual.prime) || 0) : pontosPrimeCalc
  const pontosFree = ajusteManual ? (parseInt(pontosManual.free) || 0) : pontosFreeCalc

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Tipos sem valor obrigatório
    const tipoSemValor = ['sob_consulta', 'privilegio'].includes(formData.tipo)

    if (!formData.nome || !formData.descricao) {
      toast.error('Preencha nome e descrição')
      return
    }

    if (!tipoSemValor && !formData.valor_referencia_reais) {
      toast.error('Preencha o valor de referência')
      return
    }

    setSaving(true)
    await onSave({
      ...formData,
      valor_referencia_reais: parseFloat(formData.valor_referencia_reais) || null,
      pontos_prime: tipoSemValor ? null : pontosPrime,
      pontos_free: tipoSemValor ? null : pontosFree,
      // Compatibilidade com colunas antigas
      pontos: tipoSemValor ? null : pontosFree,
      classe_minima: parseInt(formData.classe_minima),
      ordem: parseInt(formData.ordem) || 0,
      selo: formData.selo || null,
      tipo_entrega: formData.tipo_entrega || 'voucher',
      subtipo_entrega: formData.tipo_entrega === 'servico_voo' ? (formData.subtipo_entrega || null) : null
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

          {/* Tipo da experiência */}
          <div>
            <CustomSelect
              label="Tipo"
              value={formData.tipo}
              onChange={(val) => setFormData({ ...formData, tipo: val })}
              options={[
                { value: 'fixo', label: 'Fixo (preço definido)' },
                { value: 'sob_consulta', label: 'Sob consulta' },
                { value: 'em_breve', label: 'Em breve' },
                { value: 'privilegio', label: 'Privilégio (sem pontos)' }
              ]}
              variant="light"
            />
          </div>

          {/* Valor de referência e Classe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Valor de referência (R$) {!['sob_consulta', 'privilegio'].includes(formData.tipo) && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valor_referencia_reais}
                onChange={(e) => setFormData({ ...formData, valor_referencia_reais: e.target.value })}
                placeholder={['sob_consulta', 'privilegio'].includes(formData.tipo) ? 'Opcional' : 'Ex: 100.00'}
                min="0"
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              />
            </div>
            <div>
              <CustomSelect
                label="Classe mínima"
                value={formData.classe_minima}
                onChange={(val) => setFormData({ ...formData, classe_minima: val })}
                options={levels.map(level => ({
                  value: level.id,
                  label: level.name
                }))}
                variant="light"
              />
            </div>
          </div>

          {/* Preview de preços calculados */}
          {valorReais > 0 && !['sob_consulta', 'privilegio'].includes(formData.tipo) && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-amber-50 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-graphite/60 font-heading">Custo em pontos:</p>
                <label className="flex items-center gap-2 text-xs text-graphite/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ajusteManual}
                    onChange={(e) => {
                      setAjusteManual(e.target.checked)
                      if (e.target.checked) {
                        setPontosManual({ prime: pontosPrimeCalc, free: pontosFreeCalc })
                      }
                    }}
                    className="rounded border-gray-300 text-antique-gold focus:ring-antique-gold/50"
                  />
                  Ajustar manualmente
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 rounded-lg bg-amber-100 border border-amber-200">
                  <p className="text-xs text-amber-700 mb-1">Prime</p>
                  {ajusteManual ? (
                    <input
                      type="number"
                      value={pontosManual.prime}
                      onChange={(e) => setPontosManual({ ...pontosManual, prime: e.target.value })}
                      step="250"
                      min="0"
                      className="w-full text-center text-lg font-display font-bold text-amber-700 bg-transparent border-b border-amber-300 focus:outline-none"
                    />
                  ) : (
                    <p className="text-lg font-display font-bold text-amber-700">{pontosPrime.toLocaleString('pt-BR')}</p>
                  )}
                </div>
                <div className="text-center p-2 rounded-lg bg-white border border-gray-200">
                  <p className="text-xs text-graphite/60 mb-1">Free</p>
                  {ajusteManual ? (
                    <input
                      type="number"
                      value={pontosManual.free}
                      onChange={(e) => setPontosManual({ ...pontosManual, free: e.target.value })}
                      step="250"
                      min="0"
                      className="w-full text-center text-lg font-display font-bold text-graphite bg-transparent border-b border-gray-300 focus:outline-none"
                    />
                  ) : (
                    <p className="text-lg font-display font-bold text-graphite">{pontosFree.toLocaleString('pt-BR')}</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-graphite/70 text-center pt-1 border-t border-gray-200">
                O cliente vai ver: <span className="font-semibold text-amber-700">Prime {pontosPrime.toLocaleString('pt-BR')} pts</span> · <span className="font-semibold">Free {pontosFree.toLocaleString('pt-BR')} pts</span>
              </p>
            </div>
          )}

          {/* Aviso para tipos especiais */}
          {formData.tipo === 'sob_consulta' && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
              Sob consulta: o cliente verá "a partir de X pts" (se houver valor de referência) ou "consulte".
            </div>
          )}
          {formData.tipo === 'privilegio' && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-700">
              Privilégio: o cliente verá "Privilégio · sem pontos" — não consome saldo.
            </div>
          )}
          {formData.tipo === 'em_breve' && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-graphite/70">
              Em breve: aparece com selo "Em breve" e não permite resgate.
            </div>
          )}

          {/* Selo e Ordem */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <CustomSelect
                label="Selo (opcional)"
                value={formData.selo}
                onChange={(val) => setFormData({ ...formData, selo: val })}
                options={[
                  { value: 'popular', label: 'Popular' },
                  { value: 'limitado', label: 'Limitado' },
                  { value: 'sonhos', label: 'Sonhos' }
                ]}
                placeholder="Nenhum"
                variant="light"
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

          {/* Tipo de Entrega */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/50 space-y-4">
            <p className="text-xs text-blue-700 font-heading font-semibold">
              Tipo de Entrega
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CustomSelect
                  label="Como será entregue?"
                  value={formData.tipo_entrega}
                  onChange={(val) => setFormData({
                    ...formData,
                    tipo_entrega: val,
                    subtipo_entrega: val === 'servico_voo' ? formData.subtipo_entrega : ''
                  })}
                  options={[
                    { value: 'voucher', label: 'Voucher / Crédito' },
                    { value: 'servico_voo', label: 'Serviço de Voo' },
                    { value: 'arquivo', label: 'Arquivo Digital' },
                    { value: 'envio_fisico', label: 'Envio Físico' }
                  ]}
                  variant="light"
                />
              </div>
              {formData.tipo_entrega === 'servico_voo' && (
                <div>
                  <CustomSelect
                    label="Subtipo de Serviço"
                    value={formData.subtipo_entrega}
                    onChange={(val) => setFormData({ ...formData, subtipo_entrega: val })}
                    options={[
                      { value: 'assento', label: 'Escolha de Assento' },
                      { value: 'bagagem', label: 'Bagagem Extra' },
                      { value: 'sala_vip', label: 'Acesso a Lounge/Sala VIP' }
                    ]}
                    placeholder="Selecione..."
                    variant="light"
                  />
                </div>
              )}
            </div>
            <p className="text-[10px] text-graphite/50">
              {formData.tipo_entrega === 'voucher' && 'Código gerado automaticamente após aprovação'}
              {formData.tipo_entrega === 'servico_voo' && 'Cliente seleciona viagem e preenche dados do passageiro'}
              {formData.tipo_entrega === 'arquivo' && 'Admin faz upload de PDF/imagem para o cliente'}
              {formData.tipo_entrega === 'envio_fisico' && 'Cliente informa endereço de entrega'}
            </p>
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
        <AdminPageHeader
          title="Experiências"
          subtitle={`${ativasCount} ativas · ${experiencias.length} total`}
          actions={
            <AdminButton onClick={openCreate}>+ Nova Experiência</AdminButton>
          }
        />

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
                        {/* Pontos por tipo */}
                        {exp.tipo === 'privilegio' ? (
                          <span className="font-semibold text-purple-600">Privilégio · sem pontos</span>
                        ) : exp.tipo === 'sob_consulta' ? (
                          <span className="font-semibold text-blue-600">
                            {exp.pontos_prime ? `a partir de ${exp.pontos_prime.toLocaleString('pt-BR')} pts` : 'Sob consulta'}
                          </span>
                        ) : exp.tipo === 'em_breve' ? (
                          <span className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-[10px] font-medium">Em breve</span>
                            {exp.pontos_prime ? (
                              <span className="text-gray-500">{exp.pontos_prime.toLocaleString('pt-BR')} pts</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </span>
                        ) : (
                          <>
                            <span className="font-semibold text-amber-600">
                              Prime {exp.pontos_prime ? exp.pontos_prime.toLocaleString('pt-BR') : '—'}
                            </span>
                            <span className="font-semibold text-graphite">
                              Free {exp.pontos_free ? exp.pontos_free.toLocaleString('pt-BR') : '—'}
                            </span>
                            {(!exp.pontos_prime || !exp.pontos_free) && (
                              <span className="text-red-500 text-[10px]">⚠ sem preço</span>
                            )}
                          </>
                        )}
                        <span className="text-graphite/40">|</span>
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
