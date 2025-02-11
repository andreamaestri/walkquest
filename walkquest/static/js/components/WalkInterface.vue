<template>
  <div class="walk-interface-container flex flex-col h-screen w-full relative">
    <Loading ref="loadingComponent" />
    
    <div class="layout flex flex-1 h-full">
      <!-- Sidebar with walk list -->
      <Transition name="sidebar">
        <div 
          v-if="showSidebar"
          class="sidebar overflow-hidden"
          :class="{ 'mobile': isMobile }"
        >
          <div class="sidebar-header">
            <h2 class="text-xl font-semibold">Available Walks</h2>
            <button 
              @click="toggleSidebar"
              class="sidebar-toggle"
            >
              <span class="sr-only">Toggle sidebar</span>
              <i class="icon-chevron-left"></i>
            </button>
          </div>

          <div class="sidebar-content flex-1 overflow-hidden">
            <WalkList 
              :error="error"
              :walks="availableWalks"
              @walk-selected="handleWalkSelection"
            />
          </div>
        </div>
      </Transition>

      <!-- Map container -->
      <div class="map-section flex-1 relative">
        <div class="map-container h-full">
          <MapView
            ref="mapComponent"
            :mapbox-token="mapboxToken"
            :config="mapConfig"
            @map-loaded="handleMapLoaded"
            @map-error="handleMapError"
          />
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <MobileMenu v-if="isMobile">
      <div class="mobile-menu-content">
        <WalkList 
          :error="error"
          :walks="availableWalks"
          @walk-selected="handleWalkSelection"
        />
      </div>
    </MobileMenu>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useUiStore } from '../stores/ui'
import { useWalksStore } from '../stores/walks'
import Loading from './Loading.vue'
import MapView from './MapView.vue'
import WalkList from './WalkList.vue'
import MobileMenu from './MobileMenu.vue'

const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  },
  mapConfig: {
    type: Object,
    default: () => ({})
  },
  initialWalks: {
    type: Array,
    default: () => []
  }
})

// Component refs
const loadingComponent = ref(null)
const mapComponent = ref(null)

// Store access
const uiStore = useUiStore()
const walksStore = useWalksStore()

// Computed properties
const error = computed(() => uiStore.error)
const isFullscreen = computed(() => uiStore.fullscreen)
const showSidebar = computed(() => uiStore.showSidebar)
const isMobile = computed(() => uiStore.isMobile)

// Available walks from either props or store
const availableWalks = computed(() => {
  const walks = props.initialWalks?.length ? props.initialWalks : walksStore.walks
  console.log('Available walks computed:', walks?.length)
  return walks || []
})

// Methods
const initializeData = async () => {
  try {
    uiStore.setLoading(true)
    loadingComponent.value?.startLoading('Loading walks...')
    
    // Reset UI state
    uiStore.resetState()
    
    if (props.initialWalks?.length) {
      console.log('Setting initial walks:', props.initialWalks.length)
      await walksStore.setWalks(props.initialWalks)
    } else {
      console.log('Loading walks from API')
      await walksStore.loadWalks()
    }
    
    console.log('Walks loaded:', walksStore.walks?.length)
    
    // Show sidebar if we have walks and not on mobile
    if (walksStore.walks?.length > 0 && !isMobile.value) {
      await nextTick()
      uiStore.setSidebarVisibility(true)
    }
  } catch (error) {
    console.error('Failed to initialize data:', error)
    uiStore.setError(error.message)
  } finally {
    uiStore.setLoading(false)
    loadingComponent.value?.stopLoading()
  }
}

const handleMapLoaded = (map) => {
  uiStore.setMapLoading(false)
}

const handleMapError = (error) => {
  uiStore.setError(error.message)
  uiStore.setMapLoading(false)
}

const handleWalkSelection = (walk) => {
  console.log('Walk selected:', walk?.id)
  walksStore.setSelectedWalk(walk)
  if (walk && isMobile.value) {
    uiStore.setMobileMenuOpen(false)
  }
}

const toggleSidebar = () => {
  uiStore.toggleSidebar()
}

// Window resize handling
let resizeTimeout
const handleResize = () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    if (mapComponent.value?.map?.map) {
      mapComponent.value.map.map.resize()
    }
  }, 250)
}

// Watch for changes in walk data
watch(() => walksStore.walks, (newWalks) => {
  console.log('Store walks updated:', newWalks?.length)
  if (newWalks?.length > 0 && !showSidebar.value && !isMobile.value) {
    uiStore.setSidebarVisibility(true)
  }
}, { deep: true })

// Watch for sidebar visibility
watch(showSidebar, (visible) => {
  console.log('Sidebar visibility changed:', visible)
  if (visible && mapComponent.value?.map?.map) {
    nextTick(() => {
      mapComponent.value.map.map.resize()
    })
  }
})

// Lifecycle hooks
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await initializeData()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
})
</script>

<style>
.walk-interface-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.layout {
  position: relative;
  height: 100%;
  width: 100%;
}

.sidebar {
  position: absolute;
  left: 0;
  top: 0;
  width: 384px;
  height: 100%;
  background: white;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
}

.sidebar.mobile {
  display: none;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.map-section {
  position: relative;
  height: 100%;
  width: 100%;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Transitions */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(-100%);
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
  }
}
</style>
