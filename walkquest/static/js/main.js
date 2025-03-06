import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import '../css/material3.css'
import { Icon } from '@iconify/vue'
import './fixes/portalFix.js' // Import portal fix for mobile

// Create Vue app instance
const app = createApp(App)

// Initialize Pinia store
const pinia = createPinia()
app.use(pinia)

// Initialize router
app.use(router)

// Configure custom elements
app.config.compilerOptions.isCustomElement = (tag) => {
  return false // Don't treat Icon as a custom element since we're using it as a component
}

app.component('Icon', Icon)

// Mount app
app.mount('#app')
