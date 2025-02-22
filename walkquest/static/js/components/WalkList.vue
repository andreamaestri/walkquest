<template>
  <div class="walk-list-container" :class="{ 'is-compact': isCompact }" ref="listContainer">
    <div class="walks-section" :class="{ 'location-mode': searchStore.searchMode === 'locations' }">
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
                <template v-if="searchStore.searchMode === 'locations'" #meta>
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
        v-if="searchStore.searchMode === 'locations' && !locationStore.userLocation || (!filteredResults.length && !searchStore.error)" 
        class="empty-state"
        role="status"
      >
        <template v-if="searchStore.searchMode === 'locations'">
          <div v-if="locationStore.userLocation && !locationStore.nearbyWalks.length" class="empty-message">
            <Icon icon="mdi:map-marker-off" class="empty-icon" />
            <span>No walks found near this location</span>
          </div>
          <div v-else class="empty-message">
            <Icon icon="mdi:map-marker-search" class="empty-icon" />
            <span>Search for a location to find nearby walks</span>
          </div>
        </template>
        <template v-else>
          <div v-if="searchStore.searchQuery" class="empty-message">
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
import { computed, ref, nextTick, watch } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import { useMap } from '../composables/useMap'
import WalkCard from './WalkCard.vue'
import SearchView from './SearchView.vue'
import { useLocationStore } from '../stores/locationStore'
import { useSearchStore } from '../stores/searchStore'

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

const scroller = ref(null)
const searchStore = useSearchStore()
const locationStore = useLocationStore()
const { flyToLocation } = useMap()

const filteredResults = computed(() => {
  if (searchStore.searchMode === 'locations' && locationStore.userLocation) {
    return locationStore.nearbyWalks
  }
  
  const query = searchStore.searchQuery?.toLowerCase().trim()
  if (!query) return props.walks

  return props.walks.filter(walk => {
    const searchableText = [
      walk.walk_name,
      walk.title,
      walk.location,
      walk.description
    ].filter(Boolean).join(' ').toLowerCase()
    
    return searchableText.includes(query)
  })
})

const searchMode = ref('walks')

const handleLocationSelected = async (location) => {
  // Update search mode and location
  searchStore.setSearchMode('locations')
  await locationStore.setUserLocation(location)
  emit('location-selected', location)
}

const handleSearchModeChange = (mode) => {
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
}

const handleScrollerUpdate = () => {
  if (scroller.value?.updateSize) {
    nextTick(async () => {
      await scroller.value.updateSize()
    })
  }
}

const handleWalkSelection = async (walk) => {
  if (walk?.latitude && walk?.longitude) {
    await flyToLocation({
      center: [walk.longitude, walk.latitude],
      zoom: 14,
      pitch: 45
    })
  }
  emit('walk-selected', walk)
}

// Single watcher for filteredResults
watch(filteredResults, () => {
  nextTick(() => {
    handleScrollerUpdate()
  })
})

// Update the search mode watcher
watch(searchMode, (newMode) => {
  handleSearchModeChange(newMode)
})

// Add these computed properties after the existing ones
const showFilterStatus = computed(() => {
  return searchStore.searchQuery || hasFilters.value || maxDistance.value
})

const hasFilters = computed(() => {
  return searchStore.searchMode === 'locations' && locationStore.userLocation
})

const maxDistance = computed(() => {
  return searchStore.searchMode === 'locations' ? locationStore.searchRadius : null
})

const resultCountText = computed(() => {
  const count = filteredResults.value.length
  return `${count} ${count === 1 ? 'walk' : 'walks'} found`
})

// Add this helper method
const formatDistance = (distance) => {
  if (!distance) return ''
  return `${distance / 1000}km radius`
}

const clearFilters = () => {
  searchStore.clearSearch()
  locationStore.clearLocation()
}

// Add transition handling for search mode changes
watch(() => searchStore.searchMode, (newMode) => {
  // Reset scroll position when changing modes
  nextTick(() => {
    if (scroller.value?.$el) {
      scroller.value.$el.scrollTop = 0
    }
  })
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
  text-align: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
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