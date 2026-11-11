// ============================================
// ADMIN: FILA DE ENTREGAS
// Resgates em preparação, ordenados por prazo
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  fetchFilaEntregas,
  marcarEntregue,
  cancelarResgate,
  uploadArquivoEntrega
} from '@/services/resgateService'

// Configuração de tipos de entrega
const TIPO_ENTREGA_CONFIG = {
  voucher: { label: 'Voucher', icon: '🎟️', color: 'text-amber-600', bg: 'bg-amber-100' },
  servico_voo: { label: 'Serviço de Voo', icon: '✈️', color: 'text-blue-600', bg: 'bg-blue-100' },
  arquivo: { label: 'Arquivo', icon: '📄', color: 'text-purple-600', bg: 'bg-purple-100' },
  envio_fisico: { label: 'Envio Físico', icon: '📦', color: 'text-green-600', bg: 'bg-green-100' }
}

const SUBTIPO_LABELS = {
  assento: 'Escolha de Assento',
  bagagem: 'Bagagem Extra',
  sala_vip: 'Acesso a Lounge'
}

// ============================================
// MODAL DE ENTREGA
// ============================================
function EntregarModal({ entrega, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({})
  const [file, setFile] = useState(null)

  const tipoEntrega = entrega.tipoEntrega
  const subtipoEntrega = entrega.subtipoEntrega

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    let entregaDados = { ...formData }

    // Se for arquivo, fazer upload primeiro
    if (tipoEntrega === 'arquivo' && file) {
      const uploadResult = await uploadArquivoEntrega(file, entrega.id)
      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Erro no upload')
        setLoading(false)
        return
      }
      entregaDados.file_path = uploadResult.path
      entregaDados.file_name = uploadResult.fileName
    }

    await onConfirm(entrega.id, entregaDados)
    setLoading(false)
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
            Marcar como Entregue
          </h3>
          <p className="text-sm text-graphite/70 mt-1">
            {entrega.experienciaNome}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info do cliente */}
          <div className="p-3 rounded-xl bg-ice-white border border-dusty-rose/10">
            <p className="text-sm text-graphite">
              <span className="font-semibold">{entrega.userName}</span>
              <span className="text-graphite/60 ml-2">{entrega.userEmail}</span>
            </p>
          </div>

          {/* Dados do formulário do cliente */}
          {entrega.formularioDados && Object.keys(entrega.formularioDados).length > 0 && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold mb-2">Dados informados pelo cliente:</p>
              <div className="space-y-1 text-xs text-graphite/70">
                {Object.entries(entrega.formularioDados).map(([key, value]) => (
                  value && (
                    <div key={key}>
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                      <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Campos específicos por tipo */}

          {/* SERVIÇO DE VOO */}
          {tipoEntrega === 'servico_voo' && (
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Observação para o cliente
              </label>
              <textarea
                value={formData.observacao || ''}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Ex: Assento 14A confirmado para o voo de ida"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all resize-none font-heading text-sm"
              />
            </div>
          )}

          {/* ARQUIVO */}
          {tipoEntrega === 'arquivo' && (
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Arquivo para o cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite text-sm font-heading file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-deep-purple file:text-white hover:file:bg-bright-purple"
              />
              {file && (
                <p className="text-xs text-green-600 mt-1">
                  Arquivo selecionado: {file.name}
                </p>
              )}
            </div>
          )}

          {/* ENVIO FÍSICO */}
          {tipoEntrega === 'envio_fisico' && (
            <>
              <div>
                <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                  Transportadora
                </label>
                <input
                  type="text"
                  value={formData.transportadora || ''}
                  onChange={(e) => setFormData({ ...formData, transportadora: e.target.value })}
                  placeholder="Ex: Correios, Jadlog..."
                  className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                  Código de Rastreio
                </label>
                <input
                  type="text"
                  value={formData.codigo_rastreio || ''}
                  onChange={(e) => setFormData({ ...formData, codigo_rastreio: e.target.value })}
                  placeholder="Ex: BR123456789BR"
                  className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading text-sm font-mono"
                />
              </div>
            </>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (tipoEntrega === 'arquivo' && !file)}
              className="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white font-heading font-semibold hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Confirmar Entrega'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================
// MODAL DE CANCELAMENTO
// ============================================
function CancelarModal({ entrega, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(entrega.id, motivo)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6"
      >
        <h3 className="text-lg font-display font-bold text-graphite mb-4">
          Cancelar Resgate
        </h3>

        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">
            Os pontos serão devolvidos ao cliente.
          </p>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-ice-white border border-dusty-rose/10">
          <p className="text-sm text-graphite">
            <span className="font-semibold">{entrega.userName}</span> - {entrega.experienciaNome}
          </p>
          <p className="text-xs text-graphite/60 mt-1">
            {entrega.pontos.toLocaleString('pt-BR')} pontos
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-heading font-medium text-graphite/70 mb-2">
            Motivo do cancelamento
          </label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ex: Serviço indisponível, cliente solicitou..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm font-heading text-graphite placeholder-graphite/40 focus:outline-none focus:border-red-300 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm font-heading font-medium text-graphite hover:bg-dusty-rose/10 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-heading font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export function AdminFilaEntregas() {
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [entregarModal, setEntregarModal] = useState(null)
  const [cancelarModal, setCancelarModal] = useState(null)

  // Carregar fila
  const loadEntregas = async () => {
    setLoading(true)
    const result = await fetchFilaEntregas()
    if (result.success) {
      setEntregas(result.entregas)
    } else {
      toast.error('Erro ao carregar fila')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadEntregas()
  }, [])

  // Marcar como entregue
  const handleEntregar = async (resgateId, entregaDados) => {
    const result = await marcarEntregue(resgateId, entregaDados)
    if (result.success) {
      toast.success('Resgate marcado como entregue!')
      setEntregarModal(null)
      loadEntregas()
    } else {
      toast.error(result.error || 'Erro ao marcar entrega')
    }
  }

  // Cancelar resgate
  const handleCancelar = async (resgateId, motivo) => {
    const result = await cancelarResgate(resgateId, motivo)
    if (result.success) {
      toast.success('Resgate cancelado. Pontos devolvidos.')
      setCancelarModal(null)
      loadEntregas()
    } else {
      toast.error(result.error || 'Erro ao cancelar')
    }
  }

  const atrasadosCount = entregas.filter(e => e.isAtrasado).length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">
              Fila de Entregas
            </h1>
            <p className="text-sm text-graphite/70 mt-1">
              Resgates aguardando preparo e entrega
            </p>
          </div>

          <div className="flex gap-2">
            {atrasadosCount > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-heading font-semibold">
                {atrasadosCount} atrasados
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-heading font-semibold">
              {entregas.length} na fila
            </span>
          </div>
        </div>

        {/* Link para AdminResgates */}
        <div className="flex gap-3">
          <Link
            to="/admin/resgates"
            className="text-xs font-heading text-deep-purple hover:text-bright-purple transition-colors"
          >
            ← Voltar para Resgates
          </Link>
        </div>

        {/* Lista de Entregas */}
        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-dusty-rose/20 shadow-sm">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full mx-auto mb-3"
            />
            <p className="text-sm text-graphite/70 font-heading">Carregando...</p>
          </div>
        ) : entregas.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-dusty-rose/20 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="text-lg font-heading font-medium text-graphite mb-2">
              Fila vazia!
            </h3>
            <p className="text-sm text-graphite/70">
              Todas as entregas foram processadas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entregas.map((entrega, index) => {
              const tipoConfig = TIPO_ENTREGA_CONFIG[entrega.tipoEntrega] || TIPO_ENTREGA_CONFIG.voucher
              const subtipoLabel = entrega.subtipoEntrega ? SUBTIPO_LABELS[entrega.subtipoEntrega] : null

              return (
                <motion.div
                  key={entrega.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-5 rounded-2xl bg-white border shadow-sm ${
                    entrega.isAtrasado ? 'border-red-300 bg-red-50/30' : 'border-dusty-rose/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      {/* Cliente e tipo */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-heading font-semibold text-graphite">
                          {entrega.userName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-heading ${tipoConfig.bg} ${tipoConfig.color}`}>
                          {tipoConfig.icon} {subtipoLabel || tipoConfig.label}
                        </span>
                        {entrega.isAtrasado && (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-heading bg-red-100 text-red-700 font-semibold">
                            ATRASADO
                          </span>
                        )}
                      </div>

                      {/* Experiência */}
                      <p className="text-sm text-graphite/80 font-heading mb-1">
                        {entrega.quantidade > 1 && `${entrega.quantidade}× `}
                        {entrega.experienciaNome}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-graphite/60">
                        <span className="font-mono font-semibold text-deep-purple">
                          {entrega.pontos.toLocaleString('pt-BR')} pts
                        </span>
                        <span>•</span>
                        <span>Solicitado: {entrega.createdAt}</span>
                      </div>
                    </div>

                    {/* Prazo */}
                    <div className={`text-center px-4 py-2 rounded-xl ${
                      entrega.isAtrasado
                        ? 'bg-red-100 border border-red-200'
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <p className="text-[10px] uppercase tracking-wider text-graphite/60 mb-0.5">
                        Prazo
                      </p>
                      <p className={`text-sm font-heading font-semibold ${
                        entrega.isAtrasado ? 'text-red-700' : 'text-amber-700'
                      }`}>
                        {entrega.prazoFormatado || 'Não definido'}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEntregarModal(entrega)}
                        className="px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-heading font-semibold hover:bg-green-600 transition-colors"
                      >
                        Entregar
                      </button>
                      <button
                        onClick={() => setCancelarModal(entrega)}
                        className="px-4 py-2 rounded-xl bg-ice-white border border-red-200 text-red-600 text-xs font-heading font-medium hover:bg-red-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>

                  {/* Resumo dos dados do formulário */}
                  {entrega.formularioDados && Object.keys(entrega.formularioDados).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dusty-rose/10">
                      <details>
                        <summary className="text-xs text-graphite/60 cursor-pointer hover:text-graphite transition-colors">
                          Ver dados informados
                        </summary>
                        <div className="mt-2 p-3 rounded-lg bg-ice-white text-xs text-graphite/70 grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(entrega.formularioDados).map(([key, value]) => (
                            value && (
                              <div key={key}>
                                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                                <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            )
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Entrega */}
      <AnimatePresence>
        {entregarModal && (
          <EntregarModal
            entrega={entregarModal}
            onClose={() => setEntregarModal(null)}
            onConfirm={handleEntregar}
          />
        )}
      </AnimatePresence>

      {/* Modal de Cancelamento */}
      <AnimatePresence>
        {cancelarModal && (
          <CancelarModal
            entrega={cancelarModal}
            onClose={() => setCancelarModal(null)}
            onConfirm={handleCancelar}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}

export default AdminFilaEntregas
