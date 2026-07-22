import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/motion'
import { GoldLine } from '@/components/ui/GoldLine'
import { PlaneIcon, StarIcon, BriefcaseIcon, CrownIcon, DiamondIcon } from '@/components/ui/Icons'

// Sistema de classes baseado em cabines de voo
const rankingData = [
  { position: 1, name: 'Marina S.', points: 48750, level: 'Meup Exclusive', levelId: 5, avatar: 'M', isLeader: true },
  { position: 2, name: 'Ricardo L.', points: 42300, level: 'Meup Exclusive', levelId: 5, avatar: 'R' },
  { position: 3, name: 'Fernanda C.', points: 38920, level: 'Primeira Classe', levelId: 4, avatar: 'F' },
  { position: 4, name: 'Bruno M.', points: 31450, level: 'Primeira Classe', levelId: 4, avatar: 'B' },
  { position: 5, name: 'Carolina T.', points: 28100, level: 'Executiva', levelId: 3, avatar: 'C' },
]

const levelColors = {
  5: 'from-slate-200 to-slate-400', // Meup Exclusive (platina/diamante)
  4: 'from-amber-400 to-yellow-600', // Primeira Classe
  3: 'from-violet-400 to-purple-600', // Executiva
  2: 'from-blue-400 to-blue-600', // Premium Economy
  1: 'from-slate-400 to-slate-600', // Econômica
}

const levelBgColors = {
  5: 'bg-slate-200/10 border-slate-300/20 text-slate-200',
  4: 'bg-amber-500/10 border-amber-400/20 text-amber-400',
  3: 'bg-violet-500/10 border-violet-400/20 text-violet-400',
  2: 'bg-blue-500/10 border-blue-400/20 text-blue-400',
  1: 'bg-slate-500/10 border-slate-400/20 text-slate-400',
}

const levelIcons = {
  5: DiamondIcon,
  4: CrownIcon,
  3: BriefcaseIcon,
  2: StarIcon,
  1: PlaneIcon,
}

function formatPoints(points) {
  return new Intl.NumberFormat('pt-BR').format(points)
}

function getPointsDiff(currentPoints, leaderPoints) {
  const diff = leaderPoints - currentPoints
  return diff > 0 ? `-${formatPoints(diff)}` : '—'
}

function getLevelIcon(levelId, className = '') {
  const IconComponent = levelIcons[levelId] || PlaneIcon
  return <IconComponent size={16} className={className} />
}

export function Ranking() {
  const leaderPoints = rankingData[0].points

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[180px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.12) 0%, transparent 60%)' }}
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
          <span className="inline-block text-xs font-heading uppercase tracking-[0.3em] text-antique-gold mb-4">
            Competição ativa
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-ice-white mb-4">
            Quem está na frente?
          </h2>
          <GoldLine width="80px" centered className="mb-4" />
          <p className="text-dusty-rose max-w-lg mx-auto text-base">
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
            <div className="relative p-5 md:p-6 rounded-2xl bg-gradient-to-r from-antique-gold/10 via-antique-gold/5 to-transparent border border-antique-gold/20 overflow-hidden">
              {/* Brilho de fundo */}
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] opacity-30"
                style={{ background: 'radial-gradient(circle, rgba(162, 121, 55, 0.15) 0%, transparent 70%)' }}
              />

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-5">
                  {/* Ícone de coroa */}
                  <div className="text-antique-gold">
                    <CrownIcon size={28} filled />
                  </div>

                  {/* Avatar do líder */}
                  <div className="relative">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${levelColors[rankingData[0].levelId]} flex items-center justify-center text-deep-purple font-bold text-lg shadow-lg`}>
                      {rankingData[0].avatar}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-antique-gold flex items-center justify-center text-deep-purple text-xs font-bold">
                      1
                    </div>
                  </div>

                  {/* Info do líder */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-base md:text-lg font-heading font-semibold text-white">{rankingData[0].name}</span>
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-antique-gold/20 text-antique-gold border border-antique-gold/30">
                        Líder
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${levelBgColors[rankingData[0].levelId]}`}>
                      {getLevelIcon(rankingData[0].levelId)}
                      {rankingData[0].level}
                    </span>
                  </div>
                </div>

                {/* Pontuação do líder */}
                <div className="text-right">
                  <div className="text-xl md:text-2xl font-display font-bold text-white">
                    {formatPoints(rankingData[0].points)}
                  </div>
                  <div className="text-xs text-dusty-rose hidden sm:block">pontos</div>
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
                  backgroundColor: 'rgba(58, 24, 73, 0.8)',
                }}
                className="group grid grid-cols-12 gap-3 items-center px-4 md:px-5 py-4 rounded-xl border border-dusty-rose/20 bg-deep-purple/30 transition-all duration-300 cursor-pointer"
              >
                {/* Posição */}
                <div className="col-span-1">
                  <span className={`font-mono text-lg font-bold ${index < 2 ? 'text-antique-gold' : 'text-dusty-rose'}`}>
                    {user.position}
                  </span>
                </div>

                {/* Avatar + Nome */}
                <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${levelColors[user.levelId]} flex items-center justify-center text-deep-purple font-bold text-sm`}>
                    {user.avatar}
                  </div>
                  <div className="min-w-0">
                    <span className="font-heading font-medium text-ice-white group-hover:text-white transition-colors block truncate text-sm">
                      {user.name}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${levelBgColors[user.levelId]}`}>
                      {getLevelIcon(user.levelId, 'w-3 h-3')}
                      {user.level}
                    </span>
                  </div>
                </div>

                {/* Pontos */}
                <div className="col-span-3 sm:col-span-3 text-right">
                  <span className="font-mono text-sm md:text-base text-ice-white">
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
            className="mt-4 p-4 rounded-xl border border-dashed border-dusty-rose/30 bg-deep-purple/20 text-center"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-dusty-rose/10 border border-dusty-rose/20 flex items-center justify-center text-dusty-rose text-sm">
                ?
              </span>
              <div className="text-left">
                <span className="text-dusty-rose text-sm block">Seu lugar está vazio</span>
                <span className="text-dusty-rose/60 text-xs">Entre e comece a competir</span>
              </div>
            </div>
          </motion.div>

          {/* Status em tempo real */}
          <motion.div
            variants={staggerItem}
            className="mt-6 flex items-center justify-center gap-6 text-xs text-dusty-rose"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>Tempo real</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
