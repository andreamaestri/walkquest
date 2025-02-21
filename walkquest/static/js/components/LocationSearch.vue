<template>
  <div class="location-search">
    <MapboxGeocoder
      :access-token="mapboxToken"
      :zoom="14"
      :placeholder="'Search locations in Cornwall...'"
      :countries="['gb']"
      :bbox="CORNWALL_BOUNDS_ARRAY"
      :proximity="CORNWALL_CENTER"
      :language="'en-GB'"
      :limit="5"
      :flyTo="{
        speed: 1.2,
        curve: 1,
        easing: t => t * (2 - t)
      }"
      :minLength="2"
      :localGeocoder="localGeocoder"
      :filter="filterResults"
      :mapboxgl="mapboxgl"
      @result="handleGeocodeResult"
      @error="handleGeocodeError"
      @loading="handleGeocodeLoading"
      @clear="handleGeocodeClear"
      @results="handleResults"
    >
      <template #input="{ inputValue, setInput }">
        <div class="geocoder-input-wrapper">
          <Icon icon="mdi:map-marker-search" class="geocoder-icon" />
          <input
            :value="inputValue"
            @input="e => setInput(e.target.value)"
            class="geocoder-input"
            placeholder="Search locations in Cornwall..."
            type="text"
          />
          <div class="input-actions">
            <div v-if="isLoading" class="loading-indicator">
              <Icon icon="eos-icons:loading" class="animate-spin" />
            </div>
            <button v-if="inputValue" 
                    class="clear-button" 
                    @click="handleGeocodeClear"
                    title="Clear search">
              <Icon icon="material-symbols:close" />
            </button>
          </div>
        </div>
      </template>
    </MapboxGeocoder>

    <div v-if="searchStore.error" class="search-error" role="alert">
      {{ searchStore.error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useSearchStore } from '../stores/searchStore'
import { useUiStore } from '../stores/ui'
import { MapboxGeocoder } from '@studiometa/vue-mapbox-gl'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { useWalksStore } from '../stores/walks'
import mapboxgl from 'mapbox-gl'

const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  }
})

const searchStore = useSearchStore()
const uiStore = useUiStore()
const walksStore = useWalksStore()

// Constants for Cornwall bounds
const CORNWALL_BOUNDS_ARRAY = [
  -5.747, // West
  49.959, // South 
  -4.173, // East
  50.918  // North
]

const CORNWALL_CENTER = {
  longitude: -4.95,
  latitude: 50.4
}

// State
const isLoading = ref(false)
const results = ref([])

// Local geocoder for custom results
const localGeocoder = (query) => {
  return []
}

// Filter to ensure results are in Cornwall
const filterResults = (result) => {
  if (!result.bbox) return true
  
  const [minLng, minLat, maxLng, maxLat] = result.bbox
  
  return !(
    maxLng < CORNWALL_BOUNDS_ARRAY[0] || 
    minLng > CORNWALL_BOUNDS_ARRAY[2] || 
    maxLat < CORNWALL_BOUNDS_ARRAY[1] || 
    minLat > CORNWALL_BOUNDS_ARRAY[3]    
  )
}

// Add bounds calculation for walks
const walksBounds = computed(() => {
  const walks = walksStore.walks
  if (!walks?.length) return null

  // Initialize with first walk's coordinates
  let minLng = Number(walks[0].longitude)
  let maxLng = minLng
  let minLat = Number(walks[0].latitude)
  let maxLat = minLat

  // Find min/max coordinates
  walks.forEach(walk => {
    const lng = Number(walk.longitude)
    const lat = Number(walk.latitude)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  })

  // Add padding (0.1 degrees ≈ 11km)
  const padding = 0.1
  return [
    minLng - padding, // southwest lng
    minLat - padding, // southwest lat
    maxLng + padding, // northeast lng
    maxLat + padding  // northeast lat
  ]
})

const handleGeocodeResult = (event) => {
  if (!event?.result) return
  
  const result = event.result
  
  if (!result.center || result.center.length !== 2) {
    console.error('Invalid geocoding result:', result)
    searchStore.setError('Invalid location data received')
    return
  }

  emit('location-selected', result)  // Emit the raw result
}

const handleGeocodeError = (error) => {
  console.error('Geocoding error:', error)
  searchStore.setError(error.message)
}

const handleGeocodeLoading = (isLoading) => {
  uiStore.setLoadingState('location', isLoading)
}

const handleGeocodeClear = () => {
  searchStore.clearSearch()
}

const handleResults = (rawResults) => {
  results.value = rawResults
}
</script>

<style scoped>
.location-search {
  position: relative;
  width: 100%;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.search-bar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 28px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 16px;
}

.search-input:focus {
  outline: none;
}

.suggestions-list {
  margin-top: 8px;
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.suggestion-item:hover {
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-style: italic;
}

.search-error {
  padding: 4px 8px;
  color: rgb(var(--md-sys-color-error));
  font-size: 0.875rem;
}

.loading-indicator {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
  border-radius: 24px;
  transition: all 0.2s ease;
}

.clear-button:hover {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.08);
}

/* Add new styles */
.geocoder-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 28px;
  transition: background-color 0.2s ease;
}

.geocoder-input-wrapper:hover,
.geocoder-input-wrapper:focus-within {
  background: rgb(var(--md-sys-color-surface-container));
}

.geocoder-icon {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 24px;
  flex-shrink: 0;
}

/* Override Mapbox Geocoder styles */
:deep(.mapboxgl-ctrl-geocoder) {
  width: 100%;
  max-width: none;
  box-shadow: none;
  background: transparent;
}

:deep(.suggestions-wrapper) {
  margin-top: 8px;
  background: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-2);
}

:deep(.suggestions > li > a:hover) {
  background: rgb(var(--md-sys-color-surface-container-highest));
}

/* Update input styles */
.geocoder-input {
  flex: 1;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 16px;
  width: 100%;
}

.geocoder-input:focus {
  outline: none;
}

.geocoder-input::placeholder {
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
