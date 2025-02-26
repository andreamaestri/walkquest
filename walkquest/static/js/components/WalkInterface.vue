<template>
  <div class="h-screen w-screen overflow-hidden flex relative bg-surface">
    <!-- Navigation Rail (Desktop) -->
    <NavigationRail
      :walks="walks"
      :selected-walk-id="selectedWalkId"
      :filtered-walks="filteredWalks"
      @walk-selected="handleWalkSelection"
      @fab-click="handleFabClick"
      @walk-expanded="handleWalkExpanded"
      @location-selected="handleLocationSelected"
    />

    <!-- Header with Search Bar -->
    <SearchHeader
      :mapbox-token="mapboxToken"
      :is-expanded="isExpanded"
      @location-selected="handleLocationSelected"
      @walk-selected="handleWalkSelection"
    />

    <!-- Mobile Navigation Components -->
    <MobileNavigation
      :walks="walks"
      :selected-walk-id="selectedWalkId"
      :error="error"
      :mapbox-token="mapboxToken"
      @walk-selected="handleWalkSelection"
      @walk-expanded="handleWalkExpanded"
      @location-selected="handleLocationSelected"
    />

    <!-- Map Container -->
    <MapContainer
      ref="mapContainer"
      :mapbox-token="mapboxToken"
      :map-config="mapConfig"
      :selected-walk-id="selectedWalkId"
      :walks="walks"
      :is-drawer-open="isDrawerOpen"
      @map-created="handleMapCreated"
      @map-loaded="handleMapLoad"
      @walk-selected="handleWalkSelection"
    />

    <!-- Walk Drawer -->
    <Teleport to="body">
      <Transition :css="false" @enter="onDrawerEnter" @leave="onDrawerLeave">
        <WalkDrawer
          v-if="selectedWalkId"
          :walk="selectedWalk"
          ref="walkDrawerRef"
          @close="handleDrawerClose"
          @start-walk="handleStartWalk"
          class="drawer"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, shallowRef } from "vue";
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { animate } from "motion"; // Import animate from motion library

// Import stores
import { useUiStore } from "../stores/ui";
import { useWalksStore } from "../stores/walks";
import { useLocationStore } from "../stores/locationStore";
import { useSearchStore } from "../stores/searchStore";

// Import composables and utilities
import { useMap } from "../composables/useMap";
import { useMapResources } from "../composables/useMapResources";
import { useAnimations } from "../composables/useAnimations";

// Import components
import NavigationRail from "./map/NavigationRail.vue";
import SearchHeader from "./map/SearchHeader.vue";
import MobileNavigation from "./map/MobileNavigation.vue";
import MapContainer from "./map/MapContainer.vue";
import WalkDrawer from "./WalkDrawer.vue";

/**
 * Props definition with proper validation
 */
const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  },
  mapConfig: {
    type: Object,
    default: () => ({})
  },
  walkId: {
    type: [String, Number],
    default: null
  }
});

// Initialize router and route
const router = useRouter();
const route = useRoute();

// Initialize stores
const walksStore = useWalksStore();
const uiStore = useUiStore();
const locationStore = useLocationStore();
const searchStore = useSearchStore();

// Initialize composables
const { setMapInstance, flyToLocation } = useMap();
const { cleanupMapResources } = useMapResources();
const { animateInterfaceElement, animationConfigs } = useAnimations();

// Component refs
const mapContainer = shallowRef(null);
const walkDrawerRef = ref(null);

// Component state
const expandedWalkIds = ref([]);
const isExpanded = ref(localStorage.getItem("sidebarExpanded") === "true");
const drawerAnimating = ref(false);

/**
 * Extract reactive state from stores using storeToRefs
 * This preserves reactivity while avoiding unnecessary re-renders
 */
const { error } = storeToRefs(uiStore);
const { searchQuery, searchMode } = storeToRefs(searchStore);

/**
 * Computed property for filtered walks
 * Applies search filters and location-based filtering
 */
const filteredWalks = computed(() => {
  let results = walks.value;

  // Handle text search
  if (searchQuery.value?.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    results = results.filter((walk) => {
      const text = [walk.title, walk.location, walk.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }

  // Handle location-based filtering
  if (searchMode.value === "locations" && locationStore.userLocation) {
    return locationStore.nearbyWalks;
  }

  return results;
});

/**
 * Computed property for walks
 * Normalizes walk data from store
 */
const walks = computed(() => {
  if (!Array.isArray(walksStore.walks)) return [];
  return walksStore.walks.map((walk) => ({
    id: walk.id,
    lat: walk.latitude,
    lng: walk.longitude,
    title: walk.title || walk.walk_name, // Normalize title
    location: walk.location,
    ...walk,
  }));
});

/**
 * Computed property for selected walk
 * Finds walk by ID from available walks
 */
const selectedWalk = computed(() => {
  if (!selectedWalkId.value) return null;
  return walks.value.find((walk) => walk.id === selectedWalkId.value);
});

/**
 * Computed property for selected walk ID
 * Extracts from route query parameters
 */
const selectedWalkId = computed(() => route.query.walkId);

/**
 * Computed property for drawer open state
 * Combines selected walk and drawer visibility
 */
const isDrawerOpen = computed(() => selectedWalk.value && uiStore.showDrawer);

/**
 * Enhanced drawer enter animation
 * Uses motion library for fluid animations with proper physics
 */
const onDrawerEnter = async (el, onComplete) => {
  drawerAnimating.value = true;

  try {
    // Apply initial styles
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transformOrigin = 'right center';
    
    // Force reflow
    el.offsetHeight;
    
    // Animate drawer with spring physics
    await animate(el, 
      { 
        opacity: [0, 1],
        x: ['100%', '0%'],
        scale: [1.02, 1],
      }, 
      { 
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 1,
        duration: 0.6,
      }
    ).finished;
    
    if (onComplete) onComplete();
  } catch (error) {
    console.error('Drawer animation error:', error);
    // Ensure completion even on error
    if (onComplete) onComplete();
  } finally {
    drawerAnimating.value = false;
  }
};

/**
 * Enhanced drawer leave animation
 * Uses motion library for fluid animations with proper physics
 */
const onDrawerLeave = async (el, onComplete) => {
  drawerAnimating.value = true;
  
  // Animate drawer with spring physics
  try {
    await animate(el, 
      { 
        opacity: [1, 0],
        x: ['0%', '100%'],
        scale: [1, 1.02],
      }, 
      { 
        duration: 0.4,
        easing: [0.4, 0, 0.2, 1],
      }
    ).finished;
    
    if (onComplete) onComplete();
  } catch (error) {
    console.error('Drawer animation error:', error);
    // Ensure completion even on error
    if (onComplete) onComplete();
  } finally {
    drawerAnimating.value = false;
  }
};

/**
 * Handle walk selection
 * Updates route and UI state
 */
const handleWalkSelection = async (walk) => {
  if (walk?.id) {
    isExpanded.value = false; // Collapse sidebar
    
    // Don't process if animation is in progress
    if (drawerAnimating.value) return;
    
    uiStore.handleWalkSelected(); // Hide sidebar
    await router.push({ query: { walkId: walk.id } });

    // Wait for next tick to ensure drawer is mounted
    await nextTick();
    if (walkDrawerRef.value) {
      // Force a reflow
      walkDrawerRef.value.$el?.offsetHeight;
    }
  } else {
    isExpanded.value = true; // Expand sidebar
    uiStore.handleWalkClosed(); // Show sidebar
    router.push({ query: {} });
  }
};

/**
 * Handle drawer close
 * Clears route query and updates UI state
 */
const handleDrawerClose = async () => {
  // Don't process if animation is in progress
  if (drawerAnimating.value) return;
  
  // Close drawer
  await router.push({ query: {} });
  isExpanded.value = true;
  uiStore.handleWalkClosed();
};

/**
 * Handle start walk action
 * Closes drawer and could navigate to walk route view
 */
const handleStartWalk = (walk) => {
  // Close the drawer
  handleDrawerClose();

  // Add functionality to start the walk (e.g., navigate to walk route view)
  console.log("Starting walk:", walk);

  // Example: Navigate to a walk route page
  // router.push({ name: 'walk-route', params: { id: walk.id } });
};

/**
 * Handle walk expansion toggle
 * Updates expandedWalkIds and persists to localStorage
 */
const handleWalkExpanded = ({ walkId, expanded }) => {
  expandedWalkIds.value = expanded
    ? [...new Set([...expandedWalkIds.value, walkId])]
    : expandedWalkIds.value.filter((id) => id !== walkId);

  localStorage.setItem("expandedWalks", JSON.stringify(expandedWalkIds.value));
};

/**
 * Handle FAB button click
 * Navigates to home and expands sidebar
 */
const handleFabClick = async () => {
  await router.push({ name: "home" });
  
  if (!isExpanded.value) {
    isExpanded.value = true;
    localStorage.setItem("sidebarExpanded", "true");
  }
};

/**
 * Handle location selection
 * Updates location store and flies to location
 */
const handleLocationSelected = async (location) => {
  if (!location?.center) {
    searchStore.setError(null);
    locationStore.clearLocation();
    return;
  }

  try {
    uiStore.setLoadingState("location", true);

    // Ensure map is ready
    if (mapContainer.value) {
      // Fly to the location
      await flyToLocation({
        ...location,
        callback: () => {
          if (!isExpanded.value) {
            isExpanded.value = true;
            localStorage.setItem("sidebarExpanded", "true");
          }
        },
      });
    }

    // Store the selected location
    if (location.center && location.place_name) {
      await locationStore.setUserLocation({
        latitude: location.center[1],
        longitude: location.center[0],
        place_name: location.place_name,
      });
    }

    searchStore.setError(null);
  } catch (error) {
    console.error("Error handling location selection:", error);
    searchStore.setError("Unable to process location");
  } finally {
    uiStore.setLoadingState("location", false);
  }
};

/**
 * Handle map creation
 * Sets map instance in composable
 */
const handleMapCreated = (map) => {
  setMapInstance(map);
};

/**
 * Handle map load
 * Updates UI state when map is loaded
 */
const handleMapLoad = () => {
  uiStore.setLoadingState("map", false);
};

/**
 * Initialize interface
 * Sets up responsive state and loads walks
 */
const initializeInterface = () => {
  try {
    const cleanup = uiStore.initializeResponsiveState();
    
    // Load walks with proper error handling
    walksStore.loadWalks().catch(err => {
      console.error("Failed to load walks:", err);
      uiStore.setError("Failed to load walks. Please try again later.");
    });

    if (walksStore.walks.length && !uiStore.isMobile) {
      uiStore.setSidebarVisibility(true);
    }

    if (props.walkId) {
      const walk = walksStore.getWalkById(props.walkId);
      if (walk) {
        handleWalkSelection(walk).catch(err => {
          console.error("Failed to select walk:", err);
        });
      }
    }
    
    return cleanup;
  } catch (error) {
    console.error("Error initializing interface:", error);
    uiStore.setError("Failed to initialize application. Please refresh the page.");
    return () => {}; // Return empty cleanup function in case of error
  }
};

// Lifecycle hooks
onMounted(() => {
  try {
    const cleanup = initializeInterface();
  
    // Return cleanup function
    onBeforeUnmount(() => {
      try {
        cleanup();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    });
  } catch (error) {
    console.error("Error in component mount:", error);
  }
});
</script>

<style>
@import "tailwindcss";
@import "../../css/material3.css";

/* Background colors */
.bg-surface {
  background-color: rgb(var(--md-sys-color-surface));
}

/* Drawer styling */
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 90vw);
  z-index: 50;
  background: rgb(var(--md-sys-color-surface-container-highest));
  box-shadow: var(--md-sys-elevation-level2);
  border-left: 1px solid rgb(var(--md-sys-color-outline-variant));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  will-change: transform, opacity;
}
</style>
