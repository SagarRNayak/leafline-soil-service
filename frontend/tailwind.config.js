/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        leaf: {
          50: '#f4fbf7',
          100: '#e6f7ef',
          200: '#c5eed9',
          400: '#48cc8d',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        earth: {
          50: '#fbf9f5',
          100: '#f4efe4',
          200: '#e7dcc7',
          500: '#a38258',
          700: '#755837',
          900: '#45321f',
        }
      }
    },
  },
  plugins: [],
}
