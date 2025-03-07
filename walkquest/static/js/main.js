import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import '../css/material3.css';
import { Icon } from '@iconify/vue';
import './fixes/portalFix.js';

// Create Vue app instance
const app = createApp(App);

// Add global error handler
app.config.errorHandler = (err, vm, info) => {
  // Log the error with component information
  console.error('Vue Error:', err);
  console.error('Component:', vm?.$options?.name || 'Unknown component');
  console.error('Error Info:', info);
  
  // Prevent infinite error loops
  if (info === 'render function' || info === 'render') {
    console.warn('Render error detected. Component might need to be fixed:', vm);
  }
  
  // You could also send errors to a monitoring service here
};

// Initialize Pinia store
const pinia = createPinia();
app.use(pinia);

// Initialize router
app.use(router);

// Configure custom elements
app.config.compilerOptions.isCustomElement = (tag) => {
  return false; // Don't treat Icon as a custom element since we're using it as a component
};

// Register Icon component globally
app.component('Icon', Icon);

// Mount app
const vueApp = app.mount('#app');

// Initialize auth state - moved to App.vue setup function
// This ensures the auth check happens within the component lifecycle
// and avoids using the store outside of setup()
