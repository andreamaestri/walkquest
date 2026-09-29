<template>
  <div class="app-root">
    <main>
      <RouterView :mapbox-token="mapboxToken" />
    </main>
    <ThemeToggle
      v-if="route.name !== 'home' && route.name !== 'walk' && route.name !== 'walk-by-id'"
      class="global-theme-toggle"
    />
    <Loading ref="loadingComponent" />
    <LogAdventureDialog v-if="adventureDialogStore.isOpen" />
    <component :is="snackbarComponent" ref="snackbarRef" />
    <!-- Error boundary component -->
    <div v-if="hasError" class="error-boundary">
      <div class="error-content">
        <h2>Something went wrong</h2>
        <p>{{ errorMessage }}</p>
        <button @click="resetError" class="error-reset-button">Try Again</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, onErrorCaptured, defineAsyncComponent, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUiStore } from './stores/ui';
import { useAdventureDialogStore } from './stores/adventureDialog';
import { useAdventureStore } from './stores/adventure';
import { useAuthStore } from './stores/auth';
import { registerSnackbar } from './composables/useSnackbar';
import Loading from './components/shared/Loading.vue';
import { RouterView } from 'vue-router';
import ThemeToggle from './components/shared/ThemeToggle.vue';

// Async component imports
const LogAdventureDialog = defineAsyncComponent(() =>
  import('./components/adventures/LogAdventureDialog.vue')
);
const snackbarComponent = shallowRef(null);

// Lazy load the snackbar component
import('./components/shared/MDSnackbar.vue').then(module => {
  snackbarComponent.value = module.default;
});

// Error handling state
const hasError = ref(false);
const errorMessage = ref('');

// Error capture handler
const resetError = () => {
  hasError.value = false;
  errorMessage.value = '';
  window.location.reload(); // Force reload the app
};

// Capture errors from child components
onErrorCaptured((err, instance, info) => {
  console.error('Error captured in App.vue:', err);
  console.error('Component:', instance);
  console.error('Info:', info);
  
  // Set error state
  hasError.value = true;
  errorMessage.value = err.message || 'An unexpected error occurred';
  
  // Return false to prevent error propagation
  return false;
});

const adventureStore = useAdventureStore();
const adventureDialogStore = useAdventureDialogStore();
const uiStore = useUiStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const loadingComponent = ref(null);
const snackbarRef = ref(null);
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Signing out must not leave the last user's logged walks in memory.
watch(() => authStore.isAuthenticated, (signedIn) => {
  if (!signedIn) adventureStore.clear();
});

let styleFixInterval;

onMounted(() => {
  // Register snackbar instance when it's loaded
  watch(snackbarRef, (value) => {
    if (value) {
      registerSnackbar(value);
    }
  });
  
  // Initialize auth store
  authStore.initAuth();
  
  // Initialize UI responsive state and store cleanup function
  const cleanup = uiStore.initializeResponsiveState();
  
  onBeforeUnmount(() => {
    // Call cleanup function when component unmounts
    cleanup();
  });

  // Fix for portal click issue - with requestIdleCallback
  const fixPortalStyles = () => {
    // Try to make the portal-root element transparent to clicks
    const portalRootElement = document.getElementById('portal-root');
    if (portalRootElement) {
      portalRootElement.style.pointerEvents = 'none';
      
      // Ensure direct children have pointer events
      try {
        const children = portalRootElement.children;
        for (let i = 0; i < children.length; i++) {
          children[i].style.pointerEvents = 'auto';
        }
      } catch (error) {
        console.error('Portal fix error:', error);
      }
    }
  };
  
  // Use requestIdleCallback for non-critical styling tasks
  if (window.requestIdleCallback) {
    window.requestIdleCallback(fixPortalStyles);
    styleFixInterval = setInterval(() => {
      window.requestIdleCallback(fixPortalStyles);
    }, 2000);
  } else {
    // Fallback for browsers without requestIdleCallback
    fixPortalStyles();
    styleFixInterval = setInterval(fixPortalStyles, 2000);
  }
  
  // Watch loading states to show/hide loading component
  watch(() => uiStore.isAnyLoading, (isLoading) => {
    if (isLoading) {
      const loadingMessage = uiStore.loadingStates.walks ? 'Loading walks...' :
                           uiStore.loadingStates.location ? 'Finding nearby walks...' :
                           uiStore.loadingStates.map ? 'Loading map...' :
                           uiStore.loadingStates.search ? 'Searching...' :
                           'Loading...';
      
      if (loadingComponent.value?.show) {
        loadingComponent.value.show(loadingMessage);
      }
    } else {
      if (loadingComponent.value?.hide) {
        loadingComponent.value.hide();
      }
    }
  }, { immediate: true });
  
});

// Cleanup handlers when component is unmounted
onBeforeUnmount(() => {
  // Clear style fix interval
  if (styleFixInterval) {
    clearInterval(styleFixInterval);
  }
  
  // Clean up UI responsive state
  if (uiStore.cleanupResponsiveState) {
    uiStore.cleanupResponsiveState();
  }
  
  // Clean up auth store
  authStore.cleanup();
});
</script>

<style>
/* Use critical CSS only in the component style */
.app-root {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  background-color: var(--md-sys-color-background);
  color: var(--md-sys-color-on-background);
  contain: layout size;
}

/* When in PWA mode, set background to be transparent */
@media all and (display-mode: fullscreen),
       all and (display-mode: standalone) {
  .app-root {
    background-color: transparent;
  }
}

/* Error boundary styling - this is critical */
.error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: color-mix(in srgb, var(--md-sys-color-error-container) 95%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.error-content {
  background-color: var(--md-sys-color-surface);
  padding: 24px;
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-3);
  max-width: 400px;
  text-align: center;
}

.error-content h2 {
  color: var(--md-sys-color-error);
  margin-top: 0;
}

.error-reset-button {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: none;
  padding: 12px 24px;
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 16px;
  transition: background-color 0.2s;
}

.global-theme-toggle {
  position: fixed;
  top: calc(16px + var(--safe-area-top, 0px));
  right: 16px;
  z-index: 100;
  background: color-mix(in srgb, var(--md-sys-color-surface-container-highest) 92%, transparent);
  box-shadow: var(--md-sys-elevation-1);
}

/* Additional styles loaded after component mount */
@media (prefers-reduced-motion: no-preference) {
  .error-reset-button:hover {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }
}
</style>
