import 'virtual:vite/modulepreload-polyfill'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import mapboxgl from 'mapbox-gl'
import { useMapStore } from './stores/map'
import '../css/project.css'

// Get Mapbox token from config data
const configData = document.getElementById('config-data')
const config = configData ? JSON.parse(configData.textContent) : {}
mapboxgl.accessToken = config.mapboxToken

// Create Pinia instance
const pinia = createPinia()

// Create Vue app
const app = createApp(App)
app.use(pinia)
app.use(router)

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Mount the app
  app.mount('#app')

  // Initialize map store after mounting
  const mapStore = useMapStore()
})
