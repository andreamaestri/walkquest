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
        'Sora': ['Sora', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
