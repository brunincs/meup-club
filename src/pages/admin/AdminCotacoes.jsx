// ============================================
// ADMIN COTAÇÕES - Validar cotações de clientes
// Credita pontos de indicação quando indicador é Prime
// ============================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  getCotacoesPendentes,
  getTodasCotacoes,
  validarCotacao,
  reverterCotacao,
  formatCotacaoStatus,
  formatCotacaoDate
} from '@/services/cotacaoService'
import toast from 'react-hot-toast'

// ============================================
// MODAL DE VALIDAR COTAÇÃO
// ============================================
function ValidarModal({ cotacao, onConfirm, onClose }) {
  const [destino, setDestino] = useState(cotacao.destino || '')
  const [dataIda, setDataIda] = useState(cotacao.data_ida || '')
  const [dataVolta, setDataVolta] = useState(cotacao.data_volta || '')
  const [numPessoas, setNumPessoas] = useState(cotacao.num_pessoas || 1)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!destino.trim()) {
      toast.error('Informe o destino')
      return
    }
    if (!dataIda) {
      toast.error('Informe a data de ida')
      return
    }
    if (numPessoas < 1) {
      toast.error('Número de pessoas inválido')
      return
    }

    setSubmitting(true)
    await onConfirm({ destino, dataIda, dataVolta, numPessoas })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10 bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="text-lg font-display font-bold text-graphite flex items-center gap-2">
            <span>✓</span> Validar Cotação
          </h3>
          <p className="text-sm text-graphite/60 mt-1">
            {cotacao.user_name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Indicação info */}
          {cotacao.tem_indicacao && (
            <div className={`p-3 rounded-xl text-sm ${
              cotacao.indicador_plano === 'prime'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              {cotacao.indicador_plano === 'prime' ? (
                <>
                  <strong>Indicador Prime</strong> - Ambos ganham +500 pts
                </>
              ) : (
                <>
                  <strong>Indicador Free</strong> - Sem pontos de indicação
                </>
              )}
            </div>
          )}

          {/* Destino */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Destino *
            </label>
            <input
              type="text"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Ex: Lisboa, Portugal"
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Data de Ida *
              </label>
              <input
                type="date"
                value={dataIda}
                onChange={(e) => setDataIda(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-graphite/60 font-heading mb-1.5">
                Data de Volta
              </label>
              <input
                type="date"
                value={dataVolta}
                onChange={(e) => setDataVolta(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
              />
            </div>
          </div>

          {/* Número de pessoas */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Número de Pessoas *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numPessoas}
              onChange={(e) => setNumPessoas(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all font-heading text-sm"
            />
          </div>

          {/* Observações */}
          {cotacao.observacoes && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs text-graphite/60 font-heading mb-1">Observações do cliente:</p>
              <p className="text-sm text-graphite font-heading">{cotacao.observacoes}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white font-heading font-semibold hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Validando...' : 'Validar Cotação'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================
// MODAL DE REVERTER
// ============================================
function ReverterModal({ cotacao, onConfirm, onClose }) {
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await onConfirm(motivo)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10 bg-red-50">
          <h3 className="text-lg font-display font-bold text-graphite">
            Reverter Cotação
          </h3>
          <p className="text-sm text-graphite/60 mt-1">
            {cotacao.user_name} · {cotacao.destino}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {cotacao.pontos_creditados && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <strong>Atenção:</strong> Os pontos creditados serão estornados.
            </div>
          )}

          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Motivo da reversão
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cliente desistiu, dados incorretos..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-deep-purple/50 focus:ring-2 focus:ring-deep-purple/20 transition-all resize-none font-heading text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-heading font-semibold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Revertendo...' : 'Confirmar Reversão'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export function AdminCotacoes() {
  const [cotacoes, setCotacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pendentes')
  const [validarModal, setValidarModal] = useState(null)
  const [reverterModal, setReverterModal] = useState(null)

  // Carregar cotações
  const loadCotacoes = async () => {
    setLoading(true)

    let result
    if (tab === 'pendentes') {
      result = await getCotacoesPendentes()
    } else {
      result = await getTodasCotacoes(tab === 'todas' ? null : tab)
    }

    if (result.success) {
      setCotacoes(result.cotacoes)
    } else {
      toast.error('Erro ao carregar cotações')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadCotacoes()
  }, [tab])

  // Validar cotação
  const handleValidar = async (dados) => {
    const result = await validarCotacao(validarModal.id, dados)

    if (result.success) {
      if (result.pontos_creditados) {
        toast.success(`Cotação validada! +${result.pontos_indicador} pts para indicador, +${result.pontos_indicado} pts para indicado`)
      } else {
        toast.success(result.message || 'Cotação validada!')
      }
      setValidarModal(null)
      loadCotacoes()
    } else {
      toast.error(result.error || 'Erro ao validar')
    }
  }

  // Reverter cotação
  const handleReverter = async (motivo) => {
    const result = await reverterCotacao(reverterModal.id, motivo)

    if (result.success) {
      if (result.estornado_indicador) {
        toast.success(`Cotação revertida! Estornados: -${result.estornado_indicador} pts indicador, -${result.estornado_indicado} pts indicado`)
      } else {
        toast.success('Cotação cancelada!')
      }
      setReverterModal(null)
      loadCotacoes()
    } else {
      toast.error(result.error || 'Erro ao reverter')
    }
  }

  const pendentesCount = cotacoes.filter(c => c.status === 'pendente').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-graphite">Cotações</h1>
          <p className="text-sm text-graphite/70 mt-1 font-heading">
            Validar cotações e creditar pontos de indicação
            {tab === 'pendentes' && pendentesCount > 0 && (
              <span className="text-amber-600 font-medium ml-2">
                · {pendentesCount} pendente{pendentesCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dusty-rose/20 pb-3 overflow-x-auto">
          {[
            { value: 'pendentes', label: 'Pendentes', badge: pendentesCount },
            { value: 'todas', label: 'Todas' },
            { value: 'validada', label: 'Validadas' },
            { value: 'cancelada', label: 'Canceladas' }
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-xl text-sm font-heading font-medium transition-colors relative whitespace-nowrap ${
                tab === t.value
                  ? 'bg-deep-purple text-ice-white'
                  : 'text-graphite/70 hover:text-graphite hover:bg-dusty-rose/10'
              }`}
            >
              {t.label}
              {t.badge > 0 && tab !== t.value && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-semibold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
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
          ) : cotacoes.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
              <p className="text-lg mb-2">
                {tab === 'pendentes' ? '✨' : '📋'}
              </p>
              <p className="text-sm text-graphite/70 font-heading">
                {tab === 'pendentes'
                  ? 'Nenhuma cotação pendente'
                  : 'Nenhuma cotação encontrada'}
              </p>
            </div>
          ) : (
            cotacoes.map((cotacao, index) => {
              const status = formatCotacaoStatus(cotacao.status)
              const isPending = cotacao.status === 'pendente'

              return (
                <motion.div
                  key={cotacao.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-2xl border bg-white shadow-sm transition-all ${
                    isPending
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-dusty-rose/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-deep-purple/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">✈️</span>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-heading font-semibold text-graphite">
                          {cotacao.user_name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-heading font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {cotacao.tem_indicacao && (
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-heading font-medium ${
                            cotacao.indicador_plano === 'prime'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            Indicador {cotacao.indicador_plano === 'prime' ? 'Prime' : 'Free'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-graphite/60 font-heading mb-2">
                        {cotacao.user_email}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-graphite/70 font-heading flex-wrap">
                        <span className="font-medium text-graphite">
                          {cotacao.destino}
                        </span>
                        <span>
                          {formatCotacaoDate(cotacao.data_ida)}
                          {cotacao.data_volta && ` - ${formatCotacaoDate(cotacao.data_volta)}`}
                        </span>
                        <span>
                          {cotacao.num_pessoas} pessoa{cotacao.num_pessoas > 1 ? 's' : ''}
                        </span>
                      </div>

                      {cotacao.observacoes && (
                        <p className="text-xs text-graphite/50 mt-2 font-heading truncate">
                          "{cotacao.observacoes}"
                        </p>
                      )}

                      {cotacao.cancelada_motivo && (
                        <p className="text-xs text-red-600 mt-2 font-heading">
                          Motivo: {cotacao.cancelada_motivo}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPending && (
                        <button
                          onClick={() => setValidarModal(cotacao)}
                          className="px-4 py-2 rounded-xl text-xs font-heading font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                        >
                          Validar
                        </button>
                      )}
                      {cotacao.status === 'validada' && (
                        <button
                          onClick={() => setReverterModal(cotacao)}
                          className="px-4 py-2 rounded-xl text-xs font-heading font-medium bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors"
                        >
                          Reverter
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Validar */}
      <AnimatePresence>
        {validarModal && (
          <ValidarModal
            cotacao={validarModal}
            onConfirm={handleValidar}
            onClose={() => setValidarModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal Reverter */}
      <AnimatePresence>
        {reverterModal && (
          <ReverterModal
            cotacao={reverterModal}
            onConfirm={handleReverter}
            onClose={() => setReverterModal(null)}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
