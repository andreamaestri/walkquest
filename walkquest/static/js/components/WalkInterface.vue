<template>
  <div class="walk-interface-container flex flex-col h-full">
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
          @walk-selected="handleWalkSelection"
        />
      </div>
    </MobileMenu>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
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
const isMobile = computed(() => window.innerWidth < 768)

// Methods
const initializeData = async () => {
  if (props.initialWalks.length) {
    walksStore.walks = props.initialWalks
  } else {
    await walksStore.loadWalks()
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
    if (mapComponent.value?.map) {
      mapComponent.value.map.resize()
    }
  }, 250)
}

// Lifecycle hooks
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  
  try {
    loadingComponent.value.startLoading('Loading walks...')
    await initializeData()
  } catch (error) {
    uiStore.setError(error.message)
  } finally {
    loadingComponent.value.stopLoading()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
})
</script>