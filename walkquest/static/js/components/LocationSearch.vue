<template>
  <MapboxGeocoder v-bind="geocoderProps" class="geocoder-container" @mb-created="handleGeocodeCreated"
    @mb-result="handleGeocodeResult" @mb-error="handleGeocodeError" @mb-clear="handleGeocodeClear" />

  <div v-if="searchStore.error" class="search-error" role="alert">
    {{ searchStore.error }}
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useSearchStore } from '../stores/searchStore'
import { useLocationStore } from '../stores/locationStore'
import { MapboxGeocoder } from '@studiometa/vue-mapbox-gl'
import { WalksAPI } from '../services/api'
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

// Add loading state
const isLoading = ref(false)

// Optimize geocoder props using available options
const geocoderProps = {
  accessToken: props.mapboxToken,
  placeholder: 'Search locations...',
  countries: 'GB',
  language: 'en-GB',
  limit: 5,
  types: 'place,address,poi',
  minLength: 2,
  // Optimize flyTo behavior
  flyTo: {
    speed: 1.2,
    curve: 1,
    easing: t => t * (2 - t), // Ease out quad
    essential: true,
    padding: { top: 100, bottom: 100 }
  },
  // Performance optimizations
  localGeocoder: null,
  localGeocoderOnly: false,
  clearOnBlur: true,
  clearAndBlurOnEsc: true,
  marker: false,
  enableEventLogging: false,
  trackProximity: false, // Disable tracking to reduce API calls
  collapsed: false,
  // Optimize suggestion rendering
  render: item => `
    <div class='geocoder-item'>
      <div class='suggestion-title'>${item.text || ''}</div>
      <div class='suggestion-address'>${item.place_name || ''}</div>
    </div>
  `,
  getItemValue: item => item.place_name || '',
  // Add bbox to limit results to Cornwall
  bbox: [-6.5, 49.5, -3.5, 51.2],
  // Add proximity bias for better local results
  proximity: { longitude: -4.95, latitude: 50.4 }, // Cornwall center
  // Optimize filtering
  filter: (item) => {
    if (!item?.place_type?.[0] || !item?.center) return false
    const [lng, lat] = item.center

    // Check if within Cornwall bounds
    if (lng < -6.5 || lng > -3.5 || lat < 49.5 || lat > 51.2) {
      return false
    }

    const validTypes = ['place', 'address', 'poi', 'locality', 'neighborhood']
    return validTypes.includes(item.place_type[0])
  }
}

// Cache geocoder instance
let geocoderInstance = null

const handleGeocodeCreated = (control) => {
  if (!control) {
    console.error('Geocoder control not initialized')
    return
  }
  geocoderInstance = control
}

// Optimize result processing with API call
const processGeocodeResult = async (result) => {
  if (!result?.center || result.center.length !== 2) {
    searchStore.setError('Invalid location data received')
    return
  }

  const [longitude, latitude] = result.center

  try {
    isLoading.value = true

    // First emit the location to update the map immediately
    emit('location-selected', {
      center: [longitude, latitude],
      zoom: 14,
      place_name: result.place_name,
      pitch: 60,
      bearing: 30,
      duration: 2000,
      essential: true
    })

    // Update location store
    await locationStore.setUserLocation({
      latitude,
      longitude,
      place_name: result.place_name
    })

    // Fetch nearby walks from API
    const response = await WalksAPI.filterWalks({
      latitude,
      longitude,
      radius: locationStore.searchRadius,
      limit: 50
    })

    // Update store with results - directly set the ref value
    locationStore.nearbyWalks = response
    searchStore.setError(null)

  } catch (error) {
    console.error('Error handling location:', error)
    searchStore.setError('Unable to process location')
  } finally {
    isLoading.value = false
  }
}

const handleGeocodeResult = (event) => {
  if (!event?.result) {
    searchStore.setError('Please select a valid location')
    return
  }
  processGeocodeResult(event.result)
}

const handleGeocodeError = (error) => {
  console.error('Geocoding error:', error)
  searchStore.setError('Location search failed')
}

const handleGeocodeClear = () => {
  locationStore.clearLocation()
  if (geocoderInstance) {
    geocoderInstance.clear()
  }
}

// Add cleanup on unmount
onBeforeUnmount(() => {
  if (geocoderInstance) {
    geocoderInstance = null
  }
})
</script>
