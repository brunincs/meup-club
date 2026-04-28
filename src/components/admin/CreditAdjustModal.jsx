import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from '@/services/copy'

export function CreditAdjustModal({ user, onClose, onAdjust }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const amountValue = parseInt(amount) || 0
  const newBalance = user.points + amountValue

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!amount || amountValue === 0) {
      return
    }

    if (!reason.trim()) {
      return
    }

    setIsSubmitting(true)
    await onAdjust(user.id, amountValue, reason.trim())
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-dark-800 rounded-2xl border border-dark-700/50 p-6"
      >
        <h3 className="text-lg font-semibold text-neutral-100 mb-1">Ajustar Créditos</h3>
        <p className="text-sm text-neutral-500 mb-6">
          Ajuste manual de créditos para {user.name}
        </p>

        {/* Current balance */}
        <div className="p-4 rounded-xl bg-dark-700/30 border border-dark-600/30 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Saldo atual</span>
            <span className="text-lg font-mono text-accent-gold">{format.pointsShort(user.points)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">
              Valor do ajuste
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 100 para adicionar, -50 para remover"
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30"
              required
            />
            <p className="text-xs text-neutral-600 mt-1">
              Use valores positivos para adicionar, negativos para remover
            </p>
          </div>

          {/* Preview new balance */}
          {amountValue !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg border ${
                amountValue > 0
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Novo saldo:</span>
                <div className="flex items-center gap-2">
                  <span className={amountValue > 0 ? 'text-green-400' : 'text-red-400'}>
                    {amountValue > 0 ? '+' : ''}{amountValue}
                  </span>
                  <span className="text-neutral-500">=</span>
                  <span className={`font-mono font-medium ${newBalance < 0 ? 'text-red-400' : 'text-accent-gold'}`}>
                    {format.pointsShort(Math.max(0, newBalance))}
                  </span>
                </div>
              </div>
              {newBalance < 0 && (
                <p className="text-xs text-red-400 mt-2">
                  O saldo final seria negativo. O sistema ajustará para 0.
                </p>
              )}
            </motion.div>
          )}

          {/* Reason input */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">
              Motivo do ajuste <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do ajuste..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600/50 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-accent-gold/30 resize-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-dark-600/50 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amountValue === 0 || !reason.trim()}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                amountValue > 0
                  ? 'bg-green-500/80 text-dark-900 hover:bg-green-500'
                  : amountValue < 0
                  ? 'bg-red-500/80 text-white hover:bg-red-500'
                  : 'bg-accent-gold/80 text-dark-900 hover:bg-accent-gold'
              }`}
            >
              {isSubmitting ? 'Salvando...' : amountValue > 0 ? 'Adicionar' : amountValue < 0 ? 'Remover' : 'Confirmar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
