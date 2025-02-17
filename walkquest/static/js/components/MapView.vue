<template>
  <div 
    :class="{ 'fixed inset-0 z-50': isFullscreen }"
    class="absolute inset-0"
  >
    <MapboxMap
      ref="mapComponent"
      :access-token="mapboxToken"
      :map-style="mapStyle"
      :initial-options="{
        center: [-4.85, 50.4],
        zoom: 9.5,
        bounds,
        cooperativeGestures: true,
        keyboard: true
      }"
      class="w-full h-full"
      @mb-created="handleMapLoaded"
      @mb-error="handleMapError"
    >
      <!-- Map Controls -->
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
            aria-label="Toggle fullscreen"
          >
            <span class="sr-only">Toggle fullscreen</span>
            <i :class="isFullscreen ? 'icon-compress' : 'icon-expand'"></i>
          </button>
        </div>
      </template>

      <!-- Loading State -->
      <template #loader>
        <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div class="loading-spinner"></div>
          <span class="sr-only">Loading map...</span>
        </div>
      </template>

      <!-- Geocoder -->
      <MapboxGeocoder
        :zoom="14"
        :marker="false"
        placeholder="Search for locations..."
        @mb-result="handleGeocodeResult"
      />

      <!-- Map Content -->
      <slot></slot>
    </MapboxMap>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useUiStore } from '../stores/ui'
import { useWalksStore } from '../stores/walks'
import { 
  MapboxMap, 
  MapboxNavigationControl, 
  MapboxGeolocateControl,
  MapboxGeocoder 
} from '@studiometa/vue-mapbox-gl'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['map-loaded', 'map-error'])

// Component refs and state
const mapComponent = ref(null)
const uiStore = useUiStore()
const walksStore = useWalksStore()

// Computed values
const isFullscreen = computed(() => uiStore.fullscreen)
const showSidebar = computed(() => uiStore.showSidebar)
const mapStyle = computed(() => 'mapbox://styles/mapbox/streets-v11')

// Default bounds for Cornwall
const bounds = [-5.5, 49.9, -4.2, 50.9]

// Map event handlers
const handleMapLoaded = (map) => {
  uiStore.setMapLoading(false)
  emit('map-loaded', map)
}

const handleMapError = (error) => {
  console.error('Map error:', error)
  uiStore.setError(error.message)
  emit('map-error', error)
}

const handleGeocodeResult = (result) => {
  if (result && result.geometry) {
    mapComponent.value?.flyTo({
      center: result.geometry.coordinates,
      zoom: 14,
      duration: 1500
    })
  }
}

// Methods
const toggleFullscreen = () => {
  uiStore.toggleFullscreen()
}

const updateMapView = (walk) => {
  if (!mapComponent.value || !walk?.longitude || !walk?.latitude) return

  const isMobile = window.innerWidth < 768
  const offset = [
    showSidebar.value && !isMobile ? -150 : 0,
    0
  ]
  
  mapComponent.value.flyTo({
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

// Watch for sidebar changes to update map padding
watch([showSidebar, () => window.innerWidth], () => {
  if (mapComponent.value) {
    const isMobile = window.innerWidth < 768
    mapComponent.value.easeTo({
      padding: {
        top: 50,
        bottom: 50,
        left: showSidebar.value && !isMobile ? 384 + 50 : 50,
        right: 50
      }
    })
  }
}, { immediate: true })

// Methods exposed to parent
defineExpose({
  mapComponent,
  updateMapView
})
</script>

<style>
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
