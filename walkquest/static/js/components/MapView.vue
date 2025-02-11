<template>
  <div 
    :class="{ 'fullscreen': isFullscreen }"
    class="map-container h-screen w-full absolute top-0 left-0"
  >
    <MapboxMap
      ref="map"
      :access-token="mapboxToken"
      :initial-bounds="bounds"
      :zoom="9.5"
      :center="[-4.85, 50.4]"
      map-style="mapbox://styles/mapbox/streets-v12"
      @load="handleMapLoaded"
      @error="handleMapError"
    >
      <MapboxNavigationControl position="top-left" />
      <MapboxGeolocateControl position="top-left" />
      
      <div class="map-controls">
        <button 
          @click="toggleFullscreen"
          class="map-control-button"
        >
          <span class="sr-only">Toggle fullscreen</span>
          <i :class="isFullscreen ? 'icon-compress' : 'icon-expand'"></i>
        </button>
      </div>
    </MapboxMap>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import { useUiStore } from '../stores/ui'
import { useWalksStore } from '../stores/walks'
import { debounce } from '../utils/helpers'
import {
  MapboxMap,
  MapboxNavigationControl,
  MapboxGeolocateControl
} from '@studiometa/vue-mapbox-gl'

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

const isFullscreen = computed(() => uiStore.fullscreen)
const showSidebar = computed(() => uiStore.showSidebar)

// Default bounds for Cornwall
const bounds = [-5.5, 49.9, -4.2, 50.9]

// Map event handlers
const handleMapLoaded = () => {
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
  if (!map.value?.map || !walk?.longitude || !walk?.latitude) return

  const isMobile = window.innerWidth < 768
  const offset = [
    showSidebar.value && !isMobile ? -150 : 0,
    0
  ]
  
  map.value.map.flyTo({
    center: [walk.longitude, walk.latitude],
    zoom: isMobile ? 13 : 14,
    offset,
    duration: 1200,
    essential: true
  })
}

// Selected walk observer
watchEffect(() => {
  const selectedWalk = walksStore.selectedWalk
  if (selectedWalk) {
    updateMapView(selectedWalk)
  }
})

// Sidebar padding observer
watchEffect(() => {
  if (map.value?.map) {
    const isMobile = window.innerWidth < 768
    map.value.map.easeTo({
      padding: {
        top: 50,
        bottom: 50,
        left: showSidebar.value && !isMobile ? 384 + 50 : 50,
        right: 50
      }
    })
  }
})

// Methods exposed to parent
defineExpose({
  map,
  updateMapView,
  handleMapLoaded,
  handleMapError
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
