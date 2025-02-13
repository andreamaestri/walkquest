import 'vue/dist/vue.esm-bundler';
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import Navigation from './components/Navigation.vue'
import { DynamicScroller, DynamicScrollerItem, RecycleScroller } from 'vue-virtual-scroller'
import "iconify-icon"

// Create Pinia instance first
const pinia = createPinia()

// Create main Vue app
const app = createApp(App)

// Install plugins for main app
app.use(pinia)
app.use(router)

// Register virtual scroller components globally
app.component('DynamicScroller', DynamicScroller)
app.component('DynamicScrollerItem', DynamicScrollerItem)
app.component('RecycleScroller', RecycleScroller)

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
