// ============================================
// COMPONENTE: Calendário de Viagens
// Navegação por mês com dias marcados
// ============================================

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getViagensCalendario } from '@/services/minhasViagensService'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function ViagemCalendar({ onSelectViagem }) {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1) // 1-12
  const [viagens, setViagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [viagemSelecionada, setViagemSelecionada] = useState(null)

  useEffect(() => {
    loadViagens()
  }, [ano, mes])

  const loadViagens = async () => {
    setLoading(true)
    const result = await getViagensCalendario(ano, mes)
    if (result.success) {
      setViagens(result.viagens)
    }
    setLoading(false)
  }

  // Navegação de mês
  const irParaMesAnterior = () => {
    if (mes === 1) {
      setMes(12)
      setAno(ano - 1)
    } else {
      setMes(mes - 1)
    }
    setViagemSelecionada(null)
  }

  const irParaProximoMes = () => {
    if (mes === 12) {
      setMes(1)
      setAno(ano + 1)
    } else {
      setMes(mes + 1)
    }
    setViagemSelecionada(null)
  }

  const irParaHoje = () => {
    setAno(hoje.getFullYear())
    setMes(hoje.getMonth() + 1)
    setViagemSelecionada(null)
  }

  // Calcular dias do mês
  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(ano, mes - 1, 1)
    const ultimoDia = new Date(ano, mes, 0)
    const diasNoMes = ultimoDia.getDate()
    const diaSemanaInicio = primeiroDia.getDay()

    const dias = []

    // Dias vazios antes do início do mês
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push({ dia: null, viagens: [] })
    }

    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      const viagensDoDia = viagens.filter(v => {
        const ida = v.data_ida
        const volta = v.data_volta || v.data_ida
        return dataStr >= ida && dataStr <= volta
      })
      dias.push({ dia, data: dataStr, viagens: viagensDoDia })
    }

    return dias
  }, [ano, mes, viagens])

  // Verificar se é hoje
  const isHoje = (dataStr) => {
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    return dataStr === hojeStr
  }

  // Verificar tipo de dia na viagem (ida, volta, meio)
  const getTipoDia = (dataStr, viagem) => {
    if (dataStr === viagem.data_ida && dataStr === (viagem.data_volta || viagem.data_ida)) return 'unico'
    if (dataStr === viagem.data_ida) return 'ida'
    if (dataStr === (viagem.data_volta || viagem.data_ida)) return 'volta'
    return 'meio'
  }

  const handleDiaClick = (diaInfo) => {
    if (diaInfo.viagens.length > 0) {
      setViagemSelecionada(diaInfo.viagens[0])
      if (onSelectViagem) {
        onSelectViagem(diaInfo.viagens[0])
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <button
          onClick={irParaMesAnterior}
          className="p-2 rounded-lg hover:bg-dusty-rose/10 transition-colors"
          aria-label="Mês anterior"
        >
          <svg className="w-5 h-5 text-graphite/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <h3 className="text-lg font-display font-semibold text-graphite">
            {MESES[mes - 1]} {ano}
          </h3>
          <button
            onClick={irParaHoje}
            className="text-xs text-antique-gold font-heading hover:underline"
          >
            Ir para hoje
          </button>
        </div>

        <button
          onClick={irParaProximoMes}
          className="p-2 rounded-lg hover:bg-dusty-rose/10 transition-colors"
          aria-label="Próximo mês"
        >
          <svg className="w-5 h-5 text-graphite/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grade do calendário */}
      <div className="rounded-xl border border-dusty-rose/20 overflow-hidden bg-white">
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 bg-ice-white border-b border-dusty-rose/10">
          {DIAS_SEMANA.map(dia => (
            <div key={dia} className="p-2 text-center">
              <span className="text-[10px] font-heading font-medium text-graphite/50 uppercase tracking-wider">
                {dia}
              </span>
            </div>
          ))}
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7">
          {diasDoMes.map((diaInfo, idx) => {
            const temViagem = diaInfo.viagens.length > 0
            const ehHoje = diaInfo.data && isHoje(diaInfo.data)

            return (
              <button
                key={idx}
                onClick={() => diaInfo.dia && handleDiaClick(diaInfo)}
                disabled={!diaInfo.dia}
                className={`aspect-square p-1 border-b border-r border-dusty-rose/10 last:border-r-0 relative transition-colors ${
                  diaInfo.dia
                    ? temViagem
                      ? 'hover:bg-antique-gold/10 cursor-pointer'
                      : 'hover:bg-dusty-rose/5'
                    : ''
                } ${ehHoje ? 'bg-deep-purple/5' : ''}`}
              >
                {diaInfo.dia && (
                  <>
                    {/* Número do dia */}
                    <span className={`text-sm font-heading ${
                      ehHoje
                        ? 'font-bold text-deep-purple'
                        : temViagem
                          ? 'font-semibold text-graphite'
                          : 'text-graphite/60'
                    }`}>
                      {diaInfo.dia}
                    </span>

                    {/* Indicadores de viagem */}
                    {temViagem && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {diaInfo.viagens.slice(0, 3).map((v, vIdx) => {
                          const tipo = getTipoDia(diaInfo.data, v)
                          return (
                            <div
                              key={v.id || vIdx}
                              className={`h-1.5 rounded-full ${
                                tipo === 'ida' ? 'w-3 rounded-r-none' :
                                tipo === 'volta' ? 'w-3 rounded-l-none' :
                                tipo === 'meio' ? 'w-3 rounded-none' :
                                'w-1.5'
                              } ${
                                v.status === 'realizada'
                                  ? 'bg-dusty-rose'
                                  : 'bg-antique-gold'
                              }`}
                            />
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-dusty-rose/30 border-t-antique-gold rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viagem selecionada */}
      <AnimatePresence>
        {viagemSelecionada && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 rounded-xl bg-gradient-to-br from-antique-gold/10 to-antique-gold/5 border border-antique-gold/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-display font-semibold text-graphite">
                  {viagemSelecionada.titulo}
                </h4>
                <p className="text-xs text-graphite/60 font-heading mt-0.5">
                  {new Date(viagemSelecionada.data_ida + 'T12:00:00').toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long'
                  })}
                  {viagemSelecionada.data_volta && viagemSelecionada.data_volta !== viagemSelecionada.data_ida && (
                    <> a {new Date(viagemSelecionada.data_volta + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long'
                    })}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => setViagemSelecionada(null)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors"
              >
                <svg className="w-4 h-4 text-graphite/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 text-xs text-graphite/50 font-heading">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-antique-gold" />
          <span>Próximas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-dusty-rose" />
          <span>Realizadas</span>
        </div>
      </div>
    </div>
  )
}
