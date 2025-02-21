<template>
  <div class="search-view">
    <div class="search-container">
      <template v-if="props.searchMode === 'locations'">
        <LocationSearch 
          :mapbox-token="props.mapboxToken"
          @location-selected="handleLocationSelected"
        />
      </template>
      <template v-else>
        <div class="search-bar"
             :class="{ 
               'is-error': hasError,
               'is-focused': isFocused
             }"
             @click="handleContainerClick">
          <div class="search-input-wrapper">
            <Icon icon="material-symbols:search" class="search-icon" />
            <input
              ref="searchInput"
              v-model="searchQuery"
              class="search-input"
              type="text"
              placeholder="Search walks..."
              @input="handleInput"
              @focus="handleFocus"
              @blur="handleBlur"
              @keydown.down.prevent="handleKeyDown"
              @keydown.up.prevent="handleKeyUp"
              @keydown.enter.prevent="handleEnter"
              @keydown.esc.prevent="handleEscape"
            />
            <div class="input-actions">
              <div v-if="isLoading" class="loading-indicator">
                <Icon icon="eos-icons:loading" class="animate-spin" />
              </div>
              <button v-if="canClear" 
                      class="clear-button" 
                      @click="clearSearch">
                <Icon icon="material-symbols:close" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <div v-if="hasError" class="search-error">
        {{ errorMessage }}
      </div>

      <!-- Show location results only when in location mode and have a selected location -->
      <div v-if="props.searchMode === 'locations' && showLocationResults"
           class="location-results">
        <div class="results-count">
          {{ resultCountText }}
        </div>
        <WalkList 
          :walks="nearbyWalks"
          :is-compact="true"
          @walk-selected="handleWalkSelected"
        />
      </div>

      <!-- Show walk search results only in walks mode -->
      <Transition v-else
        enter-active-class="animate-in"
        leave-active-class="animate-out"
        @after-leave="onTransitionComplete"
      >
        <div v-if="showSuggestions && isFocused" 
             class="suggestions-dropdown"
             :style="suggestionDropdownStyle">
          <template v-if="suggestions?.length > 0">
            <button
              v-for="(suggestion, index) in suggestions"
              :key="suggestion.id || index"
              class="suggestion-item"
              :class="{ 'is-selected': index === selectedIndex }"
              @mousedown.prevent="selectSuggestion(suggestion)"
              @mouseover="selectedIndex = index"
            >
              <Icon icon="material-symbols:location-on" width="24" height="24" />
              <div class="suggestion-content">
                <span class="suggestion-title">{{ getSuggestionText(suggestion) }}</span>
              </div>
            </button>
          </template>
          <div v-else-if="searchQuery && !isLoading" class="empty-state">
            <div class="suggestion-item">
              <Icon :icon="searchMode === 'locations' ? 'mdi:map-marker-off' : 'material-symbols:search-off'" />
              <span>No {{ searchMode === 'locations' ? 'locations' : 'walks' }} found</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <slot name="meta"></slot>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import LocationSearch from './LocationSearch.vue'  // Fix import
import WalkList from './WalkList.vue'
import { useLocationStore } from '../stores/locationStore'
import { useSearchStore } from '../stores/searchStore'
import { useWalksStore } from '../stores/walks'
import { useMap } from '../composables/useMap' // Add this import
import { Icon } from '@iconify/vue'

// Props including mapboxToken
const props = defineProps({
  searchMode: {
    type: String,
    default: 'walks',
    validator: (value) => ['walks', 'locations'].includes(value)
  },
  mapboxToken: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:search-mode', 'location-selected', 'walk-selected'])

const searchStore = useSearchStore()
const walksStore = useWalksStore()
const searchInput = ref(null)
const selectedIndex = ref(-1)
const showSuggestions = ref(false)

// Add new ref for focus state
const isFocused = ref(false)

// Update searchQuery to use computed with two-way binding to store
const searchQuery = computed({
  get: () => searchStore.searchQuery || '',
  set: (value) => searchStore.setSearchQuery(value)
})

// Computed properties
const searchModeIcon = computed(() => 
  props.searchMode === 'walks' ? 'material-symbols:search' : 'material-symbols:location-on'
)

const searchModeTitle = computed(() => 
  props.searchMode === 'walks' ? 'Switch to location search' : 'Switch to walk search'
)

const searchPlaceholder = computed(() => 
  props.searchMode === 'locations' ? 'Search for a location...' : 'Search walks...'
)

// Add computed to get the current search mode from the store
const currentSearchMode = computed(() => searchStore.searchMode)

// Add shallowRef for better performance with large lists
const filteredWalks = shallowRef([])

// Cache walk text content for faster filtering
const walkTextCache = new Map()

function getWalkSearchText(walk) {
  if (walkTextCache.has(walk.id)) {
    return walkTextCache.get(walk.id)
  }
  
  const text = [
    walk.title,
    walk.location,
    walk.description
  ].filter(Boolean).join(' ').toLowerCase()
  
  walkTextCache.set(walk.id, text)
  return text
}

// Optimized debounced walk filter
const debouncedFilterWalks = debounce((query) => {
  console.time('filterWalks')
  
  if (!query?.trim()) {
    filteredWalks.value = []
    return
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/)
  
  // Use faster array filtering
  const results = walksStore.walks.filter(walk => {
    const text = getWalkSearchText(walk)
    return searchTerms.every(term => text.includes(term))
  })

  filteredWalks.value = results
  console.timeEnd('filterWalks')
}, 150) // Reduced debounce time

// Optimized suggestions computed
const suggestions = computed(() => {
  const query = searchQuery.value?.trim()
  if (!query) return []
  
  if (props.searchMode === 'locations') {
    return searchStore.locationSuggestions || []
  }
  
  return filteredWalks.value.slice(0, 5)
})

const isLoading = computed(() => searchStore.isLoading)
const hasError = computed(() => !!searchStore.error)
const errorMessage = computed(() => searchStore.error)
const canClear = computed(() => searchQuery.value.length > 0)

// Add debounce helper
const DEBOUNCE_DELAY = 300
function debounce(fn, delay) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), delay)
  }
}

// Add debounced search function for locations
const debouncedLocationSearch = debounce(async (query) => {
  if (!query?.trim()) {
    searchStore.clearLocationSuggestions()
    return
  }
  
  try {
    searchStore.setError(null)
    const commonLocations = [
      { 
        place_name: 'Truro, Cornwall',
        center: [-5.0527, 50.2632],
        place_type: ['place']
      },
      {
        place_name: 'Falmouth, Cornwall',
        center: [-5.0708, 50.1544],
        place_type: ['place']
      }
    ]
    
    // Filter common locations first for instant results
    const matches = commonLocations.filter(location => 
      location.place_name.toLowerCase().includes(query.toLowerCase())
    )
    
    searchStore.setLocationSuggestions(matches)
  } catch (error) {
    console.error('Location search error:', error)
    searchStore.setError('Failed to search locations')
  }
}, 150) // Use a shorter delay for location search

// Update handleInput to be more efficient
const handleInput = (event) => {
  const value = event.target.value || ''
  
  // Only update if value actually changed
  if (searchQuery.value === value) return
  
  searchQuery.value = value
  
  if (!value.trim()) {
    filteredWalks.value = []
    searchStore.clearLocationSuggestions()
    return
  }
  
  // Handle search modes
  if (props.searchMode === 'locations') {
    searchStore.setError(null)
    return
  }
  
  debouncedFilterWalks(value)
}

// Update handleFocus
const handleFocus = () => {
  isFocused.value = true
  showSuggestions.value = true
}

// Update handleBlur
const handleBlur = () => {
  isFocused.value = false
  // Use a short delay to allow click events
  setTimeout(() => {
    showSuggestions.value = false
  }, 150)
}

// Add new handler for container clicks
const handleContainerClick = () => {
  searchInput.value?.focus()
}

const handleKeyDown = () => {
  if (selectedIndex.value < suggestions.value.length - 1) {
    selectedIndex.value++
  }
}

const handleKeyUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

const handleEnter = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
    selectSuggestion(suggestions.value[selectedIndex.value])
  }
}

const handleEscape = () => {
  showSuggestions.value = false
  selectedIndex.value = -1
  searchInput.value?.blur()
}

const clearSearch = () => {
  searchQuery.value = ''
  searchStore.clearSearch()
  if (props.searchMode === 'locations') {
    searchStore.clearLocationSuggestions()
  }
  searchInput.value?.focus()
}

const toggleSearchMode = () => {
  const newMode = props.searchMode === 'walks' ? 'locations' : 'walks'
  emit('update:search-mode', newMode)
  clearSearch()
}

const { flyToLocation } = useMap()

const selectSuggestion = async (suggestion) => {
  if (props.searchMode === 'locations') {
    searchQuery.value = suggestion.place_name
    emit('location-selected', suggestion)
  } else {
    searchQuery.value = suggestion.walk_name || suggestion.title
    // Fly to walk location before emitting walk-selected
    if (suggestion.latitude && suggestion.longitude) {
      await flyToLocation({
        center: [Number(suggestion.longitude), Number(suggestion.latitude)],
        zoom: 14,
        pitch: 60,
        bearing: 30,
        duration: 2000,
        essential: true
      })
    }
    emit('walk-selected', suggestion)
  }
  showSuggestions.value = false
  selectedIndex.value = -1
}

const getSuggestionIcon = (suggestion) => {
  if (props.searchMode === 'locations') {
    return 'material-symbols:location-on'
  }
  return 'material-symbols:search'
}

const getSuggestionText = (suggestion) => {
  if (props.searchMode === 'locations') {
    return suggestion.place_name
  }
  return suggestion.walk_name || suggestion.title
}

const onTransitionComplete = () => {
  if (!showSuggestions.value) {
    selectedIndex.value = -1
  }
}

// Watch for search mode changes
watch(() => props.searchMode, (newMode) => {
  clearSearch()
  nextTick(() => {
    searchInput.value?.focus()
  })
})

// Add handleLocationSelected method
const handleLocationSelected = (location) => {
  if (!location?.center || !Array.isArray(location.center) || location.center.length !== 2) {
    console.error('Invalid location data:', location)
    searchStore.setError('Invalid location data received')
    return
  }

  try {
    const coords = {
      latitude: location.center[1],
      longitude: location.center[0],
      place_name: location.place_name || `${location.center[1]}, ${location.center[0]}`
    }

    // First, set the location in the store
    locationStore.setUserLocation(coords)

    // Then emit the event for parent components
    emit('location-selected', {
      ...location,
      latitude: coords.latitude,
      longitude: coords.longitude
    })
  } catch (error) {
    console.error('Error handling location selection:', error)
    searchStore.setError('Failed to process location')
  }
}

// Add location store
const locationStore = useLocationStore()

// Add computed properties for location results
const showLocationResults = computed(() => {
  return props.searchMode === 'locations' && locationStore.userLocation
})

// Update filteredResults computed to use nearbyWalks directly from locationStore
const nearbyWalks = computed(() => locationStore.nearbyWalks || [])

// Remove the text filtering from filteredResults since it's not needed for locations
const filteredResults = computed(() => {
  if (props.searchMode === 'walks') {
    return filteredWalks.value
  }
  return nearbyWalks.value
})

// Update resultCountText
const resultCountText = computed(() => {
  if (props.searchMode === 'locations') {
    if (!locationStore.userLocation) return 'Select a location to find nearby walks'
    const count = nearbyWalks.value.length
    if (count === 0) return 'No walks found nearby'
    return `${count} ${count === 1 ? 'walk' : 'walks'} within ${locationStore.formattedSearchRadius}`
  }
  return ''
})

// Add handler for walk selection
const handleWalkSelected = (walk) => {
  emit('walk-selected', walk)
}

// Add mounted hook to initialize suggestions
onMounted(() => {
  searchStore.clearLocationSuggestions()
})

// Add unmounted hook for cleanup
onBeforeUnmount(() => {
  searchStore.clearLocationSuggestions()
})

// Update suggestions dropdown styles
const suggestionDropdownStyle = computed(() => ({
  transform: showSuggestions.value ? 'translateY(0)' : 'translateY(-8px)',
  opacity: showSuggestions.value ? 1 : 0,
  visibility: showSuggestions.value ? 'visible' : 'hidden'
}))
</script>

<style>
.search-view {
  width: 100%;
  position: relative;
}

.search-container {
  position: relative;
  width: 100%;
  background: rgb(var(--md-sys-color-surface-container-high));
  border-radius: 28px;
  padding: 8px;
  box-shadow: var(--md-sys-elevation-1);
  transition: box-shadow 0.2s ease;
}

.search-container:hover {
  box-shadow: var(--md-sys-elevation-2);
}

.search-container:focus-within {
  box-shadow: var(--md-sys-elevation-2);
  background: rgb(var(--md-sys-color-surface-container-highest));
}

/* Location results styling */
.location-results {
  margin-top: 8px;
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-1);
}

.results-count {
  padding: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.875rem;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
}

/* Location info section */
.location-info {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgb(var(--md-sys-color-surface-container-low));
}

.selected-location {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 0.875rem;
}

.selected-location svg {
  color: rgb(var(--md-sys-color-primary));
  font-size: 20px;
}

.clear-location {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgb(var(--md-sys-color-surface-container));
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
}

.clear-location:hover {
  background: rgb(var(--md-sys-color-surface-container-high));
}

.clear-location svg {
  font-size: 20px;
}

/* Walk list container in location mode */
.walk-list-container.location-mode {
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 0 0 16px 16px;
}

/* Search filters */
.search-filters {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
  background: rgb(var(--md-sys-color-surface-container-low));
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.search-filters::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 0.875rem;
  border: 1px solid rgb(var(--md-sys-color-outline));
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-chip:hover {
  background: rgb(var(--md-sys-color-surface-container-highest));
  border-color: rgb(var(--md-sys-color-outline));
}

.filter-chip.active {
  background: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
  border-color: transparent;
}

.filter-chip svg {
  font-size: 18px;
}

/* Dropdown menu for filters */
.filter-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-2);
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
}

.filter-dropdown-item {
  padding: 12px 16px;
  color: rgb(var(--md-sys-color-on-surface));
  transition: background-color 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-dropdown-item:hover {
  background: rgb(var(--md-sys-color-surface-container-high));
}

.filter-dropdown-item.selected {
  color: rgb(var(--md-sys-color-primary));
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.filter-dropdown-item svg {
  font-size: 20px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.filter-dropdown-item.selected svg {
  opacity: 1;
}

/* Optimize suggestions dropdown animation */
.suggestions-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-2);
  z-index: 1000;
  transform-origin: top;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1),
              visibility 0s linear;
}

.animate-in {
  animation: slideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-out {
  animation: slideOut 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.suggestion-item:hover,
.suggestion-item.is-selected {
  background: rgb(var(--md-sys-color-surface-container-high));
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-title {
  display: block;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.875rem;
  text-align: center;
}
</style>
