// ============================================
// COMPONENTE: Card de Viagem em Preparação
// Exibido quando a viagem ainda não foi conferida
// ============================================

import { motion } from 'framer-motion'

export function ViagemPreparandoCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/50"
    >
      <div className="flex items-start gap-4">
        {/* Ícone animado */}
        <div className="w-12 h-12 rounded-xl bg-amber-200/50 flex items-center justify-center flex-shrink-0">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-2xl"
          >
            ✈
          </motion.span>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-heading font-semibold text-amber-800 mb-1">
            Viagem em preparação
          </h4>
          <p className="text-xs text-amber-700/80 font-heading leading-relaxed">
            Sua viagem está sendo preparada pela equipe. Em breve você poderá ver todos os detalhes aqui.
          </p>

          {/* Indicador de progresso */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-amber-200/50 overflow-hidden">
              <motion.div
                className="h-full bg-amber-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '60%' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] text-amber-600 font-heading">
              Conferindo dados...
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
