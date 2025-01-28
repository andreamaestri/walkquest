/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './walkquest/templates/**/*.html',  // All HTML templates in any subdirectory
    './walkquest/static/js/**/*.js',    // All JavaScript files
    './walkquest/**/templates/**/*.html' // Templates in app subdirectories
  ],
  theme: {
    extend: {
      fontFamily: {
        'fira': ['Fira Sans', 'sans-serif'],
        'inter': ['Inter Tight', 'sans-serif'],
      },
      colors: {
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
        },
        secondary: {
          500: 'var(--secondary-500)',
          600: 'var(--secondary-600)',
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
