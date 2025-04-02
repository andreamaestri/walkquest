import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
// Import CSS files that actually exist in the project
import '../css/material3.css';
import '../css/tokens.css';
import '../css/project.css';
import './fixes/portalFix.js';

// Create app with Pinia store
const app = createApp(App);
const pinia = createPinia();

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

// Dynamically import heavier components
const registerComponents = async () => {
  try {
    // Lazy load non-critical modules
    const [
      { Icon },
      { motion },
      { initMotionHelpers },
      MDSnackbar
    ] = await Promise.all([
      import(/* webpackChunkName: "iconify" */ '@iconify/vue'),
      import(/* webpackChunkName: "motion" */ 'motion-v'),
      import(/* webpackChunkName: "motion-helpers" */ './motion-helpers'),
      import(/* webpackChunkName: "snackbar" */ './components/shared/MDSnackbar.vue')
    ]);

    // Initialize motion after it's loaded
    app.use(motion);
    initMotionHelpers();

    // Register components globally after they're loaded
    app.component('Icon', Icon);
    app.component('MDSnackbar', MDSnackbar);
    
    console.log('All components registered');
  } catch (error) {
    console.error('Error loading components:', error);
  }
};

// Mount app immediately without waiting for non-critical dependencies
app.mount('#app');

// Register components after initial render
registerComponents();
