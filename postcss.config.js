export default {
  plugins: {
    "@tailwindcss/postcss": {},
    'postcss-nested': {},
    'autoprefixer': {},
    'cssnano': {
      preset: ['default', {
        discardComments: {
          removeAll: true,
        },
        normalizeWhitespace: true,
        reduceIdents: false, // Avoid issues with animations
        minifyFontValues: true,
        colormin: true,
      }]
    }
  }
}