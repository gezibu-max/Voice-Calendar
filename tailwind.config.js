import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: colors.neutral,
        accent: {
          DEFAULT: '#0A84FF',           // Apple system blue
          soft: 'rgba(10,132,255,0.14)',
          softDark: 'rgba(10,132,255,0.22)',
        },
        glass: {
          light: 'rgba(255,255,255,0.62)',
          medium: 'rgba(255,255,255,0.78)',
          heavy: 'rgba(255,255,255,0.92)',
          dark: 'rgba(28,28,32,0.55)',
          'dark-medium': 'rgba(28,28,32,0.72)',
          'dark-heavy': 'rgba(20,20,24,0.88)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '14px',
        pill: '999px',
        panel: '20px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,15,14,0.04)',
        glass: '0 1px 0 0 rgba(255,255,255,0.6) inset, 0 0 0 0.5px rgba(0,0,0,0.04), 0 12px 32px -12px rgba(15,15,20,0.18)',
        'glass-dark': '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 0 0 0.5px rgba(255,255,255,0.06), 0 18px 36px -12px rgba(0,0,0,0.5)',
        pop: '0 1px 0 0 rgba(255,255,255,0.6) inset, 0 24px 48px -12px rgba(15,15,20,0.28), 0 8px 18px -6px rgba(15,15,20,0.12)',
        'pop-dark': '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 28px 56px -12px rgba(0,0,0,0.6), 0 8px 18px -6px rgba(0,0,0,0.4)',
        specular: 'inset 0 1px 0 0 rgba(255,255,255,0.55)',
        'specular-dark': 'inset 0 1px 0 0 rgba(255,255,255,0.12)',
        'glow-accent': '0 0 0 4px rgba(10,132,255,0.18), 0 8px 20px -6px rgba(10,132,255,0.4)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(244,63,94,0.55)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(244,63,94,0)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
