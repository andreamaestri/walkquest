/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './walkquest/templates/**/*.html',     // All HTML templates in main templates
    './walkquest/**/templates/**/*.html',  // Templates in app subdirectories
    './walkquest/static/js/**/*.{js,vue}', // JavaScript and Vue files
    './walkquest/static/src/**/*.{js,vue}', // Source files
    './walkquest/components/**/*.{html,js,vue}', // Component files
    './walkquest/**/static/**/*.{js,jsx,vue}',  // Static files in app subdirectories
  ],
  theme: {
    extend: {
      fontFamily: {
        'ibm': ['IBM Plex Sans Condensed', 'sans-serif'],
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
