<template>
  <div class="app-root">
    <main>
      <RouterView :mapbox-token="mapboxToken" />
    </main>
    <Loading ref="loadingComponent" />
    <div id="portal-root"></div>
    <Teleport to="#portal-root" :disabled="!portalRoot()">
      <AdventureLogDialog
        v-if="adventureDialogStore.currentWalk"
        :walk="adventureDialogStore.currentWalk"
        @submit="handleAdventureSubmit"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from './stores/ui'
import { useSearchStore } from './stores/searchStore'
import { useAdventureDialogStore } from './stores/adventureDialog'
import { useAdventureStore } from './stores/adventure'
import { usePortal } from './composables/usePortal'
import Loading from './components/shared/Loading.vue'
import AdventureLogDialog from './components/shared/AdventureLogDialog.vue'
import { RouterView } from 'vue-router'

const { portalRoot } = usePortal()
const adventureStore = useAdventureStore()
const adventureDialogStore = useAdventureDialogStore()
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

// Handle adventure submission
const handleAdventureSubmit = async (data) => {
  try {
    await adventureStore.createAdventure(data)
    adventureDialogStore.closeDialog()
  } catch (error) {
    console.error('Failed to create adventure:', error)
  }
}
const uiStore = useUiStore()
const searchStore = useSearchStore()
const route = useRoute()
const loadingComponent = ref(null)

// Setup beforeunload handler to clear dialog state
let beforeUnloadHandler;

onMounted(() => {
  // Initialize UI responsive state
  const cleanup = uiStore.initializeResponsiveState()
  
  // Setup beforeunload handler
  beforeUnloadHandler = () => {
    adventureDialogStore.closeDialog()
  }
  window.addEventListener('beforeunload', beforeUnloadHandler)
  
  // Watch loading states to show/hide loading component
  watch(() => uiStore.isAnyLoading, (isLoading) => {
    if (isLoading) {
      const loadingMessage = uiStore.loadingStates.walks ? 'Loading walks...' :
                            uiStore.loadingStates.location ? 'Finding nearby walks...' :
                            uiStore.loadingStates.map ? 'Loading map...' :
                            uiStore.loadingStates.search ? 'Searching...' :
                            'Loading...'
      
      loadingComponent.value?.show(loadingMessage)
    } else {
      loadingComponent.value?.hide()
    }
  }, { immediate: true })
  
  // Set initial search mode from localStorage or default to 'walks'
  const searchMode = localStorage.getItem('searchMode') || 'walks'
  if (['walks', 'locations'].includes(searchMode)) {
    searchStore.setSearchMode(searchMode)
  }
  
  // Watch search mode changes to update localStorage
  watch(() => searchStore.searchMode, (mode) => {
    localStorage.setItem('searchMode', mode)
  })
})

// Cleanup handlers when component is unmounted
onBeforeUnmount(() => {
  // Remove beforeunload handler
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
  }
  
  // Clean up UI responsive state
  if (uiStore.cleanupResponsiveState) {
    uiStore.cleanupResponsiveState()
  }
})
</script>

<style>
.app-root {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  background-color: rgb(var(--md-sys-color-background));
  color: rgb(var(--md-sys-color-on-background));
}

/* When in PWA mode, set background to be transparent */
@media all and (display-mode: fullscreen),
       all and (display-mode: standalone) {
  .app-root {
    background-color: transparent;
  }
}

/* Keep other styles but remove sidebar-related ones */
.hover-reveal-zone {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 16px;
  z-index: 60;
  opacity: 0;
  background: linear-gradient(
    to right,
    rgb(var(--md-sys-color-surface-container-highest) / 0.1),
    transparent
  );
  transition: opacity 0.3s ease;
}

.hover-reveal-zone:hover {
  opacity: 1;
}
/* Global styles to ensure proper z-index stacking */
body {
  position: relative;
  z-index: 1;
}

#app {
  position: relative;
  z-index: 1;
}
</style>
