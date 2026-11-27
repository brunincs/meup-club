// ============================================
// MODAL DE EXCLUSÃO DE CONTA (reutilizável)
// Usado em: AdminUsers, AdminAcesso, AdminFundadores
// ============================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { excluirUsuario } from '@/services/adminService'
import toast from 'react-hot-toast'

export function ExcluirContaModal({ user, onClose, onSuccess }) {
  const [confirmText, setConfirmText] = useState('')
  const [processing, setProcessing] = useState(false)

  const canDelete = confirmText === 'EXCLUIR'

  const handleDelete = async () => {
    if (!canDelete) return

    setProcessing(true)
    const result = await excluirUsuario(user.id)

    if (result.success) {
      toast.success(`Conta de ${user.name || user.email || 'usuário'} excluída com sucesso`)
      onSuccess?.()
      onClose()
    } else {
      toast.error(result.error || 'Erro ao excluir conta')
    }
    setProcessing(false)
  }

  const userName = user.name || user.email || 'este usuário'

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-red-200 shadow-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-lg">!</span>
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-graphite">Excluir conta</h3>
            <p className="text-sm text-graphite/70 font-heading">{userName}</p>
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
          <p className="text-sm text-red-800 font-heading">
            Isso apaga a conta de <strong>{userName}</strong>, os pontos, indicações e histórico.
            <br /><strong>Não dá para desfazer.</strong>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-graphite/70 font-heading mb-2">
            Digite <strong>EXCLUIR</strong> para confirmar:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="EXCLUIR"
            className="w-full px-4 py-3 rounded-xl bg-white border border-red-300 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all font-heading"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || processing}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-heading font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Excluindo...' : 'Excluir conta'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
