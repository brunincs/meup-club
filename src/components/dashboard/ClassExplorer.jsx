import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { levels } from '@/services/pointsSystem'
import { levels as levelCopy } from '@/services/copy'
import { getClassIcon } from '@/components/ui/Icons'
import { useUserLevel } from '@/hooks/useUserLevel'
import { fetchExperienciasComPrecos } from '@/services/experienciasService'

export function ClassExplorer() {
  const { currentId: userLevelId, totalPointsEarned } = useUserLevel()

  const [selectedClass, setSelectedClass] = useState(null)
  const [experiencias, setExperiencias] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Inicializar selectedClass com a classe atual do usuário
  // Só define uma vez quando userLevelId estiver disponível
  useEffect(() => {
    if (userLevelId && selectedClass === null) {
      setSelectedClass(userLevelId)
    }
  }, [userLevelId, selectedClass])

  // Carregar experiências do banco com preços calculados
  useEffect(() => {
    async function loadExperiencias() {
      try {
        const result = await fetchExperienciasComPrecos()
        if (result.success) {
          setExperiencias(result.experiencias)
        }
      } catch (error) {
        console.error('Erro ao carregar experiências:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadExperiencias()
  }, [])

  // Esperar userLevelId estar disponível antes de determinar activeClass
  // Isso evita que o componente renderize com classe errada no primeiro render
  const activeClass = selectedClass ?? userLevelId

  // Se ainda não temos classe definida, mostrar loading
  if (!activeClass) {
    return (
      <div className="p-6 rounded-2xl border border-dusty-rose/20 bg-deep-purple/30">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 mx-auto rounded bg-dusty-rose/20" />
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-[90px] h-16 rounded-xl bg-dusty-rose/10" />
            ))}
          </div>
          <div className="h-40 rounded-2xl bg-dusty-rose/10" />
        </div>
      </div>
    )
  }
  const selectedLevel = levels.find(l => l.id === activeClass)
  const ClassIcon = getClassIcon(activeClass)
  const isUnlocked = userLevelId >= activeClass

  // Experiências da classe selecionada (do banco)
  const classRewards = useMemo(() => {
    return experiencias
      .filter(exp => exp.classe_minima === activeClass)
      .slice(0, 3)
  }, [experiencias, activeClass])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-lg font-display font-semibold text-ice-white mb-2">
          Explore as Classes
        </h3>
        <p className="text-sm text-dusty-rose">
          Deslize para ver os benefícios de cada nível
        </p>
      </div>

      {/* Seletor de classes */}
      <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2">
        {levels.map((level) => {
          const LevelIcon = getClassIcon(level.id)
          const isActive = activeClass === level.id
          const isUserLevel = userLevelId === level.id
          const isLocked = userLevelId < level.id

          return (
            <motion.button
              key={level.id}
              onClick={() => setSelectedClass(level.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all min-w-[90px] ${
                isActive
                  ? 'bg-antique-gold/20 border-antique-gold/40'
                  : isLocked
                    ? 'bg-deep-purple/30 border-dusty-rose/10 opacity-60'
                    : 'bg-deep-purple/30 border-dusty-rose/20 hover:border-dusty-rose/40'
              }`}
            >
              {/* Badge de nível atual */}
              {isUserLevel && (
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] uppercase tracking-wider bg-antique-gold text-deep-purple rounded-full font-bold">
                  Você
                </span>
              )}

              <LevelIcon
                size={24}
                color={isActive ? '#a27937' : isLocked ? '#a39695' : '#ddd1d0'}
              />
              <span className={`text-[10px] font-heading font-medium ${
                isActive ? 'text-antique-gold' : 'text-dusty-rose'
              }`}>
                {levelCopy.shortNames[level.id]}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Detalhes da classe selecionada */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeClass}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`p-6 rounded-2xl border ${
            isUnlocked
              ? 'bg-antique-gold/5 border-antique-gold/20'
              : 'bg-deep-purple/30 border-dusty-rose/20'
          }`}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Info da classe */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  isUnlocked ? 'bg-antique-gold/20' : 'bg-dusty-rose/10'
                }`}>
                  <ClassIcon size={28} color={isUnlocked ? '#a27937' : '#a39695'} />
                </div>
                <div>
                  <h4 className={`text-xl font-heading font-medium ${
                    isUnlocked ? 'text-ice-white' : 'text-dusty-rose'
                  }`}>
                    {levelCopy.names[activeClass]}
                  </h4>
                  <p className="text-xs text-dusty-rose">
                    {selectedLevel?.minPoints.toLocaleString('pt-BR')}+ pontos
                  </p>
                </div>
              </div>

              {/* Perks */}
              <div className="space-y-2">
                {selectedLevel?.perks.map((perk, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={`w-4 h-4 flex-shrink-0 ${
                        isUnlocked ? 'text-antique-gold' : 'text-dusty-rose/60'
                      }`}
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className={`text-sm ${
                      isUnlocked ? 'text-ice-white' : 'text-dusty-rose/80'
                    }`}>
                      {perk}
                    </span>
                  </div>
                ))}
              </div>

              {/* Status */}
              {!isUnlocked && (
                <div className="mt-4 p-3 rounded-lg bg-dusty-rose/10 border border-dusty-rose/20">
                  <p className="text-xs text-dusty-rose">
                    Faltam <span className="text-antique-gold font-bold">
                      {(selectedLevel.minPoints - totalPointsEarned).toLocaleString('pt-BR')}
                    </span> pontos para desbloquear
                  </p>
                </div>
              )}
            </div>

            {/* Experiências da classe */}
            <div className="lg:w-64">
              <p className="text-[10px] uppercase tracking-wider text-dusty-rose mb-3">
                Experiências desta classe
              </p>
              <div className="space-y-2">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 rounded-lg bg-dusty-rose/10 animate-pulse" />
                    ))}
                  </div>
                ) : classRewards.length > 0 ? (
                  classRewards.map((exp) => (
                    <div
                      key={exp.id}
                      className={`p-3 rounded-lg border ${
                        isUnlocked
                          ? 'bg-deep-purple/30 border-dusty-rose/20'
                          : 'bg-deep-purple/20 border-dusty-rose/10 opacity-60'
                      }`}
                    >
                      <p className={`text-sm font-heading font-medium ${
                        isUnlocked ? 'text-ice-white' : 'text-dusty-rose'
                      }`}>
                        {exp.nome}
                      </p>
                      <p className="text-[10px] text-dusty-rose/60">
                        {(exp.pontos_usuario || exp.pontos).toLocaleString('pt-BR')} pts
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-dusty-rose/60 italic">
                    Experiências premium disponíveis
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
