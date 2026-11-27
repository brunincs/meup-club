// ============================================
// MODAL PARA COLETAR @ DO INSTAGRAM
// Reutilizável em Tasks.jsx e MissionsSection.jsx
// ============================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Valida e formata o @ do Instagram
 */
export function validateInstagramHandle(handle) {
  if (!handle || !handle.trim()) {
    return { valid: false, error: 'Informe seu @ do Instagram' }
  }

  // Remove @ se tiver
  let cleaned = handle.trim().replace(/^@/, '')

  // Validar: só letras, números, pontos e underscores
  if (!/^[a-zA-Z0-9._]+$/.test(cleaned)) {
    return { valid: false, error: 'Instagram inválido. Use apenas letras, números, . e _' }
  }

  // Mínimo 1, máximo 30 caracteres
  if (cleaned.length < 1 || cleaned.length > 30) {
    return { valid: false, error: 'Instagram deve ter entre 1 e 30 caracteres' }
  }

  return { valid: true, formatted: `@${cleaned}` }
}

/**
 * Modal para coletar @ do Instagram antes de solicitar missão
 */
export function InstagramHandleModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const validation = validateInstagramHandle(handle)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    setError('')
    onSubmit(validation.formatted)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
        >
          <h3 className="text-lg font-display font-bold mb-2" style={{ color: '#32113f' }}>
            Qual seu @ do Instagram?
          </h3>
          <p className="text-sm text-graphite/70 mb-4">
            Precisamos do seu @ para verificar que você comentou no Reels.
          </p>

          <input
            type="text"
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="@seu.usuario"
            className="w-full px-4 py-3 rounded-xl border text-graphite placeholder:text-graphite/40 focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: error ? '#ef4444' : '#ddd1d0',
              backgroundColor: '#fafafa'
            }}
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-xs mt-2">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border font-heading font-medium hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#ddd1d0', color: '#5c5c5c' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !handle.trim()}
              className="flex-1 px-4 py-3 rounded-xl font-heading font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #a27937 0%, #c9a55c 100%)',
                color: '#32113f'
              }}
            >
              {isLoading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                />
              ) : (
                'Confirmar'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
