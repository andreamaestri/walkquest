import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  base: '/static/',
  build: {
    manifest: true,
    outDir: resolve('./walkquest/static/dist'),
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'walkquest/static/js/main.js'),
      }
    },
    // Add these settings
    assetsDir: '',
    sourcemap: true,
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    origin: 'http://localhost:5173',
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    }
  }
});