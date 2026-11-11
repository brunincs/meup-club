import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

/**
 * Header para landing alternada - funciona sobre fundo escuro
 */
export function HeaderAlternada() {
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
          ? 'bg-deep-purple/95 backdrop-blur-md border-b border-antique-gold/20 shadow-sm'
          : 'bg-deep-purple/80 backdrop-blur-sm'
      }`}
    >
      <div className="container-premium">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo Me,up Club */}
          <Logo variant="dark" to="/" />

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
