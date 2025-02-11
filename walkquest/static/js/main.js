import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import VueVirtualScroller from 'vue-virtual-scroller'

// Create Pinia instance first
const pinia = createPinia()

// Create Vue app
const app = createApp(App)

// Install plugins
app.use(pinia)
app.use(router)
app.use(VueVirtualScroller)

// Get configuration from the embedded script tags
const configScript = document.getElementById('config-data')
const config = configScript ? JSON.parse(configScript.textContent) : {}

// Set initial config
if (config.mapboxToken) {
    app.config.globalProperties.mapboxToken = config.mapboxToken
} else {
    // Fallback to environment variable token
    app.config.globalProperties.mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || ''
}
if (config.map) {
    app.config.globalProperties.mapConfig = config.map
}

// Mount the app
app.mount('#app')
