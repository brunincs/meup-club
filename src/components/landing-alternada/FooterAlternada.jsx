import { motion } from 'framer-motion'
import { GoldLineGradient } from '@/components/ui/GoldLine'

/**
 * Footer - SECAO ESCURA
 * Texto claro sobre fundo roxo profundo (contraste garantido)
 */
export function FooterAlternada() {
  return (
    <footer className="relative py-10 md:py-12 bg-deep-purple">
      {/* Linha dourada no topo */}
      <GoldLineGradient className="mb-6" />

      <div className="container-premium">
        <div className="flex flex-col items-center gap-5">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-antique-gold via-antique-gold to-accent-dark flex items-center justify-center shadow-lg shadow-antique-gold/15"
            >
              <span className="font-display font-bold text-deep-purple">M</span>
            </motion.div>
            <div>
              <span className="font-display font-semibold text-lg text-ice-white">Meup</span>
              <span className="font-display font-light text-lg text-dusty-rose ml-1">Club</span>
            </div>
          </motion.div>

          {/* Contato Me,up Viagens - texto claro */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-center"
          >
            <p className="text-sm text-ice-white/80">
              Me,up Viagens · <a href="https://instagram.com/meup.viagens" target="_blank" rel="noopener noreferrer" className="text-antique-gold hover:text-antique-gold/80 hover:underline">@meup.viagens</a> · <a href="tel:+5516988126568" className="text-antique-gold hover:text-antique-gold/80 hover:underline">(16) 98812-6568</a>
            </p>
          </motion.div>

          {/* Links - texto claro */}
          <motion.nav
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-6 text-sm"
          >
            <a
              href="/termos"
              className="text-ice-white/70 hover:text-antique-gold transition-colors"
            >
              Termos
            </a>
            <a
              href="/privacidade"
              className="text-ice-white/70 hover:text-antique-gold transition-colors"
            >
              Privacidade
            </a>
            <a
              href="/faq"
              className="text-ice-white/70 hover:text-antique-gold transition-colors"
            >
              FAQ
            </a>
            <a
              href="https://wa.me/5516988126568"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ice-white/70 hover:text-antique-gold transition-colors"
            >
              Contato
            </a>
          </motion.nav>

          {/* Copyright */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm text-ice-white/60"
          >
            &copy; {new Date().getFullYear()} Meup Club. Todos os direitos reservados.
          </motion.p>
        </div>
      </div>
    </footer>
  )
}
