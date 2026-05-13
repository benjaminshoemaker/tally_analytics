/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors (contrast-safe teal)
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0f766e',
          600: '#115e59',
          700: '#134e4a',
          800: '#134e4a',
          900: '#042f2e',
        },
        // Warm neutrals (stone-based)
        warm: {
          50: '#fcfaf8',
          100: '#f3ede7',
          200: '#e8e0d9',
          300: '#d6cdc3',
          400: '#b8a99a',
          500: '#57534e',
          600: '#44403c',
          700: '#57534e',
          800: '#292524',
          900: '#1b140d',
        },
        // Semantic aliases
        primary: '#0f766e',
        'primary-hover': '#115e59',
        'primary-light': '#ccfbf1',
        'background-light': '#fcfaf8',
        'surface-light': '#ffffff',
        'surface-dark': '#292524',
        'text-main': '#1b140d',
        'text-muted': '#57534e',
        'border-color': '#e8e0d9',
      },
      fontFamily: {
        display: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        '2xl': '12px',
        full: '9999px',
      },
      boxShadow: {
        warm: '0 2px 8px 0 rgba(40, 30, 20, 0.04), 0 1px 2px -1px rgba(40, 30, 20, 0.04)',
        'warm-md': '0 4px 12px 0 rgba(40, 30, 20, 0.06), 0 2px 4px -1px rgba(40, 30, 20, 0.04)',
        'warm-lg':
          '0 10px 15px -3px rgba(40, 30, 20, 0.05), 0 4px 6px -2px rgba(40, 30, 20, 0.025)',
        'warm-xl':
          '0 20px 25px -5px rgba(40, 30, 20, 0.08), 0 10px 10px -5px rgba(40, 30, 20, 0.04)',
        'glow-brand': '0 0 20px rgba(15, 118, 110, 0.15)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'draw-line': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        shimmer: 'shimmer 2s infinite linear',
        'draw-line': 'draw-line 1.5s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
