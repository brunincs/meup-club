// ============================================
// MODAL DE REVERSÃO - Admin
// Usado para reabrir, reverter e estornar
// ============================================

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * Modal de confirmação para ações de reversão
 * @param {string} type - 'reabrir' | 'reverter' | 'estornar'
 * @param {string} itemType - 'indicação' | 'emissão' | 'resgate' | 'crédito'
 * @param {object} item - Item sendo revertido (deve ter userName, pontos, etc)
 * @param {number} currentBalance - Saldo atual do cliente (para mostrar impacto)
 * @param {function} onConfirm - Callback com motivo
 * @param {function} onClose - Fechar modal
 * @param {boolean} loading - Estado de loading
 */
export function ReversalModal({
  type = 'reverter',
  itemType = 'indicação',
  item,
  currentBalance,
  onConfirm,
  onClose,
  loading = false
}) {
  const [motivo, setMotivo] = useState('')
  const inputRef = useRef(null)

  // Foco no input ao abrir
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fechar com Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [loading, onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!motivo.trim()) return
    onConfirm(motivo.trim())
  }

  // Configuração por tipo
  const config = {
    reabrir: {
      title: `Reabrir ${itemType}`,
      description: `A ${itemType} voltará para "Pendente" e poderá ser aprovada/rejeitada novamente.`,
      buttonText: 'Reabrir',
      buttonClass: 'bg-amber-500 hover:bg-amber-600',
      icon: '↩️'
    },
    reverter: {
      title: `Reverter aprovação`,
      description: `Os pontos serão estornados e a ${itemType} será marcada como "Revertida".`,
      buttonText: 'Reverter',
      buttonClass: 'bg-purple-600 hover:bg-purple-700',
      icon: '⏪'
    },
    estornar: {
      title: `Estornar crédito`,
      description: `O valor será debitado do saldo do cliente e a transação marcada como "Estornada".`,
      buttonText: 'Estornar',
      buttonClass: 'bg-red-600 hover:bg-red-700',
      icon: '🔄'
    },
    devolver: {
      title: `Reverter e devolver pontos`,
      description: `Os pontos do resgate serão devolvidos ao cliente.`,
      buttonText: 'Devolver pontos',
      buttonClass: 'bg-green-600 hover:bg-green-700',
      icon: '💰'
    }
  }

  const cfg = config[type] || config.reverter

  // Calcular impacto no saldo
  const pontos = item?.pontos || item?.points_awarded || item?.pontos_creditados || item?.points_used || item?.amount || 0
  const isDebit = type === 'estornar' || type === 'reverter'
  const newBalance = isDebit
    ? (currentBalance || 0) - pontos
    : (currentBalance || 0) + pontos

  return (
    <div
      className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cfg.icon}</span>
            <div>
              <h3 className="text-lg font-display font-bold text-graphite">
                {cfg.title}
              </h3>
              <p className="text-sm text-graphite/60">
                {item?.userName || item?.user_name || 'Cliente'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info do item */}
          <div className="p-4 rounded-xl bg-ice-white border border-dusty-rose/10">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-dusty-rose uppercase tracking-wide mb-0.5">Item</p>
                <p className="text-graphite font-medium truncate">
                  {item?.experienciaNome || item?.displayName || item?.referred?.name || item?.description || itemType}
                </p>
              </div>
              <div>
                <p className="text-xs text-dusty-rose uppercase tracking-wide mb-0.5">Pontos</p>
                <p className="text-graphite font-medium">
                  {pontos?.toLocaleString('pt-BR') || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Impacto no saldo (se aplicável) */}
          {pontos > 0 && currentBalance !== undefined && (
            <div className={`p-4 rounded-xl border ${
              newBalance < 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <p className="text-xs text-graphite/60 mb-2">Impacto no saldo:</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-graphite">
                  {currentBalance?.toLocaleString('pt-BR')} pts
                </span>
                <span className="text-graphite/40">→</span>
                <span className={`text-sm font-semibold ${
                  newBalance < 0 ? 'text-red-600' : 'text-graphite'
                }`}>
                  {newBalance?.toLocaleString('pt-BR')} pts
                </span>
              </div>
              {newBalance < 0 && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ Cliente já usou parte desses pontos — operação será bloqueada
                </p>
              )}
            </div>
          )}

          {/* Descrição */}
          <p className="text-sm text-graphite/70">
            {cfg.description}
          </p>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-heading font-medium text-graphite/70 mb-1.5">
              Motivo (obrigatório)
            </label>
            <textarea
              ref={inputRef}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da reversão..."
              rows={3}
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm font-heading text-graphite placeholder-graphite/40 focus:outline-none focus:border-antique-gold/50 disabled:opacity-50"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-ice-white border border-dusty-rose/30 text-sm font-heading font-medium text-graphite hover:bg-dusty-rose/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !motivo.trim()}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-heading font-medium transition-colors disabled:opacity-50 ${cfg.buttonClass}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"
                  />
                  Processando...
                </span>
              ) : cfg.buttonText}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
