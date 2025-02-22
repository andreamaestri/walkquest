<template>
  <div class="location-search" role="search" aria-label="Location search">
    <div class="search-field-container" :class="{ 'is-loading': isLoading }">
      <MapboxGeocoder v-bind="geocoderProps" class="geocoder-container" @mb-created="handleGeocodeCreated"
        @mb-result="handleGeocodeResult" @mb-error="handleGeocodeError" @mb-clear="handleGeocodeClear" />
    </div>

    <div v-if="searchStore.error" class="search-error" role="alert">
      <Icon icon="mdi:alert-circle" class="error-icon" />
      {{ searchStore.error }}
    </div>

    <!-- Walks count header -->
    <div v-if="locationStore.userLocation && hasSearched" class="walks-count-header" role="status">
      <template v-if="walkStore.isLoading">
        <div class="loading-text">
          <div class="loading-spinner small"></div>
          Searching for walks...
        </div>
      </template>
      <template v-else>
        <Icon icon="mdi:map-marker-radius" class="location-icon" />
        {{ walkStore.walksCountText }}
      </template>
    </div>

    <!-- Empty state -->
    <div v-if="hasSearched && walkStore.isEmptyState && locationStore.userLocation && !walkStore.isLoading" 
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
    <div v-else-if="hasSearched && !locationStore.userLocation && !walkStore.isLoading" 
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
import { ref, computed, onBeforeUnmount, onMounted, watch, nextTick } from 'vue'
import { useSearchStore } from '../stores/searchStore'
import { useLocationStore } from '../stores/locationStore'
import { MapboxGeocoder } from '@studiometa/vue-mapbox-gl'
import { Icon } from '@iconify/vue'
import { useWalkStore } from '../stores/walkStore'

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

// Stores
const searchStore = useSearchStore()
const locationStore = useLocationStore()
const walkStore = useWalkStore()

// State
const isLoading = ref(false)
const hasSearched = ref(false)  // This will now control empty state visibility
let geocoderInstance = null

// Watch for map instance changes
watch(() => props.mapInstance, async (map) => {
  if (map && !geocoderInstance) {
    await initGeocoder()
  }
}, { immediate: true })

// Computed
const hasMapboxToken = computed(() => !!props.mapboxToken)

// Geocoder configuration
const geocoderProps = computed(() => ({
  accessToken: props.mapboxToken,
  placeholder: 'Search locations...',
  countries: 'GB',
  language: 'en-GB',
  limit: 5,
  types: 'place,address,poi',
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

// Enhanced geocoder initialization
const initGeocoder = async () => {
  console.log('Initializing geocoder...', { mapInstance: props.mapInstance, token: props.mapboxToken })
  try {
    if (!props.mapboxToken) {
      throw new Error('Mapbox token is required')
    }

    if (geocoderInstance) {
      console.log('Geocoder already initialized')
      return
    }

    if (!props.mapInstance) {
      console.log('Map instance not ready, waiting...')
      return // Don't throw error, just return and wait for the watcher to call again
    }

    // Wait for the map to be fully loaded
    if (!props.mapInstance.loaded()) {
      console.log('Map not loaded, waiting for load event...')
      await new Promise(resolve => {
        props.mapInstance.once('load', resolve)
      })
    }

    console.log('Map is ready, completing geocoder initialization')
    await nextTick()
    console.log('Geocoder initialization complete')

  } catch (error) {
    console.error('Geocoder initialization error:', error)
    searchStore.setError('Location search is temporarily unavailable')
  }
}

// Enhanced geocoder created handler
const handleGeocodeCreated = (control) => {
  console.log('Geocoder created')
  if (!control) {
    console.error('Geocoder control not initialized')
    return
  }
  
  geocoderInstance = control
  
  // Initialize with any existing location
  if (locationStore.userLocation) {
    const { latitude, longitude, place_name } = locationStore.userLocation
    nextTick(() => {
      console.log('Setting initial geocoder value')
      geocoderInstance.setInput(place_name || `${latitude}, ${longitude}`)
    })
  }
}

// Debounced location update
const debouncedSetLocation = debounce(async (location) => {
  try {
    isLoading.value = true
    hasSearched.value = true // mark that a search has been initiated
    searchStore.setError(null)
    walkStore.setError(null)
    walkStore.setLoading(true)

    // First set the location
    await locationStore.setUserLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      place_name: location.place_name
    })

    // Then fetch nearby walks
    try {
      const response = await fetch(`/api/walks/nearby?latitude=${location.latitude}&longitude=${location.longitude}&radius=5000&limit=50`)
      if (!response.ok) {
        throw new Error('Failed to fetch nearby walks')
      }
      const walks = await response.json()
      
      if (!Array.isArray(walks)) {
        throw new Error('Invalid response format for walks')
      }

      if (walks.length === 0) {
        walkStore.setWalks([])
        walkStore.setError('No walks found in this area')
      } else {
        // Process walks to include distance from search location
        const walksWithDistance = walks.map(walk => ({
          ...walk,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            walk.latitude,
            walk.longitude
          )
        }))
        walkStore.setWalks(walksWithDistance)
        walkStore.setError(null)
      }

      // Emit location selected event after successful walk fetch
      emit('location-selected', {
        center: [location.longitude, location.latitude],
        zoom: 14,
        place_name: location.place_name,
        pitch: 60,
        bearing: 30,
        duration: 2000,
        essential: true
      })

    } catch (error) {
      console.error('Error fetching nearby walks:', error)
      walkStore.setError('Unable to fetch nearby walks')
      walkStore.setWalks([])
      searchStore.setError('Unable to fetch nearby walks')
    }

  } catch (error) {
    console.error('Error setting location:', error)
    searchStore.setError('Unable to process location')
    walkStore.setWalks([])
    walkStore.setError('Unable to process location')
  } finally {
    isLoading.value = false
    walkStore.setLoading(false)
  }
}, 300)

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

// Event handlers
const handleGeocodeResult = (event) => {
  console.log('Geocode result received')
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
  walkStore.clearWalks()
  hasSearched.value = false // Reset search state
  if (geocoderInstance) {
    geocoderInstance.clear()
  }
}

// Lifecycle hooks and watchers
onMounted(async () => {
  console.log('LocationSearch mounted')
  // Don't try to initialize immediately, let the watcher handle it
})

// Watch for map instance changes
watch(
  () => props.mapInstance,
  async (map, oldMap) => {
    console.log('Map instance changed:', { map, oldMap })
    if (map && !geocoderInstance) {
      await initGeocoder()
    }
  },
  { immediate: true }
)

// Watch for mapbox token changes
watch(
  () => props.mapboxToken,
  async (token, oldToken) => {
    console.log('Mapbox token changed:', { token: !!token, oldToken: !!oldToken })
    if (token && props.mapInstance && !geocoderInstance) {
      await initGeocoder()
    }
  },
  { immediate: true }
)

// Watch for changes in userLocation
watch(
  () => locationStore.userLocation,
  (userLocation) => {
    if (userLocation && geocoderInstance) {
      console.log('Updating geocoder with new location')
      nextTick(() => {
        geocoderInstance.setInput(
          userLocation.place_name || 
          `${userLocation.latitude}, ${userLocation.longitude}`
        )
      })
    }
  },
  { immediate: true }
)

// Watch for errors to reinitialize if needed
watch(() => searchStore.error, async (error) => {
  if (error) {
    console.log('Error detected, attempting geocoder recovery')
    await nextTick()
    if (props.mapInstance && props.mapboxToken) {
      await initGeocoder()
    }
  }
})

// Cleanup
onBeforeUnmount(() => {
  if (geocoderInstance) {
    try {
      geocoderInstance.clear()
      geocoderInstance = null
    } catch (e) {
      console.error('Error cleaning up geocoder:', e)
    }
  }
})

// Helper function
function debounce(fn, delay) {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(null, args), delay)
  }
}
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
  line-height: 24px;
  font-family: "Roboto", "Segoe UI", system-ui, -apple-system;
  position: relative;
  background-color: rgb(var(--md-sys-color-surface));
  width: 100%;
  min-width: 240px;
  z-index: 1;
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--md-sys-elevation-1);
}

.mapboxgl-ctrl-geocoder--input {
  font: inherit;
  width: 100%;
  border: 0;
  background-color: transparent;
  margin: 0;
  height: 50px;
  color: rgb(var(--md-sys-color-on-surface));
  padding: 6px 45px 6px 44px;
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
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  z-index: 2;
}

/* Add specific styles for the close icon */
.mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon-close {
  right: 8px;
  left: auto;
  width: 32px;
  height: 32px;
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
  box-shadow: var(--md-sys-elevation-2);
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
