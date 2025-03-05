import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: '/static/', // Changed from '/static/dist/' to '/static/'
  define: {
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true
  },
  build: {
    manifest: "manifest.json",
    outDir: resolve('./walkquest/static/dist/.vite'),
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'walkquest/static/js/main.js') // Corrected path to main.js
      }
    },
    assetsDir: '',
    emptyOutDir: true
  },
  server: {
    origin: 'http://localhost:5173' // Changed from 5174 to 5173 to match current requests
  }
})