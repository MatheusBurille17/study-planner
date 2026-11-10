import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
    './src/shared/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#faf7f2',
        surface: '#ffffff',
        ink: '#2b2437',
        muted: '#7a7288',
        line: '#ece6de',
        primary: {
          DEFAULT: '#7c3aed',
          50: '#f5f0ff',
          100: '#ede5ff',
          200: '#dccdff',
          300: '#c4abff',
          400: '#a780ff',
          500: '#8b55f5',
          600: '#7c3aed',
          700: '#6a2fd1',
          800: '#5728a9',
          900: '#472386',
        },
        lilac: '#c4b5fd',
        sage: '#b7d7c2',
        peach: '#f8cfb4',
        butter: '#f4e6b5',
        rose: '#f3c4cf',
        sky: '#bcd7f2',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -18px rgba(63, 42, 94, 0.35)',
        card: '0 6px 24px -16px rgba(63, 42, 94, 0.45)',
      },
      spacing: {
        '4.5': '1.125rem',
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
