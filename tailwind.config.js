/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        porto: {
          dark: '#1a1a2e',
          gold: '#f0c040',
          'gold-dark': '#d4a800',
        }
      }
    },
  },
  plugins: [],
}
