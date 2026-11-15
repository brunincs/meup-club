import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

// ============================================
// PÁGINA 404 - Me,up Club
// ============================================

export function NotFound() {
  return (
    <div className="min-h-screen bg-deep-purple flex flex-col items-center justify-center p-6">
      {/* Avião decorativo */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className="w-24 h-24 text-antique-gold"
        >
          <path
            d="M56 28L36 20V12L28 8V20L8 28L12 32L24 30V40L20 44V48L28 44L32 48L36 44L44 48V44L40 40V30L52 32L56 28Z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      {/* Mensagem */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center max-w-md"
      >
        <h1 className="text-6xl font-display font-bold text-antique-gold mb-4">
          404
        </h1>
        <h2 className="text-xl font-heading font-semibold text-ice-white mb-4">
          Destino não encontrado
        </h2>
        <p className="text-dusty-rose mb-8">
          Parece que você tomou uma rota que não existe.
          Não se preocupe, vamos te levar de volta ao clube.
        </p>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-antique-gold text-deep-purple font-heading font-semibold hover:bg-accent-light transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar ao clube
        </Link>
      </motion.div>

      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-antique-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-dusty-rose/5 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
