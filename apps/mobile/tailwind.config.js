/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#A8D5BA',
        secondary: '#F7D1E0',
        accent: '#B8D4E3',
        background: '#FFF8F0',
        surface: '#FFFFFF',
        text: '#2D3436',
        'text-secondary': '#636E72',
      },
    },
  },
  plugins: [],
}
