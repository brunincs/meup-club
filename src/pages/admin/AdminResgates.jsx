import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  fetchSolicitacoesResgate,
  aprovarResgate,
  rejeitarResgate
} from '@/services/resgateService'
import toast from 'react-hot-toast'

// Configuração de status
const statusConfig = {
  pendente: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  aprovado: { label: 'Aprovado', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
  rejeitado: { label: 'Rejeitado', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' }
}

// Modal de Rejeição
function RejectModal({ solicitacao, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(solicitacao.id, motivo)
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
          Rejeitar Resgate
        </h3>

        <div className="mb-4 p-3 rounded-xl bg-ice-white border border-dusty-rose/10">
          <p className="text-sm text-graphite font-heading">
            <span className="font-semibold">{solicitacao.userName}</span> solicitou:
          </p>
          <p className="text-sm text-graphite/70">
            {solicitacao.displayName || solicitacao.experienciaNome}
          </p>
          <p className="text-xs text-graphite/60 mt-1">
            {solicitacao.pontos.toLocaleString('pt-BR')} pontos
            {solicitacao.quantidade > 1 && ' (total)'}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-heading font-medium text-graphite/70 mb-2">
            Motivo da rejeição (opcional)
          </label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ex: Experiência indisponível no momento..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm font-heading text-graphite placeholder-graphite/40 focus:outline-none focus:border-antique-gold/50"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm font-heading font-medium text-graphite hover:bg-dusty-rose/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-heading font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Rejeitando...' : 'Confirmar Rejeição'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function AdminResgates() {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [stats, setStats] = useState({ pendentes: 0, aprovados: 0, rejeitados: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pendente')
  const [rejectingItem, setRejectingItem] = useState(null)
  const [processing, setProcessing] = useState(null)

  // Carregar dados
  const loadData = async () => {
    setLoading(true)
    const result = await fetchSolicitacoesResgate(filter === 'all' ? null : filter)
    if (result.success) {
      setSolicitacoes(result.solicitacoes)
      setStats(result.stats)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [filter])

  // Aprovar resgate
  const handleAprovar = async (id) => {
    console.log('[AdminResgates] handleAprovar chamado com id:', id)

    if (!id) {
      console.error('[AdminResgates] ID inválido:', id)
      toast.error('Erro: ID da solicitação inválido')
      return
    }

    setProcessing(id)

    try {
      console.log('[AdminResgates] Chamando aprovarResgate...')
      const result = await aprovarResgate(id)
      console.log('[AdminResgates] Resultado:', result)

      if (result.success) {
        toast.success('Resgate aprovado!')
        loadData()
      } else {
        toast.error(result.error || 'Erro ao aprovar')
      }
    } catch (err) {
      console.error('[AdminResgates] Exceção:', err)
      toast.error('Erro inesperado ao aprovar: ' + (err.message || 'Tente novamente'))
    } finally {
      setProcessing(null)
    }
  }

  // Rejeitar resgate
  const handleRejeitar = async (id, motivo) => {
    console.log('[AdminResgates] handleRejeitar chamado com id:', id, 'motivo:', motivo)

    if (!id) {
      console.error('[AdminResgates] ID inválido para rejeição:', id)
      toast.error('Erro: ID da solicitação inválido')
      return
    }

    try {
      console.log('[AdminResgates] Chamando rejeitarResgate...')
      const result = await rejeitarResgate(id, motivo)
      console.log('[AdminResgates] Resultado rejeição:', result)

      if (result.success) {
        toast.success('Resgate rejeitado.')
        setRejectingItem(null)
        loadData()
      } else {
        toast.error(result.error || 'Erro ao rejeitar')
      }
    } catch (err) {
      console.error('[AdminResgates] Exceção na rejeição:', err)
      toast.error('Erro inesperado ao rejeitar: ' + (err.message || 'Tente novamente'))
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-graphite">
              Resgates
            </h1>
            <p className="text-sm text-graphite/70 mt-1 font-heading">
              Gerencie solicitações de resgate de experiências
            </p>
          </div>

          {/* Stats badges */}
          <div className="flex gap-2">
            <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-heading font-semibold">
              {stats.pendentes} pendentes
            </span>
            <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-heading font-semibold">
              {stats.aprovados} aprovados
            </span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'pendente', label: 'Pendentes' },
            { value: 'aprovado', label: 'Aprovados' },
            { value: 'rejeitado', label: 'Rejeitados' },
            { value: 'all', label: 'Todos' }
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

        {/* Lista de solicitações */}
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
          ) : solicitacoes.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dusty-rose/20 bg-white shadow-sm">
              <div className="w-12 h-12 rounded-full bg-dusty-rose/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">★</span>
              </div>
              <p className="text-sm text-graphite/70 font-heading">
                {filter === 'pendente'
                  ? 'Nenhum resgate pendente'
                  : 'Nenhuma solicitação encontrada'}
              </p>
            </div>
          ) : (
            solicitacoes.map((sol, index) => {
              const config = statusConfig[sol.status] || statusConfig.pendente
              const isProcessing = processing === sol.id

              return (
                <motion.div
                  key={sol.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-2xl border bg-white shadow-sm ${
                    sol.status === 'pendente'
                      ? 'border-amber-200'
                      : 'border-dusty-rose/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      {/* Cliente */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-heading font-semibold text-graphite">
                          {sol.userName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-heading ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        {/* Badge de quantidade se > 1 */}
                        {sol.quantidade > 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple text-xs font-heading font-semibold">
                            {sol.quantidade}×
                          </span>
                        )}
                      </div>

                      {/* Experiência (com quantidade no nome se > 1) */}
                      <p className="text-sm text-graphite/80 font-heading mb-1">
                        {sol.displayName || sol.experienciaNome}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-graphite/60 font-heading">
                        <span className="font-mono font-semibold text-deep-purple">
                          {sol.pontos.toLocaleString('pt-BR')} pts
                          {sol.quantidade > 1 && (
                            <span className="text-graphite/50 font-normal ml-1">
                              (total)
                            </span>
                          )}
                        </span>
                        <span>•</span>
                        <span>{sol.createdAt}</span>
                        {sol.status === 'pendente' && (
                          <>
                            <span>•</span>
                            <span className="text-graphite/50">
                              Saldo atual: {sol.userPoints?.toLocaleString('pt-BR')} pts
                            </span>
                          </>
                        )}
                      </div>

                      {/* Comentário admin (se rejeitado) */}
                      {sol.adminComentario && (
                        <p className="mt-2 text-xs text-red-600/80 font-heading italic">
                          Motivo: {sol.adminComentario}
                        </p>
                      )}
                    </div>

                    {/* Ações (só para pendentes) */}
                    {sol.status === 'pendente' && (
                      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('[CLICK] Botão Aprovar clicado, sol.id:', sol.id, 'isProcessing:', isProcessing)
                            if (!isProcessing) {
                              handleAprovar(sol.id)
                            }
                          }}
                          disabled={isProcessing}
                          className="px-4 py-2.5 sm:py-2 rounded-xl bg-green-500 text-white text-xs font-heading font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {isProcessing ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-3 h-3 border border-white/30 border-t-white rounded-full"
                            />
                          ) : (
                            <span>✓</span>
                          )}
                          Aprovar
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('[CLICK] Botão Rejeitar clicado, sol:', sol.id)
                            if (!isProcessing) {
                              setRejectingItem(sol)
                            }
                          }}
                          disabled={isProcessing}
                          className="px-4 py-2.5 sm:py-2 rounded-xl bg-ice-white border border-red-200 text-red-600 text-xs font-heading font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Rejeitar
                        </button>
                      </div>
                    )}

                    {/* Info de processamento (se aprovado/rejeitado) */}
                    {sol.status !== 'pendente' && sol.processedAt && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-graphite/50 font-heading">
                          Processado em {sol.processedAt}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal de rejeição */}
      <AnimatePresence>
        {rejectingItem && (
          <RejectModal
            solicitacao={rejectingItem}
            onClose={() => setRejectingItem(null)}
            onConfirm={handleRejeitar}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
