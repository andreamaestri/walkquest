<template>
  <div class="location-search-wrapper">
    <div class="location-search">
      <MapboxGeocoder
        v-bind="geocoderProps"
        class="geocoder-container"
        @mb-created="handleGeocodeCreated"
        @mb-result="handleGeocodeResult"
        @mb-error="handleGeocodeError"
        @mb-clear="handleGeocodeClear"
      />

      <div v-if="searchStore.error" class="search-error" role="alert">
        {{ searchStore.error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSearchStore } from '../stores/searchStore'
import { useLocationStore } from '../stores/locationStore'
import { MapboxGeocoder } from '@studiometa/vue-mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['location-selected'])

// Stores
const searchStore = useSearchStore()
const locationStore = useLocationStore()

// Simple geocoder props without unnecessary filtering
const geocoderProps = {
  accessToken: props.mapboxToken,
  placeholder: 'Search locations...',
  countries: 'GB',
  language: 'en-GB',
  limit: 5,
  types: 'place,address,poi',
  minLength: 2,
  flyTo: false
}

const handleGeocodeCreated = (control) => {
  if (!control) {
    console.error('Geocoder control not initialized')
    return
  }
}

const handleGeocodeResult = async (event) => {
  if (!event?.result) {
    console.error('No result received from geocoder')
    searchStore.setError('Please select a valid location')
    return
  }
  
  const result = event.result
  
  try {
    if (!result.center || result.center.length !== 2) {
      throw new Error('Invalid location data received')
    }

    const [longitude, latitude] = result.center

    // Emit the location selected event to update the map
    emit('location-selected', {
      center: [longitude, latitude],
      zoom: 14,
      place_name: result.place_name
    })

    // Update the store
    await locationStore.setUserLocation({
      latitude,
      longitude,
      place_name: result.place_name
    })

    searchStore.setError(null)
    
  } catch (error) {
    console.error('Error handling location:', error)
    searchStore.setError(error.message || 'Unable to process location. Please try again.')
  }
}

const handleGeocodeError = (error) => {
  console.error('Geocoding error:', error)
  searchStore.setError(error.message || 'Location search failed. Please try again.')
}

const handleGeocodeClear = () => {
  locationStore.clearLocation()
}
</script>

<style>
.location-search-wrapper {
  position: relative;
  width: 100%;
  z-index: 1000;
}

.location-search {
  position: relative;
  width: 100%;
}

.geocoder-container {
  width: 100%;
}

/* Override default Mapbox Geocoder styles with MD3 */
:deep(.mapboxgl-ctrl-geocoder) {
  width: 100%;
  max-width: none;
  box-shadow: none;
  font-family: inherit;
  background: rgb(var(--md-sys-color-surface-container-high));
  border-radius: 28px;
  transition: all 0.2s ease;
}

:deep(.mapboxgl-ctrl-geocoder:hover) {
  background: rgb(var(--md-sys-color-surface-container-highest));
}

:deep(.mapboxgl-ctrl-geocoder--input) {
  height: 56px;
  padding: 0 56px;
  border-radius: 28px;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 1rem;
  border: none;
  outline: none;
  transition: background 0.2s ease;
}

:deep(.mapboxgl-ctrl-geocoder--input:focus) {
  outline: none;
  background: transparent;
  box-shadow: none;
}

:deep(.mapboxgl-ctrl-geocoder--input::placeholder) {
  color: rgb(var(--md-sys-color-on-surface-variant));
  opacity: 1;
}

:deep(.mapboxgl-ctrl-geocoder--icon) {
  top: 16px;
}

:deep(.mapboxgl-ctrl-geocoder--icon-search) {
  left: 16px;
  fill: rgb(var(--md-sys-color-on-surface-variant));
  transition: fill 0.2s ease;
}

:deep(.mapboxgl-ctrl-geocoder--pin-right) {
  right: 12px;
  top: 8px;
}

:deep(.mapboxgl-ctrl-geocoder--button) {
  width: 40px;
  height: 40px;
  padding: 8px;
  background: transparent;
  border-radius: 20px;
  transition: background-color 0.2s ease;
}

:deep(.mapboxgl-ctrl-geocoder--button:hover) {
  background: rgb(var(--md-sys-color-surface-variant) / 0.08);
}

:deep(.mapboxgl-ctrl-geocoder--icon-close) {
  fill: rgb(var(--md-sys-color-on-surface-variant));
  margin: 0;
}

:deep(.mapboxgl-ctrl-geocoder--icon-loading) {
  top: 16px;
  right: 16px;
  width: 24px;
  height: 24px;
}

/* Style suggestions dropdown */
:deep(.suggestions) {
  margin-top: 8px;
  background: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-2);
  border: none;
  transform: translateZ(0); /* Force GPU acceleration */
  will-change: transform, opacity; /* Hint for browser optimization */
}

:deep(.suggestions > li) {
  padding: 16px;
  color: rgb(var(--md-sys-color-on-surface));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant) / 0.08);
  transition: background-color 0.2s ease;
  transform: translateZ(0); /* Force GPU acceleration */
}

:deep(.suggestions > li:last-child) {
  border-bottom: none;
}

:deep(.suggestions > li:hover),
:deep(.suggestions > .active) {
  background: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface));
}

:deep(.mapboxgl-ctrl-geocoder--suggestion-title) {
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 0.875rem;
  margin-bottom: 4px;
}

:deep(.mapboxgl-ctrl-geocoder--suggestion-address) {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.75rem;
}

:deep(.mapboxgl-ctrl-geocoder--powered-by) {
  display: none !important;
}

/* Error message styling */
.search-error {
  margin-top: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
  font-size: 0.875rem;
}
</style>
