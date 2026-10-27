import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-ice-white/95 backdrop-blur-md border-b border-dusty-rose/20 shadow-sm'
          : 'bg-ice-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="container-premium">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-antique-gold to-accent-dark flex items-center justify-center shadow-lg shadow-antique-gold/15">
              <span className="font-display font-bold text-deep-purple text-sm">M</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-semibold text-deep-purple">Meup</span>
              <span className="font-display font-light text-deep-purple/60 ml-1">Club</span>
            </div>
          </Link>

          {/* CTA Button */}
          <Link to="/login">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-heading font-semibold bg-antique-gold text-deep-purple transition-all duration-300 hover:shadow-lg hover:shadow-antique-gold/20"
            >
              <span>Entrar</span>
              <span>→</span>
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
