// ============================================
// SERVIÇO DE CALENDÁRIO - Geração de .ics
// RFC 5545 compliant, gerado no frontend
// ============================================

const WHATSAPP_NUMBER = '5516988126568'
const CLUB_URL = 'https://club.meup.com.br'

/**
 * Gera UID estável para um trecho de voo
 * Mesmo trecho = mesmo UID (permite atualização sem duplicar)
 */
function gerarUID(voo, viagemId) {
  const base = `${viagemId}-${voo.id || voo.numero_voo}-${voo.data_voo || ''}`
  // Hash simples para UID
  let hash = 0
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `meup-${Math.abs(hash).toString(36)}@club.meup.com.br`
}

/**
 * Formata data para ICS (formato: 20261215T143000)
 * @param {string} isoDate - Data ISO ou TIMESTAMPTZ
 * @param {boolean} includeTime - Se deve incluir horário
 */
function formatICSDate(isoDate, includeTime = true) {
  if (!isoDate) return null

  const date = new Date(isoDate)

  const pad = (n) => n.toString().padStart(2, '0')

  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())

  if (!includeTime) {
    return `${year}${month}${day}`
  }

  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Extrai timezone do aeroporto baseado no IATA
 * Mapeamento dos principais aeroportos brasileiros e internacionais
 */
function getTimezoneByIATA(iata) {
  const timezones = {
    // Brasil - Horário de Brasília (UTC-3)
    'GRU': 'America/Sao_Paulo', 'CGH': 'America/Sao_Paulo', 'VCP': 'America/Sao_Paulo',
    'SDU': 'America/Sao_Paulo', 'GIG': 'America/Sao_Paulo',
    'BSB': 'America/Sao_Paulo', 'CNF': 'America/Sao_Paulo', 'PLU': 'America/Sao_Paulo',
    'CWB': 'America/Sao_Paulo', 'POA': 'America/Sao_Paulo', 'FLN': 'America/Sao_Paulo',
    'REC': 'America/Recife', 'SSA': 'America/Bahia', 'FOR': 'America/Fortaleza',
    'NAT': 'America/Fortaleza', 'SLZ': 'America/Fortaleza', 'THE': 'America/Fortaleza',
    'BEL': 'America/Belem', 'MAO': 'America/Manaus', 'PVH': 'America/Porto_Velho',
    'RBR': 'America/Rio_Branco', 'CGB': 'America/Cuiaba', 'CGR': 'America/Campo_Grande',
    'VIX': 'America/Sao_Paulo', 'JOI': 'America/Sao_Paulo', 'NVT': 'America/Sao_Paulo',
    'IGU': 'America/Sao_Paulo', 'LDB': 'America/Sao_Paulo', 'MGF': 'America/Sao_Paulo',
    'UDI': 'America/Sao_Paulo', 'RAO': 'America/Sao_Paulo', 'SJP': 'America/Sao_Paulo',
    'GYN': 'America/Sao_Paulo', 'MCZ': 'America/Maceio', 'AJU': 'America/Maceio',
    'JPA': 'America/Fortaleza', 'CPV': 'America/Fortaleza', 'PNZ': 'America/Fortaleza',
    'IOS': 'America/Bahia', 'BPS': 'America/Bahia', 'VDC': 'America/Bahia',

    // Internacional - Principais
    'MIA': 'America/New_York', 'JFK': 'America/New_York', 'EWR': 'America/New_York',
    'LAX': 'America/Los_Angeles', 'SFO': 'America/Los_Angeles', 'LAS': 'America/Los_Angeles',
    'ORD': 'America/Chicago', 'DFW': 'America/Chicago', 'IAH': 'America/Chicago',
    'ATL': 'America/New_York', 'BOS': 'America/New_York', 'PHL': 'America/New_York',
    'MCO': 'America/New_York', 'FLL': 'America/New_York', 'TPA': 'America/New_York',
    'LIS': 'Europe/Lisbon', 'OPO': 'Europe/Lisbon',
    'MAD': 'Europe/Madrid', 'BCN': 'Europe/Madrid',
    'CDG': 'Europe/Paris', 'ORY': 'Europe/Paris',
    'FCO': 'Europe/Rome', 'MXP': 'Europe/Rome',
    'LHR': 'Europe/London', 'LGW': 'Europe/London', 'STN': 'Europe/London',
    'AMS': 'Europe/Amsterdam', 'FRA': 'Europe/Berlin', 'MUC': 'Europe/Berlin',
    'DXB': 'Asia/Dubai', 'DOH': 'Asia/Qatar',
    'EZE': 'America/Argentina/Buenos_Aires', 'AEP': 'America/Argentina/Buenos_Aires',
    'SCL': 'America/Santiago', 'LIM': 'America/Lima', 'BOG': 'America/Bogota',
    'MEX': 'America/Mexico_City', 'CUN': 'America/Cancun',
    'PTY': 'America/Panama', 'UIO': 'America/Guayaquil',
    'MVD': 'America/Montevideo', 'ASU': 'America/Asuncion',
  }

  return timezones[iata?.toUpperCase()] || 'America/Sao_Paulo'
}

/**
 * Formata data com timezone específico para ICS
 * Usa TZID para indicar o fuso horário
 */
function formatICSDateWithTZ(isoDate, timezone) {
  if (!isoDate) return null

  // Se já tem timezone na string ISO, usar ela
  const date = new Date(isoDate)

  const pad = (n) => n.toString().padStart(2, '0')

  // Extrair componentes considerando o timezone original da data
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = '00'

  return {
    tzid: timezone,
    datetime: `${year}${month}${day}T${hours}${minutes}${seconds}`
  }
}

/**
 * Escapa texto para ICS (quebras de linha, vírgulas, etc)
 */
function escapeICS(text) {
  if (!text) return ''
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Quebra linhas longas conforme RFC 5545 (max 75 chars)
 */
function foldLine(line) {
  const maxLen = 75
  if (line.length <= maxLen) return line

  let result = ''
  let remaining = line

  while (remaining.length > maxLen) {
    result += remaining.substring(0, maxLen) + '\r\n '
    remaining = remaining.substring(maxLen)
  }
  result += remaining

  return result
}

/**
 * Gera descrição do evento
 */
function gerarDescricao(voo, passageiros, viagemId) {
  const lines = []

  // Localizador
  if (voo.localizador) {
    lines.push(`📋 Localizador: ${voo.localizador}`)
  }

  // Passageiros
  if (passageiros && passageiros.length > 0) {
    lines.push('')
    lines.push('👥 Passageiros:')
    passageiros.forEach(pax => {
      const nome = pax.passageiro?.nome || pax.nome || 'Passageiro'
      const eticket = pax.eticket || pax.passageiro?.eticket
      lines.push(`• ${nome}${eticket ? ` (${eticket})` : ''}`)

      // Bagagem
      const bagagem = pax.bagagem || pax.passageiro?.bagagem
      if (bagagem) {
        lines.push(`  🧳 ${bagagem}`)
      }
    })
  }

  // Links
  lines.push('')
  lines.push(`🔗 Ver no Me,up Club: ${CLUB_URL}/minhas-viagens`)
  lines.push(`📱 WhatsApp: wa.me/${WHATSAPP_NUMBER}`)

  return lines.join('\\n')
}

/**
 * Gera um evento VEVENT para um trecho de voo
 */
function gerarVEVENT(voo, passageiros, viagemId) {
  const uid = gerarUID(voo, viagemId)
  const now = formatICSDate(new Date().toISOString())

  // Título do evento
  const origem = voo.origem_iata || 'XXX'
  const destino = voo.destino_iata || 'XXX'
  const companhia = voo.companhia || ''
  const numeroVoo = voo.numero_voo || ''
  const titulo = `✈️ ${origem} → ${destino}${companhia || numeroVoo ? ` · ${companhia} ${numeroVoo}`.trim() : ''}`

  // Timezone dos aeroportos
  const tzOrigem = getTimezoneByIATA(origem)
  const tzDestino = getTimezoneByIATA(destino)

  // Datas - usar partida_em e chegada_em que já têm timezone
  const dtStart = voo.partida_em ? formatICSDate(voo.partida_em) : null
  const dtEnd = voo.chegada_em ? formatICSDate(voo.chegada_em) : null

  if (!dtStart) return null

  // Local
  const local = voo.origem_aeroporto
    ? `${voo.origem_aeroporto} (${origem})`
    : origem

  // Descrição
  const descricao = gerarDescricao(voo, passageiros, viagemId)

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
  ]

  if (dtEnd) {
    lines.push(`DTEND:${dtEnd}`)
  }

  lines.push(
    foldLine(`SUMMARY:${escapeICS(titulo)}`),
    foldLine(`LOCATION:${escapeICS(local)}`),
    foldLine(`DESCRIPTION:${descricao}`),
    // Lembretes: 24h e 3h antes
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de voo em 24h',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT3H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de voo em 3h',
    'END:VALARM',
    'END:VEVENT'
  )

  return lines.join('\r\n')
}

/**
 * Gera arquivo .ics completo
 * @param {Array} voos - Lista de voos
 * @param {Object} viagem - Dados da viagem
 * @param {string} viagemId - ID da viagem
 */
export function gerarICS(voos, viagem, viagemId) {
  const events = voos
    .map(v => {
      const voo = v.voo || v
      const passageiros = v.passageiros || []
      return gerarVEVENT(voo, passageiros, viagemId)
    })
    .filter(Boolean)

  if (events.length === 0) return null

  const titulo = viagem?.titulo || 'Viagem Me,up'

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Me,up Club//Viagens//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(titulo)}`,
    ...events,
    'END:VCALENDAR'
  ].join('\r\n')

  return ics
}

/**
 * Gera ICS para um único trecho
 */
export function gerarICSTrecho(voo, passageiros, viagemId, viagem) {
  const event = gerarVEVENT(voo, passageiros, viagemId)
  if (!event) return null

  const titulo = viagem?.titulo || 'Voo Me,up'

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Me,up Club//Viagens//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(titulo)}`,
    event,
    'END:VCALENDAR'
  ].join('\r\n')

  return ics
}

/**
 * Gera URL para adicionar ao Google Calendar
 */
export function gerarGoogleCalendarURL(voo, passageiros, viagemId) {
  const vooData = voo.voo || voo
  const paxList = voo.passageiros || passageiros || []

  const origem = vooData.origem_iata || 'XXX'
  const destino = vooData.destino_iata || 'XXX'
  const companhia = vooData.companhia || ''
  const numeroVoo = vooData.numero_voo || ''

  // Título
  const titulo = `✈️ ${origem} → ${destino}${companhia || numeroVoo ? ` · ${companhia} ${numeroVoo}`.trim() : ''}`

  // Datas (Google usa formato: 20261215T143000Z)
  const dtStart = formatICSDate(vooData.partida_em)
  const dtEnd = formatICSDate(vooData.chegada_em) || dtStart

  if (!dtStart) return null

  // Local
  const local = vooData.origem_aeroporto
    ? `${vooData.origem_aeroporto} (${origem})`
    : origem

  // Descrição (texto simples para Google)
  const descLines = []
  if (vooData.localizador) descLines.push(`📋 Localizador: ${vooData.localizador}`)
  if (paxList.length > 0) {
    descLines.push('\n👥 Passageiros:')
    paxList.forEach(pax => {
      const nome = pax.passageiro?.nome || pax.nome || 'Passageiro'
      descLines.push(`• ${nome}`)
    })
  }
  descLines.push(`\n🔗 ${CLUB_URL}/minhas-viagens`)
  descLines.push(`📱 wa.me/${WHATSAPP_NUMBER}`)

  const descricao = descLines.join('\n')

  // Montar URL
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${dtStart}/${dtEnd}`,
    location: local,
    details: descricao,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Gera URL do Google Calendar para viagem completa
 */
export function gerarGoogleCalendarURLViagem(voos, viagem, viagemId) {
  // Google Calendar não suporta múltiplos eventos em uma URL
  // Retorna URL do primeiro voo apenas
  if (!voos || voos.length === 0) return null
  return gerarGoogleCalendarURL(voos[0], [], viagemId)
}

/**
 * Faz download do arquivo .ics
 */
export function downloadICS(icsContent, filename = 'viagem-meup.ics') {
  if (!icsContent) return false

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
  return true
}

/**
 * Abre Google Calendar em nova aba
 */
export function abrirGoogleCalendar(url) {
  if (!url) return false
  window.open(url, '_blank')
  return true
}
