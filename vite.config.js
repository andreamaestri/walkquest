import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/static/',
  plugins: [vue(), tailwindcss()],
  
  define: {
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true
  },
  build: {
    manifest: '.vite/manifest.json',
    outDir: resolve('./walkquest/static/dist'),
    rollupOptions: {
      input: {
        'main': './walkquest/static/js/main.js'
      }
    },
    assetsDir: '',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})