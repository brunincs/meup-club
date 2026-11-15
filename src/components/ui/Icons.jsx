/**
 * Biblioteca de ícones SVG para o Meup Club
 * Estilo da marca: traço fino, dourado/roxo
 * Substitui emojis por ícones consistentes
 */

// ============================================
// ÍCONES DE CLASSES DE VOO
// ============================================

export function PlaneIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.5H2" />
      <path d="M3.47 13.5L2 16.5H22L20.53 13.5" />
      <path d="M15.5 7.5L12 2L8.5 7.5" />
      <path d="M12 2V7.5" />
      <path d="M8.5 7.5H15.5L19 13.5H5L8.5 7.5Z" />
    </svg>
  )
}

export function StarIcon({ size = 24, color = 'currentColor', filled = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function BriefcaseIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 12h20" />
    </svg>
  )
}

export function CrownIcon({ size = 24, color = 'currentColor', filled = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 17L4 7L9 10L12 4L15 10L20 7L22 17H2Z" />
      <path d="M3 21H21" />
    </svg>
  )
}

export function DiamondIcon({ size = 24, color = 'currentColor', filled = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3H18L22 9L12 21L2 9L6 3Z" />
      <path d="M2 9H22" />
      <path d="M12 3L9 9L12 21L15 9L12 3Z" />
    </svg>
  )
}

// ============================================
// ÍCONES DE STREAK E CONQUISTAS
// ============================================

export function FlameIcon({ size = 24, color = 'currentColor', filled = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 2-7.5 1 1 2 2 2.5 4 .5 2 1 3.5 3 6.5a5.5 5.5 0 1 1-9 4.5Z" />
    </svg>
  )
}

export function BoltIcon({ size = 24, color = 'currentColor', filled = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function SparkleIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" />
      <path d="M5 3L5.5 5L7 5.5L5.5 6L5 8L4.5 6L3 5.5L4.5 5L5 3Z" />
      <path d="M19 17L19.5 19L21 19.5L19.5 20L19 22L18.5 20L17 19.5L18.5 19L19 17Z" />
    </svg>
  )
}

// ============================================
// ÍCONES DE MEDALHAS E TROFÉUS
// ============================================

export function TrophyIcon({ size = 24, color = 'currentColor', filled = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9H4.5C3.67 9 3 8.33 3 7.5V6C3 5.17 3.67 4.5 4.5 4.5H6" />
      <path d="M18 9H19.5C20.33 9 21 8.33 21 7.5V6C21 5.17 20.33 4.5 19.5 4.5H18" />
      <path d="M6 4.5H18V12C18 15.31 15.31 18 12 18C8.69 18 6 15.31 6 12V4.5Z" />
      <path d="M12 18V21" />
      <path d="M8 21H16" />
    </svg>
  )
}

export function MedalGoldIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="7" fill="#a27937" fillOpacity="0.2" stroke="#a27937" strokeWidth="1.5" />
      <path d="M8 3L10 8H14L16 3" fill="#a27937" fillOpacity="0.3" stroke="#a27937" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 11V17" stroke="#a27937" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 14H15" stroke="#a27937" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function MedalSilverIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="7" fill="#a39695" fillOpacity="0.2" stroke="#a39695" strokeWidth="1.5" />
      <path d="M8 3L10 8H14L16 3" fill="#a39695" fillOpacity="0.3" stroke="#a39695" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12C10 12 11 11 12 11C13 11 14 12 14 13C14 14 12 15 12 16H10" stroke="#a39695" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function MedalBronzeIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="7" fill="#cd7f32" fillOpacity="0.2" stroke="#cd7f32" strokeWidth="1.5" />
      <path d="M8 3L10 8H14L16 3" fill="#cd7f32" fillOpacity="0.3" stroke="#cd7f32" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11H13C14 11 14 12 14 12.5C14 13 13 13.5 13 13.5C14 13.5 14 14 14 14.5C14 15 14 16 13 16H10" stroke="#cd7f32" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ============================================
// ÍCONES UTILITÁRIOS
// ============================================

export function CheckIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6L9 17L4 12" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12H19" />
      <path d="M12 5L19 12L12 19" />
    </svg>
  )
}

export function GiftIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 12V22H4V12" />
      <path d="M22 7H2V12H22V7Z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5C6.67 7 6 6.33 6 5.5C6 4.67 6.67 4 7.5 4C10 4 12 7 12 7Z" />
      <path d="M12 7H16.5C17.33 7 18 6.33 18 5.5C18 4.67 17.33 4 16.5 4C14 4 12 7 12 7Z" />
    </svg>
  )
}

export function UsersIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21V19C16 17.9 15.1 17 14 17H6C4.9 17 4 17.9 4 19V21" />
      <circle cx="10" cy="11" r="4" />
      <path d="M20 21V19C20 17.9 19.1 17 18 17H17" />
      <circle cx="17" cy="11" r="3" />
    </svg>
  )
}

export function TargetIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export function TrendingUpIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export function CalendarIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2V6" />
      <path d="M8 2V6" />
      <path d="M3 10H21" />
    </svg>
  )
}

export function ClockIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6V12L16 14" />
    </svg>
  )
}

// ============================================
// ÍCONES DE PREFERÊNCIAS / PERFIL
// ============================================

export function SunIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" />
    </svg>
  )
}

export function HeartIcon({ size = 24, color = 'currentColor', filled = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export function MountainIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 3L12 10L16 3" />
      <path d="M3 21L8 12L12 18L16 12L21 21H3Z" />
    </svg>
  )
}

export function LockIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function GlobeIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12H22" />
      <path d="M12 2C14.5 4.5 16 8 16 12C16 16 14.5 19.5 12 22C9.5 19.5 8 16 8 12C8 8 9.5 4.5 12 2Z" />
    </svg>
  )
}

export function ClipboardIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 4H18C19.1 4 20 4.9 20 6V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V6C4 4.9 4.9 4 6 4H8" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M8 12H16" />
      <path d="M8 16H12" />
    </svg>
  )
}

export function FamilyIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="7" r="2" />
      <path d="M3 21V18C3 16.3 4.3 15 6 15H12C13.7 15 15 16.3 15 18V21" />
      <path d="M15 15H18C19.7 15 21 16.3 21 18V21" />
    </svg>
  )
}

export function MuseumIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 21H21" />
      <path d="M5 21V11" />
      <path d="M19 21V11" />
      <path d="M9 21V17H15V21" />
      <path d="M12 3L3 9H21L12 3Z" />
    </svg>
  )
}

// ============================================
// FUNÇÃO HELPER PARA OBTER COMPONENTE ÍCONE DE CLASSE
// ============================================

export function getClassIcon(levelId) {
  const icons = {
    1: DiamondIcon,     // Meup Exclusive (topo)
    2: CrownIcon,       // Primeira Classe
    3: BriefcaseIcon,   // Executiva
    4: StarIcon,        // Premium Economy
    5: PlaneIcon,       // Econômica
  }

  return icons[levelId] || PlaneIcon
}

// ============================================
// FUNÇÃO HELPER PARA RENDERIZAR ÍCONE DE MEDALHA
// ============================================

export function getMedalIcon(position, props = {}) {
  if (position === 1) return <MedalGoldIcon {...props} />
  if (position === 2) return <MedalSilverIcon {...props} />
  if (position === 3) return <MedalBronzeIcon {...props} />
  return <TrophyIcon {...props} />
}
