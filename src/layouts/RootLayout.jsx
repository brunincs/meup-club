import { motion, AnimatePresence } from 'framer-motion'

export function RootLayout({ children }) {
  return (
    <div className="relative min-h-screen" style={{ backgroundColor: 'var(--color-dark-900)' }}>
      {/* Background noise texture */}
      <div className="fixed inset-0 noise pointer-events-none" />

      {/* Gradient orbs decorativos */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(201, 169, 98, 0.05)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(201, 169, 98, 0.03)' }}
        />
        <div
          className="absolute -bottom-40 right-1/4 w-72 h-72 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(139, 112, 66, 0.05)' }}
        />
      </div>

      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
