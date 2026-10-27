import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PONTOS_POR_REAL,
  PONTOS_POR_INDICACAO,
  formatPoints,
  getUnlockedExperiences,
  getNextExperience,
} from '@/config/experiences'

/**
 * Simulador de Pontos Unificado
 *
 * Dois modos:
 * - "travel": quanto VOCÊ ganha viajando (slider de valor em R$)
 * - "referral": quanto você ganha indicando (slider de número de amigos)
 *
 * Props:
 * - mode: "travel" | "referral"
 * - variant: "light" | "dark" (para ajustar cores ao fundo)
 * - compact: boolean (versão menor para dashboard)
 */

// Configurações por modo
const CONFIG = {
  travel: {
    title: 'Viajando',
    subtitle: 'Ganhe pontos com suas viagens',
    inputLabel: 'Se você gastar em viagens:',
    sliderMin: 2000,
    sliderMax: 50000,
    sliderStep: 500,
    sliderInitial: 8000,
    formatInput: (value) => new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value),
    formatMinMax: (min, max) => ({ min: 'R$ 2.000', max: 'R$ 50.000' }),
    calculatePoints: (value) => value * PONTOS_POR_REAL,
  },
  referral: {
    title: 'Indicando',
    subtitle: 'Ganhe pontos indicando amigos',
    inputLabel: 'Se você indicar amigos que viajam:',
    sliderMin: 1,
    sliderMax: 10,
    sliderStep: 1,
    sliderInitial: 3,
    formatInput: (value) => `${value} ${value === 1 ? 'amigo' : 'amigos'}`,
    formatMinMax: (min, max) => ({ min: '1 amigo', max: '10 amigos' }),
    calculatePoints: (value) => value * PONTOS_POR_INDICACAO,
  },
}

export function PointsSimulator({
  mode = 'travel',
  variant = 'light',
  compact = false
}) {
  const config = CONFIG[mode]
  const [inputValue, setInputValue] = useState(config.sliderInitial)

  const pontosAcumulados = config.calculatePoints(inputValue)
  const experienciasDesbloqueadas = getUnlockedExperiences(pontosAcumulados)
  const proximaExperiencia = getNextExperience(pontosAcumulados)
  const pontosFaltando = proximaExperiencia
    ? proximaExperiencia.points - pontosAcumulados
    : 0

  const isLight = variant === 'light'
  const minMaxLabels = config.formatMinMax(config.sliderMin, config.sliderMax)

  // Classes baseadas na variante
  const cardClass = isLight
    ? 'border-deep-purple/20 bg-white shadow-lg'
    : 'border-dusty-rose/20 bg-deep-purple/30'

  const textPrimaryClass = isLight ? 'text-deep-purple' : 'text-ice-white'
  const textSecondaryClass = isLight ? 'text-deep-purple/70' : 'text-dusty-rose'
  const textMutedClass = isLight ? 'text-deep-purple/60' : 'text-dusty-rose/60'

  const resultBoxClass = isLight
    ? 'bg-deep-purple'
    : 'bg-antique-gold/10 border border-antique-gold/20'
  const resultTextClass = isLight ? 'text-ice-white' : 'text-dusty-rose'

  const tagClass = isLight
    ? 'bg-deep-purple/10 border-deep-purple/20 text-deep-purple'
    : 'bg-dusty-rose/10 border-dusty-rose/20 text-dusty-rose'
  const tagDreamClass = 'bg-antique-gold/20 border-antique-gold/40 text-antique-gold'

  const sliderClass = isLight ? 'slider-light' : 'slider-dark'

  return (
    <div className={`p-${compact ? '5' : '6'} rounded-2xl border ${cardClass}`}>
      {/* Input label */}
      <div className="text-center mb-5">
        <p className={`text-sm ${textSecondaryClass} mb-1`}>
          {config.inputLabel}
        </p>
        <div className="text-2xl md:text-3xl font-display font-bold text-antique-gold">
          {config.formatInput(inputValue)}
        </div>
      </div>

      {/* Slider */}
      <div className="mb-5">
        <input
          type="range"
          min={config.sliderMin}
          max={config.sliderMax}
          step={config.sliderStep}
          value={inputValue}
          onChange={(e) => setInputValue(Number(e.target.value))}
          className={`${sliderClass} w-full`}
        />
        <div className={`flex justify-between mt-2 text-xs ${textMutedClass}`}>
          <span>{minMaxLabels.min}</span>
          <span>{minMaxLabels.max}</span>
        </div>
      </div>

      {/* Resultado */}
      <div className={`text-center p-4 rounded-xl ${resultBoxClass} mb-4`}>
        <p className={`text-sm ${resultTextClass} mb-1`}>Você ganha</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl md:text-3xl font-display font-bold text-antique-gold">
            {formatPoints(pontosAcumulados)}
          </span>
          <span className={`text-sm ${resultTextClass}`}>pontos</span>
        </div>
      </div>

      {/* Experiências desbloqueadas */}
      {experienciasDesbloqueadas.length > 0 && (
        <div className="mb-3">
          <p className={`text-xs ${textMutedClass} mb-2`}>
            {compact ? 'Experiências:' : 'Experiências que você alcança:'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {experienciasDesbloqueadas.slice(0, compact ? 3 : 6).map((exp) => (
              <span
                key={exp.id}
                className={`px-2 py-1 rounded-full text-[10px] font-heading font-medium border ${
                  exp.isDream ? tagDreamClass : tagClass
                }`}
              >
                {exp.title}
              </span>
            ))}
            {experienciasDesbloqueadas.length > (compact ? 3 : 6) && (
              <span className={`px-2 py-1 text-[10px] ${textMutedClass}`}>
                +{experienciasDesbloqueadas.length - (compact ? 3 : 6)} mais
              </span>
            )}
          </div>
        </div>
      )}

      {/* Próxima experiência */}
      {proximaExperiencia && !compact && (
        <div className={`pt-3 border-t ${isLight ? 'border-deep-purple/10' : 'border-dusty-rose/10'}`}>
          <p className={`text-xs ${textMutedClass} mb-1`}>Próxima:</p>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-heading ${textPrimaryClass}`}>
              {proximaExperiencia.title}
            </span>
            <span className={`text-xs ${textMutedClass}`}>
              faltam <span className="text-antique-gold font-bold">{formatPoints(pontosFaltando)}</span> pts
            </span>
          </div>
        </div>
      )}

      {/* CSS dos sliders */}
      <style>{`
        .slider-light,
        .slider-dark {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }

        .slider-light {
          background: linear-gradient(to right, rgba(50, 17, 63, 0.15), rgba(50, 17, 63, 0.3));
        }

        .slider-dark {
          background: linear-gradient(to right, rgba(163, 150, 149, 0.2), rgba(163, 150, 149, 0.4));
        }

        .slider-light::-webkit-slider-thumb,
        .slider-dark::-webkit-slider-thumb {
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

        .slider-light::-webkit-slider-thumb:hover,
        .slider-dark::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .slider-light::-moz-range-thumb,
        .slider-dark::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c9a962 0%, #a27937 100%);
          cursor: pointer;
          border: 3px solid #32113f;
          box-shadow: 0 2px 8px rgba(162, 121, 55, 0.4);
        }
      `}</style>
    </div>
  )
}

/**
 * Wrapper com abas para alternar entre os dois modos
 * Usado tanto na landing quanto no dashboard
 */
export function PointsSimulatorTabs({ variant = 'light', compact = false }) {
  const [activeMode, setActiveMode] = useState('travel')
  const isLight = variant === 'light'

  const tabClass = (isActive) => {
    if (isActive) {
      return isLight
        ? 'bg-deep-purple text-ice-white'
        : 'bg-antique-gold text-deep-purple'
    }
    return isLight
      ? 'text-deep-purple/70 hover:text-deep-purple'
      : 'text-dusty-rose hover:text-ice-white'
  }

  return (
    <div>
      {/* Tabs */}
      <div className={`flex items-center justify-center gap-1 p-1 rounded-xl mb-4 w-fit mx-auto ${
        isLight ? 'bg-deep-purple/10' : 'bg-deep-purple/50'
      }`}>
        <button
          onClick={() => setActiveMode('travel')}
          className={`px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all ${tabClass(activeMode === 'travel')}`}
        >
          Viajando
        </button>
        <button
          onClick={() => setActiveMode('referral')}
          className={`px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all ${tabClass(activeMode === 'referral')}`}
        >
          Indicando
        </button>
      </div>

      {/* Simulador ativo */}
      <motion.div
        key={activeMode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <PointsSimulator mode={activeMode} variant={variant} compact={compact} />
      </motion.div>
    </div>
  )
}
