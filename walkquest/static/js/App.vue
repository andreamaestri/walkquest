<template>
  <div id="app" class="app-root">
    <Loading ref="loadingComponent" />
    <RouterView :mapbox-token="mapboxToken" />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from './stores/ui'
import { useSearchStore } from './stores/searchStore'
import Loading from './components/shared/Loading.vue'

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
const uiStore = useUiStore()
const searchStore = useSearchStore()
const route = useRoute()
const loadingComponent = ref(null)

onMounted(() => {
  // Initialize UI responsive state
  const cleanup = uiStore.initializeResponsiveState()
  
  // Watch loading states to show/hide loading component
  watch(() => uiStore.isAnyLoading, (isLoading) => {
    if (isLoading) {
      let message = 'Loading...'
      if (uiStore.loadingStates.walks) message = 'Loading walks...'
      else if (uiStore.loadingStates.location) message = 'Finding nearby walks...'
      else if (uiStore.loadingStates.map) message = 'Loading map...'
      else if (uiStore.loadingStates.search) message = 'Searching...'
      
      loadingComponent.value?.show(message)
    } else {
      loadingComponent.value?.hide()
    }
  }, { immediate: true })
  
  // Set initial search mode from URL or localStorage
  const searchMode = route.query.searchMode || localStorage.getItem('searchMode') || 'walks'
  if (['walks', 'locations'].includes(searchMode)) {
    searchStore.setSearchMode(searchMode)
  }
  
  // Watch search mode changes to update localStorage
  watch(() => searchStore.searchMode, (mode) => {
    localStorage.setItem('searchMode', mode)
  })
  
  // Cleanup on unmount
  onBeforeUnmount(cleanup)
})
</script>

<style>
.app-root {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  background: rgb(var(--md-sys-color-background));
  color: rgb(var(--md-sys-color-on-background));
}
</style>