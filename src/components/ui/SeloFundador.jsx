/**
 * Selo Fundador - exibe o badge de fundador do Me,up Club
 * @param {'sm'|'md'} size - sm para header/perfil, md para cards
 */
export function SeloFundador({ size = 'sm', className = '' }) {
  const src = size === 'sm'
    ? '/brand/selo-fundador-sm.svg'
    : '/brand/selo-fundador.svg'

  const sizeClass = size === 'sm' ? 'h-5 w-auto' : 'h-12 w-auto'

  return (
    <img
      src={src}
      alt="Fundador 2026"
      className={`${sizeClass} ${className}`}
      title="Fundador Me,up Club 2026"
    />
  )
}
