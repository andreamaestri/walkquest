<template>
  <div 
    ref="mapContainer"
    :class="{ 'fullscreen': isFullscreen }"
    class="map-container"
  >
    <div class="map-controls">
      <button 
        @click="toggleFullscreen"
        class="map-control-button"
      >
        <span class="sr-only">Toggle fullscreen</span>
        <i :class="isFullscreen ? 'icon-compress' : 'icon-expand'"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watchEffect, computed } from 'vue'
import { useUiStore } from '../stores/ui'
import { useWalksStore } from '../stores/walks'
import MapService from '../services/map'
import { debounce } from '../utils/helpers'
import { NavigationControl } from 'mapbox-gl';

const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  },
  config: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['map-loaded', 'map-error'])

const mapContainer = ref(null)
const map = ref(null)
const uiStore = useUiStore()
const walksStore = useWalksStore()

const isFullscreen = computed(() => uiStore.fullscreen)
const showSidebar = computed(() => uiStore.showSidebar)

// Map initialization
const initializeMap = async () => {
  if (!mapContainer.value) return

  try {
    uiStore.setMapLoading(true)
    
    map.value = await MapService.initialize(mapContainer.value, {
      mapboxToken: props.mapboxToken,
      ...props.config,
      dragPan: false, // Disable drag pan initially
      scrollZoom: false // Disable scroll zoom initially
    })

    map.value.on('load', () => {
      uiStore.setMapLoading(false)
      emit('map-loaded', map.value)
    })

    // Add navigation controls
    const navControl = new NavigationControl();
    map.value.addControl(navControl, 'top-left')

    // Enable map interactions after the map is fully loaded
    map.value.once('idle', () => {
      map.value.dragPan.enable();
      map.value.scrollZoom.enable();
      console.log('Map interactions enabled');
    });

  } catch (error) {
    console.error('Failed to initialize map:', error)
    uiStore.setError(error.message)
    emit('map-error', error)
    uiStore.setMapLoading(false)
  }
}

// Update map padding based on sidebar state
const updateMapPadding = () => {
  if (!map.value) return

  const isMobile = window.innerWidth < 768
  const padding = {
    top: 50,
    bottom: 50,
    left: showSidebar.value && !isMobile ? 384 + 50 : 50,
    right: 50
  }

  map.value.easeTo({ padding })
}

// Update zoom level based on screen size
const updateResponsiveLayout = () => {
  if (!map.value) return

  const isMobile = window.innerWidth < 768
  const optimalZoom = isMobile ? 13 : 14
  map.value.setZoom(optimalZoom)
}

// Handle window resize with debounce
const handleResize = debounce(() => {
  if (map.value) {
    map.value.resize()
    updateResponsiveLayout()
    updateMapPadding()
  }
}, 250)

// Update map view when a walk is selected
const updateMapView = (walk) => {
  if (!map.value || !walk?.longitude || !walk?.latitude) return

  const isMobile = window.innerWidth < 768
  const optimalZoom = isMobile ? 13 : 14
  const offset = [
    showSidebar.value && !isMobile ? -150 : 0,
    0
  ]

  map.value.flyTo({
    center: [walk.longitude, walk.latitude],
    zoom: optimalZoom,
    offset,
    duration: 1200,
    essential: true,
    easing: (t) => t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  })
}

const toggleFullscreen = () => {
  uiStore.toggleFullscreen()
}

// Lifecycle hooks
onMounted(() => {
  initializeMap()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (map.value) {
    map.value.remove()
  }
})

// Watchers
watchEffect(() => {
  const selectedWalk = walksStore.selectedWalk
  if (selectedWalk) {
    updateMapView(selectedWalk)
  }
})

watchEffect(() => {
  if (map.value) {
    updateMapPadding()
  }
})

// Methods exposed to parent
defineExpose({
  map,
  updateMapView
})
</script>