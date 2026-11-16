// ============================================
// CARD "EXPERIÊNCIAS PARA VOCÊ" - Dashboard
// Mostra 2-3 experiências próximas do saldo disponível
// ============================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { usePoints } from '@/contexts/PointsContext'
import { useExperiencias, formatPoints } from '@/hooks/useExperiencias'
import { GiftIcon } from '@/components/ui/Icons'

export function ExperienciasParaVoce() {
  const { availablePoints } = usePoints()
  const { experiences, loading } = useExperiencias()
  const [recomendadas, setRecomendadas] = useState([])

  useEffect(() => {
    if (!experiences || experiences.length === 0) return

    // Filtrar apenas experiências fixas (não sob_consulta, em_breve ou privilegio)
    const fixas = experiences.filter(exp =>
      exp.tipo === 'fixo' && exp.points != null && !exp.isSobConsulta && !exp.isEmBreve && !exp.isPrivilegio
    )

    // Ordenar experiências por proximidade do saldo disponível
    const ordenadas = [...fixas].sort((a, b) => {
      const diffA = Math.abs(a.points - availablePoints)
      const diffB = Math.abs(b.points - availablePoints)
      // Prioriza as que o usuário pode resgatar
      const canRedeemA = a.points <= availablePoints ? 0 : 1
      const canRedeemB = b.points <= availablePoints ? 0 : 1
      if (canRedeemA !== canRedeemB) return canRedeemA - canRedeemB
      return diffA - diffB
    })

    // Pegar as 3 primeiras
    setRecomendadas(ordenadas.slice(0, 3))
  }, [experiences, availablePoints])

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm animate-pulse" style={{ border: '1px solid #ddd1d0' }}>
        <div className="h-5 w-40 bg-graphite/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-graphite/5 rounded-xl" />
          <div className="h-16 bg-graphite/5 rounded-xl" />
        </div>
      </div>
    )
  }

  if (recomendadas.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-6 shadow-sm"
      style={{ border: '1px solid #ddd1d0' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GiftIcon size={18} color="#a27937" />
          <h3 className="text-base font-display font-semibold text-deep-purple">
            Experiências para você
          </h3>
        </div>
        <Link
          to="/recompensas"
          className="text-xs font-heading text-antique-gold hover:text-deep-purple transition-colors"
        >
          Ver todas
        </Link>
      </div>

      {/* Lista de experiências */}
      <div className="space-y-3">
        {recomendadas.map((exp) => {
          const canRedeem = exp.points <= availablePoints
          const faltam = exp.points - availablePoints

          return (
            <Link
              key={exp.id}
              to="/recompensas"
              className="flex items-center gap-3 p-3 rounded-xl border border-nude-rose/50 hover:border-antique-gold/30 transition-colors group"
            >
              {/* Imagem */}
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-nude-rose/30">
                {exp.image && (
                  <img
                    src={exp.image}
                    alt={exp.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-medium text-deep-purple truncate group-hover:text-antique-gold transition-colors">
                  {exp.title}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-graphite/60">
                    {formatPoints(exp.points)} pts
                  </p>
                  {exp.destino && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-deep-purple/10 text-deep-purple font-medium">
                      {exp.destino}
                    </span>
                  )}
                </div>
              </div>

              {/* Ação */}
              <div className="flex-shrink-0">
                {canRedeem ? (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-heading font-semibold bg-antique-gold text-deep-purple">
                    Resgatar
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-heading text-graphite/60 bg-nude-rose/30">
                    Faltam {formatPoints(faltam)}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}

export default ExperienciasParaVoce
