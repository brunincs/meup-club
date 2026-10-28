import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from '@/services/copy'
import { PONTOS_POR_REAL, PONTOS_POR_INDICACAO } from '@/config/experiences'

// Tipos de crédito disponíveis
const CREDIT_TYPES = [
  {
    id: 'viagem',
    label: 'Viagem',
    icon: '✈',
    description: 'Calcula pontos pelo valor gasto em reais',
    inputLabel: 'Valor da viagem (R$)',
    inputPlaceholder: 'Ex: 5000',
    inputType: 'currency'
  },
  {
    id: 'indicacao',
    label: 'Indicação',
    icon: '→',
    description: 'Pontos fixos por indicação convertida',
    inputLabel: 'Número de indicações',
    inputPlaceholder: 'Ex: 1',
    inputType: 'count'
  },
  {
    id: 'ajuste',
    label: 'Ajuste Manual',
    icon: '±',
    description: 'Inserir pontos diretamente',
    inputLabel: 'Quantidade de pontos',
    inputPlaceholder: 'Ex: 500 ou -200',
    inputType: 'points'
  }
]

export function CreditAdjustModal({ user, onClose, onAdjust }) {
  const [creditType, setCreditType] = useState('viagem')
  const [inputValue, setInputValue] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Configuração do tipo selecionado
  const selectedType = CREDIT_TYPES.find(t => t.id === creditType)

  // Cálculo de pontos baseado no tipo
  const calculatedPoints = useMemo(() => {
    const numValue = parseFloat(inputValue) || 0

    switch (creditType) {
      case 'viagem':
        // R$ → pontos (1:1)
        return Math.floor(numValue * PONTOS_POR_REAL)
      case 'indicacao':
        // Número de indicações × pontos fixos
        return Math.floor(numValue) * PONTOS_POR_INDICACAO
      case 'ajuste':
        // Valor direto em pontos (permite negativo)
        return Math.floor(numValue)
      default:
        return 0
    }
  }, [creditType, inputValue])

  const newBalance = user.points + calculatedPoints
  const isPositive = calculatedPoints > 0
  const isNegative = calculatedPoints < 0
  const hasValidInput = inputValue !== '' && calculatedPoints !== 0

  // Gerar reason automático se não preenchido
  const autoReason = useMemo(() => {
    const numValue = parseFloat(inputValue) || 0
    switch (creditType) {
      case 'viagem':
        return `Viagem (valor base: ${calculatedPoints} pontos)`
      case 'indicacao':
        return `${Math.floor(numValue)} indicação(ões) convertida(s)`
      case 'ajuste':
        return ''
      default:
        return ''
    }
  }, [creditType, inputValue, calculatedPoints])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!hasValidInput) return

    const finalReason = reason.trim() || autoReason
    if (!finalReason) return

    setIsSubmitting(true)
    // IMPORTANTE: Passa apenas PONTOS, nunca o valor em reais
    await onAdjust(user.id, calculatedPoints, finalReason)
    setIsSubmitting(false)
  }

  // Reset input quando muda o tipo
  const handleTypeChange = (typeId) => {
    setCreditType(typeId)
    setInputValue('')
    setReason('')
  }

  return (
    <div className="fixed inset-0 bg-graphite/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-dusty-rose/20 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-dusty-rose/10">
          <h3 className="text-lg font-display font-bold text-graphite">Creditar Pontos</h3>
          <p className="text-sm text-graphite/70 font-heading mt-1">
            {user.name} · {format.pointsShort(user.points)} pontos atuais
          </p>
        </div>

        {/* Tipo de crédito */}
        <div className="px-6 py-4 bg-ice-white border-b border-dusty-rose/10">
          <label className="block text-xs text-graphite/60 font-heading mb-3 uppercase tracking-wide">
            Tipo de crédito
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CREDIT_TYPES.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleTypeChange(type.id)}
                className={`p-3 rounded-xl text-center transition-all ${
                  creditType === type.id
                    ? 'bg-deep-purple text-ice-white shadow-md'
                    : 'bg-white text-graphite/70 border border-dusty-rose/30 hover:border-dusty-rose/50 hover:text-graphite'
                }`}
              >
                <span className="text-lg block mb-1">{type.icon}</span>
                <span className="text-xs font-heading font-medium">{type.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-graphite/60 mt-3 font-heading text-center">
            {selectedType.description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Input baseado no tipo */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              {selectedType.inputLabel}
            </label>
            <div className="relative">
              {creditType === 'viagem' && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite/50 font-heading">
                  R$
                </span>
              )}
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedType.inputPlaceholder}
                step={creditType === 'viagem' ? '0.01' : '1'}
                min={creditType === 'ajuste' ? undefined : '0'}
                className={`w-full py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all font-heading ${
                  creditType === 'viagem' ? 'pl-12 pr-4' : 'px-4'
                }`}
                required
              />
            </div>
          </div>

          {/* Preview da conversão */}
          <AnimatePresence mode="wait">
            {hasValidInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-4 rounded-xl border ${
                  isPositive
                    ? 'bg-green-50 border-green-200'
                    : isNegative
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  {/* Conversão visual */}
                  {creditType !== 'ajuste' && (
                    <div className="flex items-center justify-center gap-3 mb-3 pb-3 border-b border-current/10">
                      <span className="text-sm text-graphite/70 font-heading">
                        {creditType === 'viagem' && `R$ ${parseFloat(inputValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        {creditType === 'indicacao' && `${Math.floor(parseFloat(inputValue) || 0)} indicação(ões)`}
                      </span>
                      <span className="text-antique-gold">→</span>
                      <span className={`text-lg font-mono font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{calculatedPoints.toLocaleString('pt-BR')} pts
                      </span>
                    </div>
                  )}

                  {/* Resumo do saldo */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-graphite/60 font-heading">Novo saldo:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-graphite/50 font-mono">{format.pointsShort(user.points)}</span>
                      <span className={`font-mono font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{calculatedPoints.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-graphite/50">=</span>
                      <span className={`font-mono font-bold ${newBalance < 0 ? 'text-red-600' : 'text-antique-gold'}`}>
                        {format.pointsShort(Math.max(0, newBalance))}
                      </span>
                    </div>
                  </div>

                  {newBalance < 0 && (
                    <p className="text-xs text-red-600 mt-2 font-heading text-center">
                      Saldo negativo será ajustado para 0
                    </p>
                  )}

                  {/* Info sobre a regra aplicada */}
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <p className="text-xs text-graphite/50 font-heading text-center">
                      {creditType === 'viagem' && `Taxa: ${PONTOS_POR_REAL} ponto por R$1`}
                      {creditType === 'indicacao' && `Taxa: ${PONTOS_POR_INDICACAO.toLocaleString('pt-BR')} pontos por indicação`}
                      {creditType === 'ajuste' && 'Ajuste direto de pontos'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motivo */}
          <div>
            <label className="block text-xs text-graphite/60 font-heading mb-1.5">
              Motivo {creditType !== 'ajuste' && <span className="text-graphite/40">(opcional)</span>}
              {creditType === 'ajuste' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={creditType === 'ajuste'
                ? 'Descreva o motivo do ajuste...'
                : autoReason || 'Adicione detalhes opcionais...'
              }
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-ice-white border border-dusty-rose/30 text-graphite placeholder:text-graphite/40 focus:outline-none focus:border-antique-gold/50 focus:ring-2 focus:ring-antique-gold/20 transition-all resize-none font-heading"
              required={creditType === 'ajuste'}
            />
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-dusty-rose/30 text-graphite/70 hover:text-graphite hover:border-dusty-rose/50 transition-colors font-heading"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasValidInput || (creditType === 'ajuste' && !reason.trim())}
              className={`flex-1 px-4 py-3 rounded-xl font-heading font-semibold transition-colors disabled:opacity-50 shadow-sm ${
                isPositive
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : isNegative
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-antique-gold text-deep-purple hover:bg-accent-light'
              }`}
            >
              {isSubmitting ? 'Salvando...' : isPositive ? 'Creditar' : isNegative ? 'Debitar' : 'Confirmar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
