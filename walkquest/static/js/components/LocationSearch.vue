<template>
  <div class="location-search" role="search" aria-label="Location search">
    <div class="search-field-container" :class="{ 'is-loading': isLoading }">
      <MapboxGeocoder v-bind="geocoderProps" class="geocoder-container" @mb-created="handleGeocodeCreated"
        @mb-result="handleGeocodeResult" @mb-error="handleGeocodeError" @mb-clear="handleGeocodeClear" />
    </div>

    <div v-if="searchError" class="search-error" role="alert">
      <Icon icon="mdi:alert-circle" class="error-icon" />
      {{ searchError }}
    </div>

    <!-- Walks count header -->
    <div v-if="userLocation && hasSearched" class="walks-count-header" role="status">
      <template v-if="walkLoading">
        <div class="loading-text">
          <div class="loading-spinner small"></div>
          Searching for walks...
        </div>
      </template>
      <template v-else>
        <Icon icon="mdi:map-marker-radius" class="location-icon" />
        {{ walksCountText }}
      </template>
    </div>

    <!-- Empty state -->
    <div v-if="hasSearched && isEmptyState && userLocation && !walkLoading" 
         class="empty-state" 
         role="status" 
         aria-label="No walks found">
      <div class="empty-state-icon">
        <Icon icon="mdi:map-marker-off" />
      </div>
      <div class="empty-state-content">
        <div class="empty-state-text">
          No walks found near this location
        </div>
        <p class="empty-state-suggestion">
          Try searching in a different area or adjusting your search criteria
        </p>
      </div>
    </div>

    <!-- Initial state -->
    <div v-else-if="hasSearched && !userLocation && !walkLoading" 
         class="empty-state" 
         aria-label="Search prompt">
      <div class="empty-state-icon">
        <Icon icon="mdi:map-marker-search" />
      </div>
      <div class="empty-state-content">
        <div class="empty-state-text">
          Search for a location to find nearby walks
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch, nextTick, shallowRef } from 'vue'
import { useSearchStore } from '../stores/searchStore'
import { useLocationStore } from '../stores/locationStore'
import { MapboxGeocoder } from '@studiometa/vue-mapbox-gl'
import { Icon } from '@iconify/vue'
import { useWalkStore } from '../stores/walkStore'
import { storeToRefs } from 'pinia'

// Props and emits
const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  },
  initialValue: {
    type: String,
    default: ''
  },
  value: {
    type: String,
    default: ''
  },
  mapInstance: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:value', 'location-selected'])

// Stores with storeToRefs for better reactivity
const searchStore = useSearchStore()
const locationStore = useLocationStore()
const walkStore = useWalkStore()

// Extract reactive state from stores
const { error: searchError } = storeToRefs(searchStore)
const { userLocation, nearbyWalks, hasSearched } = storeToRefs(locationStore)
const { isLoading: walkLoading, walksCountText, isEmptyState } = storeToRefs(walkStore)

// State
const isLoading = ref(false)
let geocoderInstance = shallowRef(null)
let debounceTimers = {}

// Computed properties with storeToRefs
const hasMapboxToken = computed(() => !!props.mapboxToken)

// Create debounce helper with timer tracking
function debounce(fn, delay, id = 'default') {
  return (...args) => {
    if (debounceTimers[id]) clearTimeout(debounceTimers[id])
    
    debounceTimers[id] = setTimeout(() => {
      fn(...args)
      delete debounceTimers[id]
    }, delay)
  }
}

// Geocoder configuration
const geocoderProps = computed(() => ({
  accessToken: props.mapboxToken,
  placeholder: 'Search walks nearby...',
  countries: 'GB',
  language: 'en-GB',
  limit: 5,
  types: 'address,poi,locality,neighborhood',
  minLength: 2,
  flyTo: false, // Disable default flyTo since we handle it ourselves
  showResultMarkers: false,
  mapInstance: props.mapInstance,
  bbox: [-5.5, 50.0, -4.5, 50.5],
  render: item => {
    const title = item.text || ''
    const address = item.place_name ? item.place_name.replace(`${item.text}, `, '') : ''
    return `
      <div class='geocoder-suggestion'>
        <div class='geocoder-suggestion-title'>${title}</div>
        ${address ? `<div class='geocoder-suggestion-address'>${address}</div>` : ''}
      </div>
    `
  }
}))

// Enhanced geocoder initialization with better error handling and lifecycle management
const initGeocoder = async () => {
  if (!props.mapboxToken) {
    console.error('Missing Mapbox token')
    searchStore.setError('Location search unavailable (missing API key)')
    return
  }

  try {
    // Check if map instance is ready
    if (!props.mapInstance) {
      console.log('Map instance not ready, deferring initialization')
      return
    }

    // Ensure map is fully loaded before initializing geocoder
    if (props.mapInstance && !props.mapInstance.loaded()) {
      console.log('Map loading, waiting for load event')
      await new Promise(resolve => {
        const loadHandler = () => {
          props.mapInstance.off('load', loadHandler)
          resolve()
        }
        props.mapInstance.on('load', loadHandler)
      })
    }

    // Clear any previous errors once initialization is successful
    searchStore.setError(null)
    console.log('Geocoder initialization complete')
  } catch (error) {
    console.error('Geocoder initialization error:', error)
    searchStore.setError('Location search temporarily unavailable')
  }
}

// Enhanced geocoder created handler with proper cleanup
const handleGeocodeCreated = (control) => {
  if (!control) {
    console.error('Failed to create geocoder control')
    return
  }
  
  // Store reference with proper cleanup
  if (geocoderInstance.value) {
    try {
      geocoderInstance.value.clear()
    } catch (e) {
      console.warn('Error cleaning up previous geocoder instance:', e)
    }
  }
  
  geocoderInstance.value = control
  
  // Initialize with any existing location
  if (userLocation.value) {
    nextTick(() => {
      setGeocoderInput(userLocation.value.place_name || 
                      `${userLocation.value.latitude}, ${userLocation.value.longitude}`)
    })
  }
}

// Helper to safely set geocoder input
const setGeocoderInput = (text) => {
  if (!geocoderInstance.value) return
  
  try {
    geocoderInstance.value.setInput(text || '')
  } catch (error) {
    console.warn('Failed to set geocoder input:', error)
  }
}

// Process geocode result with better validation
const processGeocodeResult = async (result) => {
  if (!result?.geometry?.coordinates || !Array.isArray(result.geometry.coordinates)) {
    searchStore.setError('Invalid location data received')
    return
  }

  const location = {
    latitude: result.geometry.coordinates[1],
    longitude: result.geometry.coordinates[0],
    place_name: result.place_name,
    properties: result.properties || {}
  }

  await handleLocationChange(location)
}

// Consolidated location change handler
const handleLocationChange = async (location) => {
  try {
    // Update loading state
    isLoading.value = true
    searchStore.setError(null)
    walkStore.setError(null)
    walkStore.setLoading(true)
    // Record that a search has happened
    locationStore.$patch({ hasSearched: true })
    
    // Set the user location in the store
    await locationStore.setUserLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      place_name: location.place_name
    })
    // Fetch nearby walks
    await fetchNearbyWalks(location)
    // Emit location selected event for map positioning
    emit('location-selected', {
      center: [location.longitude, location.latitude],
      zoom: calculateZoomLevel(nearbyWalks.value?.length > 0 ? 
                              nearbyWalks.value[0].distance : 5),
      place_name: location.place_name,
      pitch: 60,
      bearing: 30,
      duration: 2000,
      essential: true
    })

    // Update input value for parent components
    emit('update:value', location.place_name || '')

  } catch (error) {
    console.error('Error handling location change:', error)
    searchStore.setError('Unable to process location')
    walkStore.setWalks([])
    walkStore.setError('Unable to process location')
  } finally {
    isLoading.value = false
    walkStore.setLoading(false)
  }
}

// Fetch nearby walks with better error handling and retry logic
const fetchNearbyWalks = async (location) => {
  if (!location?.latitude || !location?.longitude) {
    console.error('Invalid location for walk search')
    return
  }
  
  let retries = 2
  let success = false
  
  while (retries >= 0 && !success) {
    try {
      const response = await fetch(
        `/api/walks/nearby?` + 
        new URLSearchParams({
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
          radius: '10000', // 10km radius
          limit: '50',
          sort: 'distance',
        })
      )
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const walks = await response.json()
      
      if (!Array.isArray(walks)) {
        throw new Error('Invalid response format for walks')
      }
      
      if (walks.length === 0) {
        walkStore.setWalks([])
      } else {
        // Process walks to include distance and sort by proximity
        const processedWalks = walks
          .map(walk => ({
            ...walk,
            distance: calculateDistance(
              location.latitude,
              location.longitude,
              walk.latitude,
              walk.longitude
            )
          }))
          .sort((a, b) => a.distance - b.distance) // Sort by distance
          
        walkStore.setWalks(processedWalks)
        
        // Update search radius based on the furthest walk
        const maxDistance = Math.max(...processedWalks.map(w => w.distance || 0))
        walkStore.setSearchRadius(maxDistance)
      }
      
      success = true
    } catch (error) {
      console.error(`Error fetching nearby walks (retry ${2 - retries}/2):`, error)
      retries--
      
      if (retries < 0) {
        walkStore.setError('Unable to fetch nearby walks')
        walkStore.setWalks([])
      } else {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
}

// Add helper function to calculate appropriate zoom level based on distance
function calculateZoomLevel(distance) {
  // Convert distance from km to determine appropriate zoom
  if (distance <= 1) return 14 // Very close
  if (distance <= 3) return 13
  if (distance <= 5) return 12
  if (distance <= 10) return 11
  return 10 // Default for larger distances
}

// Add helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Clear search state with proper store coordination
const clearSearchState = () => {
  locationStore.clearSearched()
  walkStore.clearWalks()
  locationStore.clearLocation()
  searchStore.setError(null)
  walkStore.setError(null)
  
  // Clear geocoder input safely
  if (geocoderInstance.value) {
    try {
      geocoderInstance.value.clear()
    } catch (e) {
      console.warn('Error clearing geocoder:', e)
    }
  }
  
  // Emit value cleared event
  emit('update:value', '')
}

// Event handlers with improved error handling
const handleGeocodeResult = (event) => {
  if (!event?.result) {
    searchStore.setError('Please select a valid location')
    return
  }
  
  processGeocodeResult(event.result).catch(error => {
    console.error('Error processing geocode result:', error)
    searchStore.setError('Failed to process location')
  })
}

const handleGeocodeError = (error) => {
  console.error('Geocoding error:', error)
  searchStore.setError('Location search failed')
  isLoading.value = false
}

// Update the handleGeocodeClear method with store coordination
const handleGeocodeClear = () => {
  clearSearchState()
  emit('location-selected', null) // Notify parent that location was cleared
}

// Lifecycle hooks with proper cleanup
onMounted(async () => {
  if (props.mapInstance && props.mapboxToken) {
    await initGeocoder()
  }
  
  // If we already have a location stored, restore the geocoder state
  if (userLocation.value && geocoderInstance.value) {
    nextTick(() => {
      setGeocoderInput(userLocation.value.place_name || 
                      `${userLocation.value.latitude}, ${userLocation.value.longitude}`)
    })
  }
})

// Clean up all resources on unmount
onBeforeUnmount(() => {
  // Clear all debounce timers
  Object.values(debounceTimers).forEach(clearTimeout)
  debounceTimers = {}
  
  // Clean up geocoder instance
  if (geocoderInstance.value) {
    try {
      geocoderInstance.value.clear()
      geocoderInstance.value = null
    } catch (e) {
      console.error('Error cleaning up geocoder:', e)
    }
  }
})

// Watchers with proper reactive dependencies

// Watch for map instance changes
watch(() => props.mapInstance, async (map) => {
  if (map && props.mapboxToken && !geocoderInstance.value) {
    await initGeocoder()
  }
}, { immediate: true })

// Watch for mapbox token changes
watch(() => props.mapboxToken, async (token) => {
  if (token && props.mapInstance && !geocoderInstance.value) {
    await initGeocoder()
  }
}, { immediate: true })

// Watch for changes in userLocation for restoring geocoder state
watch(() => userLocation.value, (location) => {
  if (location && geocoderInstance.value) {
    nextTick(() => {
      setGeocoderInput(location.place_name || `${location.latitude}, ${location.longitude}`)
    })
  }
}, { immediate: true })

// Watch for search mode changes in searchStore
watch(() => searchStore.searchMode, (newMode) => {
  if (newMode !== 'locations') {
    clearSearchState()
  }
})

// Watch for error changes to attempt geocoder recovery
watch(() => searchError.value, async (error) => {
  if (error && props.mapInstance && props.mapboxToken && !geocoderInstance.value) {
    // Try to recover from error by reinitializing
    await initGeocoder()
  }
})
</script>

<style>
@import '../../css/material3.css';
.location-search {
  width: 100% !important;
}

.search-field-container {
  position: relative !important;
  width: 100% !important;
  margin-bottom: 8px !important;
}

/* Basics */
.mapboxgl-ctrl-geocoder,
.mapboxgl-ctrl-geocoder *,
.mapboxgl-ctrl-geocoder *:after,
.mapboxgl-ctrl-geocoder *:before {
  box-sizing: border-box;
}

.mapboxgl-ctrl-geocoder {
  font-size: 16px;
  line-height: 18px;
  font-family: "Roboto", "Segoe UI", system-ui, -apple-system;
  position: relative;
  background-color: rgb(var(--md-sys-color-surface));
  width: 100%;
  min-width: 240px;
  z-index: 1;
  border-radius: 24px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--md-sys-elevation-0);
}

.mapboxgl-ctrl-geocoder--input {
  font: inherit;
  width: 100%;
  border: 0;
  background-color: transparent;
  margin: 0;
  height: 40px;
  color: rgb(var(--md-sys-color-on-surface));
  padding: 2px 45px 2px 44px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.mapboxgl-ctrl-geocoder--input::-ms-clear {
  display: none;
}

.mapboxgl-ctrl-geocoder--input:focus {
  color: rgb(var(--md-sys-color-on-surface));
  outline: none;
  box-shadow: none;
}

.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--pin-right > * {
  z-index: 2;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: none;
}

.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: rgb(var(--md-sys-color-on-surface));
  fill: rgb(var(--md-sys-color-on-surface))!important;
  width: 18px;
  height: 18px;
  z-index: 2;
}

/* Add specific styles for the close icon */
.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon-close {
  right: 8px;
  left: auto;
  width: 18px;
  height: 18px;
  color: rgb(var(--md-sys-color-on-surface))!important;
  padding: 4px;
  margin-right: 4px;
  border-radius: 16px;
  cursor: pointer;
  background: transparent;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon-close:hover {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.08);
}

/* Adjust the input padding to account for both icons */
.mapboxgl-ctrl-geocoder--input {
  padding: 6px 44px 6px 44px !important;
}

.mapboxgl-ctrl-geocoder,
.mapboxgl-ctrl-geocoder .suggestions {
  box-shadow: var(--md-sys-elevation-0);
}

/* Collapsed */
.mapboxgl-ctrl-geocoder.mapboxgl-ctrl-geocoder--collapsed {
  width: 50px;
  min-width: 50px;
  transition: width .25s, min-width .25s;
}

/* Suggestions */
.mapboxgl-ctrl-geocoder .suggestions {
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 4px;
  left: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  position: absolute;
  width: 100%;
  top: 110%;
  top: calc(100% + 6px);
  z-index: 1000;
  overflow: hidden;
  font-size: 15px;
}

.mapboxgl-ctrl-geocoder .suggestions > li > a {
  padding: 12px 16px;
  color: rgb(var(--md-sys-color-on-surface));
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.mapboxgl-ctrl-geocoder .suggestions > .active > a,
.mapboxgl-ctrl-geocoder .suggestions > li > a:hover {
  color: rgb(var(--md-sys-color-on-surface));
  background-color: rgb(var(--md-sys-color-surface-container));
  text-decoration: none;
  cursor: pointer;
}

.search-error {
  color: rgb(var(--md-sys-color-on-error-container));
  background-color: rgb(var(--md-sys-color-error-container));
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.walks-count-header {
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background-color: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
  background-color: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 16px;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  opacity: 0.5;
}

.empty-state-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: rgb(var(--md-sys-color-on-surface));
}

.empty-state-suggestion {
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin: 0;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgb(var(--md-sys-color-primary));
  border-top-color: transparent;
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

@keyframes spinner {
  to {transform: rotate(360deg);}
}
</style>
