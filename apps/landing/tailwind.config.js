/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Paths relative to monorepo root (where Angular CLI runs from)
    "apps/landing/src/**/*.{html,ts}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Primary: Teal (matches mobile app #10B981)
        primary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
        },
        // Secondary: Purple/Violet for variety
        secondary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
          950: '#3B0764',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
        mono: ['SF Mono', 'Roboto Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'fitos-sm': '4px',
        'fitos-md': '8px',
        'fitos-lg': '12px',
        'fitos-xl': '16px',
        'fitos-2xl': '24px',
      },
      boxShadow: {
        'fitos-glow-primary': '0 0 20px rgba(16, 185, 129, 0.3)',
        'fitos-glow-secondary': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
    },
  },
  plugins: [],
}
