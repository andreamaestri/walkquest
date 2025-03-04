<template>
  <BottomSheet 
    ref="bottomSheetRef"
    v-model="isOpen" 
    :snap-points="adjustedSnapPoints" 
    :default-snap-point="1"
    @max-height="handleMaxHeight" 
    :elevation="3" 
    :blocking="false"
    :can-swipe-close="false" 
    :duration="320" 
    :scrim-color="scrimColor" 
    class="mobile-walk-list-sheet" 
  >
    <template #header>
      <div class="mobile-walk-list-header">
        <h2 class="header-title">All Walks</h2>
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
    
    <!-- Walk list takes up the whole bottom sheet area -->
    <WalkList
      :walks="walks"
      :selected-walk-id="selectedWalkId"
      :is-compact="true"
      @walk-selected="handleWalkSelected"
    />
  </BottomSheet>

  <!-- Material Design 3 Search Modal -->
  <Transition name="md3-modal">
    <div v-if="isSearchOpen" class="md3-search-modal" @click.self="closeSearch">
      <div class="md3-search-modal-container" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <div class="md3-search-modal-header">
          <button class="md3-search-back-button" @click="closeSearch" aria-label="Close search">
            <Icon icon="mdi:arrow-left" />
          </button>
          <div class="md3-search-field-full">
            <div class="md3-search-icon-container">
              <Icon icon="mdi:magnify" class="md3-search-icon" />
            </div>
            <input 
              ref="searchInputRef"
              v-model="searchQuery" 
              type="search" 
              placeholder="Search walks..." 
              class="md3-search-input"
              @input="handleSearchInput"
            />
            <button 
              v-if="searchQuery" 
              @click="clearSearch" 
              class="md3-search-clear" 
              aria-label="Clear search"
            >
              <Icon icon="mdi:close" />
            </button>
          </div>
        </div>

        <div class="md3-search-results">
          <div v-if="storeIsSearching" class="md3-search-loading">
            <Icon icon="mdi:loading" class="md3-spinner" />
            <span>Searching...</span>
          </div>
          <div v-else-if="searchResults.length > 0" class="md3-search-results-list">
            <WalkList
              :walks="searchResults.slice(0, 20)"
              :selected-walk-id="selectedWalkId"
              :is-compact="true"
              @walk-selected="handleSearchResultSelect"
            />
          </div>
          <div v-else-if="searchQuery" class="md3-search-empty">
            <Icon icon="mdi:text-search" class="md3-empty-icon" />
            <span>No walks found matching "{{ searchQuery }}"</span>
          </div>
          <div v-else class="md3-search-prompt">
            <Icon icon="mdi:magnify" class="md3-empty-icon" />
            <span>Search for walks by name, location or features</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { useSearchStore } from '../stores/searchStore'
import { useRouter } from 'vue-router'
import BottomSheet from './BottomSheet.vue'
import WalkList from './WalkList.vue'

const props = defineProps({
  walks: {
    type: Array,
    required: true
  },
  selectedWalkId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['walk-selected'])

// Component refs
const bottomSheetRef = ref(null)
const searchInputRef = ref(null)

// State management
const isOpen = ref(true)  // Ensure the walk list stays open as default state
const maxHeight = ref(window.innerHeight)
const navHeight = 80  // Updated to match the bottom nav height
const showFilters = ref(false)
const isSearching = ref(false)

// Store initialization
const walksStore = useWalksStore()
const uiStore = useUiStore()
const searchStore = useSearchStore()
const router = useRouter()
const searchDebounceTimeout = ref(null)
const { searchQuery, searchResults, isLoading: storeIsSearching } = storeToRefs(searchStore)

// Material Design 3 scrim color with 0.32 opacity
const scrimColor = computed(() => 'rgba(0, 0, 0, 0.32)')

// Adjusted snap points for better usability
const adjustedSnapPoints = computed(() => {
  const height = maxHeight.value - navHeight
  return [
    Math.min(300, height / 2),     // Half expanded
    height - 20                    // Full height minus small margin
  ].sort((a, b) => a - b)
})

// Update max height when window resizes
function updateMaxHeight() {
  maxHeight.value = window.innerHeight
}

function handleMaxHeight(height) {
  maxHeight.value = height
}

// Walk selection handler - now immediately emits event and doesn't keep sheet open
function handleWalkSelected(walk) {
  emit('walk-selected', walk)
  
  // When a walk is selected, ensure the sheet is closed
  // The parent component will remove it from the DOM
}

// Search modal logic
function openSearch() {
  isSearchOpen.value = true
  // Focus the search input after transition
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function closeSearch() {
  isSearchOpen.value = false
  // Clear search when closing
  searchQuery.value = ''
  searchStore.clearSearch()
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  // Re-focus the input after clearing
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

// Filter toggle
function toggleFilters() {
  showFilters.value = !showFilters.value
}

// Implement debounced search 
function handleSearchInput() {
  // Reset any pending debounce
  clearTimeout(searchDebounceTimeout.value)
  
  if (!searchQuery.value.trim()) {
    searchStore.clearSearch()
    return
  }
  
  // Debounce the actual search
  searchDebounceTimeout.value = setTimeout(async () => {
    try {
      await searchStore.performSearch(searchQuery.value)
    } catch (error) {
      console.error('Search error:', error)
    }
  }, 200)
}

// Handle search result selection
function handleSearchResultSelect(walk) {
  emit('walk-selected', walk)
  closeSearch()
}

// Setup and teardown
onMounted(() => {
  window.addEventListener('resize', updateMaxHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMaxHeight)
  clearTimeout(searchDebounceTimeout.value)
})

// Watch for route changes to properly handle sheet visibility
watch(() => router.currentRoute.value.name, (routeName) => {
  // When route changes to home, ensure the sheet is open again
  if (routeName === 'home' && !props.selectedWalkId) {
    isOpen.value = true
  }
})

// Watch for selected walk changes
watch(() => props.selectedWalkId, (newId) => {
  // Ensure sheet is closed if a walk is selected
  if (newId) {
    isOpen.value = false
  } else {
    // If no walk is selected and we're on home route, open the sheet
    if (router.currentRoute.value.name === 'home') {
      isOpen.value = true
    }
  }
})
</script>

<style scoped>
.mobile-walk-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 16px;
}

.header-title {
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
  letter-spacing: 0.0125em;
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
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.header-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: currentColor;
  border-radius: inherit;
  opacity: 0;
  transform: scale(0);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.header-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
  color: rgb(var(--md-sys-color-on-surface));
}

.header-button:hover::before {
  opacity: 0.08;
  transform: scale(1);
}

.header-button:active {
  transform: scale(0.92);
}

/* Material Design 3 Search Modal */
.md3-search-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.32);
  z-index: 1200;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.md3-search-modal-container {
  background-color: rgb(var(--md-sys-color-surface));
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.md3-search-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
}

.md3-search-back-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 50%;
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
}

.md3-search-field-full {
  flex: 1;
  display: flex;
  align-items: center;
  height: 48px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-radius: 24px;
  padding: 0 16px;
}

.md3-search-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.md3-search-icon {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 22px;
}

.md3-search-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 1rem;
  outline: none;
}

.md3-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 50%;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
}

.md3-search-results {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom);
}

.md3-search-loading,
.md3-search-empty,
.md3-search-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  text-align: center;
  gap: 16px;
}

.md3-empty-icon,
.md3-spinner {
  font-size: 48px;
  opacity: 0.7;
}

.md3-spinner {
  animation: spin 1s infinite linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Bottom Sheet Styling */
.mobile-walk-list-sheet :deep(.bottom-sheet__container) {
  transition: transform var(--md-sys-motion-duration-medium2, 320ms) 
              var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1.0));
  border-radius: 28px 28px 0 0; /* Rounded top corners */
}

.mobile-walk-list-sheet :deep(.bottom-sheet__container--elevation-3) {
  box-shadow: var(--md-sys-elevation-3);
}

:deep(.bottom-sheet__content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.walk-list-container) {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
  background: rgb(var(--md-sys-color-surface));
}

.mobile-walk-list-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  pointer-events: auto !important;
}

:deep(.bottom-sheet__container) {
  pointer-events: auto !important;
  background: rgb(var(--md-sys-color-surface));
}

.mobile-walk-list-header {
  padding: 16px 16px 8px;
  background: rgb(var(--md-sys-color-surface));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
  position: sticky;
  top: 0;
  z-index: 1;
}

/* Modal transitions */
.md3-modal-enter-active,
.md3-modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.md3-modal-enter-from,
.md3-modal-leave-to {
  opacity: 0;
}

.md3-modal-enter-from .md3-search-modal-container {
  transform: translateY(20px);
}

.md3-modal-leave-to .md3-search-modal-container {
  transform: translateY(20px);
}
</style>
