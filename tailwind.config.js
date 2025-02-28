/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./walkquest/templates/**/*.html",
    "./walkquest/static/**/*.{js,vue}",
    "./walkquest/static/css/**/*.css",
  ],
  theme: {
    extend: {
      fontFamily: {
        'Inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
