/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./walkquest/templates/**/*.html",
    "./walkquest/static/**/*.{js,vue}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'Outfit': ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
