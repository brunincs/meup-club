import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'

const rewards = [
  {
    id: 'pix',
    title: 'Saque imediato via Pix',
    description: 'Pontos viram dinheiro real na sua conta.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path
          d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    points: '5.000',
    color: 'emerald',
  },
  {
    id: 'upgrade',
    title: 'Upgrade prioritário de voo',
    description: 'Saia da econômica. Entre na executiva.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path
          d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    points: '15.000',
    featured: true,
    color: 'gold',
  },
  {
    id: 'stopover',
    title: 'Stopover exclusivo',
    description: 'Uma viagem, dois destinos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    points: '20.000',
    color: 'blue',
  },
  {
    id: 'dinner',
    title: 'Jantar pago pela casa',
    description: 'Restaurantes premium. Conta zerada.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path
          d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    points: '12.000',
    color: 'purple',
  },
  {
    id: 'exclusive',
    title: 'Benefícios elite',
    description: 'Vantagens secretas para o topo.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 8l2 2-2 2-2-2 2-2z" fill="currentColor" />
      </svg>
    ),
    points: '30.000',
    locked: true,
    color: 'gold',
  },
]

const colorStyles = {
  emerald: {
    iconBg: 'group-hover:bg-emerald-500/10',
    iconColor: 'group-hover:text-emerald-400',
  },
  gold: {
    iconBg: 'group-hover:bg-accent-gold/10',
    iconColor: 'group-hover:text-accent-gold',
  },
  blue: {
    iconBg: 'group-hover:bg-blue-500/10',
    iconColor: 'group-hover:text-blue-400',
  },
  purple: {
    iconBg: 'group-hover:bg-purple-500/10',
    iconColor: 'group-hover:text-purple-400',
  },
}

export function Rewards() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Divider */}
      <div className="divider-premium mb-16 md:mb-20" />

      <div className="container-premium">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-accent-gold mb-4">
            Catálogo
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-neutral-100 mb-4">
            O que seus pontos podem virar
          </h2>
          <p className="text-neutral-500 max-w-lg mx-auto text-base">
            Cada ponto é uma fração de algo real. Escolha como usar.
          </p>
        </motion.div>

        {/* Rewards grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
        >
          {rewards.map((reward) => {
            const styles = colorStyles[reward.color] || colorStyles.gold

            return (
              <motion.div
                key={reward.id}
                variants={staggerItem}
                whileHover={{
                  y: -6,
                  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                }}
                className={`group relative p-6 rounded-2xl border transition-all duration-500 cursor-pointer ${
                  reward.featured
                    ? 'border-accent-gold/30 bg-gradient-to-b from-accent-gold/5 to-dark-800/50'
                    : reward.locked
                    ? 'border-dark-700/30 bg-dark-800/20'
                    : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-500 hover:bg-dark-700/40'
                }`}
              >
                {/* Featured badge */}
                {reward.featured && (
                  <div className="absolute -top-2.5 left-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-accent-gold text-dark-900 font-semibold">
                      <span className="w-1 h-1 rounded-full bg-dark-900 animate-pulse" />
                      Popular
                    </span>
                  </div>
                )}

                {/* Locked icon */}
                {reward.locked && (
                  <div className="absolute top-5 right-5">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-neutral-700">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 ${
                    reward.featured
                      ? 'bg-accent-gold/10 text-accent-gold'
                      : `bg-dark-700/50 text-neutral-500 ${styles.iconBg} ${styles.iconColor}`
                  } ${reward.locked ? 'opacity-40' : ''}`}
                >
                  {reward.icon}
                </motion.div>

                {/* Content */}
                <h3 className={`text-base font-semibold mb-2 transition-colors duration-300 ${
                  reward.locked ? 'text-neutral-600' : 'text-neutral-100 group-hover:text-white'
                }`}>
                  {reward.title}
                </h3>
                <p className={`text-sm leading-relaxed mb-5 ${
                  reward.locked ? 'text-neutral-700' : 'text-neutral-500'
                }`}>
                  {reward.description}
                </p>

                {/* Points footer */}
                <div className="flex items-center justify-between pt-4 border-t border-dark-600/30">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-600">
                    {reward.locked ? 'Bloqueado' : 'A partir de'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-sm font-semibold ${
                      reward.locked ? 'text-neutral-700' : 'text-accent-gold'
                    }`}>
                      {reward.points}
                    </span>
                    <span className="text-neutral-600 text-xs">pts</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
