import 'vue/dist/vue.esm-bundler'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import Navigation from './components/Navigation.vue'
import { DynamicScroller, DynamicScrollerItem, RecycleScroller } from 'vue-virtual-scroller'
import { useUiStore } from './stores/ui'
import "iconify-icon"

// Import required CSS
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import 'mapbox-gl/dist/mapbox-gl.css'

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

// Initialize UI store with defaults
const uiStore = useUiStore(pinia)
uiStore.$patch({
    error: null,
    loading: false,
    mapLoading: true,
    showSidebar: false,
    fullscreen: false,
    mobileMenuOpen: false,
    isMobile: window.innerWidth <= 768,  // Add initial mobile state
    loadingStates: {
        walks: false,
        map: false,
        path: false,
        search: false
    }
})

// Set initial mobile state
window.addEventListener('resize', () => {
    uiStore.$patch({ isMobile: window.innerWidth <= 768 })  // Use $patch instead of direct assignment
})

// Mount the app
app.mount('#app')
