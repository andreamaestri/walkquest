<template>
  <div class="app-root">
    <main>
      <RouterView :mapbox-token="mapboxToken" />
    </main>
    <Loading ref="loadingComponent" />
    <Teleport to="#portal-root" :disabled="!portalRoot()">
      <component 
        :is="adventureDialogStore.currentWalk ? AdventureLogDialog : null"
        v-if="adventureDialogStore.currentWalk && AdventureLogDialog"
        :walk="adventureDialogStore.currentWalk"
        @submit="handleAdventureSubmit"
      />
    </Teleport>
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
import { useSearchStore } from './stores/searchStore';
import { useAdventureDialogStore } from './stores/adventureDialog';
import { useAdventureStore } from './stores/adventure';
import { useAuthStore } from './stores/auth';
import { usePortal } from './composables/usePortal';
import { registerSnackbar } from './composables/useSnackbar';
import Loading from './components/shared/Loading.vue';
import { RouterView } from 'vue-router';

// Async component imports
const AdventureLogDialog = defineAsyncComponent(() => 
  import('./components/shared/AdventureLogDialog.vue')
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

const { portalRoot } = usePortal();
const adventureStore = useAdventureStore();
const adventureDialogStore = useAdventureDialogStore();
const uiStore = useUiStore();
const searchStore = useSearchStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const loadingComponent = ref(null);
const snackbarRef = ref(null);
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Handle adventure submission
const handleAdventureSubmit = async (data) => {
  try {
    await adventureStore.createAdventure(data);
    adventureDialogStore.closeDialog();
    uiStore.showToast('Adventure created successfully!', 'success');
  } catch (error) {
    console.error('Failed to create adventure:', error);
    uiStore.showToast('Failed to create adventure. Please try again.', 'error');
  }
};

// Setup beforeunload handler to clear dialog state
let beforeUnloadHandler;
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
    
    // Remove beforeunload handler
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
  });
  
  // Setup beforeunload handler
  beforeUnloadHandler = () => {
    adventureDialogStore.closeDialog();
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

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
  
  // Set initial search mode from localStorage or default to 'walks'
  try {
    const searchMode = localStorage.getItem('searchMode') || 'walks';
    if (['walks', 'locations'].includes(searchMode)) {
      searchStore.setSearchMode(searchMode);
    }
    
    // Watch search mode changes to update localStorage
    watch(() => searchStore.searchMode, (mode) => {
      localStorage.setItem('searchMode', mode);
    });
  } catch (error) {
    console.error('Error setting search mode:', error);
  }
});

// Cleanup handlers when component is unmounted
onBeforeUnmount(() => {
  // Remove beforeunload handler
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }
  
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
  background-color: rgb(var(--md-sys-color-background));
  color: rgb(var(--md-sys-color-on-background));
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
  background-color: rgba(var(--md-sys-color-error-container), 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.error-content {
  background-color: rgb(var(--md-sys-color-surface));
  padding: 24px;
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-3);
  max-width: 400px;
  text-align: center;
}

.error-content h2 {
  color: rgb(var(--md-sys-color-error));
  margin-top: 0;
}

.error-reset-button {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  border: none;
  padding: 12px 24px;
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 16px;
  transition: background-color 0.2s;
}

/* Additional styles loaded after component mount */
@media (prefers-reduced-motion: no-preference) {
  .error-reset-button:hover {
    background-color: rgb(var(--md-sys-color-primary-container));
    color: rgb(var(--md-sys-color-on-primary-container));
  }
}
</style>
