/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saathi: {
          50: '#f0fdf9',
          100: '#ccfbe8',
          200: '#9cf6d2',
          300: '#5eeab8',
          400: '#2ad49b',
          500: '#0ea575',
          600: '#07845d',
          700: '#09694c',
          800: '#0c543e',
          900: '#0d4534',
          950: '#03271e',
        },
      },
    },
  },
  plugins: [],
}
