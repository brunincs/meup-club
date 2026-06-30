/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta premium escura
        dark: {
          900: '#0a0a0a',
          800: '#0f0f0f',
          700: '#141414',
          600: '#1a1a1a',
          500: '#242424',
          400: '#2d2d2d',
          300: '#3d3d3d',
          200: '#4d4d4d',
          100: '#5d5d5d',
        },
        // Cor de destaque premium
        accent: {
          gold: '#c9a962',
          light: '#e8d5a3',
          dark: '#8b7042',
        },
        // Tons neutros sofisticados
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Paleta gamificada
        game: {
          green: '#22c55e',      // Ganhos/pontos
          blue: '#3b82f6',       // Ranking/competição
          purple: '#a855f7',     // Missões
          orange: '#f97316',     // Streak
          gold: '#fbbf24',       // Progresso/Meup
        },
        // Sistema de raridade
        rarity: {
          common: '#9ca3af',     // Cinza
          rare: '#3b82f6',       // Azul
          epic: '#a855f7',       // Roxo
          legendary: '#f59e0b',  // Dourado
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'display-lg': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-md': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-sm': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-down': 'fadeDown 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-green': 'glowGreen 2s ease-in-out infinite alternate',
        'glow-blue': 'glowBlue 2s ease-in-out infinite alternate',
        'glow-purple': 'glowPurple 2s ease-in-out infinite alternate',
        'glow-orange': 'glowOrange 2s ease-in-out infinite alternate',
        'glow-gold': 'glowGold 2s ease-in-out infinite alternate',
        'pulse-border': 'pulseBorder 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'confetti': 'confetti 1s ease-out forwards',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'count-up': 'countUp 0.4s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'progress-fill': 'progressFill 1s ease-out forwards',
        'ring-fill': 'ringFill 1.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(201, 169, 98, 0.2)' },
          '100%': { boxShadow: '0 0 40px rgba(201, 169, 98, 0.4)' },
        },
        glowGreen: {
          '0%': { boxShadow: '0 0 15px rgba(34, 197, 94, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)' },
        },
        glowBlue: {
          '0%': { boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)' },
        },
        glowPurple: {
          '0%': { boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)' },
        },
        glowOrange: {
          '0%': { boxShadow: '0 0 15px rgba(249, 115, 22, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(249, 115, 22, 0.4)' },
        },
        glowGold: {
          '0%': { boxShadow: '0 0 15px rgba(251, 191, 36, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(251, 191, 36, 0.4)' },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: 'rgba(168, 85, 247, 0.3)' },
          '50%': { borderColor: 'rgba(168, 85, 247, 0.8)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) rotate(720deg)', opacity: '0' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        countUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        ringFill: {
          '0%': { strokeDashoffset: 'var(--ring-circumference, 283)' },
          '100%': { strokeDashoffset: 'var(--ring-offset, 0)' },
        },
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '900': '900ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
