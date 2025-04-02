import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { splitVendorChunkPlugin } from 'vite'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith('motion.')
        }
      }
    }),
    tailwindcss(),
    splitVendorChunkPlugin() // Add vendor chunk splitting
  ],
  base: '/static/',
  define: {
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'walkquest/static/js'),
      'static': resolve(__dirname, './static')
    }
  },
  build: {
    manifest: "manifest.json",
    outDir: resolve('./walkquest/static/dist'),
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'walkquest/static/js/main.js')
      },
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-components': ['@iconify/vue'],
          'motion': ['motion-v']
        }
      }
    },
    assetsDir: '',
    emptyOutDir: true,
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    },
    target: 'es2018', // Target modern browsers for smaller bundles
    cssCodeSplit: true, // Split CSS into smaller chunks
    reportCompressedSize: false, // Improve build speed
    chunkSizeWarningLimit: 500 // Raise the size warning limit
  },
  server: {
    origin: 'http://localhost:5173'
  }
})