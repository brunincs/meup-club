import { motion } from 'framer-motion'
import { GoldLineGradient } from '@/components/ui/GoldLine'

export function Footer() {
  return (
    <footer className="relative py-12 md:py-16">
      {/* Linha dourada no topo */}
      <GoldLineGradient className="mb-12" />

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
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-antique-gold via-antique-gold to-accent-dark flex items-center justify-center shadow-lg shadow-antique-gold/15"
            >
              <span className="font-display font-bold text-deep-purple">M</span>
            </motion.div>
            <div>
              <span className="font-display font-semibold text-lg text-ice-white">Meup</span>
              <span className="font-display font-light text-lg text-dusty-rose ml-1">Club</span>
            </div>
          </motion.div>

          {/* Contato Me Up Viagens */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-center"
          >
            <p className="text-sm text-dusty-rose">
              Me Up Viagens · <a href="https://instagram.com/meup.viagens" target="_blank" rel="noopener noreferrer" className="text-antique-gold hover:underline">@meup.viagens</a> · <a href="tel:+5516988126568" className="text-antique-gold hover:underline">(16) 98812-6568</a>
            </p>
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
                className="text-dusty-rose hover:text-antique-gold transition-colors"
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
            className="text-xs text-dusty-rose/60"
          >
            &copy; {new Date().getFullYear()} Meup Club. Todos os direitos reservados.
          </motion.p>
        </div>
      </div>
    </footer>
  )
}
