import { createApp, defineAsyncComponent } from 'vue';
import { createPinia } from 'pinia';
import { Icon } from '@iconify/vue';
import App from './App.vue';
import router from './router';
import { registerIcons } from './icons';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../css/app.css';
import './fixes/portalFix.js';
import { initializeTheme } from './composables/useTheme';

initializeTheme();
// Bundled icon data: icons render immediately with no runtime API calls.
registerIcons();

const app = createApp(App);

app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err, '\nComponent:', vm?.$options?.name || 'Unknown', '\nInfo:', info);
};

app.use(createPinia());
app.use(router);

app.component('Icon', Icon);
app.component('MDSnackbar', defineAsyncComponent(() => import('./components/shared/MDSnackbar.vue')));

app.mount('#app');
