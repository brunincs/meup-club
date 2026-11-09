import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PlaneIcon, StarIcon, BriefcaseIcon, CrownIcon, DiamondIcon } from '@/components/ui/Icons'

/**
 * Suba de Classe - SECAO CLARA
 * Texto escuro sobre fundo claro (para alternar com PrimeOffer escuro)
 */

const classLevels = [
  {
    id: 1,
    name: 'Econômica',
    shortName: 'Econômica',
    benefit: 'Acesso ao clube e acúmulo de pontos',
    icon: PlaneIcon,
    gradient: 'from-slate-400 to-slate-500',
    bgColor: 'bg-slate-100 border-slate-300',
    textColor: 'text-slate-600',
  },
  {
    id: 2,
    name: 'Econômica Premium',
    shortName: 'Premium',
    benefit: 'Experiências exclusivas desbloqueadas',
    icon: StarIcon,
    gradient: 'from-blue-400 to-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-600',
  },
  {
    id: 3,
    name: 'Executiva',
    shortName: 'Executiva',
    benefit: 'Upgrades e lounges com desconto',
    icon: BriefcaseIcon,
    gradient: 'from-violet-400 to-purple-500',
    bgColor: 'bg-violet-50 border-violet-200',
    textColor: 'text-violet-600',
  },
  {
    id: 4,
    name: 'Primeira Classe',
    shortName: 'Primeira',
    benefit: 'Acesso a experiências premium',
    icon: CrownIcon,
    gradient: 'from-amber-400 to-yellow-500',
    bgColor: 'bg-amber-50 border-amber-200',
    textColor: 'text-amber-600',
  },
  {
    id: 5,
    name: 'Meup Exclusive',
    shortName: 'Exclusive',
    benefit: 'Benefícios máximos do clube',
    icon: DiamondIcon,
    gradient: 'from-slate-200 to-slate-300',
    bgColor: 'bg-antique-gold/10 border-antique-gold/30',
    textColor: 'text-antique-gold',
    isTop: true,
  },
]

export function RankingAlternada() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-ice-white">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(50, 17, 63, 0.15) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10">
        {/* Header - TEXTO CLARO sobre fundo escuro */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-8"
        >
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-deep-purple font-semibold mb-3">
            Evolução
          </span>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-deep-purple mb-3">
            Suba de classe
          </h2>
          <GoldLine width="60px" centered className="mb-3" />
          <p className="text-deep-purple/70 max-w-md mx-auto text-sm">
            Quanto mais você viaja, mais alto chega. Cada nível traz novos benefícios.
          </p>
        </motion.div>

        {/* Jornada de classes */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-3xl mx-auto"
        >
          {/* Timeline visual */}
          <div className="relative">
            {/* Linha conectora - dourada */}
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-slate-400/40 via-violet-400/40 to-antique-gold/60" />

            {classLevels.map((level, index) => {
              const IconComponent = level.icon
              const isLast = index === classLevels.length - 1

              return (
                <motion.div
                  key={level.id}
                  variants={staggerItem}
                  className={`relative flex items-start gap-4 md:gap-6 ${isLast ? '' : 'mb-4'}`}
                >
                  {/* Icone do nivel */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${level.gradient} flex items-center justify-center shadow-lg`}>
                    <IconComponent size={20} className="text-deep-purple" />
                    {level.isTop && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-antique-gold flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-deep-purple">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Card do nivel - fundo semi-transparente */}
                  <motion.div
                    whileHover={{
                      scale: 1.01,
                      transition: { duration: 0.2 }
                    }}
                    className={`flex-1 p-4 rounded-xl border ${level.bgColor} backdrop-blur-sm transition-all duration-300`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {/* Nome da classe - COR CLARA e legivel */}
                      <h3 className={`font-heading font-semibold ${level.textColor}`}>
                        {level.name}
                      </h3>
                      {level.isTop && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-antique-gold/30 text-antique-gold border border-antique-gold/40">
                          Topo
                        </span>
                      )}
                    </div>
                    {/* Beneficio - texto escuro */}
                    <p className="text-sm text-deep-purple/60">
                      {level.benefit}
                    </p>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>

          {/* Mensagem de incentivo */}
          <motion.div
            variants={staggerItem}
            className="mt-6 p-4 rounded-xl border border-deep-purple/20 bg-deep-purple/5 text-center"
          >
            <p className="text-sm text-deep-purple">
              Você começa na <span className="text-antique-gold font-medium">Econômica</span> e sobe conforme acumula pontos.
            </p>
            <p className="text-xs text-deep-purple/60 mt-1">
              Sua jornada, seu ritmo.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
