export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#B8924A',
          50:  '#FAF5EC',
          100: '#F3E8D2',
          200: '#E8D4AD',
          300: '#D4B47A',
          400: '#C9A05E',
          500: '#B8924A',
          600: '#9A7535',
          700: '#7D5D28',
          800: '#5F461E',
          900: '#3E2E13',
        },
        ink: {
          DEFAULT: '#0A0C12',
          50:  '#F0F1F3',
          100: '#D0D3DB',
          200: '#A9AFBF',
          300: '#7B849A',
          400: '#545D75',
          500: '#313A52',
          600: '#1C2130',
          700: '#131621',
          800: '#0D0F18',
          900: '#0A0C12',
        },
        paper: { DEFAULT: '#F4F3EF', dark: '#E8E7E2' },
      },
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        'gold': '0 0 0 3px rgba(184,146,74,0.20)',
        'card': '0 1px 3px rgba(10,12,18,0.06), 0 1px 2px rgba(10,12,18,0.04)',
        'card-md': '0 4px 12px rgba(10,12,18,0.08)',
      },
    }
  },
  plugins: []
}
