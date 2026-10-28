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
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-dusty-rose/20 shadow-xl p-6"
      >
        <h3 className="text-lg font-display font-bold text-graphite mb-1">Ajustar Créditos</h3>
        <p className="text-sm text-dusty-rose font-heading mb-6">
          Ajuste manual de créditos para {user.name}
        </p>

        {/* Current balance */}
        <div className="p-4 rounded-xl bg-deep-purple/5 border border-deep-purple/10 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dusty-rose font-heading">Saldo atual</span>
            <span className="text-lg font-mono font-semibold text-antique-gold">{format.pointsShort(user.points)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs text-dusty-rose font-heading mb-1.5">
              Valor do ajuste
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 100 para adicionar, -50 para remover"
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading"
              required
            />
            <p className="text-xs text-dusty-rose/70 mt-1 font-heading">
              Use valores positivos para adicionar, negativos para remover
            </p>
          </div>

          {/* Preview new balance */}
          {amountValue !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                amountValue > 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-dusty-rose font-heading">Novo saldo:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-semibold ${amountValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {amountValue > 0 ? '+' : ''}{amountValue}
                  </span>
                  <span className="text-dusty-rose">=</span>
                  <span className={`font-mono font-semibold ${newBalance < 0 ? 'text-red-600' : 'text-antique-gold'}`}>
                    {format.pointsShort(Math.max(0, newBalance))}
                  </span>
                </div>
              </div>
              {newBalance < 0 && (
                <p className="text-xs text-red-600 mt-2 font-heading">
                  O saldo final seria negativo. O sistema ajustará para 0.
                </p>
              )}
            </motion.div>
          )}

          {/* Reason input */}
          <div>
            <label className="block text-xs text-dusty-rose font-heading mb-1.5">
              Motivo do ajuste <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do ajuste..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-dusty-rose/50 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all resize-none font-heading"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-dusty-rose hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amountValue === 0 || !reason.trim()}
              className={`flex-1 px-4 py-3 rounded-xl font-heading font-semibold transition-colors disabled:opacity-50 shadow-sm ${
                amountValue > 0
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : amountValue < 0
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-antique-gold text-deep-purple hover:bg-accent-light'
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
