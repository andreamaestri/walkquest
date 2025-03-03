<template>
  <div class="search-header-wrapper">
    <header 
      ref="searchHeader"
      class="py-2 w-full transition-all duration-300 ease-md3"
      :class="[
        isSearchActive ? 'bg-transparent' : 'bg-surface-variant',
        isSearchActive && uiStore.isMobile ? 'fixed inset-0 z-50 py-0' : ''
      ]"
    >
      <!-- Logo for mobile view -->
      <div v-if="uiStore.isMobile && !isSearchActive" class="mobile-header">
        <div class="logo-container">
          <Icon icon="mdi:hiking" class="logo-icon" />
          <span class="logo-text">WalkQuest</span>
        </div>
        <button @click="activateSearch" class="search-fab">
          <Icon icon="material-symbols:search" />
        </button>
      </div>

      <!-- Search bar for desktop or when search is active -->
      <div
        v-else
        class="search-wrapper transition-all duration-300 ease-md3 mx-auto"
        :class="[
          searchContainerClass,
          isSearchActive ? 'search-active' : '',
          isSearchActive && uiStore.isMobile ? 'h-full' : ''
        ]"
        @click="activateSearch"
      >
        <SearchView
          v-model="searchQuery"
          :search-mode="searchMode"
          :mapbox-token="mapboxToken"
          :is-active="isSearchActive"
          @location-selected="handleLocationSelected"
          @walk-selected="handleWalkSelection"
          @blur="deactivateSearch"
          @close="deactivateSearch"
          class="md3-search-bar px-4"
        />
      </div>
      
      <!-- Fullscreen backdrop when search is active -->
      <div 
        v-if="isSearchActive" 
        class="search-backdrop fixed inset-0 -z-10"
        @click="deactivateSearch"
      ></div>
    </header>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from "vue";
import { useUiStore } from "../../stores/ui";
import { useSearchStore } from "../../stores/searchStore";
import SearchView from "../SearchView.vue";
import { Icon } from '@iconify/vue';

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
const windowWidth = ref(window.innerWidth);
const isSearchActive = ref(false);

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
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', handleKeyDown);
});

const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isSearchActive.value) {
    deactivateSearch();
  }
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
    }
  }
};

const deactivateSearch = () => {
  if (isSearchActive.value) {
    // For mobile, add exit animation before actually closing
    if (uiStore.isMobile) {
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
}

.search-header-wrapper > * {
  pointer-events: auto;
}

/* Base container styles */
.search-container-expanded {
  width: min(720px, 70%);
  margin: 0 auto;
}

.search-container-collapsed {
  width: min(640px, 50%);
  margin: 0 auto;
}

/* Responsive width classes following MD3 container guidelines */
.search-container-small {
  width: calc(100% - 32px);
  margin: 0 auto;
}

.search-container-medium {
  width: min(640px, 70%);
  margin: 0 auto;
}

.search-container-large {
  width: min(720px, 60%);
  margin: 0 auto;
}

.search-container-xlarge {
  width: min(840px, 50%);
  margin: 0 auto;
}

.search-container-mobile {
  width: calc(100% - 16px);
  margin: 0 8px;
  max-width: 100%;
}

/* Modal styles when search is active */
.search-container-modal {
  width: min(840px, 80%);
  margin: 0 auto;
  border-radius: 28px;
  background-color: rgb(var(--md-sys-color-surface-container));
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
}

.search-wrapper.search-active {
  z-index: 10;
}

.search-backdrop {
  background-color: rgb(var(--md-sys-color-scrim) / 0.32);
  backdrop-filter: blur(2px);
  pointer-events: auto;
}

.bg-surface-variant {
  background-color: rgb(var(--md-sys-color-surface-variant));
}

.md3-search-bar {
  border-radius: 24px;
  height: 44px;
  overflow: visible;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-view-active {
  border-radius: 24px 24px 0 0;
  box-shadow: none;
}

/* MD3 motion ease */
.ease-md3 {
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
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
  padding: 4px 16px;
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
</style>