<template>
  <div class="h-screen w-screen overflow-hidden flex relative bg-surface">
    <!-- Navigation Rail (Desktop) -->
    <NavigationRail
      v-if="!isMobileComputed"
      :walks="walks"
      :selected-walk-id="selectedWalkId"
      :filtered-walks="filteredWalks"
      @walk-selected="handleWalkSelection"
      @fab-click="handleFabClick"
      @walk-expanded="handleWalkExpanded"
      @location-selected="handleLocationSelected"
      @filtered-walks-update="handleFilteredWalksUpdate"
    />

    <!-- Header with Search Bar -->
    <SearchHeader
      :mapbox-token="mapboxToken"
      :is-expanded="isExpanded"
      @location-selected="handleLocationSelected"
      @walk-selected="handleWalkSelection"
      @account-click="handleAccountClick"
    />

    <!-- Mobile Walk List - Only shown when explicitly toggled by FAB action -->
    <MobileWalkList
      v-if="isMobileComputed && showWalksBottomSheet"
      ref="mobileWalkListRef"
      :walks="filteredWalks"
      :selected-walk-id="selectedWalkId"
      :key="activeTab"
      :mapbox-token="mapboxToken"
      :map-instance="mapInstance" 
      @walk-selected="handleWalkSelection"
      @location-selected="handleLocationSelected"
    />
    
    <!-- Mobile FAB with child menu -->
    <SpeedDial 
      v-if="isMobileComputed && !selectedWalkId" 
      class="mobile-fab" 
      @action="handleFabAction" 
    />

    <!-- Map Container -->
    <MapContainer
      :mapbox-token="mapboxToken"
      :map-config="mapConfig"
      :selected-walk-id="selectedWalkId"
      :walks="walks"
      :is-drawer-open="isDrawerOpen"
      @map-created="handleMapCreated"
      @map-loaded="handleMapLoad"
      @walk-selected="handleWalkSelection"
      ref="mapContainerRef"
    />

    <!-- Walk Drawer (Desktop) -->
    <WalkDrawer
      v-if="selectedWalkId && !isMobileComputed && showDrawerComputed"
      :key="selectedWalkId"
      :walk="selectedWalk"
      :is-open="showDrawerComputed"
      :isMobile="false"
      ref="walkDrawerRef"
      @close="handleDrawerClose"
      @start-walk="handleStartWalk"
      @category-selected="handleCategorySelected"
      @recenter="handleRecenter"
    />
    
    <!-- Mobile Walk Detail Bottom Sheet -->
    <MobileWalkDrawer 
      v-if="selectedWalk && isMobileComputed"
      :walk="selectedWalk"
      v-model="showWalkDetailSheet"
      @close="handleDrawerClose"
      @start-walk="handleStartWalk"
      @save-walk="handleSaveWalk"
      @category-selected="handleCategorySelected"
      @recenter="handleRecenter"
      @directions="handleDirections"
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
import { useAdventureDialogStore } from "../stores/adventureDialog";
import { useAuthStore } from "../stores/auth";

// Import composables and utilities
import { useMap } from "../composables/useMap";
import { useMapResources } from "../composables/useMapResources";
import { useAnimations } from "../composables/useAnimations";

// Import components
import NavigationRail from "./map/NavigationRail.vue";
import SearchHeader from "./map/SearchHeader.vue";
import MapContainer from "./map/MapContainer.vue";
import WalkDrawer from "./WalkDrawer.vue";
import MobileWalkDrawer from "./MobileWalkDrawer.vue"; // Add MobileWalkDrawer import
import MobileWalkList from './MobileWalkList.vue'; 
import BottomSheet from '@douxcode/vue-spring-bottom-sheet';
import WalkList from './WalkList.vue';
import SpeedDial from './SpeedDial.vue';
import { Icon } from '@iconify/vue';

// Define emits
const emit = defineEmits(['route-loaded', 'drawer-mounted']);

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

// Initialize stores inside setup context
const stores = {
  walks: useWalksStore(),
  ui: useUiStore(),
  location: useLocationStore(),
  search: useSearchStore(),
  adventureDialog: useAdventureDialogStore(),
  auth: useAuthStore()
};

const isMobileComputed = computed(() => stores.ui.isMobile);
const showDrawerComputed = computed(() => stores.ui.showDrawer);

// Initialize composables
const { setMapInstance, flyToLocation } = useMap();
const { cleanupMapResources } = useMapResources();
const { animateInterfaceElement, animationConfigs } = useAnimations();

// Component refs
const mapContainer = shallowRef(null);
const mapContainerRef = ref(null); // Add missing ref declaration for mapContainerRef
const walkDrawerRef = ref(null);
const drawerMounted = ref(false);
const mobileWalkListRef = ref(null);

// State refs
const isExpanded = ref(localStorage.getItem("sidebarExpanded") === "true");
const activeTab = ref('explore');
const showWalksBottomSheet = ref(false); // Initialize to false to ensure it's closed on page load
const showWalkDetailSheet = ref(false);
const isWalksSheetExpanded = ref(false);
const isWalkDetailSheetExpanded = ref(false);
const activeCategory = ref(null);

// Available categories
const availableCategories = ref([
  { id: 1, name: 'Nature', icon: 'mdi:tree' },
  { id: 2, name: 'Urban', icon: 'mdi:city' },
  { id: 3, name: 'Historical', icon: 'mdi:bank' },
  { id: 4, name: 'Adventure', icon: 'mdi:hiking' },
  { id: 5, name: 'Family', icon: 'mdi:account-group' }
]);

// Get category icon
function getCategoryIcon(categoryName) {
  const category = availableCategories.value.find(c => c.name === categoryName);
  return category?.icon || 'mdi:help-circle';
}

// Select category
function selectCategory(category) {
  if (activeCategory.value === category.name) {
    activeCategory.value = null;
  } else {
    activeCategory.value = category.name;
  }
}

const expandedWalkIds = ref(
  localStorage.getItem("expandedWalks") 
  ? JSON.parse(localStorage.getItem("expandedWalks")) 
  : []
);

// Add tab change handler
function handleTabChange(tab) {
  activeTab.value = tab
  switch (tab) {
    case 'explore':
      stores.search.setSearchMode('walks')
      stores.location.clearLocation()
      showWalksBottomSheet.value = false // Close sheet when switching to explore
      break
    case 'nearby':
      stores.search.setSearchMode('locations')
      showWalksBottomSheet.value = false // Close sheet when switching to nearby
      break
    case 'categories':
      stores.search.setSearchMode('categories')
      showWalksBottomSheet.value = true
      break
  }
}

/**
 * Handle FAB actions from SpeedDial component
 */
const handleFabAction = (action) => {
  switch (action) {
    case 'explore':
      activeTab.value = 'explore';
      stores.search.setSearchMode('walks');
      showWalksBottomSheet.value = true;
      // Ensure the bottom sheet is opened after it's mounted
      nextTick(() => {
        if (mobileWalkListRef.value) {
          mobileWalkListRef.value.openSheet();
        }
      });
      break;
    case 'nearby':
      activeTab.value = 'nearby';
      stores.search.setSearchMode('locations');
      showWalksBottomSheet.value = true;
      nextTick(() => {
        if (mobileWalkListRef.value) {
          mobileWalkListRef.value.openSheet();
        }
      });
      break;
    case 'categories':
      activeTab.value = 'categories';
      stores.search.setSearchMode('categories');
      showWalksBottomSheet.value = true;
      nextTick(() => {
        if (mobileWalkListRef.value) {
          mobileWalkListRef.value.openSheet();
        }
      });
      break;
    default:
      stores.ui.setError(`Unknown action: ${action}`);
  }
}

/**
 * Handle snap changes in the walks bottom sheet
 */
function handleWalksSheetSnapChange(snapIndex) {
  // snapIndex 0 = half expanded, 1 = fully expanded
  isWalksSheetExpanded.value = snapIndex === 1;
}

/**
 * Handle snap changes in the walk detail bottom sheet
 */
function handleWalkDetailSheetSnapChange(snapIndex) {
  isWalkDetailSheetExpanded.value = snapIndex === 1;
}

/**
 * Handle search input focus - auto-expand the sheet
 */
function handleSearchFocus() {
  isWalksSheetExpanded.value = true;
}

/**
 * Handle saving a walk for later
 */
function handleSaveWalk(walk) {
  // Save walk to user favorites
  stores.ui.setLoadingState("saving", true);
  try {
    stores.walks.saveWalk(walk);
    stores.ui.showSnackbar("Walk saved to favorites");
  } finally {
    stores.ui.setLoadingState("saving", false);
  }
}

/**
 * Extract reactive state from stores using storeToRefs
 * This preserves reactivity while avoiding unnecessary re-renders
 */
const { error } = storeToRefs(stores.ui);
const { searchQuery, searchMode } = storeToRefs(stores.search);

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
  if (searchMode.value === "locations" && stores.location.userLocation) {
    return stores.location.nearbyWalks;
  }

  return results;
});

/**
 * Computed property for walks
 * Normalizes walk data from store
 */
const walks = computed(() => {
  if (!Array.isArray(stores.walks.walks)) return [];
  
  return stores.walks.walks.map((walk) => ({
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
  if (!route.params.walk_id) return null;
  
  // Find walk by walk_id slug
  return walks.value.find(walk => walk.walk_id === route.params.walk_id);
});

const selectedWalkId = computed(() => selectedWalk.value?.id);

/**
 * Computed property for drawer open state
 * Combines selected walk and drawer visibility
 */
const isDrawerOpen = computed(
  () => Boolean(selectedWalk.value) && stores.ui.showDrawer
);

/**
 * Handle walk selection from WalkList in bottom sheet
 */
function handleWalkListSelection(walk) {
  showWalksBottomSheet.value = false;
  handleWalkSelection(walk);
}

/**
 * Handle walk selection
 * Updates route and UI state
 */
const handleWalkSelection = async (walk) => {
  if (walk?.id) {
    isExpanded.value = false; // Collapse sidebar
    localStorage.setItem("sidebarExpanded", "false"); // Persist collapsed state
    
    // Hide sidebar and show drawer
    stores.ui.handleWalkSelected();

    // For mobile, show the walk detail bottom sheet
    if (isMobileComputed.value) {
      showWalkDetailSheet.value = true;
    }

    // Navigate using walk_id for slug if available
    if (walk.walk_id) {
      await router.push({ name: 'walk', params: { walk_id: walk.walk_id } });
    } else {
      await router.push({ name: 'walk-by-id', params: { walk_id: walk.id } });
    }

    // Wait for next tick to ensure drawer is mounted
    await nextTick();
    if (walkDrawerRef.value && walkDrawerRef.value.$el) {
      emit('drawer-mounted', walkDrawerRef.value.$el);
    }
  }
};

/**
 * Handle drawer close
 * Clears route query and updates UI state
 */
const handleDrawerClose = async () => {
  // Close drawer
  await router.push({ name: 'home' });
  isExpanded.value = true;
  stores.ui.handleWalkClosed();
  showWalkDetailSheet.value = false; // Also close mobile walk detail sheet
};

/**
 * Handle start walk action
 * Opens the adventure log dialog
 */
const handleStartWalk = (walk) => {
  // Open the adventure log dialog instead of closing
  stores.adventureDialog.openDialog(walk);
};

/**
 * Handle filtered walks update from NavigationRail or WalkList
 * Passes filtered walks to MapContainer for map filtering
 */
const handleFilteredWalksUpdate = (filteredWalks) => {
  if (mapContainerRef.value && mapContainerRef.value.handleCategoryFilter) {
    mapContainerRef.value.handleCategoryFilter(filteredWalks);
  }
};

/**
 * Handle category selection
 * Could filter walks by category or navigate to category view
 */
const handleCategorySelected = (category) => {
  // Close the mobile sheet if on mobile
  if (isMobileComputed.value) {
    showWalkDetailSheet.value = false;
  }
  
  // Filter walks by the selected category
  stores.search.setSearchMode('categories');
  stores.search.setSearchQuery(category.name);
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
    stores.search.setError(null);
    stores.location.clearLocation();
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
      await stores.location.setUserLocation({
        latitude: location.center[1],
        longitude: location.center[0],
        place_name: location.place_name,
      });
    }
    
    stores.search.setError(null);
  } catch (error) {
    stores.search.setError("Unable to process location");
  } finally {
    stores.ui.setLoadingState("location", false);
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
  stores.ui.setLoadingState("map", false);
};

/**
 * Handle recenter request from drawer
 */
const handleRecenter = () => {
  if (!mapContainer.value || !selectedWalk.value) return;
  mapContainer.value.handleRecenterToWalk();
};

/**
 * Handle directions request from drawer
 */
const handleDirections = () => {
  if (!selectedWalk.value || !selectedWalk.value.latitude || !selectedWalk.value.longitude) return;
  
  const destination = `${selectedWalk.value.latitude},${selectedWalk.value.longitude}`;
  const title = selectedWalk.value.title || selectedWalk.value.walk_name || 'Walk';
  
  // Try to use platform-specific map apps if available
  if (navigator.platform.indexOf('iPhone') !== -1 || 
      navigator.platform.indexOf('iPad') !== -1 ||
      navigator.platform.indexOf('iPod') !== -1) {
    window.open(`maps://maps.apple.com/maps?daddr=${destination}&q=${encodeURIComponent(title)}`);
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${encodeURIComponent(title)}`);
  }
};

/**
 * Handle account icon click
 * Opens account-related functionality
 */
const handleAccountClick = (event) => {
  // Let the AccountCircle component handle all interactions
  // The navigation to profile will be handled through the menu
};

/**
 * Initialize interface
 * Sets up responsive state and loads walks
 */
const initializeInterface = () => {
  try {
    const cleanup = stores.ui.initializeResponsiveState();
    
    // Initialize UI based on device type
    
    // Load walks with proper error handling
    stores.walks.loadWalks().catch((err) => {
      console.error('Error loading walks:', err);
      stores.ui.setError("Failed to load walks. Please try again later.");
    }).then(() => {
      // After walks are loaded, handle deep linking if walk is in URL
      if (route.params.walk_id) {
        const walkId = route.params.walk_id;
        const walk = walkId.includes('-') 
          ? stores.walks.walks.find(w => w.walk_id === walkId) // Find by slug
          : stores.walks.getWalkById(walkId); // Find by ID

        if (walk) {
          handleWalkSelection(walk).catch(() => {
            stores.ui.setError("Failed to load walk details.");
          });
        } else {
          stores.ui.setError("Walk not found.");
        }
      }
    });
    
    if (stores.walks.walks.length && !isMobileComputed.value) {
      stores.ui.setSidebarVisibility(true);
    }
    
    if (props.walkId) {
      const walk = stores.walks.getWalkById(props.walkId);
      if (walk) {
        handleWalkSelection(walk).catch(() => {
          stores.ui.setError("Failed to load walk details.");
        });
      }
    }
    
    return cleanup;
  } catch (error) {
    stores.ui.setError(
      "Failed to initialize application. Please refresh the page."
    );
    return () => {}; // Return empty cleanup function in case of error
  }
};

// Watch for selected walk changes to update mobile walk detail sheet visibility
watch(selectedWalk, (newWalk) => {
  if (isMobileComputed.value) {
    showWalkDetailSheet.value = !!newWalk;
  }
});

// Watch for mobile walk selection to properly handle bottom sheet state
watch(selectedWalk, (newWalk) => {
  if (isMobileComputed.value) {
    showWalkDetailSheet.value = !!newWalk;
    // Ensure walks bottom sheet is closed when a walk is selected
    if (newWalk) {
      showWalksBottomSheet.value = false;
      if (mobileWalkListRef.value) {
        mobileWalkListRef.value.closeSheet();
      }
    }
  }
});

// Watch for route changes to properly handle bottom sheet state
watch(route, (newRoute) => {
  if (isMobileComputed.value && newRoute.name === 'home') {
    // Reset bottom sheet states when navigating home
    showWalkDetailSheet.value = false;
    if (!['categories', 'walks'].includes(activeTab.value)) {
      showWalksBottomSheet.value = false;
    }
  }
}, { deep: true });

// Lifecycle hooks
onMounted(() => {
  // Add event listener to prevent route changes during map movements
  const preventRouteChange = (e) => {
    if (e.type === "popstate") {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }
  window.addEventListener("popstate", preventRouteChange)
  
  try {
    // If we have a walk in the URL, show the drawer
    if (route.params.walk_id) {
      stores.ui.handleWalkSelected();
      stores.ui.showDrawer = true;
    }

    // Set CSS variables for mobile nav height
    if (isMobileComputed.value) {
      document.documentElement.style.setProperty('--bottom-nav-height', '80px');
      
      // Also set safe area inset from environment if available
      if (CSS.supports('padding-bottom: env(safe-area-inset-bottom)')) {
        const safeAreaInset = getComputedStyle(document.documentElement)
          .getPropertyValue('--safe-area-inset-bottom') || '0px';
        document.documentElement.style.setProperty('--safe-area-inset-bottom', 
          `env(safe-area-inset-bottom, ${safeAreaInset})`);
      }
    }
    
    // Set up mobile-specific UI elements
    
    // Initialize interface
    const cleanup = initializeInterface();
    
    // Return cleanup function
    onBeforeUnmount(() => {
      try {
        cleanup();
        window.removeEventListener("popstate", preventRouteChange);
      } catch (error) {
        stores.ui.setError("Error during cleanup. Please refresh the page.");
      }
    });
  } catch (error) {
    stores.ui.setError("Failed to mount component. Please refresh the page.");
  }
});
</script>

<style>
@import "tailwindcss";
@import "../../css/material3.css";

/* CSS variable is now defined in material3.css */

.bg-surface {
  background-color: rgb(var(--md-sys-color-surface));
  min-height: 100vh;
  min-height: -webkit-fill-available;
  min-height: calc(100vh + env(safe-area-inset-top)); /* Add this line */
  padding-top: env(safe-area-inset-top); /* Optional: Add padding to content */
}

/* Mobile FAB styling */
.mobile-fab {
  position: fixed;
  right: 16px; /* MD3 standard spacing */
  bottom: calc(16px + env(safe-area-inset-bottom)); /* MD3 standard spacing + safe area */
  z-index: 100;
}

/* Search field styling */
.md3-search-container {
  position: relative;
}

.md3-search-field {
  position: relative;
  display: flex;
  align-items: center;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-radius: 28px;
  height: 48px;
  padding: 0 16px;
  box-shadow: var(--md-sys-elevation-1);
  transition: box-shadow 0.2s;
}

.md3-search-field:focus-within {
  box-shadow: var(--md-sys-elevation-2);
}

.md3-search-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.md3-search-icon {
  font-size: 20px;
}

.md3-search-input {
  flex: 1;
  height: 100%;
  background-color: transparent;
  border: none;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 16px;
  outline: none;
  padding: 0;
}

.md3-search-input::placeholder {
  color: rgb(var(--md-sys-color-on-surface-variant));
  opacity: 0.7;
}

.md3-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: transparent;
  border: none;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
}

.md3-search-clear:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
}

.md3-search-clear:active {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.12);
}

.md3-surface {
  background-color: rgb(var(--md-sys-color-surface));
  color: rgb(var(--md-sys-color-on-surface));
}
</style>
