<template>
  <div class="search-header-wrapper">
    <header 
      ref="searchHeader"
      class="w-full transition-all duration-300 ease-md3 py-2"
      :class="isSearchActive && uiStore.isMobile ? 'fixed inset-x-0 top-0 z-50 py-0' : 'bg-surface-variant'"
      :style="{ top: uiStore.isMobile ? 'var(--safe-area-top, 0px)' : '0' }"
    >

      <!-- Search bar for desktop and active mobile search -->
      <div
        v-if="!uiStore.isMobile || isSearchActive"
        class="search-wrapper transition-all duration-300 ease-md3 mx-auto flex items-center"
        :class="[
          searchContainerClass + ' search-container',
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
          class="md3-search-bar flex-1"
          :class="{ 'search-view-active': isSearchActive }"
        />
        
        <!-- Account Circle as trailing icon in search bar for desktop layout -->
        <AccountCircle
          v-if="!uiStore.isMobile && !isSearchActive"
          :is-active="accountActive"
          @click="handleAccountClick"
          class="desktop-avatar"
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
    
    <!-- Account Circle as standalone icon for mobile layout -->
    <AccountCircle
      v-if="uiStore.isMobile"
      :is-active="accountActive"
      @click="handleAccountClick"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from "vue";
import { useUiStore } from "../../stores/ui";
import { useSearchStore } from "../../stores/searchStore";
import SearchView from "../SearchView.vue";
import AccountCircle from "../shared/AccountCircle.vue";
import { Icon } from '@iconify/vue';
import BottomSheet from '@douxcode/vue-spring-bottom-sheet';

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

const emit = defineEmits(['location-selected', 'walk-selected', 'account-click']);

const uiStore = useUiStore();
const searchStore = useSearchStore();

const searchHeader = ref(null);
const mobileBottomSheet = ref(null);
const searchViewRef = ref(null);
const windowWidth = ref(window.innerWidth);
const isSearchActive = ref(false);
const accountActive = ref(false);
const maxHeight = ref(window.innerHeight - 60);
const bottomSheetHeight = ref(0);
const bottomSheetOpen = ref(false);

const BREAKPOINTS = {
  SMALL: 600,
  MEDIUM: 905,
  LARGE: 1240,
  XLARGE: 1440
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  document.addEventListener('keydown', handleKeyDown);
  maxHeight.value = window.innerHeight - 60;
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', handleKeyDown);
});

const handleResize = () => {
  windowWidth.value = window.innerWidth;
  maxHeight.value = window.innerHeight - 60;
};

const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isSearchActive.value) {
    if (mobileBottomSheet.value && uiStore.isMobile) {
      if (bottomSheetHeight.value > maxHeight.value * 0.8) {
        mobileBottomSheet.value.snapToPoint('50%');
      } else if (bottomSheetHeight.value > maxHeight.value * 0.4) {
        mobileBottomSheet.value.snapToPoint(200);
      } else {
        deactivateSearch();
      }
    } else {
      deactivateSearch();
    }
  }
};

const handleAccountClick = (event) => {
  accountActive.value = !accountActive.value;
  emit('account-click', event);
};

const handleBottomSheetOpened = () => {
  bottomSheetOpen.value = true;
};

const handleBottomSheetClosed = () => {
  bottomSheetOpen.value = false;
};

const activateSearch = () => {
  if (!isSearchActive.value) {
    isSearchActive.value = true;
    if (uiStore.isMobile) {
      document.body.classList.add('overflow-hidden');
      const searchContainer = document.querySelector('.search-wrapper');
      if (searchContainer) {
        searchContainer.style.animation = 'md3-slide-up 320ms var(--md-sys-motion-easing-emphasized, cubic-bezier(0.05, 0.7, 0.1, 1.0)) forwards';
      }
      setTimeout(() => {
        if (mobileBottomSheet.value) {
          mobileBottomSheet.value.open();
          mobileBottomSheet.value.snapToPoint('50%');
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
    if (uiStore.isMobile) {
      if (mobileBottomSheet.value) {
        if (mobileBottomSheet.value.$el) {
          mobileBottomSheet.value.$el.removeEventListener('sheet-position-change', () => {});
        }
        mobileBottomSheet.value.close();
        bottomSheetHeight.value = 0;
      }
      
      const searchContainer = document.querySelector('.search-wrapper');
      if (searchContainer) {
        searchContainer.style.animation = 'md3-slide-down 280ms var(--md-sys-motion-easing-emphasized-accelerate, cubic-bezier(0.3, 0.0, 0.8, 0.15)) forwards';
        setTimeout(() => {
          isSearchActive.value = false;
          document.body.classList.remove('overflow-hidden');
        }, 250);
        return;
      }
    }
    
    isSearchActive.value = false;
    if (uiStore.isMobile) {
      document.body.classList.remove('overflow-hidden');
    }
  }
};

const searchQuery = computed({
  get: () => searchStore.searchQuery,
  set: (value) => searchStore.setSearchQuery(value)
});

const searchMode = computed(() => searchStore.searchMode);

const showNavigationRail = computed(() => {
  return !uiStore.isMobile && 
         uiStore.showSidebar && 
         !uiStore.fullscreen;
});

const searchContainerClass = computed(() => {
  if (isSearchActive.value) {
    if (uiStore.isMobile || windowWidth.value < BREAKPOINTS.SMALL) {
      return 'search-container-modal-mobile';
    }
    return 'search-container-modal';
  }

  if (uiStore.isMobile || windowWidth.value < BREAKPOINTS.SMALL) {
    return 'search-container-mobile';
  }
  
  if (showNavigationRail.value) {
    return props.isExpanded 
      ? 'search-container-expanded' 
      : 'search-container-collapsed';
  }
  
  if (windowWidth.value < BREAKPOINTS.MEDIUM) {
    return 'search-container-small';
  } else if (windowWidth.value < BREAKPOINTS.LARGE) {
    return 'search-container-medium'; 
  } else if (windowWidth.value < BREAKPOINTS.XLARGE) {
    return 'search-container-large';
  }
  
  return 'search-container-xlarge';
});

const handleLocationSelected = (location) => {
  try {
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

const handleWalkSelection = (walk) => {
  emit('walk-selected', walk);
  deactivateSearch();
};

defineExpose({
  activateSearch
});
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

.search-header-wrapper > header {
  pointer-events: none;
}

.search-header-wrapper > header .search-wrapper,
.search-header-wrapper > header .search-fab {
  pointer-events: auto;
}

/* Base and responsive container styles */
.search-container-expanded { width: clamp(360px, 55%, 720px); margin: 0 auto; }
.search-container-collapsed { width: clamp(360px, 35%, 720px); margin: 0 auto; }
.search-container-small { width: clamp(360px, calc(100% - 48px), 720px); margin: 0 auto; }
.search-container-medium { width: clamp(360px, 55%, 720px); margin: 0 auto; }
.search-container-large { width: clamp(360px, 45%, 720px); margin: 0 auto; }
.search-container-xlarge { width: clamp(360px, 35%, 720px); margin: 0 auto; }
.search-container-mobile { width: calc(100% - 24px); margin: 0 12px; max-width: 720px; min-width: 360px; }

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
  height: calc(100% - env(safe-area-inset-top, 0px));
  margin: 0;
  background-color: rgb(var(--md-sys-color-surface));
  padding-top: env(safe-area-inset-top, 0px);
}

/* Search container to accommodate account circle */
.search-container {
  position: relative;
  padding-right: 0%;
}

/* Active search mode styles */
.search-wrapper {
  position: relative;
  z-index: 1;
  min-height: 56px;
  display: flex;
  align-items: center;
  border-radius: 28px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

.search-wrapper.search-active {
  z-index: 10;
}

.search-wrapper:not(.search-active) {
  pointer-events: none;
}

.search-wrapper:not(.search-active) .md3-search-bar,
.search-wrapper:not(.search-active) .desktop-avatar {
  pointer-events: auto;
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

/* Position avatar as trailing icon in desktop search bar */
.desktop-avatar {
  position: absolute;
  right: 16px;
  left: auto;
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  z-index: 3;
  margin-left: 8px;
  pointer-events: auto;
}

.search-view-active {
  border-radius: 28px 28px 0 0;
  box-shadow: none;
}

.ease-md3 {
  transition-timing-function: var(--md-sys-motion-easing-standard);
}

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

.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  width: 100%;
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

.search-fab:hover,
.search-fab:focus {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  box-shadow: var(--md-sys-elevation-2);
}

.search-fab:active {
  transform: scale(0.95);
}

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

.mobile-search-results-sheet {
  --vsbs-backdrop-bg: rgba(0, 0, 0, 0.4);
  --vsbs-shadow-color: rgba(0, 0, 0, 0.2);
  --vsbs-background: rgb(var(--md-sys-color-surface));
  --vsbs-border-radius: 28px 28px 0 0;
  --vsbs-max-width: 100%;
  --vsbs-border-color: rgba(var(--md-sys-color-outline-variant), 0.08);
  --vsbs-padding-x: 0px;
  --vsbs-handle-background: rgba(var(--md-sys-color-on-surface-variant), 0.28);
  --vsbs-handle-width: 40px;
  --vsbs-safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

.mobile-search-results-sheet :deep([data-vsbs-sheet]) {
  min-height: 200px !important;
  height: auto !important;
  max-height: calc(100vh - env(safe-area-inset-top, 0px) - var(--sab, 0px)) !important;
  padding-top: 0;
}

.mobile-search-results-sheet :deep([data-vsbs-content]) {
  min-height: 200px;
  height: 100% !important;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  box-sizing: border-box;
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