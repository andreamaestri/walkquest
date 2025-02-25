import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: '/static/dist/',
  build: {
    manifest: true,
    outDir: resolve('./walkquest/static/dist'),
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'walkquest/static/js/main.js')
      }
    },
    assetsDir: '',
    emptyOutDir: true
  },
  server: {
    origin: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174'
  }
})