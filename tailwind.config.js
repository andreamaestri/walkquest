/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './walkquest/templates/**/*.html',  // All HTML templates in any subdirectory
    './walkquest/static/js/**/*.js',    // All JavaScript files
    './walkquest/**/templates/**/*.html' // Templates in app subdirectories
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#1D4ED8',
          600: '#0284c7',
          700: '#0369a1',
        },
        secondary: {
          500: '#9333EA',
          600: '#7e22ce',
        }
      },
      spacing: {
        '128': '32rem'
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite'
      }
    },
  },
  plugins: [],
}