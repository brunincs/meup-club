/**
 * Ícone de aviãozinho de papel decorativo
 * Versão dourada (fundo escuro) e roxo (fundo claro)
 * Seguindo o brand book da Me Up Viagens
 */
export function PaperPlane({
  variant = 'gold', // 'gold' | 'purple'
  size = 24,
  className = ''
}) {
  const colors = {
    gold: '#a27937',
    purple: '#5c005a',
  }

  const color = colors[variant] || colors.gold

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  )
}

/**
 * Aviãozinho de papel preenchido (mais decorativo)
 */
export function PaperPlaneFilled({
  variant = 'gold',
  size = 24,
  className = ''
}) {
  const colors = {
    gold: '#a27937',
    purple: '#5c005a',
  }

  const color = colors[variant] || colors.gold

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
    >
      <path d="M22 2L11 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" fillOpacity="0.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Aviãozinho com animação de movimento (uso em seções)
 */
export function PaperPlaneAnimated({
  variant = 'gold',
  size = 32,
  className = ''
}) {
  const colors = {
    gold: '#a27937',
    purple: '#5c005a',
  }

  const color = colors[variant] || colors.gold

  return (
    <div className={`inline-block ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-300 hover:translate-x-1 hover:-translate-y-1"
      >
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
      </svg>
    </div>
  )
}
