<template>
  <div class="mobile-walk-list-sheet">
    <BottomSheet 
      ref="bottomSheetRef"
      :snap-points="snapPoints"
      :default-snap-point="200"
      :blocking="false"
      :can-swipe-close="true"
      :expand-on-content-drag="false"
      @max-height="(n) => (maxHeight = n)"
      @opened="handleOpened"
      @closed="handleClosed"
    >
      <template #header>
        <div class="mobile-walk-list-header">
          <h2 class="header-title">{{ headerTitle }}</h2>
          <div class="header-actions">
            <!-- Show clear button when location search results are shown -->
            <button 
              v-if="shouldShowClearButton" 
              class="header-button clear-results-button" 
              @click="clearLocationResults" 
              aria-label="Clear search results"
            >
              <Icon icon="mdi:close" />
              <span class="button-text">Clear</span>
            </button>
            <button class="header-button" @click="openSearch" aria-label="Search walks">
              <Icon icon="mdi:magnify" />
            </button>
            <button class="header-button" @click="toggleFilters" aria-label="Filter walks">
              <Icon icon="mdi:filter-variant" />
            </button>
          </div>
        </div>
      </template>
      
      <!-- Enhanced empty state for nearby walks search -->
      <div v-if="showLocationEmptyState" class="empty-state-container">
        <div class="empty-state">
          <div class="empty-state-illustration">
            <Icon icon="mdi:map-search" class="empty-state-icon" />
            <div class="empty-state-pulse"></div>
          </div>
          <h3 class="empty-state-title">Find Walks Near You</h3>
          <p class="empty-state-description">
            Discover walking routes and trails in your area by searching for a location
          </p>
          <button @click="openSearch" class="empty-state-button">
            <Icon icon="mdi:map-marker" />
            <span>Search Locations</span>
          </button>
        </div>
      </div>
      
      <!-- Regular walk list when we have content to show -->
      <WalkList
        v-else
        :walks="walks"
        :selected-walk-id="selectedWalkId"
        :is-compact="true"
        @walk-selected="handleWalkSelected"
        class="walk-list-content"
      />
    </BottomSheet>

    <!-- Search Modal -->
    <Transition name="md3-modal">
      <div v-if="isSearchOpen" class="md3-search-modal" @click.self="closeSearch">
        <div class="md3-search-container">
          <div class="md3-search-header">
            <button class="md3-search-back" @click="closeSearch">
              <Icon icon="mdi:arrow-left" />
            </button>
            <div class="md3-search-input-container">
              <!-- Use LocationSearch component for nearby search mode -->
              <LocationSearch
                v-if="searchMode === 'locations'"
                :mapbox-token="mapboxToken"
                :map-instance="mapInstance"
                :is-active="true"
                ref="locationSearchRef"
                @location-selected="handleLocationSelected"
                @close="closeSearch"
              />
              <!-- Regular search input for other modes -->
              <template v-else>
                <input 
                  type="text" 
                  class="md3-search-input" 
                  :placeholder="searchPlaceholder"
                  v-model="searchQuery"
                  @keyup.enter="performSearch"
                  ref="searchInputRef"
                  autocomplete="off"
                />
                <button v-if="searchQuery" class="md3-search-clear" @click="clearSearch">
                  <Icon icon="mdi:close-circle" />
                </button>
              </template>
            </div>
          </div>
          <div class="md3-search-content">
            <!-- Search results will go here -->
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { useSearchStore } from '../stores/searchStore'
import { useLocationStore } from '../stores/locationStore'
import { useRouter } from 'vue-router'
import BottomSheet from '@douxcode/vue-spring-bottom-sheet'
import '@douxcode/vue-spring-bottom-sheet/dist/style.css'
import WalkList from './WalkList.vue'
import LocationSearch from './LocationSearch.vue'

const props = defineProps({
  walks: {
    type: Array,
    required: true
  },
  selectedWalkId: {
    type: [String, Number],
    default: null
  },
  mapboxToken: {
    type: String,
    required: true
  },
  mapInstance: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['walk-selected', 'location-selected'])

// Component refs
const bottomSheetRef = ref(null)
const searchInputRef = ref(null)
const locationSearchRef = ref(null)

// State management
const isOpen = ref(true)  
const isSearchOpen = ref(false)
const maxHeight = ref(window.innerHeight)
const showFilters = ref(false)
const searchQuery = ref('')

// Store initialization
const walksStore = useWalksStore()
const uiStore = useUiStore()
const searchStore = useSearchStore()
const locationStore = useLocationStore()
const router = useRouter()

// Get current search mode from store
const { searchMode } = storeToRefs(searchStore)

// Track whether we have location search results
const hasLocationResults = computed(() => {
  return locationStore.hasActiveLocationSearch;
})

// More direct check for whether to show the clear button
const shouldShowClearButton = computed(() => {
  return searchMode.value === 'locations' && 
         locationStore.nearbyWalks?.length > 0 && 
         locationStore.userLocation !== null;
})

// Check if we should show the location empty state
const showLocationEmptyState = computed(() => {
  // Show the empty state when:
  // 1. User is in locations search mode but has no results yet, OR
  // 2. User hasn't yet performed a location search (initial state)
  return searchMode.value === 'locations' && 
         (locationStore.nearbyWalks?.length === 0 || 
          (!locationStore.hasSearched && !locationStore.userLocation));
})

// Contextual header title based on search mode
const headerTitle = computed(() => {
  switch (searchMode.value) {
    case 'locations':
      return 'Nearby Walks'
    case 'categories':
      return 'Browse Categories'
    default:
      return 'Explore Walks'
  }
})

// Contextual search placeholder
const searchPlaceholder = computed(() => {
  switch (searchMode.value) {
    case 'locations':
      return 'Search for a location...'
    case 'categories':
      return 'Search for a category...'
    default:
      return 'Search for walks...'
  }
})

// Compute snap points based on max height
const snapPoints = computed(() => {
  const height = maxHeight.value
  return [
    Math.max(200, height / 4),      // Minimal view
    Math.max(300, height / 3),      // Small view
    Math.max(450, height / 2),      // Half view
    Math.max(600, height / 1.5),    // Large view
    Math.max(800, height / 1.2),    // Nearly full view
    height                          // Full height
  ]
})

// Window resize handler
const windowResizeHandler = debounce(() => {
  maxHeight.value = window.innerHeight;
  
  // Force recalculation of walk list items
  if (bottomSheetRef.value) {
    nextTick(() => {
      // Force a reflow of the whole sheet
      const sheetElement = bottomSheetRef.value.$el;
      if (sheetElement) {
        const height = sheetElement.offsetHeight;
        sheetElement.style.height = `${height - 0.1}px`;
        setTimeout(() => {
          sheetElement.style.height = '';
        }, 10);
      }
    });
  }
}, 100);

// Add debounce helper
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Event handlers for bottom sheet
function handleOpened() {
  console.log('Bottom sheet opened')
  isOpen.value = true

  // Force refresh of the scroller when bottom sheet is fully opened
  nextTick(() => {
    const walkListElement = document.querySelector('.walk-list-content');
    if (walkListElement) {
      const event = new CustomEvent('force-update-scroller');
      walkListElement.dispatchEvent(event);
    }
  });
}

function handleClosed() {
  console.log('Bottom sheet closed')
  isOpen.value = false
}

// Walk selection handler
function handleWalkSelected(walk) {
  emit('walk-selected', walk)
  if (bottomSheetRef.value) {
    bottomSheetRef.value.close()
  }
}

// Search functions
function openSearch() {
  // If we're showing the empty state and the user clicks search,
  // make sure we're in location search mode
  if (showLocationEmptyState.value) {
    searchStore.setSearchMode('locations');
  }
  
  isSearchOpen.value = true;
  
  // Focus the right input based on search mode
  setTimeout(() => {
    if (searchMode.value === 'locations' && locationSearchRef.value) {
      // LocationSearch component has its own focus handling
    } else if (searchInputRef.value) {
      searchInputRef.value.focus()
    }
  }, 300)
}

function closeSearch() {
  isSearchOpen.value = false
}

function clearSearch() {
  searchQuery.value = ''
  if (searchInputRef.value) {
    searchInputRef.value.focus()
  }
}

// Clear location search results
function clearLocationResults() {
  console.log("Clearing location results");
  // Reset the location search and update the UI
  locationStore.clearLocationSearch();
  searchStore.setSearchMode('default');
  
  // Reset the header title
  if (bottomSheetRef.value) {
    bottomSheetRef.value.open();
  }
}

// Handle location selection from the LocationSearch component
function handleLocationSelected(location) {
  if (!location) return
  
  // Close search modal after location selection
  closeSearch()
  
  // Forward location selection to parent
  emit('location-selected', location)
}

function performSearch() {
  if (!searchQuery.value.trim()) return
  
  // Handle different search types based on mode
  if (searchMode.value === 'categories') {
    // Search for categories
    searchStore.setSelectedCategory(searchQuery.value)
  } else {
    // Default walk search
    searchStore.performSearch(searchQuery.value)
  }
  
  // Close search modal after search
  closeSearch()
}

// Filter toggle
function toggleFilters() {
  showFilters.value = !showFilters.value
}

// Setup
onMounted(() => {
  console.log("MobileWalkList mounted, bottomSheetRef:", bottomSheetRef.value)
  
  // Add window resize listener
  window.addEventListener('resize', windowResizeHandler);
  
  // Force open the bottom sheet after it's mounted
  setTimeout(() => {
    if (bottomSheetRef.value) {
      console.log("Attempting to open bottom sheet")
      bottomSheetRef.value.open();
      
      // After sheet is opened, force update scroller
      setTimeout(() => {
        const walkListElement = document.querySelector('.walk-list-content');
        if (walkListElement) {
          const event = new CustomEvent('force-update-scroller');
          walkListElement.dispatchEvent(event);
        }
      }, 500);
    }
  }, 100);
});

// Clean up events on unmount
onBeforeUnmount(() => {
  window.removeEventListener('resize', windowResizeHandler);
});

// Watch for route changes
watch(() => router.currentRoute.value.name, (routeName) => {
  console.log("Route changed to:", routeName)
  if (routeName === 'home' && !props.selectedWalkId && bottomSheetRef.value) {
    console.log("Opening sheet due to home route")
    bottomSheetRef.value.open();
  }
})

// Watch for selected walk changes
watch(() => props.selectedWalkId, (newId) => {
  console.log("Selected walk ID changed:", newId)
  if (newId) {
    if (bottomSheetRef.value && isOpen.value) {
      console.log("Closing sheet due to walk selection")
      bottomSheetRef.value.close();
    }
  } else {
    if (router.currentRoute.value.name === 'home' && bottomSheetRef.value) {
      console.log("Opening sheet due to no walk selected")
      bottomSheetRef.value.open();
    }
  }
})

// Expose sheet control methods
defineExpose({
  openSheet() {
    console.log("openSheet called")
    if (bottomSheetRef.value) {
      bottomSheetRef.value.open()
    } else {
      console.warn("bottomSheetRef is not available")
    }
  },
  closeSheet() {
    console.log("closeSheet called")
    if (bottomSheetRef.value) {
      // Set the state first
      isOpen.value = false;
      
      // Use nextTick to ensure state changes are applied before attempting to close
      nextTick(() => {
        try {
          // Add additional null check to prevent error if ref becomes null
          if (bottomSheetRef.value) {
            bottomSheetRef.value.close()
          }
        } catch (err) {
          console.error("Error closing bottom sheet:", err);
        }
      })
    } else {
      console.warn("bottomSheetRef is not available")
    }
  }
})
</script>

<style>
.mobile-walk-list-sheet {
  --vsbs-backdrop-bg: rgba(0, 0, 0, 0.5);
  --vsbs-shadow-color: rgba(89, 89, 89, 0.2);
  --vsbs-background: rgb(var(--md-sys-color-surface));
  --vsbs-border-radius: 28px 28px 0 0;
  --vsbs-max-width: 100%;
  --vsbs-border-color: rgba(var(--md-sys-color-outline), 0.12);
  --vsbs-padding-x: 0px;
  --vsbs-handle-background: rgba(var(--md-sys-color-on-surface), 0.28);
}

/* Ensure bottom sheet accounts for safe areas */
.mobile-walk-list-sheet :deep([data-vsbs-sheet]) {
  min-height: 300px !important;
  height: auto !important;
  max-height: calc(100vh - var(--sab, 0px)) !important;
  padding-top: env(safe-area-inset-top, 0px);
}

.mobile-walk-list-sheet :deep([data-vsbs-content]) {
  min-height: 300px;
  height: 100% !important;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  padding-top: env(safe-area-inset-top, 0px);
  box-sizing: border-box;
}

.walk-list-bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  height: 100%;
}

.mobile-walk-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.12);
  height: 72px;
  flex-shrink: 0;
}

/* Fix the height calculation for content area */
[data-vsbs-content] {
  height: 100%!important;
  padding: 0!important;
  flex-direction: column;
  overflow: hidden; /* Add overflow hidden to prevent breaking layout */
}

/* Fix the WalkList container to take full height */
.walk-list-content {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative; /* Add position relative */
}

/* Ensure the scroller component takes remaining height */
.walk-list-container .vue-recycle-scroller {
  flex-grow: 1;
  height: auto !important;
  min-height: 0 !important;
  position: relative; /* Ensure position context */
}

/* Fix for vue-recycle-scroller item positioning */
.vue-recycle-scroller__item-wrapper {
  width: 100%; /* Ensure full width */
  position: relative !important; /* Force position relative */
}

.vue-recycle-scroller__item-view {
  position: absolute;
  width: 100%; /* Ensure full width */
  left: 0 !important; /* Force left alignment */
}

/* Ensure walk cards are properly contained */
.walk-card-wrapper {
  width: 100%;
  position: relative;
  overflow: visible; /* Allow content to be visible */
}

/* Additional fix for vsbs container */
[data-vsbs-content-wrapper] {
  height: 100%;
  overflow: hidden;
}

/* Keep the rest of your styles */
.header-title {
  font-size: 20px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
}

/* Style for the clear results button */
.clear-results-button {
  display: flex;
  align-items: center;
  gap: 4px;
  width: auto;
  padding: 0 12px;
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
  border-radius: 16px;
}

.clear-results-button .button-text {
  font-size: 14px;
  font-weight: 500;
}

.header-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
}

.clear-results-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.12);
}

.header-button:active {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.12);
}

/* Search modal styles */
.md3-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  overflow: hidden;
}

.md3-search-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgb(var(--md-sys-color-surface));
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

@media screen and (max-width: 768px) {
  .mapboxgl-ctrl-geocoder .suggestions {
    display: block;
    width: 150%;
    right: 0px;
    left: -60px !important;
    z-index: 10001;
  }
}
.md3-search-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.md3-search-header {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.12);
  height: 64px;
}

.md3-search-back {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgb(var(--md-sys-color-on-surface));
  margin-right: 8px;
}

.md3-search-input-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

/* Style for non-location search input */
.md3-search-input {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  padding: 0 16px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border: 1px solid rgba(var(--md-sys-color-outline), 0.12);
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 16px;
  outline: none;
}

/* Ensure LocationSearch component fits in the search container */
.md3-search-input-container .location-search {
  width: 100%;
}

.md3-search-clear {
  position: absolute;
  right: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.md3-search-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Transition animations */
.md3-modal-enter-active,
.md3-modal-leave-active {
  transition: opacity 0.3s ease;
}

.md3-modal-enter-from,
.md3-modal-leave-to {
  opacity: 0;
}

/* Empty state styles */
.empty-state-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.empty-state {
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-state-icon {
  font-size: 64px;
  color: rgba(var(--md-sys-color-on-surface-variant), 0.7);
  margin-bottom: 16px;
}

.empty-state-title {
  font-size: 20px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin-bottom: 8px;
}

.empty-state-description {
  font-size: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-bottom: 24px;
}

.empty-state-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 20px;
  background-color: #F7F2FA;
  color: rgb(var(--md-sys-color-on-primary));
  font-size: 16px;
  font-weight: 600; /* Increased font weight for better contrast */
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.empty-state-button:hover {
  background-color: rgb(var(--md-sys-color-primary-dark, var(--md-sys-color-primary)));
  color: rgb(var(--md-sys-color-on-primary));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
}

.empty-state-button:focus-visible {
  outline: 2px solid rgb(var(--md-sys-color-outline));
  outline-offset: 2px;
}

/* Improved virtual scroller styles */
.walk-list-container {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.vue-recycle-scroller {
  flex: 1 !important;
  height: auto !important;
  min-height: 0 !important;
  position: relative !important;
  will-change: transform;
}

.vue-recycle-scroller__item-wrapper {
  width: 100% !important; 
  transform: translateZ(0);
}

.vue-recycle-scroller__item-view {
  width: 100% !important;
  left: 0 !important;
  contain: layout;
}

/* Fix general layout issues */
[data-vsbs-content] {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  overflow: hidden !important;
}

.walk-list-content {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  min-height: 0 !important;
}

/* Force GPU acceleration for smoother scrolling */
.walk-list-container .scroller {
  -webkit-overflow-scrolling: touch;
  transform: translateZ(0);
  will-change: transform;
}

/* Ensure dynamic scroller items properly handle their position */
.dynamic-scroller-item {
  position: absolute !important;
  box-sizing: border-box;
  width: 100% !important;
  contain: content;
  will-change: transform;
}
</style>