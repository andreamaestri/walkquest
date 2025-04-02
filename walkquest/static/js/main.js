import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './index.css';
import { initMotionHelpers } from './motion-helpers';
import { Icon } from '@iconify/vue';
import './fixes/portalFix.js';
import MDSnackbar from './components/shared/MDSnackbar.vue';
import { motionPlugin } from 'motion-v'; // Import Motion for Vue plugin

// Create app with Pinia store
const app = createApp(App);
const pinia = createPinia();

// Initialize Motion for Vue
app.use(motionPlugin); // Register the Motion for Vue plugin
initMotionHelpers();

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
};

// Apply plugins
app.use(pinia);
app.use(router);

// Configure custom elements
app.config.compilerOptions.isCustomElement = (tag) => {
  return tag.startsWith('motion.'); // Treat motion.* as custom elements for Motion for Vue
};

// Register components globally
app.component('Icon', Icon);
app.component('MDSnackbar', MDSnackbar);

// Mount app
app.mount('#app');
