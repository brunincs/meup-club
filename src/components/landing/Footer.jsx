import { motion } from 'framer-motion'

export function Footer() {
  return (
    <footer className="relative py-12 md:py-16 border-t border-dark-700/30">
      <div className="container-premium">
        <div className="flex flex-col items-center gap-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-light via-accent-gold to-accent-dark flex items-center justify-center shadow-lg shadow-accent-gold/15"
            >
              <span className="font-display font-bold text-dark-900">M</span>
            </motion.div>
            <div>
              <span className="font-display font-semibold text-lg text-neutral-100">Meup</span>
              <span className="font-display font-light text-lg text-neutral-500 ml-1">Club</span>
            </div>
          </motion.div>

          {/* Links */}
          <motion.nav
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-6 text-sm"
          >
            {['Termos', 'Privacidade', 'FAQ', 'Contato'].map((link) => (
              <a
                key={link}
                href="#"
                className="text-neutral-600 hover:text-accent-gold transition-colors"
              >
                {link}
              </a>
            ))}
          </motion.nav>

          {/* Copyright */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xs text-neutral-700"
          >
            &copy; {new Date().getFullYear()} Meup Club. Todos os direitos reservados.
          </motion.p>
        </div>
      </div>
    </footer>
  )
}
