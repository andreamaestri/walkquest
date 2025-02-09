<template>
  <div class="walk-interface">
    <!-- Existing template content here -->
    <h1>Walk Interface</h1>
    <p>Search Query: {{ searchQuery }}</p>
    <p>Show Sidebar: {{ showSidebar }}</p>
    <p>Is Loading: {{ isLoading }}</p>
    <p>Error: {{ error }}</p>
    <WalkList />
  </div>
</template>

<script>
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { useMapStore } from '../stores/map'
import mapboxgl from 'mapbox-gl'
import { computed, onMounted, onUnmounted } from 'vue'
// import { addEvent, debounce } from '../alpine-components.js';
import WalkList from './WalkList.vue'

export default {
  name: 'WalkInterface',
  components: {
    WalkList
  },
  setup() {
    const walksStore = useWalksStore()
    const uiStore = useUiStore()
    const mapStore = useMapStore()

    const searchQuery = computed(() => uiStore.searchQuery)
    const showSidebar = computed(() => uiStore.showSidebar)
    const isLoading = computed(() => walksStore.loading)
    const error = computed(() => uiStore.error)

    let cleanup = {
      events: new Set(),
      observers: new Set(),
      intervals: new Set(),
      timeouts: new Set()
    }

    const handleError = (error) => {
      uiStore.setError(error.message || 'An unexpected error occurred')
      console.error('Error:', error)
    }

    const initializeMap = async () => {
      uiStore.setLoadingState('map', true)
      try {
        // Map initialization logic here
        console.log('Initializing map')
      } catch (error) {
        handleError(error)
      } finally {
        uiStore.setLoadingState('map', false)
      }
    }

    const fetchWalks = async () => {
      walksStore.loading = true
      try {
        await walksStore.fetchWalks()
      } catch (error) {
        handleError(error)
      } finally {
        walksStore.loading = false
      }
    }

    // const registerEventListener = (target, event, handler) => {
    //   const cleanupFunc = addEvent(target, event, handler);
    //   cleanup.events.add(cleanupFunc);
    //   return cleanupFunc;
    // }

    const updateResponsiveLayout = () => {
      // Responsive layout update logic
      console.log('Updating responsive layout')
    }

    const handleWalkInteractions = (event) => {
      // Walk interactions handler logic
      console.log('Handling walk interactions')
    }

    onMounted(async () => {
      console.group('WalkInterface Initialization')
      console.log('Starting initialization...')

      try {
        await initializeMap()
        await fetchWalks()

        // Handle responsive layout
        // const debouncedResize = debounce(() => {
        //   // if (mapStore.mapInstance) {
        //   //   mapStore.mapInstance.resize()
        //   // }
        //   updateResponsiveLayout()
        // }, 250)

        // registerEventListener(window, 'resize', debouncedResize)
        // registerEventListener(document, 'click', handleWalkInteractions)

        updateResponsiveLayout()

        console.log('Initialization complete')
      } catch (error) {
        handleError(error)
      } finally {
        console.groupEnd()
      }
    })

    onUnmounted(() => {
      console.log('WalkInterface unmounted')
      // Cleanup logic
      cleanup.events.forEach(cleanupFunc => cleanupFunc());
      cleanup.observers.forEach(observer => observer.disconnect());
      cleanup.intervals.forEach(clearInterval);
      cleanup.timeouts.forEach(clearTimeout);

      cleanup.events.clear();
      cleanup.observers.clear();
      cleanup.intervals.clear();
      cleanup.timeouts.clear();
    })

    return {
      walksStore,
      uiStore,
      mapStore,
      searchQuery,
      showSidebar,
      isLoading,
      error
    }
  }
}
</script>

<style scoped>
/* Component styles here */
</style>