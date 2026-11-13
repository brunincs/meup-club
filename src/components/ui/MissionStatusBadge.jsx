// ============================================
// BADGE DE STATUS DE MISSÃO - Componente Unificado
// Usado em cards de missão (cliente e admin)
// ============================================

/**
 * Badge de status de missão
 * @param {'pendente' | 'aprovada' | 'rejeitada' | 'externo'} status
 * @param {string} className - Classes adicionais
 */
export function MissionStatusBadge({ status, className = '' }) {
  const config = {
    rejeitada: {
      label: 'Rejeitada',
      bg: '#fde8e8',
      text: '#b42318',
    },
    pendente: {
      label: 'Em análise',
      bg: '#fdf3e1',
      text: '#7d5a26',
    },
    aprovada: {
      label: 'Concluída ✓',
      bg: '#32113f',
      text: '#edf0f1',
    },
    externo: {
      label: 'Externo ↗',
      bg: 'rgba(163, 150, 149, 0.2)',
      text: '#a39695',
    }
  }

  const cfg = config[status]
  if (!cfg) return null

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full font-heading font-semibold ${className}`}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 1.2,
      }}
    >
      {cfg.label}
    </span>
  )
}

export default MissionStatusBadge
