import { motion } from 'framer-motion'
import { calculateSaleCredits, creditsConfig } from '@/services/pointsSystem'

export function FinancialPreview({ profit, multiplier = 'padrao' }) {
  const profitValue = parseFloat(profit) || 0

  if (profitValue <= 0) {
    return null
  }

  // Usar o novo sistema de cálculo de créditos
  const credits = calculateSaleCredits(profitValue, multiplier)

  // Se não atingir o lucro mínimo, mostrar aviso
  if (!credits.eligible) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5"
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-400">
            <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-400">Lucro insuficiente</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Lucro mínimo de R$ {creditsConfig.minProfitToGenerateCredits.toFixed(2)} necessário para gerar créditos
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-accent-gold/20 bg-accent-gold/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-accent-gold">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs font-medium text-accent-gold">Preview de Impacto Financeiro</span>
      </div>

      {/* Grid principal com 4 colunas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Lucro informado */}
        <div>
          <p className="text-xs text-neutral-500 mb-1">Lucro</p>
          <p className="text-sm font-mono text-green-400">
            R$ {profitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Créditos do Indicador */}
        <div>
          <p className="text-xs text-neutral-500 mb-1">Indicador</p>
          <p className="text-sm font-mono text-accent-gold">
            +{credits.referrerCredits.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-neutral-600 mt-0.5">
            {(creditsConfig.referrerPercentage * 100).toFixed(0)}% do lucro
          </p>
        </div>

        {/* Créditos do Comprador */}
        <div>
          <p className="text-xs text-neutral-500 mb-1">Comprador</p>
          <p className="text-sm font-mono text-blue-400">
            +{credits.buyerCredits.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-neutral-600 mt-0.5">
            {(creditsConfig.buyerPercentage * 100).toFixed(0)}% do lucro
          </p>
        </div>

        {/* Custo Total */}
        <div>
          <p className="text-xs text-neutral-500 mb-1">Custo Total</p>
          <p className="text-sm font-mono text-amber-400">
            R$ {credits.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-neutral-600 mt-0.5">
            {credits.costPercentage}% do lucro
          </p>
        </div>
      </div>

      {/* Resumo total */}
      <div className="mt-4 pt-3 border-t border-dark-700/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="text-xs text-neutral-500">
              Total de créditos: <span className="text-accent-gold font-mono">{credits.totalCredits.toLocaleString('pt-BR')}</span>
            </div>
            <div className="text-xs text-neutral-500">
              Margem retida: <span className="text-green-400 font-mono">{credits.marginRetained}%</span>
            </div>
          </div>
        </div>

        {/* Barra visual de proporção */}
        <div className="h-2 rounded-full bg-dark-700/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
            style={{ width: `${credits.marginRetained}%` }}
          />
        </div>
      </div>

      {/* Info dos limites */}
      <div className="mt-3 pt-3 border-t border-dark-700/20 flex flex-wrap gap-3 text-xs text-neutral-600">
        <span>Saque mensal max: R$ {creditsConfig.monthlyWithdrawalLimit}</span>
        <span>Bonus extras max: {creditsConfig.maxExtraBonusPercentage * 100}%</span>
      </div>
    </motion.div>
  )
}
