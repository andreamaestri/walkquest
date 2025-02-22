<template>
  <div class="search-view">
    <div class="search-container">
      <template v-if="props.searchMode === 'locations'">
        <LocationSearch 
          :key="`location-search-${props.searchMode}`"
          :mapbox-token="props.mapboxToken"
          :value="modelValue"
          :map-instance="mapInstance"
          @update:value="$emit('update:modelValue', $event)"
          @location-selected="handleLocationSelected"
          :initial-value="modelValue"
        />
      </template>
      <template v-else>
        <!-- Ensure walk search gets remounted too -->
        <div :key="`walk-search-${props.searchMode}`" 
             class="m3-search-field"
             :class="{ 
               'has-input': canClear
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
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-if="hasError" class="m3-search-error">
        {{ errorMessage }}
      </div>

      <!-- Location results with proper transition -->
      <Transition
        enter-active-class="m3-animate-in"
        leave-active-class="m3-animate-out"
        @after-leave="onTransitionComplete"
      >
        <div v-if="props.searchMode === 'locations' && showLocationResults && locationStore.hasSearched"
             class="m3-location-results">
          <div class="m3-results-count">
            {{ resultCountText }}
          </div>
          <WalkList 
            :key="`location-results-${nearbyWalks?.length}`"
            :walks="nearbyWalks"
            :is-compact="true"
            @walk-selected="handleWalkSelected"
          />
        </div>
      </Transition>

      <!-- Walk search results -->
      <Transition
        enter-active-class="m3-animate-in"
        leave-active-class="m3-animate-out"
        @after-leave="onTransitionComplete"
      >
        <div v-if="showSuggestions && isFocused && props.searchMode === 'walks'" 
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
          <!-- Only show empty state for walk search -->
          <div v-else-if="searchQuery && !isLoading && props.searchMode === 'walks'" 
               class="m3-empty-state">
            <div class="m3-suggestion-item">
              <Icon icon="material-symbols:search-off" />
              <span>No walks found</span>
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

// Add debounce helper at the top level
function debounce(fn, delay) {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(null, args), delay)
  }
}

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
  },
  modelValue: {
    type: String,
    default: ''
  }
})

// Add to emits
const emit = defineEmits(['update:search-mode', 'location-selected', 'walk-selected', 'update:modelValue'])

const searchStore = useSearchStore()
const walksStore = useWalksStore()
const searchInput = ref(null)
const selectedIndex = ref(-1)

// Update showSuggestions computed to exclude locations mode
const showSuggestions = computed(() => 
  props.searchMode === 'walks' && 
  searchQuery.value?.trim() && 
  isFocused.value
)

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

// Optimize suggestions computed to be more lightweight
const suggestions = computed(() => 
  props.searchMode === 'walks' ? searchStore.suggestions : []
)

const isLoading = computed(() => searchStore.isLoading)
const hasError = computed(() => !!searchStore.error)
const errorMessage = computed(() => searchStore.error)
const canClear = computed(() => searchQuery.value.length > 0)

// Create debounced input handler
const debouncedSetQuery = debounce((value) => {
  searchQuery.value = value
}, 150) // 150ms debounce

// Update handleInput to use debouncing
const handleInput = (event) => {
  const value = event.target.value || ''
  
  // Update UI immediately for responsiveness
  if (!value.trim()) {
    showSuggestions.value = false
    selectedIndex.value = -1
    searchStore.clearLocationSuggestions()
    searchQuery.value = ''
  } else if (!showSuggestions.value) {
    showSuggestions.value = true
  }
  
  // Debounce the actual search query update
  debouncedSetQuery(value)
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

const { flyToLocation, mapInstance } = useMap()

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

// Optimize suggestion text getter
const getSuggestionText = (suggestion) => 
  props.searchMode === 'locations' ? suggestion.place_name : suggestion.title

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
const handleLocationSelected = async (location) => {
  if (!location?.center || !Array.isArray(location.center) || location.center.length !== 2) {
    console.error('Invalid location data:', location)
    searchStore.setError('Invalid location data received')
    return
  }

  try {
    // Reset UI state
    showSuggestions.value = false
    isFocused.value = false

    const coords = {
      latitude: location.center[1],
      longitude: location.center[0],
      place_name: location.place_name || `${location.center[1]}, ${location.center[0]}`
    }

    // Set location in store
    locationStore.setUserLocation(coords)

    // Emit event
    emit('location-selected', {
      ...location,
      latitude: coords.latitude,
      longitude: coords.longitude
    })

    // Clear input and reset UI
    emit('update:modelValue', '')
    searchStore.clearLocationSuggestions()

  } catch (error) {
    console.error('Error handling location selection:', error)
    searchStore.setError('Failed to process location')
  }
}

// Add location store
const locationStore = useLocationStore()

// Add computed properties for location results
const showLocationResults = computed(() => 
  props.searchMode === 'locations' && 
  locationStore.userLocation &&
  locationStore.hasSearched // Add this condition
)

// Update filteredResults computed to use nearbyWalks directly from locationStore
const nearbyWalks = computed(() => locationStore.nearbyWalks || [])

// Update resultCountText
const resultCountText = computed(() => {
  if (!locationStore.userLocation) return 'Select a location to find nearby walks'
  const count = nearbyWalks.value.length
  if (count === 0) return 'No walks found nearby'
  return `${count} ${count === 1 ? 'walk' : 'walks'} within ${locationStore.formattedSearchRadius}`
})

// Add handler for walk selection
const handleWalkSelected = (walk) => {
  emit('walk-selected', walk)
}

// Simplify the mounted and unmounted hooks
onMounted(() => {
  searchStore.clearLocationSuggestions()
})

onBeforeUnmount(() => {
  searchStore.clearLocationSuggestions()
})

// Update suggestions dropdown styles to be simpler
const suggestionDropdownStyle = computed(() => ({
  display: showSuggestions.value ? 'block' : 'none'
}))

// Add a watcher to handle search mode changes
watch(
  () => props.searchMode,
  async (newMode, oldMode) => {
    if (newMode !== oldMode) {
      // Reset component state when switching modes
      isFocused.value = false;
      showSuggestions.value = false;
      
      // Clear input when switching to location search
      if (newMode === 'locations') {
        emit('update:modelValue', '');
      }
      
      // Wait for DOM update before focusing
      await nextTick();
      
      // Auto-focus the appropriate input
      const input = document.querySelector(
        newMode === 'locations' 
          ? '.location-search-input' 
          : '.walk-search-input'
      );
      if (input) {
        input.focus();
      }
    }
  }
);

// Add cleanup for component unmount
const cleanup = () => {
  isFocused.value = false;
  showSuggestions.value = false;
  emit('update:modelValue', '');
};

onBeforeUnmount(cleanup);

// Add initialization in onMounted
onMounted(async () => {
  // Initialize with stored search mode
  const savedMode = localStorage.getItem('searchMode')
  if (savedMode && ['walks', 'locations'].includes(savedMode)) {
    searchStore.setSearchMode(savedMode)
  }

  // If we're in location mode and have a saved location, restore it
  if (props.searchMode === 'locations' && locationStore.userLocation) {
    await nextTick()
    handleLocationResult(locationStore.userLocation)
  }
})

// Watch for search mode changes
watch(() => searchStore.searchMode, (newMode) => {
  localStorage.setItem('searchMode', newMode)
})

// Update the location result handling
const handleLocationResult = async (location) => {
  if (!location?.center || !Array.isArray(location.center)) {
    console.error('Invalid location data:', location)
    searchStore.setError('Invalid location data received')
    return
  }

  try {
    // Reset UI state
    showSuggestions.value = false
    isFocused.value = false

    const coords = {
      latitude: location.center[1],
      longitude: location.center[0],
      place_name: location.place_name || `${location.center[1]}, ${location.center[0]}`
    }

    // Set location in store first
    await locationStore.setUserLocation(coords)

    // Then emit event
    emit('location-selected', {
      ...location,
      latitude: coords.latitude,
      longitude: coords.longitude
    })

    // Reset UI
    emit('update:modelValue', '')
    searchStore.clearLocationSuggestions()

  } catch (error) {
    console.error('Error handling location selection:', error)
    searchStore.setError('Failed to process location')
  }
}

// Add view transition tracking
const isTransitioning = ref(false)

// Update search mode handling with better transitions
const handleSearchModeChange = async (newMode) => {
  isTransitioning.value = true
  searchStore.setError(null)
  
  try {
    await searchStore.setSearchMode(newMode)
    
    // Reset state when switching to location search
    if (newMode === 'locations') {
      emit('update:modelValue', '')
      showSuggestions.value = false
      selectedIndex.value = -1
      
      // If we have a saved location, restore it
      if (locationStore.hasLocation) {
        await nextTick()
        handleLocationResult(locationStore.userLocation)
      }
    }
  } finally {
    isTransitioning.value = false
  }
}

// Add initialization in onMounted
onMounted(async () => {
  // Initialize with stored search mode
  const savedMode = localStorage.getItem('searchMode')
  if (savedMode && ['walks', 'locations'].includes(savedMode)) {
    await handleSearchModeChange(savedMode)
  }
})

// Update search mode persistence
watch(() => searchStore.searchMode, (newMode) => {
  if (!isTransitioning.value) {
    localStorage.setItem('searchMode', newMode)
  }
})
</script>

<style>
/* Material Design 3 Search Field */
.m3-search-field {
  position: relative;
  width: 100%;
  height: 40px;
  border-radius: 20px;
  background: rgb(var(--md-sys-color-surface-container-low));
  transition: background 200ms cubic-bezier(0.2, 0, 0, 1);
}

.m3-search-field:hover {
  background: rgb(var(--md-sys-color-surface-container));
}

.m3-search-field.is-focused {
  background: rgb(var(--md-sys-color-surface-container));
}

.m3-search-field-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.m3-search-field-content {
  display: flex;
  align-items: center;
  padding: 0 4px 0 16px;
  gap: 8px;
  height: 100%;
}

.m3-search-field-icon {
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 20px;
  flex-shrink: 0;
  opacity: 0.65;
}

.m3-search-field-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  background: transparent;
  border: none;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
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
  gap: 4px;
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
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
  opacity: 0.65;
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
  margin-top: 4px;
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: none;
  z-index: 1000;
  border: 1px solid rgb(var(--md-sys-color-outline-variant) / 0.12);
}

.m3-suggestion-item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 48px;
  padding: 0 16px;
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
  padding: 12px 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  text-align: center;
  font-size: var(--md-sys-typescale-body-medium-size);
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
  margin-top: 8px;
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-1);
  border: 1px solid rgb(var(--md-sys-color-outline-variant) / 0.2);
}

.m3-results-count {
  padding: 12px 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: var(--md-sys-typescale-body-medium-size);
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
}
</style>
