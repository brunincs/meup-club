// ============================================
// UTILITÁRIOS DE DATA
// Evita problemas de fuso horário ao formatar datas
// ============================================

/**
 * Formata data ISO (YYYY-MM-DD) para DD/MM/YYYY sem conversão de fuso
 * @param {string} dateStr - Data no formato YYYY-MM-DD ou ISO
 * @returns {string} Data formatada DD/MM/YYYY
 */
export function formatDateLocal(dateStr) {
  if (!dateStr) return ''

  // Se vier como objeto Date, extrair string ISO
  if (dateStr instanceof Date) {
    dateStr = dateStr.toISOString()
  }

  // Extrair apenas a parte da data (YYYY-MM-DD)
  const datePart = String(dateStr).split('T')[0]
  const [year, month, day] = datePart.split('-')

  if (!year || !month || !day) return dateStr

  return `${day}/${month}/${year}`
}

/**
 * Formata data e hora ISO para DD/MM/YYYY HH:mm
 * @param {string} dateStr - Data ISO
 * @returns {string} Data formatada
 */
export function formatDateTimeLocal(dateStr) {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Formata data para exibição curta (DD/MM)
 * @param {string} dateStr - Data ISO ou YYYY-MM-DD
 * @returns {string} Data formatada DD/MM
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return ''

  const datePart = String(dateStr).split('T')[0]
  const [, month, day] = datePart.split('-')

  if (!month || !day) return dateStr

  return `${day}/${month}`
}
