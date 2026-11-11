import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  useExperiencias,
  PONTOS_POR_REAL,
  formatPoints,
  getUnlockedExperiences,
  getNextExperience,
} from '@/hooks/useExperiencias'
import { fetchPlanosConfig, fetchUserBenefits } from '@/services/subscriptionService'
import { useAuth } from '@/contexts/AuthContext'
import { garantirVagaFundadorWhatsApp } from '@/services/paymentAdapter'

/**
 * Simulador de Pontos Unificado
 *
 * Dois modos de simulação:
 * - "travel": quanto VOCÊ ganha viajando (slider de valor em R$)
 * - "referral": quanto você ganha indicando (slider de número de amigos)
 *
 * Agora com alternância Free/Prime para mostrar a diferença de ganhos.
 *
 * Props:
 * - mode: "travel" | "referral"
 * - variant: "light" | "dark" (para ajustar cores ao fundo)
 * - compact: boolean (versão menor para dashboard)
 * - plano: "free" | "prime" (qual plano simular)
 * - showPlanToggle: boolean (mostrar toggle Free/Prime)
 */

export function PointsSimulator({
  mode = 'travel',
  variant = 'light',
  compact = false,
  plano = 'prime',
  ciclo = null, // 'anual' | 'mensal' | null
  config = null,
}) {
  // Config padrão (fallback)
  const freeConfig = config?.free || { pontosCheckin: 10, pontosIndicacao: 3000 }
  const primeConfig = config?.prime || { pontosCheckin: 30, pontosIndicacao: 5000 }

  const planoConfig = plano === 'prime' ? primeConfig : freeConfig
  // Multiplicador 1.5x APENAS para Prime ANUAL
  const multiplicador = (plano === 'prime' && ciclo === 'anual') ? 1.5 : 1

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
      formatMinMax: () => ({ min: 'R$ 2.000', max: 'R$ 50.000' }),
      calculatePoints: (value) => Math.floor(value * PONTOS_POR_REAL * multiplicador),
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
      formatMinMax: () => ({ min: '1 amigo', max: '10 amigos' }),
      calculatePoints: (value) => value * planoConfig.pontosIndicacao,
    },
  }

  const modeConfig = CONFIG[mode]
  const [inputValue, setInputValue] = useState(modeConfig.sliderInitial)
  const { allExperiences } = useExperiencias()

  const pontosAcumulados = modeConfig.calculatePoints(inputValue)
  const experienciasDesbloqueadas = getUnlockedExperiences(allExperiences, pontosAcumulados)
  const proximaExperiencia = getNextExperience(allExperiences, pontosAcumulados)
  const pontosFaltando = proximaExperiencia
    ? proximaExperiencia.points - pontosAcumulados
    : 0

  const isLight = variant === 'light'
  const minMaxLabels = modeConfig.formatMinMax()

  // Classes baseadas na variante
  const cardClass = isLight
    ? 'border-deep-purple/20 bg-white shadow-lg'
    : 'border-dusty-rose/20 bg-deep-purple/30'

  const textSecondaryClass = isLight ? 'text-deep-purple/70' : 'text-dusty-rose'
  const textMutedClass = isLight ? 'text-deep-purple/60' : 'text-dusty-rose/60'
  const textPrimaryClass = isLight ? 'text-deep-purple' : 'text-ice-white'

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
          {modeConfig.inputLabel}
        </p>
        <div className="text-2xl md:text-3xl font-display font-bold text-antique-gold">
          {modeConfig.formatInput(inputValue)}
        </div>
      </div>

      {/* Slider */}
      <div className="mb-5">
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
        {plano === 'prime' && mode === 'travel' && ciclo === 'anual' && (
          <p className="text-xs text-antique-gold/80 mt-1">
            (inclui multiplicador 1.5x do seu Prime Anual)
          </p>
        )}
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
 * Wrapper com abas para alternar entre modos E planos
 * Condicional por plano do usuário:
 * - Prime: só mostra ganhos do Prime (sem comparação)
 * - Free: mostra comparação Free vs Prime + CTA para upgrade
 */
export function PointsSimulatorTabs({ variant = 'light', compact = false }) {
  const { profile, user } = useAuth()
  const [activeMode, setActiveMode] = useState('travel')
  const [activePlano, setActivePlano] = useState('prime')
  const [config, setConfig] = useState(null)
  const [userBenefits, setUserBenefits] = useState(null)
  const isLight = variant === 'light'

  // Verificar se usuário é Prime e qual o ciclo
  const userIsPrime = userBenefits?.isPrime || false
  const userCiclo = userBenefits?.ciclo || null // 'anual' | 'mensal' | null

  // Carregar config dos planos e benefícios do usuário
  useEffect(() => {
    async function load() {
      const result = await fetchPlanosConfig()
      if (result.success) {
        setConfig(result.planos)
      }

      // Buscar benefícios reais do usuário
      if (user?.id) {
        const benefitsResult = await fetchUserBenefits(user.id)
        if (benefitsResult.success) {
          setUserBenefits(benefitsResult.benefits)
        }
      }
    }
    load()
  }, [user?.id])

  // Se Prime, sempre mostrar só Prime
  useEffect(() => {
    if (userIsPrime) {
      setActivePlano('prime')
    }
  }, [userIsPrime])

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

  const planoTabClass = (isActive) => {
    if (isActive) {
      return 'bg-antique-gold text-deep-purple font-semibold'
    }
    return isLight
      ? 'text-deep-purple/60 hover:text-deep-purple border border-deep-purple/20'
      : 'text-dusty-rose/60 hover:text-dusty-rose border border-dusty-rose/20'
  }

  // Calcular diferença para mostrar vantagem do Prime
  const freeConfig = config?.free || { pontosIndicacao: 3000 }
  const primeConfig = config?.prime || { pontosIndicacao: 5000 }

  const handleUpgrade = () => {
    garantirVagaFundadorWhatsApp('anual')
  }

  return (
    <div>
      {/* Toggle Free / Prime - só mostra se NÃO é Prime */}
      {!userIsPrime && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setActivePlano('free')}
            className={`px-4 py-2 rounded-lg text-sm font-heading transition-all ${planoTabClass(activePlano === 'free')}`}
          >
            Free
          </button>
          <button
            onClick={() => setActivePlano('prime')}
            className={`px-4 py-2 rounded-lg text-sm font-heading transition-all ${planoTabClass(activePlano === 'prime')}`}
          >
            👑 Prime
          </button>
        </div>
      )}

      {/* Badge Prime para usuários Prime */}
      {userIsPrime && (
        <div className="text-center mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading ${
            isLight ? 'bg-antique-gold/20 text-antique-gold' : 'bg-antique-gold/20 text-antique-gold'
          }`}>
            👑 Seus ganhos como Prime {userCiclo === 'anual' ? 'Anual' : 'Mensal'}
          </span>
        </div>
      )}

      {/* Indicador de vantagem - só para Free simulando Prime */}
      {!userIsPrime && activePlano === 'prime' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading ${
            isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400'
          }`}>
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {activeMode === 'travel' ? 'Prime Anual: 1,5x pontos nas viagens' : 'Prime: +5.000 pts por indicação'}
          </span>
        </motion.div>
      )}

      {/* Tabs de modo */}
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
        key={`${activeMode}-${activePlano}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <PointsSimulator
          mode={activeMode}
          variant={variant}
          compact={compact}
          plano={userIsPrime ? 'prime' : activePlano}
          ciclo={userIsPrime ? userCiclo : (activePlano === 'prime' ? 'anual' : null)}
          config={config}
        />
      </motion.div>

      {/* CTA para upgrade - só para Free */}
      {!userIsPrime && activePlano === 'free' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-4 p-4 rounded-xl text-center ${
            isLight ? 'bg-antique-gold/10 border border-antique-gold/20' : 'bg-antique-gold/5 border border-antique-gold/20'
          }`}
        >
          <p className={`text-sm mb-3 ${isLight ? 'text-deep-purple' : 'text-ice-white'}`}>
            Com o <span className="text-antique-gold font-semibold">Prime</span>, você ganharia{' '}
            <span className="text-antique-gold font-bold">
              {activeMode === 'travel' ? '50% mais' : `+${formatPoints(primeConfig.pontosIndicacao - freeConfig.pontosIndicacao)}`}
            </span>{' '}
            {activeMode === 'travel' ? 'pontos' : 'pts por indicação'}
          </p>
          <button
            onClick={handleUpgrade}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-antique-gold text-deep-purple text-sm font-heading font-semibold hover:bg-accent-light transition-colors"
          >
            Assine o Prime e ganhe mais pontos
            <span>→</span>
          </button>
        </motion.div>
      )}
    </div>
  )
}
