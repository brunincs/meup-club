// ============================================
// COMPONENTE: Trecho de Voo (IDA/VOLTA)
// ============================================

import { useMemo } from 'react'

// Configuração de antecedência de check-in por companhia (em horas)
const CHECKIN_ANTECEDENCIA = {
  'LATAM': 48,
  'GOL': 48,
  'Azul': 48,
  'Avianca': 48,
  'default': 48
}

/**
 * Calcula status do check-in baseado na data do voo
 * @param {Object} voo - Dados do voo
 * @returns {{ status: string, dataAbre?: Date, label: string }}
 */
function calcularStatusCheckin(voo) {
  // Se já foi feito
  if (voo.checkin_feito_em) {
    return { status: 'feito', label: 'Check-in feito' }
  }

  // Calcular data de abertura
  const dataVoo = voo.data_voo || voo.partida_em?.split('T')[0]
  if (!dataVoo) {
    return { status: 'desconhecido', label: '' }
  }

  const partida = voo.partida_em ? new Date(voo.partida_em) : new Date(dataVoo + 'T12:00:00')
  const companhia = voo.companhia || 'default'
  const antecedenciaHoras = CHECKIN_ANTECEDENCIA[companhia] || CHECKIN_ANTECEDENCIA.default

  const dataAbre = new Date(partida.getTime() - antecedenciaHoras * 60 * 60 * 1000)
  const agora = new Date()

  // Verificar se já passou o voo
  if (agora > partida) {
    return { status: 'passado', label: '' }
  }

  // Verificar se está dentro da janela de check-in
  if (agora >= dataAbre) {
    return { status: 'aberto', label: 'Check-in aberto' }
  }

  // Ainda não abriu
  const dia = String(dataAbre.getDate()).padStart(2, '0')
  const mes = String(dataAbre.getMonth() + 1).padStart(2, '0')
  return {
    status: 'aguardando',
    dataAbre,
    label: `Check-in abre ${dia}/${mes}`
  }
}

/**
 * Exibe informações de um trecho de voo
 * @param {Object} voo - Dados do voo
 * @param {Function} onCopyLocalizador - Callback ao copiar localizador
 */
export function ViagemTrecho({ voo, onCopyLocalizador }) {
  const sentidoLabel = {
    ida: 'IDA',
    volta: 'VOLTA',
    trecho: `TRECHO ${voo.ordem || 1}`
  }

  // Status do check-in (calculado)
  const checkinStatus = useMemo(() => calcularStatusCheckin(voo), [voo])

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      if (onCopyLocalizador) {
        onCopyLocalizador(label)
      }
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  return (
    <div className="p-4 rounded-xl bg-ice-white border border-dusty-rose/10">
      {/* Header do trecho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge IDA/VOLTA com cores da marca */}
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-heading font-bold uppercase tracking-wider bg-deep-purple text-ice-white border border-antique-gold/30">
            {sentidoLabel[voo.sentido] || voo.sentido}
          </span>

          {/* Status de check-in */}
          {checkinStatus.label && (
            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-heading font-bold border ${
              checkinStatus.status === 'feito'
                ? 'bg-ice-white text-deep-purple border-antique-gold/30'
                : checkinStatus.status === 'aberto'
                  ? 'bg-antique-gold/10 text-deep-purple border-antique-gold/30'
                  : 'bg-dusty-rose/10 text-deep-purple border-dusty-rose/20'
            }`}>
              {checkinStatus.status === 'feito' && (
                <svg className="w-3 h-3 text-antique-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {checkinStatus.label}
            </span>
          )}
        </div>

        {/* Localizador */}
        {voo.localizador && (
          <button
            onClick={() => handleCopy(voo.localizador, 'Localizador')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-deep-purple/5 hover:bg-deep-purple/10 transition-colors group"
            title="Copiar localizador"
          >
            <span className="text-xs font-mono font-bold text-deep-purple">
              {voo.localizador}
            </span>
            <svg className="w-3.5 h-3.5 text-deep-purple/50 group-hover:text-deep-purple transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Rota visual */}
      <div className="flex items-center gap-4 mb-4">
        {/* Origem */}
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-display font-bold text-graphite">
            {voo.origem_iata || '---'}
          </div>
          <div className="text-xs text-graphite/60 font-heading truncate">
            {voo.origem_cidade || voo.origem_aeroporto || 'Origem'}
          </div>
          {voo.partida_local && (
            <div className="text-sm font-heading font-semibold text-graphite mt-1">
              {voo.partida_local}
            </div>
          )}
        </div>

        {/* Linha de conexão */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <div className="w-8 h-px bg-dusty-rose/30" />
            <span className="text-antique-gold text-lg">✈</span>
            <div className="w-8 h-px bg-dusty-rose/30" />
          </div>
          {voo.duracao && (
            <span className="text-[10px] text-graphite/50 font-heading">
              {voo.duracao}
            </span>
          )}
          {!voo.direto && voo.escalas > 0 && (
            <span className="text-[10px] text-deep-purple/70 font-heading">
              {voo.escalas} escala{voo.escalas > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Destino */}
        <div className="flex-1 min-w-0 text-right">
          <div className="text-2xl font-display font-bold text-graphite">
            {voo.destino_iata || '---'}
          </div>
          <div className="text-xs text-graphite/60 font-heading truncate">
            {voo.destino_cidade || voo.destino_aeroporto || 'Destino'}
          </div>
          {voo.chegada_local && (
            <div className="text-sm font-heading font-semibold text-graphite mt-1">
              {voo.chegada_local}
            </div>
          )}
        </div>
      </div>

      {/* Info do voo */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-graphite/60 font-heading">
        {/* Data */}
        {voo.data_voo && (
          <span>
            {new Date(voo.data_voo + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })}
          </span>
        )}

        {/* Companhia + Voo */}
        {(voo.companhia || voo.numero_voo) && (
          <span className="flex items-center gap-1">
            <span className="font-medium text-graphite">{voo.companhia}</span>
            {voo.numero_voo && <span>{voo.numero_voo}</span>}
          </span>
        )}

        {/* Classe */}
        {voo.classe_cabine && (
          <span className="px-1.5 py-0.5 rounded bg-antique-gold/10 text-antique-gold font-medium">
            {voo.classe_cabine}
          </span>
        )}

        {/* Direto */}
        {voo.direto && (
          <span className="flex items-center gap-1 text-deep-purple">
            <svg className="w-3 h-3 text-antique-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Voo direto
          </span>
        )}
      </div>
    </div>
  )
}
