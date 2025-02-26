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
    <WalkDrawer
      v-show="selectedWalkId && uiStore.showDrawer"
      v-if="selectedWalkId"
      :key="selectedWalkId"
      :walk="selectedWalk"
      :is-open="uiStore.showDrawer"
      :sidebar-width="sidebarWidth"
      ref="walkDrawerRef"
      @close="handleDrawerClose"
      @start-walk="handleStartWalk"
    />
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  shallowRef,
} from "vue";
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
    required: true,
  },
  mapConfig: {
    type: Object,
    default: () => ({}),
  },
  walkId: {
    type: [String, Number],
    default: null,
  },
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
const drawerMounted = ref(false);
const sidebarWidth = ref(80); // Default collapsed sidebar width (--md-sys-sidebar-collapsed)

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
  if (!route.params.walk_slug && !route.params.walk_id) return null;
  
  // Try to find walk by slug first
  if (route.params.walk_slug) {
    return walks.value.find(walk => walk.walk_id === route.params.walk_slug);
  }
  
  // Fallback to ID lookup
  return walks.value.find(walk => walk.id === route.params.walk_id);
});

const selectedWalkId = computed(() => selectedWalk.value?.id);

/**
 * Computed property for drawer open state
 * Combines selected walk and drawer visibility
 */
const isDrawerOpen = computed(
  () => Boolean(selectedWalk.value) && uiStore.showDrawer
);

/**
 * Handle walk selection
 * Updates route and UI state
 */
const handleWalkSelection = async (walk) => {
  if (walk?.id) {
    isExpanded.value = false; // Collapse sidebar

    // Don't process if animation is in progress
    if (drawerAnimating.value) return;

    // Hide sidebar and show drawer
    drawerAnimating.value = true;
    uiStore.handleWalkSelected();

    // Navigate using slug if available, fallback to ID
    if (walk.walk_id) {
      await router.push({ name: 'walk', params: { walk_slug: walk.walk_id } });
    } else {
      await router.push({ name: 'walk-by-id', params: { walk_id: walk.id } });
    }

    // Wait for next tick to ensure drawer is mounted
    await nextTick();
    if (walkDrawerRef.value) {
      walkDrawerRef.value.$el?.offsetHeight; // Force a reflow
      drawerMounted.value = true;
      drawerAnimating.value = false;
    }
  } else {
    isExpanded.value = true; // Expand sidebar
    uiStore.handleWalkClosed(); // Show sidebar
    router.push({ name: 'home' });
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
  drawerAnimating.value = true;
  console.log("Closing drawer");
  await router.push({ name: 'home' });
  isExpanded.value = true;
  uiStore.handleWalkClosed();
  drawerAnimating.value = false;
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
    walksStore.loadWalks().catch((err) => {
      console.error("Failed to load walks:", err);
      uiStore.setError("Failed to load walks. Please try again later.");
    });

    if (walksStore.walks.length && !uiStore.isMobile) {
      uiStore.setSidebarVisibility(true);
    }

    if (props.walkId) {
      const walk = walksStore.getWalkById(props.walkId);
      if (walk) {
        handleWalkSelection(walk).catch((err) => {
          console.error("Failed to select walk:", err);
        });
      }
    }

    return cleanup;
  } catch (error) {
    console.error("Error initializing interface:", error);
    uiStore.setError(
      "Failed to initialize application. Please refresh the page."
    );
    return () => {}; // Return empty cleanup function in case of error
  }
};

// Lifecycle hooks
onMounted(() => {
  // Add event listener to prevent route changes during map movements
  const preventRouteChange = (e) => {
    if (drawerAnimating.value && e.type === "popstate") {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };
  window.addEventListener("popstate", preventRouteChange);

  try {
    // Get sidebar width for proper drawer positioning
    const sidebarElement = document.querySelector(".m3-navigation-rail");
    if (sidebarElement) {
      sidebarWidth.value = sidebarElement.offsetWidth;

      // Add resize observer to update sidebar width
      const resizeObserver = new ResizeObserver((entries) => {
        sidebarWidth.value = entries[0].target.offsetWidth;
      });

      resizeObserver.observe(sidebarElement);
    }
    const cleanup = initializeInterface();

    // Return cleanup function
    onBeforeUnmount(() => {
      try {
        cleanup();
        window.removeEventListener("popstate", preventRouteChange);
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

:root {
  --md-sys-sidebar-collapsed: 80px;
}

.bg-surface {
  background-color: rgb(var(--md-sys-color-surface));
}
</style>
