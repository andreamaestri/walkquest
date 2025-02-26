<template>
  <div
    class="fixed top-0 left-0 z-10 transition-all duration-300 flex w-full"
    :style="{
      paddingLeft: showNavigationRail
        ? isExpanded
          ? '410px'
          : '72px'
        : '0px',
    }"
  >
    <header class="py-3 bg-surface-variant w-full">
      <!-- Search Bar -->
      <div
        class="transition-all duration-300 mx-auto"
        :class="[
          showNavigationRail ? (isExpanded ? 'search-container-expanded' : 'search-container-collapsed') : 'search-container-full',
        ]"
      >
        <SearchView
          v-model="searchQuery"
          :search-mode="searchMode"
          :mapbox-token="mapboxToken"
          @location-selected="handleLocationSelected"
          @walk-selected="handleWalkSelection"
          class="md3-search-bar px-4"
        />
      </div>
    </header>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useUiStore } from "../../stores/ui";
import { useSearchStore } from "../../stores/searchStore";
import SearchView from "../SearchView.vue";

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
 * Handle location selection
 * Emits event to parent component
 */
const handleLocationSelected = (location) => {
  try {
    // Ensure location exists before emitting
    if (location === null || location === undefined) {
      console.warn('Location selection event received with no location data');
    }
    emit('location-selected', location);
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
};
</script>

<style scoped>
.search-container-expanded {
  width: calc(100% - 2rem);
  max-width: 800px;
  margin-left: 1rem;
  margin-right: 1rem;
}

.search-container-collapsed {
  width: calc(100% - 2rem);
  max-width: 800px;
  margin-left: 1rem;
  margin-right: 1rem;
}

.search-container-full {
  width: calc(100% - 2rem);
  max-width: 800px;
  margin-left: 1rem;
  margin-right: 1rem;
}

.bg-surface-variant {
  background-color: rgb(var(--md-sys-color-surface-variant));
}

.md3-search-bar {
  border-radius: 28px;
  overflow: visible;
}
</style>