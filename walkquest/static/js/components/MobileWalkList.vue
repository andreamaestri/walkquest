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
      class="walk-list-bottom-sheet"
    >
      <template #header>
        <div class="mobile-walk-list-header">
          <h2 class="header-title">{{ headerTitle }}</h2>
          <div class="header-actions">
            <button class="header-button" @click="openSearch" aria-label="Search walks">
              <Icon icon="mdi:magnify" />
            </button>
            <button class="header-button" @click="toggleFilters" aria-label="Filter walks">
              <Icon icon="mdi:filter-variant" />
            </button>
          </div>
        </div>
      </template>
      
      <WalkList
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
import { ref, computed, watch, onMounted } from 'vue'
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

// Event handlers for bottom sheet
function handleOpened() {
  console.log('Bottom sheet opened')
  isOpen.value = true
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
  isSearchOpen.value = true
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
  
  // Force open the bottom sheet after it's mounted
  setTimeout(() => {
    if (bottomSheetRef.value) {
      console.log("Attempting to open bottom sheet")
      bottomSheetRef.value.open()
    }
  }, 100)
})

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
      bottomSheetRef.value.close()
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
}

/* Fix the WalkList container to take full height */
.walk-list-content {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Ensure the scroller component takes remaining height */
.walk-list-container .vue-recycle-scroller {
  flex-grow: 1;
  height: auto !important;
  min-height: 0 !important;
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

.header-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
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
</style>