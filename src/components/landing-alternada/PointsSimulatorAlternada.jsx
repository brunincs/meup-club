import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import {
  PONTOS_POR_REAL,
  calculatePoints,
  formatPoints,
  getUnlockedExperiences,
  getNextExperience,
} from '@/config/experiences'

/**
 * Simulador de Pontos - SECAO CLARA
 * Texto escuro sobre fundo claro (contraste garantido)
 * ATENCAO ESPECIAL: "Voce acumularia" e "pontos" devem ser legiveis
 */

const SLIDER_MIN = 2000
const SLIDER_MAX = 50000
const SLIDER_STEP = 500
const SLIDER_INITIAL = 8000

export function PointsSimulatorAlternada() {
  const [valorGasto, setValorGasto] = useState(SLIDER_INITIAL)

  const pontosAcumulados = calculatePoints(valorGasto)
  const experienciasDesbloqueadas = getUnlockedExperiences(pontosAcumulados)
  const proximaExperiencia = getNextExperience(pontosAcumulados)
  const pontosFaltando = proximaExperiencia
    ? proximaExperiencia.points - pontosAcumulados
    : 0

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(valorGasto)

  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-ice-white">
      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-deep-purple/15 to-transparent mb-6" />

      <div className="container-premium">
        {/* Header - TEXTO ESCURO sobre fundo claro */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-8"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-deep-purple font-semibold mb-3">
            Simulador
          </span>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-deep-purple mb-3">
            Quanto voce pode ganhar
          </h2>
          <GoldLine width="60px" centered className="mb-3" />
          <p className="text-deep-purple/70 max-w-md mx-auto text-sm">
            Arraste o controle e veja suas experiencias se aproximando.
          </p>
        </motion.div>

        {/* Simulador */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          {/* Card do simulador */}
          <div className="p-6 md:p-8 rounded-2xl border border-deep-purple/20 bg-white shadow-lg">
            {/* Label do valor - TEXTO ESCURO */}
            <div className="text-center mb-6">
              <p className="text-sm text-deep-purple/70 mb-2">
                Se voce gastar em viagens:
              </p>
              <div className="text-3xl md:text-4xl font-display font-bold text-antique-gold">
                {valorFormatado}
              </div>
            </div>

            {/* Slider */}
            <div className="mb-8">
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={SLIDER_STEP}
                value={valorGasto}
                onChange={(e) => setValorGasto(Number(e.target.value))}
                className="slider-premium-clara w-full"
              />
              {/* Labels min/max - TEXTO ESCURO */}
              <div className="flex justify-between mt-2 text-xs text-deep-purple/70 font-medium">
                <span>R$ 2.000</span>
                <span>R$ 50.000</span>
              </div>
            </div>

            {/* Resultado: PONTOS - Caixa roxa com texto claro */}
            <div className="text-center p-5 rounded-xl bg-deep-purple border border-deep-purple mb-6">
              <p className="text-sm text-ice-white mb-1">Voce acumularia</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl md:text-4xl font-display font-bold text-antique-gold">
                  {formatPoints(pontosAcumulados)}
                </span>
                <span className="text-lg text-ice-white font-medium">pontos</span>
              </div>
            </div>

            {/* Experiencias desbloqueadas */}
            <div className="space-y-4">
              {/* Ja alcanca */}
              {experienciasDesbloqueadas.length > 0 && (
                <div>
                  <p className="text-sm text-deep-purple font-heading font-semibold mb-3 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0 text-antique-gold">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Voce ja alcanca:
                  </p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {experienciasDesbloqueadas.map((exp) => (
                      <span
                        key={exp.id}
                        className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-heading font-medium border transition-all ${
                          exp.isDream
                            ? 'bg-antique-gold/20 border-antique-gold/40 text-antique-gold'
                            : 'bg-deep-purple/10 border-deep-purple/20 text-deep-purple'
                        }`}
                      >
                        {exp.isDream && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        )}
                        {exp.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Proxima experiencia */}
              {proximaExperiencia && (
                <div className="pt-4 border-t border-deep-purple/10">
                  <p className="text-sm text-deep-purple/70 mb-2">
                    E esta a caminho de:
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-deep-purple/5 border border-deep-purple/10">
                    <span className="font-heading font-medium text-deep-purple text-sm sm:text-base">
                      {proximaExperiencia.title}
                    </span>
                    <span className="text-xs text-deep-purple/80 whitespace-nowrap">
                      faltam <span className="text-deep-purple font-bold">{formatPoints(pontosFaltando)}</span> pts
                    </span>
                  </div>
                </div>
              )}

              {/* Mensagem quando atingiu tudo */}
              {!proximaExperiencia && experienciasDesbloqueadas.length > 0 && (
                <div className="pt-4 border-t border-deep-purple/20">
                  <p className="text-sm text-deep-purple text-center font-heading font-semibold">
                    Voce alcanca todas as experiencias do clube!
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* CSS do slider customizado - versao clara */}
      <style>{`
        .slider-premium-clara {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(to right, rgba(50, 17, 63, 0.2), rgba(50, 17, 63, 0.4));
          outline: none;
          cursor: pointer;
        }

        .slider-premium-clara::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c9a962 0%, #a27937 100%);
          cursor: pointer;
          border: 3px solid #32113f;
          box-shadow: 0 4px 12px rgba(162, 121, 55, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .slider-premium-clara::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(162, 121, 55, 0.5);
        }

        .slider-premium-clara::-webkit-slider-thumb:active {
          transform: scale(1.15);
        }

        .slider-premium-clara::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c9a962 0%, #a27937 100%);
          cursor: pointer;
          border: 3px solid #32113f;
          box-shadow: 0 4px 12px rgba(162, 121, 55, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .slider-premium-clara::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(162, 121, 55, 0.5);
        }

        @media (max-width: 768px) {
          .slider-premium-clara::-webkit-slider-thumb {
            width: 36px;
            height: 36px;
          }
          .slider-premium-clara::-moz-range-thumb {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </section>
  )
}
