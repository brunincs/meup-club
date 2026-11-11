import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PlaneIcon, StarIcon, BriefcaseIcon, CrownIcon, DiamondIcon } from '@/components/ui/Icons'
import { siteConfig } from '@/config/siteConfig'

/**
 * Suba de Classe - SECAO CLARA
 * Texto escuro sobre fundo claro (para alternar com PrimeOffer escuro)
 */

// Estilos visuais para cada classe (independente dos dados)
const classStyles = [
  {
    icon: PlaneIcon,
    gradient: 'from-slate-400 to-slate-500',
    bgColor: 'bg-slate-100 border-slate-300',
    textColor: 'text-slate-600',
  },
  {
    icon: StarIcon,
    gradient: 'from-blue-400 to-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-600',
  },
  {
    icon: BriefcaseIcon,
    gradient: 'from-violet-400 to-purple-500',
    bgColor: 'bg-violet-50 border-violet-200',
    textColor: 'text-violet-600',
  },
  {
    icon: CrownIcon,
    gradient: 'from-antique-gold to-[#c9a962]',
    bgColor: 'bg-antique-gold/10 border-antique-gold/30',
    textColor: 'text-antique-gold',
  },
  {
    icon: DiamondIcon,
    gradient: 'from-slate-200 to-slate-300',
    bgColor: 'bg-antique-gold/10 border-antique-gold/30',
    textColor: 'text-antique-gold',
  },
]

export function RankingAlternada() {
  const classes = siteConfig.classes || []

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
          <GoldLine width="60px" centered className="mb-4" />
          <p className="text-deep-purple/70 max-w-lg mx-auto text-sm leading-relaxed">
            Sua classe é o seu nível dentro do clube — você sobe de graça, só acumulando pontos.
            Quanto mais alto, mais benefícios.
            <span className="block mt-1 text-deep-purple/50 text-xs">
              (Diferente do plano: a classe você conquista; o plano você escolhe.)
            </span>
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

            {classes.map((classe, index) => {
              const style = classStyles[index] || classStyles[0]
              const IconComponent = style.icon
              const isLast = index === classes.length - 1
              const isTop = classe.isTopo

              return (
                <motion.div
                  key={index}
                  variants={staggerItem}
                  className={`relative flex items-start gap-4 md:gap-6 ${isLast ? '' : 'mb-4'}`}
                >
                  {/* Icone do nivel */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg`}>
                    <IconComponent size={20} className="text-deep-purple" />
                    {isTop && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-antique-gold flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-deep-purple">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Card do nivel */}
                  <motion.div
                    whileHover={{
                      scale: 1.01,
                      transition: { duration: 0.2 }
                    }}
                    className={`flex-1 p-4 rounded-xl border ${style.bgColor} backdrop-blur-sm transition-all duration-300`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {/* Nome da classe */}
                      <h3 className={`font-heading font-semibold ${style.textColor}`}>
                        {classe.nome}
                      </h3>
                      {/* Badge com requisito de pontos */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                        isTop
                          ? 'bg-antique-gold/30 text-antique-gold border border-antique-gold/40 font-semibold'
                          : 'bg-deep-purple/10 text-deep-purple/60'
                      }`}>
                        {isTop ? 'Topo' : classe.requisito}
                      </span>
                    </div>
                    {/* Requisito de pontos para o topo (mostrar separado) */}
                    {isTop && (
                      <p className="text-xs text-antique-gold/80 mb-1">
                        {classe.requisito}
                      </p>
                    )}
                    {/* Beneficio */}
                    <p className="text-sm text-deep-purple/70">
                      {classe.beneficio}
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
