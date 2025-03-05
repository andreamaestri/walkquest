<template>
  <div class="search-header-wrapper">
    <header 
      ref="searchHeader"
      class="w-full transition-all duration-300 ease-md3 py-2"
      :class="isSearchActive && uiStore.isMobile ? 'fixed inset-x-0 top-0 z-50 py-0' : 'bg-surface-variant'"
      :style="{ top: uiStore.isMobile ? 'var(--safe-area-top, 0px)' : '0' }"
    >
      <!-- Fixed logo header without search button -->
      <div v-if="uiStore.isMobile && !isSearchActive" class="mobile-header">
        <div class="logo-container">
          <Icon icon="mdi:hiking" class="logo-icon" />
          <span class="logo-text">WalkQuest</span>
        </div>
      </div>

      <!-- Search bar for desktop and active mobile search -->
      <div
        v-if="!uiStore.isMobile || isSearchActive"
        class="search-wrapper transition-all duration-300 ease-md3 mx-auto flex items-center"
        :class="[
          searchContainerClass,
          isSearchActive ? 'search-active' : '',
          isSearchActive && uiStore.isMobile ? 'h-full' : ''
        ]"
      >
        <SearchView
          ref="searchViewRef"
          v-model="searchQuery"
          :search-mode="searchMode"
          :mapbox-token="mapboxToken"
          :is-active="isSearchActive"
          @location-selected="handleLocationSelected"
          @walk-selected="handleWalkSelection"
          @blur="deactivateSearch"
          @close="deactivateSearch"
          class="md3-search-bar"
          :class="{ 'search-view-active': isSearchActive }"
        />
      </div>
      
      <!-- Fullscreen backdrop when search is active -->
      <div 
        v-if="isSearchActive" 
        class="search-backdrop fixed inset-0 -z-10"
        @click="deactivateSearch"
      ></div>
    </header>
    
    <!-- Mobile Bottom Sheet for search results 
         Using dynamic snap points for better UX: peek (200px), half (50% of screen), and fullscreen -->
    <BottomSheet 
      v-if="uiStore.isMobile && isSearchActive" 
      ref="mobileBottomSheet"
      :blocking="true"
      :can-swipe-close="true"
      :can-overlay-close="false"
      :expand-on-content-drag="true"
      :snap-points="[200, '50%', maxHeight]"
      :default-snap-point="'50%'"
      :safe-area-inset-bottom="true"
      @max-height="(height) => maxHeight.value = height"
      @opened="handleBottomSheetOpened"
      @closed="handleBottomSheetClosed"
      class="mobile-search-results-sheet"
    >
      <template #header>
        <div class="sheet-header">
          <div class="sheet-handle"></div>
          <h3 class="sheet-title">Search Results</h3>
        </div>
      </template>
      
      <!-- Map preview in the bottom sheet header when in peek state -->
      <div class="map-preview-container" v-if="bottomSheetHeight < 250">
        <div class="map-preview-placeholder">
          <div class="map-preview-gradient"></div>
        </div>
      </div>
      
      <!-- Pass the search view's mobile-results-container into the bottom sheet -->
      <div v-if="searchViewRef" class="sheet-content-wrapper">
        <slot name="results"></slot>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from "vue";
import { useUiStore } from "../../stores/ui";
import { useSearchStore } from "../../stores/searchStore";
import SearchView from "../SearchView.vue";
import { Icon } from '@iconify/vue';
import BottomSheet from '@douxcode/vue-spring-bottom-sheet';

/**
 * Props definition with proper validation
 */
const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  }
});

/**
 * Emits for component communication
 */
const emit = defineEmits(['location-selected', 'walk-selected']);

// Initialize stores
const uiStore = useUiStore();
const searchStore = useSearchStore();

// References for component state
const searchHeader = ref(null);
const mobileBottomSheet = ref(null);
const searchViewRef = ref(null);
const windowWidth = ref(window.innerWidth);
const isSearchActive = ref(false);
const maxHeight = ref(window.innerHeight - 60); // Reduced top offset to maximize available space
const bottomSheetHeight = ref(0); // Track the current height of the bottom sheet
const bottomSheetOpen = ref(false); // Control the bottom sheet open state

// Breakpoints following MD3 guidelines
const BREAKPOINTS = {
  SMALL: 600,    // 0-599px: Extra small - Full width search bar
  MEDIUM: 905,   // 600-904px: Small to medium - Wider search bar
  LARGE: 1240,   // 905-1239px: Medium to large - Balanced width
  XLARGE: 1440   // 1240px+: Extra-large - Constrained width to maintain readability
};

// Watch for window resize to update responsive sizing
onMounted(() => {
  window.addEventListener('resize', handleResize);
  document.addEventListener('keydown', handleKeyDown);
  
  // Initialize the maximum height on mount
  maxHeight.value = window.innerHeight - 60;
  
  // The maxHeight event will be handled via props in Vue 3
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', handleKeyDown);
});

const handleResize = () => {
  windowWidth.value = window.innerWidth;
  maxHeight.value = window.innerHeight - 60; // Update maxHeight on resize with smaller offset
};

const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isSearchActive.value) {
    // If bottom sheet is at max height, snap to peek position first
    if (mobileBottomSheet.value && uiStore.isMobile) {
      // Check if current height is near max height
      if (bottomSheetHeight.value > maxHeight.value * 0.8) {
        mobileBottomSheet.value.snapToPoint('50%'); // Step down to half-screen first
      } else if (bottomSheetHeight.value > maxHeight.value * 0.4) {
        mobileBottomSheet.value.snapToPoint(200); // Step down to peek view
      } else {
        deactivateSearch(); // Already at lowest snap point, close the search
      }
    } else {
      deactivateSearch();
    }
  }
};

// Add event handlers for bottom sheet
const handleBottomSheetOpened = () => {
  bottomSheetOpen.value = true;
};

const handleBottomSheetClosed = () => {
  bottomSheetOpen.value = false;
};

// Methods to handle search activation state
const activateSearch = () => {
  if (!isSearchActive.value) {
    isSearchActive.value = true;
    
    // Add a class to the body to prevent scrolling
    if (uiStore.isMobile) {
      document.body.classList.add('overflow-hidden');
      
      // Apply Material Design 3 motion transition for entering
      const searchContainer = document.querySelector('.search-wrapper');
      if (searchContainer) {
        searchContainer.style.animation = 'md3-slide-up 320ms var(--md-sys-motion-easing-emphasized, cubic-bezier(0.05, 0.7, 0.1, 1.0)) forwards';
      }
      
      // Open the bottom sheet after a slight delay to allow search view to open first
      setTimeout(() => {
        if (mobileBottomSheet.value) {
          mobileBottomSheet.value.open();
          mobileBottomSheet.value.snapToPoint('50%'); // Default to half-screen for better content visibility
          
          // Set up event listener to track sheet position changes
          mobileBottomSheet.value.$el.addEventListener('sheet-position-change', (event) => {
            bottomSheetHeight.value = event.detail.currentHeight;
          });
        }
      }, 200);
    }
  }
};

const deactivateSearch = () => {
  if (isSearchActive.value) {
    // For mobile, add exit animation before actually closing
    if (uiStore.isMobile) {
      // Close the bottom sheet first
      if (mobileBottomSheet.value) {
        // Remove any event listeners to prevent memory leaks
        if (mobileBottomSheet.value.$el) {
          mobileBottomSheet.value.$el.removeEventListener('sheet-position-change', () => {});
        }
        mobileBottomSheet.value.close();
        // Reset bottom sheet height
        bottomSheetHeight.value = 0;
      }
      
      const searchContainer = document.querySelector('.search-wrapper');
      if (searchContainer) {
        searchContainer.style.animation = 'md3-slide-down 280ms var(--md-sys-motion-easing-emphasized-accelerate, cubic-bezier(0.3, 0.0, 0.8, 0.15)) forwards';
        
        // Delay the actual closing to allow animation to complete
        setTimeout(() => {
          isSearchActive.value = false;
          document.body.classList.remove('overflow-hidden');
        }, 250);
        return;
      }
    }
    
    // Default behavior for non-mobile or if animation fails
    isSearchActive.value = false;
    if (uiStore.isMobile) {
      document.body.classList.remove('overflow-hidden');
    }
  }
};

// Computed properties
const searchQuery = computed({
  get: () => searchStore.searchQuery,
  set: (value) => searchStore.setSearchQuery(value)
});

const searchMode = computed(() => searchStore.searchMode);

/**
 * Computed property to determine if navigation rail should be shown
 * Combines multiple conditions for better readability
 */
const showNavigationRail = computed(() => {
  return !uiStore.isMobile && 
         uiStore.showSidebar && 
         !uiStore.fullscreen;
});

/**
 * Computed property for search container class based on layout state
 * Enhanced to respect Material Design 3 guidelines for search components
 */
const searchContainerClass = computed(() => {
  if (isSearchActive.value) {
    // When active, use different classes based on device size
    if (uiStore.isMobile || windowWidth.value < BREAKPOINTS.SMALL) {
      return 'search-container-modal-mobile';
    }
    return 'search-container-modal';
  }

  // For inactive state use the regular container classes
  if (uiStore.isMobile || windowWidth.value < BREAKPOINTS.SMALL) {
    return 'search-container-mobile';
  }
  
  // When nav rail is shown, adjust based on expansion state
  if (showNavigationRail.value) {
    return props.isExpanded 
      ? 'search-container-expanded' 
      : 'search-container-collapsed';
  }
  
  // When there's no sidebar, use responsive widths based on screen size
  if (windowWidth.value < BREAKPOINTS.MEDIUM) {
    return 'search-container-small';
  } else if (windowWidth.value < BREAKPOINTS.LARGE) {
    return 'search-container-medium'; 
  } else if (windowWidth.value < BREAKPOINTS.XLARGE) {
    return 'search-container-large';
  }
  
  return 'search-container-xlarge';
});

/**
 * Handle location selection
 * Emits event to parent component
 */
const handleLocationSelected = (location) => {
  try {
    // Ensure location exists before emitting
    if (location === null || location === undefined) {
      console.warn('Location selection event received with no location data');
      return;
    }
    emit('location-selected', location);
    deactivateSearch();
  } catch (error) {
    console.error('Error handling location selection in SearchHeader:', error);
  }
};

/**
 * Handle walk selection
 * Emits event to parent component
 */
const handleWalkSelection = (walk) => {
  emit('walk-selected', walk);
  deactivateSearch();
};
</script>

<style scoped>
.search-header-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  pointer-events: none;
  padding-top: var(--safe-area-top, 0px);
}

.search-header-wrapper > * {
  pointer-events: auto;
}

/* Base container styles */
.search-container-expanded {
  width: min(680px, 65%);
  margin: 0 auto;
}

.search-container-collapsed {
  width: min(600px, 45%);
  margin: 0 auto;
}

/* Responsive width classes following MD3 guidelines */
.search-container-small {
  width: calc(100% - 32px);
  margin: 0 auto;
}

.search-container-medium {
  width: min(600px, 65%);
  margin: 0 auto;
}

.search-container-large {
  width: min(680px, 55%);
  margin: 0 auto;
}

.search-container-xlarge {
  width: min(720px, 45%);
  margin: 0 auto;
}

.search-container-mobile {
  width: calc(100% - 16px);
  margin: 0 8px;
  max-width: 100%;
}

/* Modal styles when search is active */
.search-container-modal {
  width: min(720px, 70%);
  margin: 0 auto;
  border-radius: 28px;
  background-color: rgb(var(--md-sys-color-surface-container));
  padding: 4px 8px;
  box-shadow: var(--md-sys-elevation-0);
}

.search-container-modal-mobile {
  width: 100%;
  height: 100%;
  margin: 0;
  background-color: rgb(var(--md-sys-color-surface));
}

/* Active search mode styles */
.search-wrapper {
  position: relative;
  z-index: 1;
  min-height: 48px;
}

.search-wrapper.search-active {
  z-index: 10;
}

.search-backdrop {
  background-color: rgb(var(--md-sys-color-scrim) / 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: auto;
}

.bg-surface-variant {
  background-color: rgb(var(--md-sys-color-surface-variant));
}

.md3-search-bar {
  width: 100%;
  border-radius: 16px;
  height: 40px;
  overflow: visible;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 12px;
  background: rgb(var(--md-sys-color-surface-container-lowest));
  box-shadow: var(--md-sys-elevation-1);
}

.search-view-active {
  border-radius: 24px 24px 0 0;
  box-shadow: none;
}

/* MD3 motion ease */
.ease-md3 {
  transition-timing-function: var(--md-sys-motion-easing-standard);
}

/* Mobile mode adjustments */
@media (max-width: 599px) {
  .search-active {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .search-view-active {
    border-radius: 0;
    flex: 1;
  }
}

/* Mobile header with logo and search button */
.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  width: 100%;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
  color: rgb(var(--md-sys-color-primary));
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--md-sys-color-on-surface));
}

.search-fab {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border: none;
  box-shadow: var(--md-sys-elevation-1);
  color: rgb(var(--md-sys-color-on-surface));
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-fab:hover, .search-fab:focus {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  box-shadow: var(--md-sys-elevation-2);
}

.search-fab:active {
  transform: scale(0.95);
}

/* Material Design 3 motion animations for search transitions */
@keyframes md3-slide-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes md3-slide-down {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(24px);
  }
}
/* Bottom Sheet Styles */
.mobile-search-results-sheet {
  --vsbs-backdrop-bg: rgba(0, 0, 0, 0.4);
  --vsbs-shadow-color: rgba(0, 0, 0, 0.2);
  --vsbs-background: rgb(var(--md-sys-color-surface));
  --vsbs-border-radius: 28px 28px 0 0; /* More pronounced rounded corners */
  --vsbs-max-width: 100%;
  --vsbs-border-color: rgba(var(--md-sys-color-outline-variant), 0.08);
  --vsbs-padding-x: 0px; /* Remove horizontal padding to allow content to go edge-to-edge */
  --vsbs-handle-background: rgba(var(--md-sys-color-on-surface-variant), 0.28);
  --vsbs-handle-width: 40px; /* Wider handle for better touch target */
  --vsbs-safe-area-bottom: env(safe-area-inset-bottom, 0px); /* Respect safe area for bottom sheet */
}

.sheet-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  position: relative;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline-variant), 0.08);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--vsbs-handle-background);
  border-radius: 2px;
  margin-bottom: 12px;
}

.sheet-title {
  font-size: 16px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0;
}

.sheet-content-wrapper {
  padding: 0 0 24px 0;
  width: 100%;
  min-height: 200px;
}

/* Map preview container styles */
.map-preview-container {
  width: 100%;
  height: 120px;
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;
}

.map-preview-placeholder {
  width: 100%;
  height: 100%;
  background-color: rgb(var(--md-sys-color-surface-container-low));
  position: relative;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline-variant), 0.08);
}

.map-preview-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(
    to bottom,
    rgba(var(--md-sys-color-surface) / 0) 0%,
    rgba(var(--md-sys-color-surface) / 1) 100%
  );
}
</style>