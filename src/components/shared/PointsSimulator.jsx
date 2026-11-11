import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  useExperiencias,
  formatPoints,
  getUnlockedExperiences,
  getNextExperience,
} from '@/hooks/useExperiencias'
import { fetchPlanosConfig } from '@/services/subscriptionService'
import { garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'

/**
 * Simulador de Pontos - Landing Page
 *
 * Layout: "Viajando | Indicando" → slider → dois cards resultado (Free/Prime) → experiências
 * Valores lidos do plano_config (multiplicador, pontosIndicacao, etc.)
 */

export function PointsSimulatorTabs({ variant = 'light', compact = false }) {
  const [activeMode, setActiveMode] = useState('travel')
  const [config, setConfig] = useState(null)
  const [inputValue, setInputValue] = useState(8000) // Inicial viajando
  const { allExperiences } = useExperiencias()
  const isLight = variant === 'light'

  // Carregar config dos planos
  useEffect(() => {
    async function load() {
      const result = await fetchPlanosConfig()
      if (result.success) {
        setConfig(result.planos)
      }
    }
    load()
  }, [])

  // Configurações do plano
  const freeConfig = config?.free || { multiplicadorViagem: 1, pontosIndicacao: 3000 }
  const primeConfig = config?.prime || { multiplicadorViagem: 1.5, pontosIndicacao: 5000 }

  // Configurações por modo
  const modeConfigs = {
    travel: {
      sliderMin: 2000,
      sliderMax: 50000,
      sliderStep: 500,
      sliderInitial: 8000,
      formatInput: (value) => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
      }).format(value),
      formatMinMax: { min: 'R$ 2.000', max: 'R$ 50.000' },
      calculateFree: (value) => Math.floor(value * (freeConfig.multiplicadorViagem || 1)),
      calculatePrime: (value) => Math.floor(value * (primeConfig.multiplicadorViagem || 1.5)),
      subtitle: null,
    },
    referral: {
      sliderMin: 1,
      sliderMax: 10,
      sliderStep: 1,
      sliderInitial: 3,
      formatInput: (value) => `${value} ${value === 1 ? 'amigo' : 'amigos'}`,
      formatMinMax: { min: '1 amigo', max: '10 amigos' },
      calculateFree: (value) => value * (freeConfig.pontosIndicacao || 3000),
      calculatePrime: (value) => value * (primeConfig.pontosIndicacao || 5000),
      subtitle: 'Se o amigo virar Prime, você ganha +3.000 (só Prime)',
    },
  }

  const modeConfig = modeConfigs[activeMode]

  // Atualizar valor inicial ao trocar de modo
  useEffect(() => {
    setInputValue(modeConfig.sliderInitial)
  }, [activeMode])

  // Calcular pontos
  const pontosFree = modeConfig.calculateFree(inputValue)
  const pontosPrime = modeConfig.calculatePrime(inputValue)
  const diferenca = pontosPrime - pontosFree

  // Experiências baseadas no resultado Prime (preço Prime = fator 130 ou config)
  const fatorPontoPrime = primeConfig.fatorPontos || 130
  const experienciasDesbloqueadas = getUnlockedExperiences(allExperiences, pontosPrime, fatorPontoPrime)
  const proximaExperiencia = getNextExperience(allExperiences, pontosPrime, fatorPontoPrime)
  const pontosFaltando = proximaExperiencia
    ? proximaExperiencia.points - pontosPrime
    : 0

  const handleUpgrade = () => {
    garantirVagaFundadorWhatsApp('anual')
  }

  // Classes baseadas na variante
  const tabBgClass = isLight ? 'bg-deep-purple/10' : 'bg-deep-purple/50'
  const tabActiveClass = isLight ? 'bg-deep-purple text-ice-white' : 'bg-antique-gold text-deep-purple'
  const tabInactiveClass = isLight ? 'text-deep-purple/70 hover:text-deep-purple' : 'text-dusty-rose hover:text-ice-white'
  const textMutedClass = isLight ? 'text-deep-purple/60' : 'text-dusty-rose/60'
  const textPrimaryClass = isLight ? 'text-deep-purple' : 'text-ice-white'
  const sliderClass = isLight ? 'slider-light' : 'slider-dark'

  return (
    <div>
      {/* Tabs Viajando | Indicando */}
      <div className={`flex items-center justify-center gap-1 p-1 rounded-xl mb-6 w-fit mx-auto ${tabBgClass}`}>
        <button
          onClick={() => setActiveMode('travel')}
          className={`px-5 py-2.5 rounded-lg text-sm font-heading font-medium transition-all ${
            activeMode === 'travel' ? tabActiveClass : tabInactiveClass
          }`}
        >
          Viajando
        </button>
        <button
          onClick={() => setActiveMode('referral')}
          className={`px-5 py-2.5 rounded-lg text-sm font-heading font-medium transition-all ${
            activeMode === 'referral' ? tabActiveClass : tabInactiveClass
          }`}
        >
          Indicando
        </button>
      </div>

      {/* Slider */}
      <motion.div
        key={activeMode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl border ${isLight ? 'border-deep-purple/20 bg-white shadow-lg' : 'border-dusty-rose/20 bg-deep-purple/30'}`}
      >
        {/* Input label */}
        <div className="text-center mb-5">
          <p className={`text-sm ${textMutedClass} mb-1`}>
            {activeMode === 'travel' ? 'Se você gastar em viagens:' : 'Se você indicar amigos que viajam:'}
          </p>
          <div className="text-2xl md:text-3xl font-display font-bold text-antique-gold">
            {modeConfig.formatInput(inputValue)}
          </div>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <input
            type="range"
            min={modeConfig.sliderMin}
            max={modeConfig.sliderMax}
            step={modeConfig.sliderStep}
            value={inputValue}
            onChange={(e) => setInputValue(Number(e.target.value))}
            className={`${sliderClass} w-full`}
          />
          <div className={`flex justify-between mt-2 text-xs ${textMutedClass}`}>
            <span>{modeConfig.formatMinMax.min}</span>
            <span>{modeConfig.formatMinMax.max}</span>
          </div>
        </div>

        {/* Subtítulo modo indicando */}
        {modeConfig.subtitle && (
          <p className={`text-xs text-center mb-4 ${textMutedClass}`}>
            {modeConfig.subtitle}
          </p>
        )}

        {/* Resultado: Dois cards lado a lado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* Card Prime (primeiro no mobile) */}
          <div className={`order-1 sm:order-2 p-4 rounded-xl border-2 ${
            isLight
              ? 'border-antique-gold/50 bg-gradient-to-br from-deep-purple to-deep-purple/90'
              : 'border-antique-gold/50 bg-gradient-to-br from-antique-gold/20 to-antique-gold/10'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-heading font-semibold uppercase tracking-wider ${isLight ? 'text-antique-gold' : 'text-antique-gold'}`}>
                Prime
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-heading font-bold bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                +{formatPoints(diferenca)} no Prime
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-display font-bold text-antique-gold">
              {formatPoints(pontosPrime)} <span className={`text-sm font-normal ${isLight ? 'text-ice-white/70' : 'text-dusty-rose'}`}>pts</span>
            </div>
          </div>

          {/* Card Free */}
          <div className={`order-2 sm:order-1 p-4 rounded-xl border ${
            isLight
              ? 'border-deep-purple/20 bg-deep-purple/5'
              : 'border-white/10 bg-white/5'
          }`}>
            <span className={`text-xs font-heading font-medium uppercase tracking-wider ${textMutedClass}`}>
              Free
            </span>
            <div className={`text-2xl md:text-3xl font-display font-bold ${textPrimaryClass} mt-2`}>
              {formatPoints(pontosFree)} <span className={`text-sm font-normal ${textMutedClass}`}>pts</span>
            </div>
          </div>
        </div>

        {/* Experiências desbloqueadas */}
        {experienciasDesbloqueadas.length > 0 && (
          <div className="mb-3">
            <p className={`text-xs ${textMutedClass} mb-2`}>
              Experiências que você alcança:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {experienciasDesbloqueadas.slice(0, compact ? 3 : 6).map((exp) => (
                <span
                  key={exp.id}
                  className={`px-2 py-1 rounded-full text-[10px] font-heading font-medium border ${
                    exp.isDream
                      ? 'bg-antique-gold/20 border-antique-gold/40 text-antique-gold'
                      : isLight
                        ? 'bg-deep-purple/10 border-deep-purple/20 text-deep-purple'
                        : 'bg-dusty-rose/10 border-dusty-rose/20 text-dusty-rose'
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
      </motion.div>

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

// Exportar também como PointsSimulator para compatibilidade
export const PointsSimulator = PointsSimulatorTabs
