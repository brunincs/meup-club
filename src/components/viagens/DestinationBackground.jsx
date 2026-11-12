// ============================================
// COMPONENTE: Background com Foto do Destino
// Exibe foto da cidade com overlay gradiente
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getFotoDestino } from '@/services/destinoFotosService'

/**
 * Background com foto do destino
 * @param {Object} props
 * @param {string} props.cidade - Nome da cidade
 * @param {string} props.iata - Código IATA (opcional)
 * @param {React.ReactNode} props.children - Conteúdo a renderizar por cima
 * @param {string} props.className - Classes adicionais
 * @param {boolean} props.showCredit - Mostrar crédito do fotógrafo (default: true)
 */
export function DestinationBackground({
  cidade,
  iata,
  children,
  className = '',
  showCredit = true
}) {
  const [fotoInfo, setFotoInfo] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!cidade) return

    let cancelled = false

    const loadFoto = async () => {
      try {
        const info = await getFotoDestino(cidade, iata)
        if (!cancelled) {
          setFotoInfo(info)
        }
      } catch (err) {
        if (!cancelled) {
          setError(true)
        }
      }
    }

    loadFoto()

    return () => {
      cancelled = true
    }
  }, [cidade, iata])

  // Preload da imagem
  useEffect(() => {
    if (!fotoInfo?.url) return

    const img = new Image()
    img.onload = () => setLoaded(true)
    img.onerror = () => setError(true)
    img.src = fotoInfo.url
  }, [fotoInfo?.url])

  const hasFoto = fotoInfo?.url && loaded && !error

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background Image */}
      {hasFoto ? (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src={fotoInfo.url}
            alt={`${cidade}`}
            className="w-full h-full object-cover"
          />
          {/* Overlay gradiente da marca */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(
                to bottom,
                rgba(50, 17, 63, 0.35) 0%,
                rgba(50, 17, 63, 0.9) 100%
              )`
            }}
          />
        </motion.div>
      ) : (
        /* Fallback: gradiente + ícone avião */
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #32113f 0%, #5c005a 100%)'
          }}
        >
          {/* Avião dourado decorativo */}
          <svg
            className="absolute right-4 bottom-4 w-16 h-16 text-antique-gold/20"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
      )}

      {/* Conteúdo */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Crédito do fotógrafo (Pexels) */}
      {showCredit && hasFoto && fotoInfo?.fonte === 'pexels' && fotoInfo?.credito_autor && (
        <a
          href={fotoInfo.credito_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1.5 right-2 z-20 text-[9px] text-ice-white/40 hover:text-ice-white/60 transition-colors font-heading"
        >
          📷 {fotoInfo.credito_autor}
        </a>
      )}
    </div>
  )
}

export default DestinationBackground
