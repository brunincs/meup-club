/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Me Up Viagens Palette - Brand Book
        'deep-purple': '#32113f',
        'antique-gold': '#a27937',
        'ice-white': '#edf0f1',
        'nude-rose': '#ddd1d0',
        'graphite': '#1f1f1f',
        'bright-purple': '#5c005a',
        'dusty-rose': '#a39695',
        // Paleta escura (compatibilidade)
        dark: {
          900: '#32113f',
          800: '#3a1849',
          700: '#421e53',
          600: '#4a245d',
          500: '#522a67',
          400: '#5a3071',
          300: '#6a407b',
          200: '#7a5085',
          100: '#8a608f',
        },
        // Cor de destaque premium (ouro antigo)
        accent: {
          gold: '#a27937',
          light: '#c49b5a',
          dark: '#7a5a28',
        },
        // Tons neutros sofisticados
        neutral: {
          50: '#fafafa',
          100: '#edf0f1',
          200: '#ddd1d0',
          300: '#d4d4d4',
          400: '#a39695',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Paleta gamificada
        game: {
          green: '#22c55e',
          blue: '#3b82f6',
          purple: '#a855f7',
          orange: '#f97316',
          gold: '#a27937',
        },
        // Sistema de raridade
        rarity: {
          common: '#a39695',
          rare: '#3b82f6',
          epic: '#a855f7',
          legendary: '#a27937',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        heading: ['Montserrat', 'Roboto', 'sans-serif'],
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
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'count-up': 'countUp 0.4s ease-out forwards',
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
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        countUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
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
