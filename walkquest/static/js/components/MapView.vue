<template>
  <div 
    :class="{ 'fixed inset-0 z-50': isFullscreen }"
    class="absolute inset-0"
  >
    <MapboxMap
      :access-token="mapboxToken"
      :map-style="mapStyle"
      :initial-options="{ center: [-4.85, 50.4], zoom: 9.5, bounds: bounds }"
      class="w-full h-full"
      @load="handleMapLoaded"
      @error="handleMapError"
    >
      <template #controls>
        <MapboxNavigationControl position="top-left" />
        <MapboxGeolocateControl 
          position="top-left"
          :trackUserLocation="true"
          :showAccuracyCircle="true"
        />
        <div class="absolute top-4 right-4 z-10">
          <button 
            @click="toggleFullscreen"
            class="bg-white border border-gray-300 rounded p-2 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span class="sr-only">Toggle fullscreen</span>
            <i :class="isFullscreen ? 'icon-compress' : 'icon-expand'"></i>
          </button>
        </div>
      </template>
    </MapboxMap>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useUiStore } from '../stores/ui'
import { useWalksStore } from '../stores/walks'
import { MapboxMap, MapboxNavigationControl, MapboxGeolocateControl } from '@studiometa/vue-mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['map-loaded', 'map-error'])
const map = ref(null)
const uiStore = useUiStore()
const walksStore = useWalksStore()

// Computed values
const isFullscreen = computed(() => uiStore.fullscreen)
const showSidebar = computed(() => uiStore.showSidebar)
const mapStyle = computed(() => 'mapbox://styles/mapbox/streets-v11')

// Default bounds for Cornwall
const bounds = [-5.5, 49.9, -4.2, 50.9]

// Map event handler updated to accept the map instance as parameter
const handleMapLoaded = (mapInstance) => {
  map.value = mapInstance
  uiStore.setMapLoading(false)
  emit('map-loaded', map.value)
}

const handleMapError = (error) => {
  console.error('Map error:', error)
  uiStore.setError(error.message)
  emit('map-error', error)
}

// Methods
const toggleFullscreen = () => {
  uiStore.toggleFullscreen()
}

const updateMapView = (walk) => {
  if (!map.value || !walk?.longitude || !walk?.latitude) return

  const isMobile = window.innerWidth < 768
  const offset = [
    showSidebar.value && !isMobile ? -150 : 0,
    0
  ]
  
  map.value.flyTo({
    center: [walk.longitude, walk.latitude],
    zoom: isMobile ? 13 : 14,
    offset,
    duration: 1200,
    essential: true
  })
}

// Watch for selected walk changes
watch(() => walksStore.selectedWalk, (walk) => {
  if (walk) {
    updateMapView(walk)
  }
})

// Watch for sidebar changes
watch([showSidebar, () => window.innerWidth], () => {
  if (map.value) {
    const isMobile = window.innerWidth < 768
    map.value.easeTo({
      padding: {
        top: 50,
        bottom: 50,
        left: showSidebar.value && !isMobile ? 384 + 50 : 50,
        right: 50
      }
    })
  }
}, { immediate: true })

// Cleanup on unmount
onBeforeUnmount(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})

// Methods exposed to parent
defineExpose({
  map,
  updateMapView
})
</script>

<style>
.map-container {
  width: 100%;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
}

.map-container .mapboxgl-map {
  width: 100% !important;
  height: 100% !important;
}

.map-container.fullscreen {
  position: fixed;
  z-index: 9999;
}

.map-controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1;
}

.map-control-button {
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}
</style>
