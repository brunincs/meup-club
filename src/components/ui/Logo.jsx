import { Link } from 'react-router-dom'

/**
 * Logo Me,up Club - usa arquivos SVG da pasta /brand
 * @param {Object} props
 * @param {'dark'|'light'} props.variant - dark para fundo escuro, light para fundo claro
 * @param {'sm'|'md'} props.size - sm = 32px, md = 40px (desktop)
 * @param {string} props.to - destino do link (default: "/")
 * @param {boolean} props.showText - mostrar texto ao lado do logo (default: true em desktop)
 * @param {string} props.className - classes adicionais
 */
export function Logo({
  variant = 'dark',
  size = 'md',
  to = '/',
  showText = true,
  className = ''
}) {
  const heightClass = size === 'sm' ? 'h-8' : 'h-10 md:h-10'
  const mobileHeightClass = size === 'sm' ? 'h-7' : 'h-8'

  const logoSrc = variant === 'dark'
    ? '/brand/meup-club-logo-dark.svg'
    : '/brand/meup-club-logo-light.svg'

  return (
    <Link to={to} className={`flex items-center ${className}`}>
      <img
        src={logoSrc}
        alt="Me,up Club"
        className={`${mobileHeightClass} sm:${heightClass} w-auto`}
      />
    </Link>
  )
}

/**
 * Logo apenas ícone (aviãozinho) para uso em espaços reduzidos
 */
export function LogoIcon({ size = 32, className = '' }) {
  return (
    <img
      src="/brand/meup-club-icon.svg"
      alt="Me,up Club"
      width={size}
      height={size}
      className={className}
    />
  )
}
