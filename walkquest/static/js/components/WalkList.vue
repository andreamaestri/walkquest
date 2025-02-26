<template>
  <div class="walk-list-container" :class="{ 'is-compact': isCompact }" ref="listContainer">
    <div class="walks-section" :class="{ 'location-mode': searchMode === 'locations' }">
      <DynamicScroller
        ref="scroller"
        class="scroller"
        :items="filteredResults"
        :min-item-size="isCompact ? 56 : 180"
        key-field="id"
        :buffer="500"
        :emit-update="true"
        @update="handleScrollerUpdate"
        role="list"
        aria-label="List of walks"
      >
        <template #default="{ item, index, active }">
          <DynamicScrollerItem
            :item="item"
            :active="active"
            :data-index="index"
            :size-dependencies="[
              item.walk_name,
              item.location,
              item.description,
              item.related_categories?.length,
              isCompact,
              selectedWalkId === item.id
            ]"
            :watch-data="false"
            :emit-resize="true"
            @resize="handleScrollerUpdate"
            role="listitem"
          >
            <div class="walk-card-wrapper">
              <WalkCard
                :walk="item"
                :is-compact="isCompact"
                :is-selected="selectedWalkId === item.id"
                @walk-selected="handleWalkSelection"
              >
                <template v-if="searchMode === 'locations'" #meta>
                  <div class="distance-badge" :title="'Distance from selected location'">
                    <Icon icon="mdi:map-marker-distance" />
                    {{ locationStore.getFormattedDistance(item.id) }}
                  </div>
                </template>
              </WalkCard>
            </div>
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>

      <div 
        v-if="searchMode === 'locations' && !userLocation || (!filteredResults.length && !searchError)" 
        class="empty-state"
        role="status"
      >
        <template v-if="searchMode === 'locations'">
          <div v-if="userLocation && !nearbyWalks.length" class="empty-message">
            <Icon icon="mdi:map-marker-off" class="empty-icon" />
            <span>No walks found near this location</span>
          </div>
          <div v-else class="empty-message">
            <Icon icon="mdi:map-marker-search" class="empty-icon" />
            <span>Search for a location to find nearby walks</span>
          </div>
        </template>
        <template v-else>
          <div v-if="searchQuery" class="empty-message">
            <Icon icon="mdi:magnify-close" class="empty-icon" />
            <span>No walks found matching your search</span>
          </div>
          <div v-else class="empty-message">
            <Icon icon="mdi:hiking" class="empty-icon" />
            <span>No walks available</span>
          </div>
        </template>
        <template x-if="walks.length === 0">
            <div class="empty-state">
                <div class="empty-state-icon">
                    <Icon icon="mdi:map-marker-off" />
                </div>
                <div class="empty-state-text">
                    No walks found
                </div>
                <p class="empty-state-suggestion">
                    Try adjusting your search or filters
                </p>
            </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import { useMap } from '../composables/useMap'
import WalkCard from './WalkCard.vue'
import SearchView from './SearchView.vue'
import { useLocationStore } from '../stores/locationStore'
import { useSearchStore } from '../stores/searchStore'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'

const props = defineProps({
  walks: {
    type: Array,
    required: true,
  },
  selectedWalkId: {
    type: [String, Number],
    default: null,
  },
  isCompact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['walk-selected', 'location-selected'])

// Use shallowRef for better performance with the scroller
const scroller = shallowRef(null)
const listContainer = shallowRef(null)

// Initialize stores with storeToRefs for reactivity
const searchStore = useSearchStore()
const locationStore = useLocationStore()
const { flyToLocation } = useMap()

// Extract reactive state from stores
const { searchQuery, searchMode, error: searchError } = storeToRefs(searchStore)
const { userLocation, nearbyWalks } = storeToRefs(locationStore)

// Use shallowRef to optimize large data structures
const filteredResults = shallowRef([])

// More efficient computation of filtered results
const updateFilteredResults = () => {
  let results = props.walks

  if (searchMode.value === 'locations' && userLocation.value) {
    filteredResults.value = nearbyWalks.value
    return
  }
  
  const query = searchQuery.value?.toLowerCase().trim()
  if (!query) {
    filteredResults.value = results
    return
  }

  filteredResults.value = results.filter(walk => {
    const searchableText = [
      walk.walk_name,
      walk.title,
      walk.location,
      walk.description
    ].filter(Boolean).join(' ').toLowerCase()
    
    return searchableText.includes(query)
  })
}

// Handle location selection with improved error handling
const handleLocationSelected = async (location) => {
  if (!location) {
    console.warn('Invalid location data received')
    return
  }
  
  try {
    // Update search mode and location
    searchStore.setSearchMode('locations')
    await locationStore.setUserLocation(location)
    emit('location-selected', location)
  } catch (error) {
    console.error('Error setting location:', error)
    searchStore.setError('Unable to process location')
  }
}

// Debounced search mode change for better UX
const handleSearchModeChange = debounce((mode) => {
  searchStore.setSearchMode(mode)
  // Clear any existing search when switching modes
  clearFilters()
  // Focus the search input after mode change
  nextTick(() => {
    const searchInput = document.querySelector('.search-input')
    if (searchInput) {
      searchInput.focus()
    }
  })
}, 150)

// Optimized scroller update with microtask timing
const handleScrollerUpdate = () => {
  if (!scroller.value?.updateSize) return
  
  // Use microtask for better performance than nextTick
  queueMicrotask(() => {
    scroller.value.updateSize()
  })
}

// Walk selection handler with improved error handling
const handleWalkSelection = async (walk) => {
  if (!walk) return
  emit('walk-selected', walk)
}

// Helper function for debounced operations
function debounce(fn, delay) {
  let timer
  return function(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

// Improved computed properties
const showFilterStatus = computed(() => {
  return searchQuery.value || hasFilters.value || maxDistance.value
})

const hasFilters = computed(() => {
  return searchMode.value === 'locations' && userLocation.value
})

const maxDistance = computed(() => {
  return searchMode.value === 'locations' ? locationStore.searchRadius : null
})

const resultCountText = computed(() => {
  const count = filteredResults.value.length
  return `${count} ${count === 1 ? 'walk' : 'walks'} found`
})

// Helper method
const formatDistance = (distance) => {
  if (!distance) return ''
  return `${distance / 1000}km radius`
}

const clearFilters = () => {
  searchStore.clearSearch()
  locationStore.clearLocation()
}

// Better lifecycle management

// Initialize components and state
onMounted(() => {
  // Initial filtered results
  updateFilteredResults()
  
  // Setup ResizeObserver for responsive updates
  const resizeObserver = new ResizeObserver(debounce(() => {
    handleScrollerUpdate()
  }, 100))
  
  if (listContainer.value) {
    resizeObserver.observe(listContainer.value)
  }
  
  // Clean up on unmount
  onBeforeUnmount(() => {
    resizeObserver.disconnect()
  })
})

// More efficient watchers

// Watch for changes to walks props
watch(() => props.walks, () => {
  updateFilteredResults()
  handleScrollerUpdate()
}, { immediate: true })

// Watch for query changes with debounce
watch(searchQuery, debounce(() => {
  updateFilteredResults()
  handleScrollerUpdate()
}, 100))

// Watch for search mode changes
watch(searchMode, (newMode) => {
  // Reset scroll position when changing modes
  updateFilteredResults()
  nextTick(() => {
    if (scroller.value?.$el) {
      scroller.value.$el.scrollTop = 0
      handleScrollerUpdate()
    }
  })
})

// Watch for location changes
watch(userLocation, () => {
  if (searchMode.value === 'locations') {
    updateFilteredResults()
    handleScrollerUpdate()
  }
})

// Watch for nearby walks changes
watch(nearbyWalks, () => {
  if (searchMode.value === 'locations') {
    updateFilteredResults()
    handleScrollerUpdate()
  }
})
</script>

<style scoped>
.walk-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.search-wrapper {
  flex-shrink: 0;
  padding: 8px;
  background: rgb(var(--md-sys-color-surface));
  z-index: 1;
}

.walks-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-height: 0;  /* Important for flex-child scrolling */
}

.walks-section.location-mode {
  height: 100%;
}

.scroller {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  padding: 0;
}

.walk-card-wrapper {
  padding: 4px 0;
}

.location-info {
  padding: 8px 16px;
  background: rgb(var(--md-sys-color-surface-container));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.selected-location {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 0.875rem;
}

.selected-location Icon {
  color: rgb(var(--md-sys-color-primary));
  font-size: 18px;
}

.clear-location {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 16px;
  background: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.clear-location:hover {
  background: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface));
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  height: 100%;
  min-height: 200px;
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 12px;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.error-message {
  padding: 16px;
  margin: 8px;
  background: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
  border-radius: 8px;
  font-size: 0.875rem;
}

.distance-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgb(var(--md-sys-color-primary));
  font-size: 0.875rem;
}

.distance-badge Icon {
  font-size: 16px;
}

/* Compact mode adjustments */
.walk-list-container.is-compact .walk-card-wrapper {
  padding: 2px 0;
}

.walk-list-container.is-compact .search-wrapper {
  padding: 4px;
}

/* Location mode adjustments */
.search-wrapper.location-mode {
  padding: 8px 16px;
}

.walks-section.location-mode {
  padding-top: 0;
}

.search-mode-enter-active,
.search-mode-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-mode-enter-from,
.search-mode-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.search-mode-enter-to,
.search-mode-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.filter-status {
  margin-top: 12px;
  padding: 8px 16px;
  border-radius: 16px;
  background: rgb(var(--md-sys-color-surface-container));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.location-mode .filter-status {
  background: rgb(var(--md-sys-color-surface));
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.875rem;
}

.clear-filters {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--md-sys-color-primary));
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.clear-filters:hover {
  background: rgb(var(--md-sys-color-primary) / 0.08);
}

.results-count {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.875rem;
}
</style>