<template>
  <div class="search-view" :class="{ 'search-view-expanded': isActive }">
    <div class="search-container">
      <template v-if="props.searchMode === 'locations'">
        <LocationSearch 
          :key="`location-search-${props.searchMode}`"
          :mapbox-token="props.mapboxToken"
          :value="modelValue"
          :map-instance="mapInstance"
          :is-active="isActive"
          @update:value="$emit('update:modelValue', $event)"
          @location-selected="handleLocationSelected"
          @blur="$emit('blur')"
          :initial-value="modelValue"
        />
      </template>
      <template v-else>
        <!-- Ensure walk search gets remounted too -->
        <div :key="`walk-search-${props.searchMode}`" 
             class="m3-search-field"
             :class="{ 
               'has-input': canClear,
               'is-active': isActive
             }"
             @click="handleContainerClick">
          <div class="m3-search-field-container">
            <div class="m3-search-field-content">
              <Icon icon="material-symbols:search" class="m3-search-field-icon" />
              <input
                ref="searchInput"
                v-model="searchQuery"
                class="m3-search-field-input"
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
              <div class="m3-search-field-actions">
                <div v-if="isLoading" class="m3-search-field-loading">
                  <Icon icon="eos-icons:loading" class="animate-spin" />
                </div>
                <button v-if="canClear" 
                        class="m3-search-field-clear" 
                        @click="clearSearch"
                        aria-label="Clear search">
                  <Icon icon="material-symbols:close" />
                </button>
                <button v-if="isActive"
                        class="m3-search-field-close"
                        @click.stop="closeSearch"
                        aria-label="Close search">
                  <Icon icon="material-symbols:arrow-back" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
      <!-- Location results with proper transition -->
      <Transition
        enter-active-class="m3-animate-in"
        leave-active-class="m3-animate-out"
        @after-leave="onTransitionComplete"
      >
        <div v-if="props.searchMode === 'locations' && showLocationResults && hasLocationSearched" class="m3-location-results">
          <div v-if="nearbyWalks && nearbyWalks.length > 0" class="m3-results-count">
            {{ resultCountText }}
          </div>
          <WalkList 
            v-if="nearbyWalks && nearbyWalks.length > 0"
            :key="`location-results-${nearbyWalks?.length}`"
            :walks="nearbyWalks"
            :is-compact="true"
            @walk-selected="handleWalkSelected"
          />
          <div v-else-if="!isLoading && hasLocationSearched" class="m3-empty-state">
            <Icon icon="material-symbols:location-off" class="m3-empty-icon" />
            <span>No walks found nearby</span>
          </div>
        </div>
      </Transition>
      <!-- Walk search results -->
      <Transition
        enter-active-class="m3-animate-in"
        leave-active-class="m3-animate-out"
        @after-leave="onTransitionComplete"
      >
        <div v-if="showSuggestions && (isFocused || isActive) && props.searchMode === 'walks'" 
             class="m3-suggestions-menu">
          <template v-if="suggestions?.length > 0">
            <button
              v-for="(suggestion, index) in suggestions"
              :key="suggestion.id || index"
              class="m3-suggestion-item"
              :class="{ 'is-selected': index === selectedIndex }"
              @mousedown.prevent="selectSuggestion(suggestion)"
              @mouseover="selectedIndex = index"
            >
              <Icon icon="material-symbols:location-on" class="m3-suggestion-icon" />
              <div class="m3-suggestion-content">
                <span class="m3-suggestion-text">{{ getSuggestionText(suggestion) }}</span>
              </div>
            </button>
          </template>
          <!-- Simplified empty state -->
          <div v-else-if="searchQuery && !isLoading" class="m3-empty-state">
            <Icon icon="material-symbols:search-off" class="m3-empty-icon" />
            <span>No walks found</span>
          </div>
        </div>
      </Transition>
    </div>

    <slot name="meta"></slot>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import LocationSearch from './LocationSearch.vue'
import WalkList from './WalkList.vue'
import { useLocationStore } from '../stores/locationStore'
import { useSearchStore } from '../stores/searchStore'
import { useWalksStore } from '../stores/walks'
import { formatDistance } from '../utils/distance'
import { useMap } from '../composables/useMap'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'

// Add walkStore reference to access searchRadius
import { useWalkStore } from '../stores/walkStore'

// Add debounce helper at the top level
function debounce(fn, delay) {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(null, args), delay)
  }
}

// Props including mapboxToken and isActive
const props = defineProps({
  searchMode: {
    type: String,
    default: 'walks',
    validator: (value) => ['walks', 'locations'].includes(value)
  },
  mapboxToken: {
    type: String,
    required: true
  },
  modelValue: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

// Add to emits
const emit = defineEmits(['update:search-mode', 'location-selected', 'walk-selected', 'update:modelValue', 'blur', 'close'])

// Initialize stores with storeToRefs for reactivity
const searchStore = useSearchStore()
const walksStore = useWalksStore()
const locationStore = useLocationStore()
const walkStore = useWalkStore() // Add walkStore initialization
const mapTools = useMap()
const { mapInstance } = mapTools

// Extract reactive state from stores
const { 
  searchQuery, 
  searchMode, 
  error: searchError, 
  isLoading: searchIsLoading, 
  suggestions: storeSuggestions 
} = storeToRefs(searchStore)

const { userLocation, nearbyWalks, hasSearched: hasLocationSearched } = storeToRefs(locationStore)

// Fix: Add a default fallback value for searchRadius using computed
const searchRadiusValue = computed(() => {
  // Access walkStore's searchRadius safely, with a fallback value of 10000 (10km)
  return walkStore.searchRadius || 10000
})

// References with appropriate performance optimization
const searchInput = shallowRef(null)
const selectedIndex = ref(-1)
const isFocused = ref(false) // Focus state management
const showSuggestions = ref(false)

// Update showSuggestions computed with correct reactive dependencies
const shouldShowSuggestions = computed(() => 
  props.searchMode === 'walks' && 
  searchQuery.value?.trim() && 
  (isFocused.value || props.isActive)
)

// Sync show suggestions with computed value
watch(shouldShowSuggestions, (value) => {
  showSuggestions.value = value
})

// Computed properties with reactivity
const searchModeIcon = computed(() => 
  props.searchMode === 'walks' ? 'material-symbols:search' : 'material-symbols:location-on'
)

const searchModeTitle = computed(() => 
  props.searchMode === 'walks' ? 'Switch to location search' : 'Switch to walk search'
)

const searchPlaceholder = computed(() => 
  props.searchMode === 'locations' ? 'Search for a location...' : 'Search walks...'
)

// Optimize suggestions computed with shallowRef
const suggestions = computed(() => 
  props.searchMode === 'walks' ? storeSuggestions.value : []
)

const isLoading = computed(() => searchIsLoading.value)
const hasError = computed(() => !!searchError.value)
const errorMessage = computed(() => searchError.value)
const canClear = computed(() => searchQuery.value.length > 0)

// Create debounced input handler with proper cancellation
const debouncedSetQuery = debounce((value) => {
  searchStore.setSearchQuery(value)
}, 150) // 150ms debounce

// Input handler calls with debounce cleanup
let inputDebounceTimer = null
const handleInput = (event) => {
  const value = event.target.value || ''
  
  // Update UI immediately for responsiveness
  if (!value.trim()) {
    showSuggestions.value = false
    selectedIndex.value = -1
    searchStore.clearLocationSuggestions()
    searchQuery.value = ''
    
    // Clear any pending debounce
    clearTimeout(inputDebounceTimer)
  } else if (!showSuggestions.value) {
    showSuggestions.value = true
  }
  
  // Debounce the actual search query update
  clearTimeout(inputDebounceTimer)
  inputDebounceTimer = setTimeout(() => {
    searchStore.setSearchQuery(value)
  }, 150)
}

// Update handleFocus with better focus management
const handleFocus = () => {
  isFocused.value = true
  
  // Show suggestions only if there's a query
  if (searchQuery.value?.trim()) {
    showSuggestions.value = true
  }
}

// Update handleBlur with debounced hide for better UX
const handleBlur = () => {
  setTimeout(() => {
    // Allow click events on suggestions to complete first
    isFocused.value = false
    showSuggestions.value = false
    
    // Emit blur event
    emit('blur')
  }, 150)
}

// Add new handler for container clicks
const handleContainerClick = () => {
  searchInput.value?.focus()
}

// Navigation handlers with boundary checks
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

// Handle enter with correct action
const handleEnter = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
    selectSuggestion(suggestions.value[selectedIndex.value])
  } else if (searchQuery.value?.trim()) {
    // Perform a search with current query
    searchStore.performSearch(searchQuery.value)
  }
}

// Better escape key handling
const handleEscape = () => {
  showSuggestions.value = false
  selectedIndex.value = -1
  searchInput.value?.blur()
}

// Clear search with proper store updates
const clearSearch = () => {
  // Clear all state in one go
  searchQuery.value = ''
  searchStore.clearSearch()
  searchStore.clearLocationSuggestions()
  showSuggestions.value = false
  selectedIndex.value = -1
  
  // Maintain focus for better UX
  nextTick(() => {
    searchInput.value?.focus()
  })
}

// Mode toggle with state cleanup
const toggleSearchMode = () => {
  const newMode = props.searchMode === 'walks' ? 'locations' : 'walks'
  
  // Update mode before clearing to ensure proper cleanup
  emit('update:search-mode', newMode)
  
  // Clean up previous mode state
  clearSearch()
}

// Suggestion selection with improved error handling
const selectSuggestion = async (suggestion) => {
  if (!suggestion) return
  
  try {
    if (props.searchMode === 'locations') {
      searchQuery.value = suggestion.place_name || ''
      emit('location-selected', suggestion)
    } else {
      // Update query to show selected walk
      searchQuery.value = suggestion.walk_name || suggestion.title || ''
      
      // Emit selection event without camera movement
      emit('walk-selected', suggestion)
    }
    
    // Reset UI state after selection
    showSuggestions.value = false
    selectedIndex.value = -1
    
    // Clear suggestions to prevent stale data
    searchStore.clearLocationSuggestions()
  } catch (error) {
    console.error('Error handling suggestion selection:', error)
    searchStore.setError('Failed to process selection')
  }
}

// Optimize suggestion text getter
const getSuggestionText = (suggestion) => {
  if (!suggestion) return ''
  return props.searchMode === 'locations' 
    ? suggestion.place_name || ''
    : suggestion.title || suggestion.walk_name || ''
}

// Clean up after transitions
const onTransitionComplete = () => {
  if (!showSuggestions.value) {
    selectedIndex.value = -1
  }
}

// Better location selection handler with error boundary
const handleLocationSelected = async (location) => {
  if (!location?.center || !Array.isArray(location.center) || location.center.length !== 2) {
    console.error('Invalid location data:', location)
    searchStore.setError('Invalid location data received')
    return
  }

  try {
    // Reset UI state first for better perceived performance
    showSuggestions.value = false
    isFocused.value = false

    // Prepare location data
    const coords = {
      latitude: location.center[1],
      longitude: location.center[0],
      place_name: location.place_name || `${location.center[1]}, ${location.center[0]}`
    }

    // Set location in store with await to catch errors
    await locationStore.setUserLocation(coords)

    // Emit event with complete location data
    emit('location-selected', {
      ...location,
      latitude: coords.latitude,
      longitude: coords.longitude
    })

    // Clear input and reset UI only on success
    emit('update:modelValue', coords.place_name || '')
    searchStore.clearLocationSuggestions()

  } catch (error) {
    console.error('Error handling location selection:', error)
    searchStore.setError('Failed to process location')
  }
}

// Walk selection handler with proper error handling
const handleWalkSelected = (walk) => {
  if (!walk) return
  
  try {
    // Close suggestions when a walk is selected
    showSuggestions.value = false
    selectedIndex.value = -1
    
    // Emit selection event
    emit('walk-selected', walk)
  } catch (error) {
    console.error('Error handling walk selection:', error)
  }
}

// Add computed for location results visibility
const showLocationResults = computed(() => 
  props.searchMode === 'locations' && 
  userLocation.value &&
  hasLocationSearched.value
)

// resultCountText with more detailed information
const resultCountText = computed(() => {
  if (!userLocation.value) return 'Select a location to find nearby walks'
  
  const count = nearbyWalks.value?.length || 0
  if (count === 0) return 'No walks found nearby'
  
  // Fix: Use the safe computed value instead of directly accessing potentially undefined ref
  const radius = formatDistance(searchRadiusValue.value)
  return `${count} ${count === 1 ? 'walk' : 'walks'} within ${radius}`
})

// Enhanced lifecycle hooks

// Setup component on mount
onMounted(() => {
  // Clear any stale suggestions
  searchStore.clearLocationSuggestions()
  
  // Initialize with stored search mode if available
  const savedMode = localStorage.getItem('searchMode')
  if (savedMode && ['walks', 'locations'].includes(savedMode)) {
    searchStore.setSearchMode(savedMode)
  }
  
  // Focus search input on mobile devices only when not in a map view
  const isMobileView = window.innerWidth < 768
  if (isMobileView && !document.querySelector('.mapboxgl-map')) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
  
  // Restore location if we're in location mode
  if (props.searchMode === 'locations' && userLocation.value) {
    try {
      // Create a properly formatted location object for handleLocationResult
      if (userLocation.value?.latitude && userLocation.value?.longitude) {
        handleLocationResult({
          center: [userLocation.value.longitude, userLocation.value.latitude],
          place_name: userLocation.value.place_name || ''
        })
      }
    } catch (error) {
      console.error('Error restoring location:', error)
    }
  }
})

// Clean up on unmount
onBeforeUnmount(() => {
  // Cancel any pending debounced operations
  clearTimeout(inputDebounceTimer)
  
  // Clear suggestions to prevent memory leaks
  searchStore.clearLocationSuggestions()
})

// Better watchers for search mode changes
watch(
  () => props.searchMode,
  async (newMode, oldMode) => {
    if (newMode !== oldMode) {
      // Reset component state when switching modes
      isFocused.value = false
      showSuggestions.value = false
      selectedIndex.value = -1
      
      // Clear input when switching to location search
      if (newMode === 'locations') {
        emit('update:modelValue', '')
        
        // If we have a stored location, restore its display
        if (userLocation.value) {
          nextTick(() => {
            // Create a properly formatted location object for handleLocationResult
            handleLocationResult({
              center: [userLocation.value.longitude, userLocation.value.latitude],
              place_name: userLocation.value.place_name || ''
            })
          })
        }
      }
      
      // Wait for DOM update before focusing
      await nextTick()
      
      // Auto-focus the appropriate input
      const input = newMode === 'locations'
        ? document.querySelector('.location-search-input')
        : searchInput.value
        
      if (input) {
        input.focus()
      }
    }
  }
)

// Store search mode for persistence
watch(
  () => searchStore.searchMode,
  (newMode) => {
    if (['walks', 'locations'].includes(newMode)) {
      localStorage.setItem('searchMode', newMode)
    }
  }
)

// Helper for location result handling
const handleLocationResult = (location) => {
  if (!location?.center || !Array.isArray(location.center)) {
    console.warn('Invalid location format in handleLocationResult:', JSON.stringify(location))
    return
  }

  try {
    // Reformat for consistency
    const formattedLocation = {
      center: location.center,
      place_name: location.place_name || userLocation.value?.place_name || '',
      latitude: location.center[1],
      longitude: location.center[0]
    }

    // Update UI with location name
    emit('update:modelValue', formattedLocation.place_name)
    
    // Emit location selected event
    emit('location-selected', formattedLocation)
  } catch (error) {
    console.error('Error in handleLocationResult:', error)
  }
}

// Add method to close search and emit close event
const closeSearch = () => {
  // Clear UI state
  showSuggestions.value = false
  selectedIndex.value = -1
  isFocused.value = false
  
  // Emit close event for parent component
  emit('close')
}
</script>

<style>
.search-view {
  width: 100%;
  position: relative;
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.search-view-expanded {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  /* In mobile fullscreen mode, apply Material Design 3 search modal styles */
  @media (max-width: 599px) {
    background-color: rgb(var(--md-sys-color-surface));
    padding: 8px 16px;
  }
}

.search-container {
  width: 100%;
  position: relative;
}

/* Material Design 3 Search Field */
.m3-search-field {
  height: 44px; /* More compact height */
  border-radius: 24px;
  background: rgb(var(--md-sys-color-surface-container-low));
  transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
}

/* Active state styling */
.m3-search-field.is-active {
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 24px;
}

.m3-search-field:hover {
  background: rgb(var(--md-sys-color-surface-container));
}

.m3-search-field.is-focused {
  background: rgb(var(--md-sys-color-surface-container));
}

.m3-search-field-container {
  position: relative;
  background: none;
  width: 100%;
  height: 100%;
}

.m3-search-field-content {
  display: flex;
  align-items: center;
  padding: 0 4px 0 12px; /* Reduced left padding */
  background: none;
  gap: 6px; /* Reduced gap */
  height: 100%;
}

.m3-search-field-icon {
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 18px; /* Slightly smaller icon */
  flex-shrink: 0;
  opacity: 0.65;
}

.m3-search-field-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px 0 0; /* Adjusted padding */
  background: transparent;
  border: none;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: 14px; /* Slightly smaller text */
  line-height: var(--md-sys-typescale-body-large-line-height);
  font-weight: var(--md-sys-typescale-body-large-weight);
  letter-spacing: var(--md-sys-typescale-body-large-tracking);
}

.m3-search-field-input::placeholder {
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.m3-search-field-input:focus {
  outline: none;
}

.m3-search-field-actions {
  display: flex;
  align-items: center;
  gap: 2px; /* Reduced gap between actions */
  padding-right: 8px;
}

.m3-search-field-loading {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 20px;
  opacity: 0.65;
}

.m3-search-field-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; /* Slightly smaller buttons */
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
  opacity: 0.75;
  transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
}

.m3-search-field-clear:hover {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.08);
  opacity: 0.85;
}

.m3-search-field-clear:active {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.12);
  opacity: 1;
}

/* Remove the active indicator since it's not used in MD3 search bars */
.m3-search-field-active-indicator {
  display: none;
}

/* Error state */
.m3-search-field.is-error {
  background: rgb(var(--md-sys-color-error-container) / 0.08);
}

.m3-search-error {
  margin-top: 4px;
  padding: 0 16px;
  color: rgb(var(--md-sys-color-error));
  font-size: var(--md-sys-typescale-body-small-size);
}

/* Suggestions Menu - Updated to match MD3 menu styling */
.m3-suggestions-menu {
  position: absolute;
  left: 0;
  right: 0;
  margin-top: 2px; /* Reduced gap */
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-0);
  z-index: 1000;
  border: 1px solid rgb(var(--md-sys-color-outline-variant) / 0.12);
}

.m3-suggestion-item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px; /* More compact suggestions */
  padding: 0 12px;
  gap: 12px;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: var(--md-sys-typescale-body-large-font);
  text-align: left;
  cursor: pointer;
  transition: background 200ms cubic-bezier(0.2, 0, 0, 1);
}

.m3-suggestion-item:hover,
.m3-suggestion-item.is-selected {
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.m3-suggestion-icon {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 20px;
  opacity: 0.65;
}

.m3-suggestion-content {
  flex: 1;
  min-width: 0;
}

.m3-suggestion-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--md-sys-typescale-body-large-size);
}

.m3-empty-state {
  padding: 16px;
  gap: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
  text-align: center;
  font-size: var(--md-sys-typescale-body-medium-size);
}

.m3-empty-icon {
  font-size: 48px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Animations */
.m3-animate-in {
  animation: m3-slide-in 100ms cubic-bezier(0.2, 0, 0, 1);
}

.m3-animate-out {
  animation: m3-slide-out 100ms cubic-bezier(0.2, 0, 0, 1);
}

@keyframes m3-slide-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes m3-slide-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-4px);
  }
}

/* Location Results */
.m3-location-results {
  margin-top: 4px; /* Reduced margin */
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-0);
  border: 1px solid rgb(var(--md-sys-color-outline-variant) / 0.2);
}

.m3-results-count {
  padding: 12px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: var(--md-sys-typescale-body-medium-size);
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
}

.m3-search-field-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; /* Slightly smaller buttons */
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 18px;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
  opacity: 0.75;
  transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
  margin-left: 4px;
}

.m3-search-field-close:hover {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.08);
  opacity: 0.85;
}

.m3-search-field-close:active {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.12);
  opacity: 1;
}
</style>
