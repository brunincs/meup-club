import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'

const rankingData = [
  { position: 1, name: 'Marina S.', points: 48750, level: 'Diamante', avatar: 'M', isLeader: true },
  { position: 2, name: 'Ricardo L.', points: 42300, level: 'Diamante', avatar: 'R' },
  { position: 3, name: 'Fernanda C.', points: 38920, level: 'Platina', avatar: 'F' },
  { position: 4, name: 'Bruno M.', points: 31450, level: 'Platina', avatar: 'B' },
  { position: 5, name: 'Carolina T.', points: 28100, level: 'Ouro', avatar: 'C' },
]

const levelColors = {
  Diamante: 'from-cyan-400 to-blue-500',
  Platina: 'from-neutral-300 to-neutral-500',
  Ouro: 'from-amber-400 to-yellow-600',
}

const levelBgColors = {
  Diamante: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  Platina: 'bg-neutral-400/10 border-neutral-400/20 text-neutral-300',
  Ouro: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
}

function formatPoints(points) {
  return new Intl.NumberFormat('pt-BR').format(points)
}

function getPointsDiff(currentPoints, leaderPoints) {
  const diff = leaderPoints - currentPoints
  return diff > 0 ? `-${formatPoints(diff)}` : '—'
}

export function Ranking() {
  const leaderPoints = rankingData[0].points

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[180px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.12) 0%, transparent 60%)' }}
        />
      </div>

      <div className="container-premium relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-accent-gold mb-4">
            Competição ativa
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-neutral-100 mb-4">
            Quem está na frente?
          </h2>
          <p className="text-neutral-500 max-w-lg mx-auto text-base">
            O ranking atualiza a cada indicação. Sua posição depende de você.
          </p>
        </motion.div>

        {/* Ranking table */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-3xl mx-auto"
        >
          {/* Líder destacado */}
          <motion.div
            variants={staggerItem}
            className="mb-4"
          >
            <div className="relative p-5 md:p-6 rounded-2xl bg-gradient-to-r from-accent-gold/10 via-accent-gold/5 to-transparent border border-accent-gold/20 overflow-hidden">
              {/* Brilho de fundo */}
              <motion.div
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px]"
                style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.15) 0%, transparent 70%)' }}
              />

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5">
                  {/* Coroa animada */}
                  <motion.div
                    animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-2xl md:text-3xl"
                  >
                    👑
                  </motion.div>

                  {/* Avatar do líder */}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${levelColors.Diamante} flex items-center justify-center text-dark-900 font-bold text-lg shadow-lg shadow-cyan-500/20`}
                    >
                      {rankingData[0].avatar}
                    </motion.div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-gold flex items-center justify-center text-dark-900 text-xs font-bold">
                      1
                    </div>
                  </div>

                  {/* Info do líder */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-base md:text-lg font-semibold text-white">{rankingData[0].name}</span>
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-accent-gold/20 text-accent-gold border border-accent-gold/30">
                        Líder
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${levelBgColors.Diamante}`}>
                      {rankingData[0].level}
                    </span>
                  </div>
                </div>

                {/* Pontuação do líder */}
                <div className="text-right">
                  <div className="text-xl md:text-2xl font-display font-bold text-white">
                    {formatPoints(rankingData[0].points)}
                  </div>
                  <div className="text-xs text-neutral-500 hidden sm:block">pontos</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Outros competidores */}
          <div className="space-y-2">
            {rankingData.slice(1).map((user, index) => (
              <motion.div
                key={user.position}
                variants={staggerItem}
                whileHover={{
                  scale: 1.01,
                  backgroundColor: 'rgba(26, 26, 26, 0.8)',
                }}
                className="group grid grid-cols-12 gap-3 items-center px-4 md:px-5 py-4 rounded-xl border border-dark-700/50 bg-dark-800/30 transition-all duration-300 cursor-pointer"
              >
                {/* Posição */}
                <div className="col-span-1">
                  <span className={`font-mono text-lg font-bold ${index < 2 ? 'text-accent-gold' : 'text-neutral-600'}`}>
                    {user.position}
                  </span>
                </div>

                {/* Avatar + Nome */}
                <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${levelColors[user.level]} flex items-center justify-center text-dark-900 font-bold text-sm`}>
                    {user.avatar}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-neutral-100 group-hover:text-white transition-colors block truncate text-sm">
                      {user.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${levelBgColors[user.level]}`}>
                      {user.level}
                    </span>
                  </div>
                </div>

                {/* Pontos */}
                <div className="col-span-3 sm:col-span-3 text-right">
                  <span className="font-mono text-sm md:text-base text-neutral-100">
                    {formatPoints(user.points)}
                  </span>
                </div>

                {/* Diferença para o líder */}
                <div className="col-span-2 sm:col-span-3 text-right">
                  <span className="text-xs text-red-400/70 font-mono">
                    {getPointsDiff(user.points, leaderPoints)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Seu lugar */}
          <motion.div
            variants={staggerItem}
            className="mt-4 p-4 rounded-xl border border-dashed border-dark-600 bg-dark-800/20 text-center"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-neutral-600 text-sm">
                ?
              </span>
              <div className="text-left">
                <span className="text-neutral-400 text-sm block">Seu lugar está vazio</span>
                <span className="text-neutral-600 text-xs">Entre e comece a competir</span>
              </div>
            </div>
          </motion.div>

          {/* Status em tempo real */}
          <motion.div
            variants={staggerItem}
            className="mt-6 flex items-center justify-center gap-6 text-xs text-neutral-600"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-green-500"
              />
              <span>Tempo real</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
