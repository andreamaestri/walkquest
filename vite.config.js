import { defineConfig } from 'vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const projectDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],
  base: '/static/',
  define: {
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  },
  resolve: {
    alias: {
      '@': resolve(projectDir, 'walkquest/static/js'),
      'static': resolve(projectDir, './static')
    }
  },
  build: {
    manifest: "manifest.json",
    outDir: resolve(projectDir, './walkquest/static/dist'),
    rollupOptions: {
      input: {
        main: resolve(projectDir, 'walkquest/static/js/main.js')
      },
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-components': ['@iconify/vue'],
          'mapbox': ['mapbox-gl']
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
    target: 'es2020', // Target modern browsers for smaller bundles
    cssCodeSplit: true, // Split CSS into smaller chunks
    reportCompressedSize: false, // Improve build speed
    chunkSizeWarningLimit: 500 // Raise the size warning limit
  },
  test: {
    include: ['walkquest/static/js/**/*.test.js'],
    environment: 'node',
  },
  server: {
    origin: 'http://localhost:5173'
  }
})
