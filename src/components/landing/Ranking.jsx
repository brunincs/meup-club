import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PlaneIcon, StarIcon, BriefcaseIcon, CrownIcon, DiamondIcon } from '@/components/ui/Icons'

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SUA JORNADA DE CLASSE                                                     ║
 * ║                                                                            ║
 * ║  Mostra a progressão PESSOAL de nível no clube, sem comparação.            ║
 * ║  Tom: pertencimento e evolução, não disputa.                               ║
 * ║                                                                            ║
 * ║  Classes (do projeto):                                                     ║
 * ║  1. Econômica → 2. Econômica Premium → 3. Executiva →                      ║
 * ║  4. Primeira Classe → 5. Meup Exclusive                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

const classLevels = [
  {
    id: 1,
    name: 'Econômica',
    shortName: 'Econômica',
    // DETALHE DE NÍVEL A DEFINIR - benefícios exatos
    benefit: 'Acesso ao clube e acúmulo de pontos',
    icon: PlaneIcon,
    gradient: 'from-slate-400 to-slate-600',
    bgColor: 'bg-slate-500/10 border-slate-400/30',
    textColor: 'text-slate-300',
  },
  {
    id: 2,
    name: 'Econômica Premium',
    shortName: 'Premium',
    // DETALHE DE NÍVEL A DEFINIR - benefícios exatos
    benefit: 'Experiências exclusivas desbloqueadas',
    icon: StarIcon,
    gradient: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-500/10 border-blue-400/30',
    textColor: 'text-blue-400',
  },
  {
    id: 3,
    name: 'Executiva',
    shortName: 'Executiva',
    // DETALHE DE NÍVEL A DEFINIR - benefícios exatos
    benefit: 'Upgrades e lounges com desconto',
    icon: BriefcaseIcon,
    gradient: 'from-violet-400 to-purple-600',
    bgColor: 'bg-violet-500/10 border-violet-400/30',
    textColor: 'text-violet-400',
  },
  {
    id: 4,
    name: 'Primeira Classe',
    shortName: 'Primeira',
    // DETALHE DE NÍVEL A DEFINIR - benefícios exatos
    benefit: 'Acesso a experiências premium',
    icon: CrownIcon,
    gradient: 'from-amber-400 to-yellow-600',
    bgColor: 'bg-amber-500/10 border-amber-400/30',
    textColor: 'text-amber-400',
  },
  {
    id: 5,
    name: 'Meup Exclusive',
    shortName: 'Exclusive',
    // DETALHE DE NÍVEL A DEFINIR - benefícios exatos
    benefit: 'Benefícios máximos do clube',
    icon: DiamondIcon,
    gradient: 'from-slate-200 to-slate-400',
    bgColor: 'bg-slate-200/10 border-slate-300/30',
    textColor: 'text-slate-200',
    isTop: true,
  },
]

export function Ranking() {
  return (
    <section className="relative py-10 md:py-12 overflow-hidden bg-ice-white">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.15) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10">
        {/* Header */}
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
          <p className="text-deep-purple/80 max-w-md mx-auto text-sm">
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
            {/* Linha conectora */}
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-slate-500/40 via-violet-500/40 to-amber-500/40" />

            {classLevels.map((level, index) => {
              const IconComponent = level.icon
              const isLast = index === classLevels.length - 1

              return (
                <motion.div
                  key={level.id}
                  variants={staggerItem}
                  className={`relative flex items-start gap-4 md:gap-6 ${isLast ? '' : 'mb-4'}`}
                >
                  {/* Ícone do nível */}
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

                  {/* Card do nível */}
                  <motion.div
                    whileHover={{
                      scale: 1.01,
                      transition: { duration: 0.2 }
                    }}
                    className={`flex-1 p-4 rounded-xl border ${level.bgColor} transition-all duration-300`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-heading font-semibold ${level.textColor}`}>
                        {level.name}
                      </h3>
                      {level.isTop && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                          Topo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-deep-purple/80">
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
            className="mt-6 p-4 rounded-xl border border-antique-gold/20 bg-antique-gold/5 text-center"
          >
            <p className="text-sm text-deep-purple">
              Você começa na <span className="text-deep-purple/80 font-medium">Econômica</span> e sobe conforme acumula pontos.
            </p>
            <p className="text-xs text-deep-purple/80 mt-1">
              Sua jornada, seu ritmo.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
