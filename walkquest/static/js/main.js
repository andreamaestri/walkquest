import { createApp } from 'vue'
import { createPinia } from 'pinia'
import WalkInterface from './components/WalkInterface.vue'
import { WalksAPI } from './services/api'

// Create Pinia instance
const pinia = createPinia()

// Get configuration from the embedded script tags
const configScript = document.getElementById('config-data')

const config = configScript ? JSON.parse(configScript.textContent) : {}

// Fetch walks data from the API
WalksAPI.filterWalks()
    .then(data => {
        // Create Vue app with its props from initial data & config
        const app = createApp(WalkInterface, {
            mapboxToken: config.mapboxToken,
            mapConfig: config.map || {},
            initialWalks: data.walks || [] // Changed: pass array directly
        })

        // Install plugins
        app.use(pinia)

        // Mount the app
        app.mount('#app')
    })
    .catch(error => {
        console.error('Error fetching walks data:', error);
    });
