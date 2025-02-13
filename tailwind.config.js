/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './walkquest/templates/**/*.html',     // All HTML templates in main templates
    './walkquest/static/js/**/*.{js,vue}', // JavaScript and Vue files
  ],
  theme: {
    extend: {
      fontFamily: {
        'ibm': ['IBM Plex Sans Condensed', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
