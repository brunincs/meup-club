import { useState } from 'react'
import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'
import {
  PONTOS_POR_REAL,
  calculatePoints,
  formatPoints,
  getUnlockedExperiences,
  getNextExperience,
} from '@/config/experiences'

/**
 * Simulador de Pontos Compacto - SECAO CLARA
 * Versao reduzida para uso no dashboard
 */

const SLIDER_MIN = 2000
const SLIDER_MAX = 30000
const SLIDER_STEP = 500
const SLIDER_INITIAL = 5000

export function PointsSimulatorCompact() {
  const [valorGasto, setValorGasto] = useState(SLIDER_INITIAL)

  const pontosAcumulados = calculatePoints(valorGasto)
  const experienciasDesbloqueadas = getUnlockedExperiences(pontosAcumulados)
  const proximaExperiencia = getNextExperience(pontosAcumulados)

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(valorGasto)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-display font-semibold text-deep-purple mb-2">
          Simule seus ganhos
        </h3>
        <GoldLine width="60px" centered className="mb-2" />
        <p className="text-sm text-deep-purple/70">
          Veja quanto voce pode acumular indicando viagens
        </p>
      </div>

      {/* Card do simulador */}
      <div className="max-w-xl mx-auto p-6 rounded-2xl border border-deep-purple/20 bg-white shadow-lg">
        {/* Valor */}
        <div className="text-center mb-6">
          <p className="text-sm text-deep-purple/70 mb-1">
            Se suas indicacoes gastarem:
          </p>
          <div className="text-3xl font-display font-bold text-antique-gold">
            {valorFormatado}
          </div>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={valorGasto}
            onChange={(e) => setValorGasto(Number(e.target.value))}
            className="slider-compact w-full"
          />
          <div className="flex justify-between mt-2 text-xs text-deep-purple/60">
            <span>R$ 2.000</span>
            <span>R$ 30.000</span>
          </div>
        </div>

        {/* Resultado */}
        <div className="text-center p-4 rounded-xl bg-deep-purple mb-4">
          <p className="text-sm text-ice-white mb-1">Voce ganha</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-display font-bold text-antique-gold">
              {formatPoints(pontosAcumulados)}
            </span>
            <span className="text-sm text-ice-white">pontos</span>
          </div>
        </div>

        {/* Experiencias */}
        {experienciasDesbloqueadas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {experienciasDesbloqueadas.slice(0, 4).map((exp) => (
              <span
                key={exp.id}
                className={`px-2 py-1 rounded-full text-[10px] font-heading font-medium border ${
                  exp.isDream
                    ? 'bg-antique-gold/20 border-antique-gold/40 text-antique-gold'
                    : 'bg-deep-purple/10 border-deep-purple/20 text-deep-purple'
                }`}
              >
                {exp.title}
              </span>
            ))}
            {experienciasDesbloqueadas.length > 4 && (
              <span className="px-2 py-1 text-[10px] text-deep-purple/60">
                +{experienciasDesbloqueadas.length - 4} mais
              </span>
            )}
          </div>
        )}
      </div>

      {/* CSS do slider */}
      <style>{`
        .slider-compact {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, rgba(50, 17, 63, 0.15), rgba(50, 17, 63, 0.3));
          outline: none;
          cursor: pointer;
        }

        .slider-compact::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c9a962 0%, #a27937 100%);
          cursor: pointer;
          border: 3px solid #32113f;
          box-shadow: 0 2px 8px rgba(162, 121, 55, 0.4);
          transition: transform 0.2s ease;
        }

        .slider-compact::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .slider-compact::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c9a962 0%, #a27937 100%);
          cursor: pointer;
          border: 3px solid #32113f;
          box-shadow: 0 2px 8px rgba(162, 121, 55, 0.4);
        }
      `}</style>
    </motion.div>
  )
}
