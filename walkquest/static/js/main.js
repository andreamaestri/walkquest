import { createApp } from 'vue'
import { createPinia } from 'pinia'
import WalkInterface from './components/WalkInterface.vue'

// Create Pinia instance
const pinia = createPinia()

// Get configuration from the embedded script tags
const configScript = document.getElementById('config-data')
const walksDataScript = document.getElementById('walks-data')

const config = configScript ? JSON.parse(configScript.textContent) : {}
const initialData = walksDataScript ? JSON.parse(walksDataScript.textContent) : { walks: [] }

// Create Vue app with its props from initial data & config
const app = createApp(WalkInterface, {
    mapboxToken: config.mapboxToken,
    mapConfig: config.map || {},
    initialWalks: initialData.walks
})

// Install plugins
app.use(pinia)

// Mount the app
app.mount('#app')
