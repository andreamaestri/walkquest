<template>
  <div 
    class="m3-content-container hardware-accelerated pointer-events-auto" 
    :class="{ 
      'drawer-open': isDrawerOpen,
      'has-mobile-nav': uiStore.isMobile && !selectedWalkId,
      'has-notch': uiStore.isMobile 
    }"
    :style="mapContainerStyle" 
    ref="mapContainerRef"
  >
    <div class="m3-surface-container hardware-accelerated pointer-events-auto absolute inset-0">
      <MapboxMap ref="mapComponent" :access-token="mapboxToken" :map-style="mapStyle" :max-bounds="maxBounds"
        :center="center" :zoom="zoom" :min-zoom="minZoom" :max-zoom="maxZoom" :pitch="45" :bearing="0" :min-pitch="0"
        :max-pitch="85" :drag-rotate="true" :touch-zoom-rotate="true" :touch-pitch="true" :cooperativeGestures="false"
        @mb-created="handleMapCreated" @mb-load="handleMapLoad" @mb-moveend="updateVisibleMarkers"
        class="h-full w-full absolute inset-0">
        <!-- Loading indicator -->
        <div v-if="loading" class="absolute bottom-4 left-4 z-50 bg-white rounded-full px-4 py-2 shadow-lg">
          <div class="flex items-center gap-2">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
            <span class="text-on-surface text-sm">Loading route...</span>
          </div>
        </div>

        <!-- Map content components -->
        <template v-if="mapLoaded">
          <!-- Route layers -->
          <WalkRouteLayer v-if="selectedWalkId && routeData" :route-data="routeData"
            @route-layer-loaded="handleRouteLayerLoaded" @glow-layer-loaded="handleGlowLayerLoaded" />

          <!-- Walk markers -->
          <WalkMarkers :walks="visibleWalks" :selected-walk-id="selectedWalkId" @marker-click="handleMarkerClick"
            @marker-mounted="handleMarkerMounted" @popup-open-walk="handlePopupOpenWalk" />
            
          <!-- Navigation control with key to force re-creation when layout changes -->
          <MapboxNavigationControl 
            v-if="mapInstance"
            :key="`nav-control-${uiStore.isMobile ? 'mobile' : 'desktop'}`"
            :position="uiStore.isMobile ? 'top-left' : 'top-right'" 
            :show-compass="true" 
            :show-zoom="true" 
            :visualize-pitch="true"
            class="navigation-control" />
            
          <!-- Geolocation control with key to force re-creation when layout changes -->
          <MapboxGeolocateControl
            v-if="mapInstance"
            :key="`geo-control-${uiStore.isMobile ? 'mobile' : 'desktop'}`"
            :position="uiStore.isMobile ? 'top-left' : 'top-right'"
            :positionOptions="{
              enableHighAccuracy: true,
              timeout: 6000
            }"
            :trackUserLocation="true"
            :showAccuracyCircle="true"
            :showUserLocation="true"
            :fitBoundsOptions="{
              maxZoom: 15
            }"
            class="geolocate-control"
          />
        </template>
      </MapboxMap>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef, nextTick, watchEffect } from "vue";
import { useElementVisibility } from "@vueuse/core";
import {
  MapboxMap,
  MapboxNavigationControl,
  MapboxGeolocateControl
} from "@studiometa/vue-mapbox-gl";
import mapboxgl from 'mapbox-gl';
import { useMap } from "../../composables/useMap";
import { getGeometry } from "../../services/api";
import WalkRouteLayer from "./WalkRouteLayer.vue";
import WalkMarkers from "./WalkMarkers.vue";
import { useUiStore } from "../../stores/ui"; // Fix the import name to match the actual export

// Add this line to access the UI store
const uiStore = useUiStore();

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
  selectedWalkId: {
    type: [String, Number],
    default: null
  },
  walks: {
    type: Array,
    required: true
  },
  isDrawerOpen: {
    type: Boolean,
    default: false
  }
});

/**
 * Emits for component communication
 */
const emit = defineEmits(['map-created', 'map-loaded', 'walk-selected']);

// Component refs
const mapContainerRef = shallowRef(null);
const mapComponent = shallowRef(null);
const mapInstance = shallowRef(null);
const resizeObserver = shallowRef(null); // Add this line to define the resize observer

// Component state
const mapLoaded = ref(false);
const mapReady = ref(false);
const loading = ref(false);
const routeData = shallowRef(null);
const markerRefs = shallowRef(new Map());
const spatialIndex = shallowRef(new Map());
const mapBounds = shallowRef(null);
const previousVisibleWalks = shallowRef(null);
const markerKey = ref(0);
const isAnimating = ref(false); // Track if map animation is in progress
const pendingMarkerUpdates = ref(false); // Track if marker updates are pending
const animationInProgress = ref(false); // Track any animation in progress

// Extract setMapInstance from useMap
const { setMapInstance, flyToLocation } = useMap();

// Cornwall bounds constants
const CORNWALL_BOUNDS = [
  [-6.5, 49.5], // Southwest coordinates - expanded west and south
  [-3.5, 51.2], // Northeast coordinates - expanded east and north
];

// Cornwall center
const CORNWALL_CENTER = [-4.95, 50.4];

/**
 * Merge default map values with the mapConfig prop
 * Provides sensible defaults while allowing customization
 */
const mapStyle = computed(() =>
  props.mapConfig.mapStyle || "mapbox://styles/andreamaestri/cm79fegfl000z01sdhl4u32jv?optimize=true"
);

const maxBounds = computed(() =>
  props.mapConfig.maxBounds || CORNWALL_BOUNDS
);

const center = computed(() =>
  props.mapConfig.center || CORNWALL_CENTER
);

const zoom = computed(() =>
  props.mapConfig.zoom || 9
);

const minZoom = computed(() =>
  props.mapConfig.minZoom || 1
);

const maxZoom = computed(() =>
  props.mapConfig.maxZoom || 20
);

/**
 * Computed property for map container style
 * Adjusts layout based on drawer state and notch
 */
const mapContainerStyle = computed(() => ({
  position: "absolute",
  inset: "0",
  width: "100dvw",
  height: "calc(100vh + env(safe-area-inset-top, 0px))",
  marginLeft: "var(--md-sys-sidebar-collapsed)", // Always keep margin for sidebar
  paddingRight: "0", // No padding needed on right side
  marginTop: "-env(safe-area-inset-top, 0px)", // Negative margin to extend into notch area
  paddingTop: uiStore.isMobile ? "0" : "64px", // Only add header padding on desktop
}));

/**
 * Computed property for visible walks
 * Uses spatial indexing for performance optimization
 */
const visibleWalks = computed(() => {
  if (!mapBounds.value || !props.walks?.length) {
    return props.walks || [];
  }

  const bounds = mapBounds.value;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const cellSize = 0.1;
  const minCellX = Math.floor(sw.lng / cellSize);
  const maxCellX = Math.floor(ne.lng / cellSize);
  const minCellY = Math.floor(sw.lat / cellSize);
  const maxCellY = Math.floor(ne.lat / cellSize);
  const visibleSet = new Set();

  for (let x = minCellX; x <= maxCellX; x++) {
    for (let y = minCellY; y <= maxCellY; y++) {
      const cellKey = `${x}:${y}`;
      const cellWalks = spatialIndex.value.get(cellKey) || [];
      cellWalks.forEach((walk) => visibleSet.add(walk));
    }
  }

  const currentVisibleWalks = Array.from(visibleSet);

  // Avoid unnecessary re-renders by checking if the visible walks have changed
  if (
    previousVisibleWalks.value &&
    areArraysShallowEqual(currentVisibleWalks, previousVisibleWalks.value)
  ) {
    return previousVisibleWalks.value;
  }

  previousVisibleWalks.value = currentVisibleWalks;
  return currentVisibleWalks;
});

/**
 * Helper function to check if two arrays of walks are shallowly equal
 * Used to optimize rendering performance
 */
function areArraysShallowEqual(arrA, arrB) {
  if (!arrA || !arrB || arrA.length !== arrB.length) return false;
  const setB = new Set(arrB.map((walk) => walk.id));
  for (const walkA of arrA) {
    if (!setB.has(walkA.id)) return false;
  }
  return true;
}

/**
 * Update spatial index when walks change
 * Improves performance for large datasets
 */
function updateSpatialIndex() {
  const newIndex = new Map();
  const cellSize = 0.1; // roughly 11km at equator

  for (const walk of props.walks) {
    const lng = Number(walk.longitude) || Number(walk.lng);
    const lat = Number(walk.latitude) || Number(walk.lat);

    // Get grid cell coordinates
    const cellX = Math.floor(lng / cellSize);
    const cellY = Math.floor(lat / cellSize);

    // Create cell key
    const key = `${cellX}:${cellY}`;

    if (!newIndex.has(key)) {
      newIndex.set(key, []);
    }
    newIndex.get(key).push(walk);
  }

  spatialIndex.value = newIndex;
}

/**
 * Handle map creation
 * Sets up map instance and event listeners
 */
const handleMapCreated = (map) => {
  console.log("Map created");
  mapInstance.value = map;
  setMapInstance(map);

  // Setup Mapbox logo positioning with improved mobile support
  const positionMapboxLogo = () => {
    const logoElement = document.querySelector('.mapboxgl-ctrl-logo');
    if (logoElement) {
      const sidebarWidth = uiStore.isMobile ? 0 : 80; // No sidebar on mobile
      const drawerWidth = props.isDrawerOpen && !uiStore.isMobile ? 320 : 0; // No drawer consideration on mobile
      const totalWidth = sidebarWidth + drawerWidth;
      
      // Apply responsive positioning
      logoElement.style.position = 'fixed';
      
      if (uiStore.isMobile) {
        // Mobile positioning - ensure logo stays within viewport
        logoElement.style.bottom = `-52px!important`;
        logoElement.style.left = '0'; // Fixed left position to ensure visibility
        logoElement.style.right = 'auto';
        logoElement.style.transform = 'scale(1.25)';
        logoElement.style.transformOrigin = 'bottom left';
      } else {
        // Desktop positioning - account for sidebar and drawer
        logoElement.style.bottom = '16px';
        logoElement.style.left = `${totalWidth + 16}px`;
        logoElement.style.right = 'auto';
        logoElement.style.transform = 'scale(1)';
      }
      
      // Common styles
      logoElement.style.zIndex = '45';
      logoElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      logoElement.style.opacity = mapLoaded.value ? '0.8' : '0'; // Fade in when map is loaded
    }
  };

  // Create a mutation observer to detect when the logo is added to the DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        if (document.querySelector('.mapboxgl-ctrl-logo')) {
          positionMapboxLogo();
          break;
        }
      }
    }
  });

  // Start observing the map container for the logo to appear
  observer.observe(mapContainerRef.value, { childList: true, subtree: true });

  // Set up reactive positioning that updates when relevant values change
  watchEffect(positionMapboxLogo);

  // Clean up observer when component is unmounted
  onBeforeUnmount(() => {
    observer.disconnect();
  });

  // Wait for style to load before enabling interactions
  map.once("style.load", () => {
    mapLoaded.value = true;
    mapReady.value = true;
    
    // Update logo visibility once map is loaded
    positionMapboxLogo();
  });

  // Listen to continuous map movement to update mapBounds
  map.on("move", () => {
    // Update mapBounds when the map moves
    mapBounds.value = map.getBounds();
    if (!props.selectedWalkId) updateVisibleMarkers(); // Only update markers if no walk is selected
  });
  
  // Track animation state
  map.on("movestart", () => {
    isAnimating.value = true;
    animationInProgress.value = true;
  });
  
  map.on("moveend", () => {
    isAnimating.value = false;
    // Reset the canvas style after animation completes
    map.getCanvas().style.willChange = 'auto';
    
    // Process any pending marker updates after animation completes
    setTimeout(() => {
      if (pendingMarkerUpdates.value) {
        updateAllMarkerColors(props.selectedWalkId);
        pendingMarkerUpdates.value = false;
      }
      animationInProgress.value = false;
    }, 100);
  });

  // Initialize mapBounds
  mapBounds.value = map.getBounds();

  emit('map-created', map);
};

/**
 * Handle map load
 * Sets map loaded state and emits event
 */
const handleMapLoad = () => {
  mapLoaded.value = true;
  mapReady.value = true;
  emit('map-loaded');
};

/**
 * Update visible markers
 * Debounced to improve performance
 */
const updateVisibleMarkers = debounce(() => {
  if (!mapInstance.value) return;

  const bounds = mapInstance.value.getBounds();
  if (bounds) {
    mapBounds.value = bounds;
  }
}, 100);

/**
 * Handle marker click
 * Updates marker colors and emits walk selection event
 */
 const handleMarkerClick = (walk) => {
  if (!walk || animationInProgress.value) return;

  // Lock out animations
  animationInProgress.value = true;
  
  // First: update all markers to avoid flicker
  markerRefs.value.forEach((marker, id) => {
    updateMarkerColorImmediate(marker, id === walk.id);
  });
  
  // Then: emit walk selected with enough delay for marker update
  setTimeout(() => {
    emit('walk-selected', walk);
  }, 50);
};

/**
 * Handle popup open walk button click
 * Flies to walk location and emits selection event
 */
const handlePopupOpenWalk = async (event, walk) => {
  event.stopPropagation();
  
  if (animationInProgress.value) return;
  animationInProgress.value = true;
  
  try {
    // Close all popups first
    if (mapInstance.value) {
      const popups = document.getElementsByClassName("mapboxgl-popup");
      for (const popup of Array.from(popups)) {
        popup.remove();
      }
    }
    
    // Immediately update just the clicked marker
    const clickedMarker = markerRefs.value.get(walk.id);
    if (clickedMarker) {
      const svg = clickedMarker.querySelector("svg");
      if (svg) {
        const targetPath = svg.querySelector("path[fill]");
        if (targetPath) {
          targetPath.style.transition = 'none';
          targetPath.style.fill = "#6750A4"; // Selected color
        }
      }
    }
    
    // Set flag to update other markers after map animation
    pendingMarkerUpdates.value = true;
    
    // Then select the walk with a brief delay
    setTimeout(() => {
      emit('walk-selected', walk);
    }, 100);
  } catch (error) {
    console.error("Error handling walk selection:", error);
    animationInProgress.value = false;
  }
};

/**
 * Handle marker mounted
 * Stores marker reference for later use
 */
const handleMarkerMounted = (marker, walkId) => {
  if (!marker) return;

  // Clean up old marker if it exists
  const oldMarker = markerRefs.value.get(walkId);
  if (oldMarker?.remove) {
    oldMarker.remove();
  }

  // Store new marker reference
  markerRefs.value.set(walkId, marker);
};

/**
 * Update marker color with no transition during animations
 * Used for immediate updates when needed
 */
 const updateMarkerColorImmediate = (marker, isSelected) => {
  if (!marker) return;
  
  const element = marker;
  const svg = element.querySelector("svg");
  if (!svg) return;
  
  const targetPath = svg.querySelector("path[fill]");
  if (!targetPath) return;
  
  // Remove hardware acceleration usage
  svg.style.willChange = '';
  svg.style.transform = '';
  
  // No transition, direct update
  targetPath.style.transition = 'none';
  targetPath.style.fill = isSelected ? "#6750A4" : "#3FB1CE";
};

/**
 * Update marker color with normal transition
 * Used for smooth updates when not during map animations
 */
 const updateMarkerColorWithTransition = (marker, isSelected) => {
  if (!marker) return;
  
  const element = marker;
  const svg = element.querySelector("svg");
  if (!svg) return;
  
  const targetPath = svg.querySelector("path[fill]");
  if (!targetPath) return;
  
  // Add transition
  targetPath.style.transition = 'fill 0.15s ease-out';
  targetPath.style.fill = isSelected ? "#6750A4" : "#3FB1CE";
};

/**
 * Update marker color
 * Smart decision on which update method to use based on current animation state
 */
const updateMarkerColor = (marker, isSelected) => {
  if (isAnimating.value || loading.value || animationInProgress.value) {
    updateMarkerColorImmediate(marker, isSelected);
  } else {
    updateMarkerColorWithTransition(marker, isSelected);
  }
};

/**
 * Update all marker colors
 * Updates colors for all markers based on selection state
 */
const updateAllMarkerColors = (selectedId = null) => {
  // Don't update markers during animations
  if (isAnimating.value) {
    pendingMarkerUpdates.value = true;
    return;
  }
  
  markerRefs.value.forEach((marker, id) => {
    updateMarkerColor(marker, id === selectedId);
  });
};

/**
 * Handle route layer loaded
 */
const handleRouteLayerLoaded = () => {
  console.log(`Route layer loaded`);
};

/**
 * Handle glow layer loaded
 */
const handleGlowLayerLoaded = () => {
  console.log('Glow layer loaded');
};

/**
 * Load route data for selected walk
 * Fetches and displays route geometry
 */
async function loadRouteData(walkId) {
  if (!walkId) {
    routeData.value = null;
    return;
  }

  try {
    loading.value = true;
    const geometry = await getGeometry(walkId);
    console.log("Retrieved geometry data:", geometry);

    if (geometry && isValidGeoJSON(geometry)) {
      await nextTick();
      routeData.value = geometry;

      // Single camera movement when route is loaded
      if (mapInstance.value && geometry?.geometry?.coordinates?.length) {
        // Add a small delay to ensure the map is ready
        setTimeout(() => {
          try {
            // Just apply minimal transform
            mapInstance.value.getCanvas().style.transform = 'translate3d(0, 0, 0)';
            
            const coordinates = geometry.geometry.coordinates;

            if (coordinates.length > 1) {
              // Find the bounds of all coordinates
              const bounds = coordinates.reduce(
                (acc, coord) => {
                  return {
                    minLng: Math.min(acc.minLng, coord[0]),
                    maxLng: Math.max(acc.maxLng, coord[0]),
                    minLat: Math.min(acc.minLat, coord[1]),
                    maxLat: Math.max(acc.maxLat, coord[1])
                  };
                },
                {
                  minLng: Infinity,
                  maxLng: -Infinity,
                  minLat: Infinity,
                  maxLat: -Infinity
                }
              );

              // Use a smoother animation with proper easing
              mapInstance.value.flyTo({
                center: [
                  (bounds.minLng + bounds.maxLng) / 2,
                  (bounds.minLat + bounds.maxLat) / 2
                ],
                zoom: 13,
                pitch: 65,
                bearing: 30,
                essential: true,
                padding: {
                  top: 50,
                  bottom: 50,
                  left: 50,
                  right: 50
                },
                easing: (t) => {
                  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                },
                animate: true
              });
            } else if (coordinates.length === 1) {
              mapInstance.value.flyTo({
                center: coordinates[0],
                zoom: 13,
                pitch: 65,
                bearing: 30,
                essential: true,
                padding: {
                  top: 50,
                  bottom: 50,
                  left: 50,
                  right: 50
                },
                easing: (t) => {
                  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                },
                animate: true
              });
            }
          } catch (e) {
            console.error("Error with camera movement:", e);
          }
        }, 250);
      }
    }
  } catch (error) {
    console.error('Error loading route:', error);
  } finally {
    loading.value = false;
  }
}

/**
 * Check if GeoJSON is valid
 * Validates GeoJSON structure
 */
function isValidGeoJSON(data) {
  try {
    if (!data || typeof data !== 'object') return false;
    if (!data.type) return false;

    // Handle different GeoJSON structures
    if (data.type === 'Feature') {
      if (!data.geometry || !data.geometry.coordinates) return false;
      if (!Array.isArray(data.geometry.coordinates)) return false;

      // Check if coordinates are valid numbers
      return data.geometry.coordinates.every(coord =>
        Array.isArray(coord) &&
        coord.length >= 2 &&
        !isNaN(coord[0]) &&
        !isNaN(coord[1])
      );
    } else if (data.type === 'FeatureCollection') {
      if (!Array.isArray(data.features) || data.features.length === 0) return false;
      return data.features.every(feature => isValidGeoJSON(feature));
    } else if (data.type === 'LineString' || data.type === 'MultiLineString') {
      if (!data.coordinates || !Array.isArray(data.coordinates)) return false;
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error validating GeoJSON:', error);
    return false;
  }
}

/**
 * Debounce helper function
 * Limits the rate at which a function can fire
 */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Watch for changes in walks to update spatial index
watch(() => props.walks, updateSpatialIndex, { immediate: true });

// Watch for changes in selectedWalkId to load route data
watch(() => props.selectedWalkId, loadRouteData);

// Watch for animation end to update markers if needed
watch(() => isAnimating.value, (newValue) => {
  if (!newValue && pendingMarkerUpdates.value) {
    // Wait for a frame to complete before updating markers
    requestAnimationFrame(() => {
      updateAllMarkerColors(props.selectedWalkId);
      pendingMarkerUpdates.value = false;
    });
  }
});

// Lifecycle hooks
onMounted(() => {
  // Initialize spatial index
  updateSpatialIndex();

  // Load route data if walk is selected
  if (props.selectedWalkId) {
    loadRouteData(props.selectedWalkId);
  }
  
  // Initialize resize observer for the map container
  if (mapContainerRef.value && window.ResizeObserver) {
    resizeObserver.value = new ResizeObserver(debounce(() => {
      if (mapInstance.value) {
        mapInstance.value.resize();
      }
    }, 100));
    
    resizeObserver.value.observe(mapContainerRef.value);
  }
});

onBeforeUnmount(() => {
  // Clean up resize observer
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }

  // Clean up markers
  for (const marker of markerRefs.value.values()) {
    marker?.remove?.();
  }
  markerRefs.value.clear();

  // Clear collections
  spatialIndex.value.clear();
});

const handleRecenterToWalk = () => {
  if (!mapInstance.value || !props.selectedWalkId || animationInProgress.value) return;
  
  animationInProgress.value = true;
  
  // Find the selected walk
  const walk = props.walks.find(w => w.id === props.selectedWalkId);
  if (!walk) return;
  
  // Get the walk's coordinates
  const lng = Number(walk.longitude) || Number(walk.lng);
  const lat = Number(walk.latitude) || Number(walk.lat);
  
  try {
    // Just apply minimal transform for performance
    mapInstance.value.getCanvas().style.transform = 'translate3d(0, 0, 0)';
    
    mapInstance.value.flyTo({
      center: [lng, lat],
      zoom: 13,
      pitch: 0, // Flat 2D view
      bearing: 0, // No rotation
      essential: true
    });
  } catch (error) {
    console.error('Error during recenter:', error);
  } finally {
    setTimeout(() => {
      animationInProgress.value = false;
    }, 1100); // Just after animation ends
  }
};

// Make the method available to parent components
defineExpose({
  flyTo: (options) => {
    if (!mapInstance.value || animationInProgress.value) return;
    mapInstance.value.flyTo(options);
  },
  handleRecenterToWalk
});
</script>

<style scoped>
@import "tailwindcss";
@import "../../../css/material3.css";

.hardware-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
}

.m3-content-container {
  position: absolute;
  inset: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 0 !important; /* Override any existing margins */
  padding-top: env(safe-area-inset-top, 0px);
  height: calc(100vh + env(safe-area-inset-top, 0px)) !important;
  width: 100vw;
}

/* Update to adjust map when drawer is open but keep sidebar visible */
.m3-content-container.drawer-open {
  margin-left: calc(var(--md-sys-sidebar-collapsed) + 320px);
}

.m3-content-container.has-mobile-nav {
  padding-bottom: 64px;
}

.m3-surface-container {
  background-color: rgb(var(--md-sys-color-surface-container));
}

.text-on-surface {
  color: rgb(var(--md-sys-color-on-surface));
}

.border-primary {
  border-color: rgb(var(--md-sys-color-primary));
}

:deep(.mapboxgl-popup-close-button) {
  background-color: rgba(0, 0, 0, 0.3) !important;
  color: white !important;
  font-size: 16px !important;
  padding: 2px 5px !important;
  border-radius: 50px !important;
  border: none !important;
  top: 5px !important;
  right: 5px !important;
}

:deep(.mapboxgl-popup-close-button:hover) {
  background-color: rgba(0, 0, 0, 0.5) !important;
}

/* Mapbox Popup Styling - Global styles for the popup */
:deep(.mapboxgl-popup) {
  transform-origin: bottom center;
  z-index: 10;
  margin-bottom: 12px !important; /* Add margin to account for missing tip */
}

:deep(.mapboxgl-popup-tip) {
  display: none !important; /* Hide the triangle tip as requested */
}

:deep(.mapboxgl-popup-content) {
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
  overflow: hidden;
  border: 1px solid rgb(var(--md-sys-color-outline-variant));
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

/* Fix popup positioning for various anchors */
:deep(.mapboxgl-popup-anchor-bottom),
:deep(.mapboxgl-popup-anchor-bottom-left),
:deep(.mapboxgl-popup-anchor-bottom-right) {
  margin-top: -8px;
}

:deep(.mapboxgl-popup-anchor-top),
:deep(.mapboxgl-popup-anchor-top-left),
:deep(.mapboxgl-popup-anchor-top-right) {
  margin-bottom: 8px;
}

:deep(.mapboxgl-popup-anchor-left) {
  margin-right: 8px;
}

:deep(.mapboxgl-popup-anchor-right) {
  margin-left: 8px;
}

/* Add elevation effect for the popup */
:deep(.mapboxgl-popup) {
  will-change: transform;
  animation: popup-appear 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes popup-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Popup styles */
.m3-popup {
  max-width: none !important;
  width: min(340px, calc(100vw - 24px));
  font-family: "Outfit", system-ui, -apple-system, BlinkMacSystemFont,
    sans-serif !important;
}

:deep(.mapboxgl-popup-content) {
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-3);
  padding: 0 !important;
  background: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
  min-width: 0;
  width: 100%;
  border: 1px solid rgb(var(--md-sys-color-outline-variant));
  overflow: hidden;
  font-family: "Outfit", sans-serif !important;
  font-size: 14px;
  line-height: 1.5;
}

:deep(.mapboxgl-popup-close-button) {
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  color: white !important;
  background-color: rgba(75, 75, 75, 0.6) !important;
  font-size: 18px !important;
  line-height: 24px !important;
  border-radius: 50% !important;
  top: 8px !important;
  right: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: background-color 0.2s ease !important;
  border: none !important;
}

:deep(.mapboxgl-popup-close-button span) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  font-size: 20px !important;
  line-height: 1 !important;
}

:deep(.mapboxgl-popup-close-button:hover) {
  background-color: rgba(75, 75, 75, 0.8) !important;
}

:deep(.mapboxgl-popup-content h3) {
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 1.125rem;
  line-height: 1.4;
  font-weight: 500;
  margin: 0;
  letter-spacing: 0.15px;
}

:deep(.m3-button) {
  width: 100%;
  min-height: 48px;
  justify-content: center;
  margin: 0;
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: 0.1px;
  padding: 0 16px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.m3-button:hover) {
  background-color: rgb(var(--md-sys-color-primary) / 0.92);
}

:deep(.m3-button:active) {
  background-color: rgb(var(--md-sys-color-primary) / 0.85);
  transform: scale(0.98);
}

:deep(.mapboxgl-ctrl .mapboxgl-ctrl-group) {
  pointer-events: auto;
}

/* Hide the popup tip */
:deep(.mapboxgl-popup-tip) {
  display: none !important;
  border: none !important;
  width: 0 !important;
  height: 0 !important;
}

/* Add elevation when popup is open */
:deep(.mapboxgl-popup) {
  will-change: transform;
  transform-origin: bottom center;
  margin-top: -8px !important; /* Adjust positioning to compensate for hidden tip */
}

/* Add subtle surface tint */
:deep(.mapboxgl-popup-content::before) {
  content: "";
  position: absolute;
  inset: 0;
  background: rgb(var(--md-sys-color-surface-tint));
  opacity: 0.05;
  pointer-events: none;
}

/* Ensure proper text wrapping */
:deep(.mapboxgl-popup-content .m3-title-medium) {
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
}

/* Add styling for the info badges */
:deep(.popup-info-badge) {
  display: flex;
  align-items: center;
  background-color: rgb(var(--md-sys-color-surface-container));
  color: rgb(var(--md-sys-color-on-surface-variant));
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 500;
}

/* Add styling for the difficulty badges */
:deep(.popup-difficulty-badge) {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 500;
}

:deep(.difficulty-easy) {
  background-color: rgb(var(--md-sys-color-tertiary-container));
  color: rgb(var(--md-sys-color-on-tertiary-container));
}

:deep(.difficulty-medium) {
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

:deep(.difficulty-hard) {
  background-color: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
}

/* Feature badges */
:deep(.popup-feature-badge) {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.75rem;
  border-radius: 16px;
  font-weight: 500;
}

:deep(.popup-feature-icon) {
  font-size: 16px;
  color: rgb(var(--md-sys-color-primary));
}

/* Add ripple effect for better touch feedback */
:deep(.walk-popup) {
  position: relative;
  overflow: hidden;
}

/* Proper notch handling */
.m3-content-container.has-notch {
  padding-top: env(safe-area-inset-top, 0px);
  height: 100dvh !important;
  margin-top: -env(safe-area-inset-top, 0px) !important;
}

/* Adjust controls positioning to respect safe areas */
:deep(.mapboxgl-control-container) {
  padding-top: env(safe-area-inset-top, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
}

/* Position other map elements correctly */
:deep(.mapboxgl-ctrl-top-right) {
  top: calc(10px + env(safe-area-inset-top, 0px)) !important;
  right: calc(10px + env(safe-area-inset-right, 0px)) !important;
}

/* MD3 styled map controls */
:deep(.mapboxgl-ctrl-group) {
  background: #fff;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.12);
  overflow: hidden;
}

:deep(.mapboxgl-ctrl-group > button) {
  width: 40px;
  height: 40px;
  background-color: transparent;
  border: none;
  color: #1d1b20;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.mapboxgl-ctrl-group > button:hover) {
  background-color: rgba(73, 69, 79, 0.08);
}

:deep(.mapboxgl-ctrl-group > button:active) {
  background-color: rgba(73, 69, 79, 0.12);
}

:deep(.mapboxgl-ctrl-group > button + button) {
  border-top: 1px solid rgba(200, 197, 205, 0.08);
}

/* Style map control icons */
:deep(.mapboxgl-ctrl-zoom-in .mapboxgl-ctrl-icon) {
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z'/%3E%3C/svg%3E")!important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}

:deep(.mapboxgl-ctrl-zoom-out .mapboxgl-ctrl-icon) {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M19 13H5v-2h14z'/%3E%3C/svg%3E")!important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}

:deep(.mapboxgl-ctrl-compass .mapboxgl-ctrl-icon) {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m16 21l-4-8l-4 8l4-2zM10 9V3l4 6V3'/%3E%3C/svg%3E")!important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}

:deep(.mapboxgl-ctrl-geolocate .mapboxgl-ctrl-icon) {
 background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M3.05 13H1v-2h2.05C3.5 6.83 6.83 3.5 11 3.05V1h2v2.05c4.17.45 7.5 3.78 7.95 7.95H23v2h-2.05c-.45 4.17-3.78 7.5-7.95 7.95V23h-2v-2.05C6.83 20.5 3.5 17.17 3.05 13M12 5a7 7 0 0 0-7 7a7 7 0 0 0 7 7a7 7 0 0 0 7-7a7 7 0 0 0-7-7'/%3E%3C/svg%3E") !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}

:deep(.mapboxgl-ctrl-geolocate.mapboxgl-ctrl-geolocate-active .mapboxgl-ctrl-icon) {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236750A4' d='M12 8a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m-8.95 5H1v-2h2.05C3.5 6.83 6.83 3.5 11 3.05V1h2v2.05c4.17.45 7.5 3.78 7.95 7.95H23v2h-2.05c-.45 4.17-3.78 7.5-7.95 7.95V23h-2v-2.05C6.83 20.5 3.5 17.17 3.05 13M12 5a7 7 0 0 0-7 7a7 7 0 0 0 7 7a7 7 0 0 0 7-7a7 7 0 0 0-7-7'/%3E%3C/svg%3E") !important;
  fill: #6750A4 !important;
}

:deep(.mapboxgl-ctrl-geolocate.mapboxgl-ctrl-geolocate-background .mapboxgl-ctrl-icon) {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M3.05 13H1v-2h2.05C3.5 6.83 6.83 3.5 11 3.05V1h2v2.05c4.17.45 7.5 3.78 7.95 7.95H23v2h-2.05c-.45 4.17-3.78 7.5-7.95 7.95V23h-2v-2.05C6.83 20.5 3.5 17.17 3.05 13M12 5a7 7 0 0 0-7 7a7 7 0 0 0 7 7a7 7 0 0 0 7-7a7 7 0 0 0-7-7'/%3E%3C/svg%3E") !important;
}

/* Adjust control positioning */
:deep(.mapboxgl-control-container) {
  pointer-events: none; /* Allow clicking through the container to the map */
}

:deep(.mapboxgl-ctrl-top-right),
:deep(.mapboxgl-ctrl-bottom-right) {
  pointer-events: auto; /* Re-enable pointer events for the actual controls */
}

/* Separate navigation and geolocate controls */
.navigation-control {
  margin-bottom: 8px;
}

/* Position map controls with safe area insets */
:deep(.mapboxgl-ctrl-top-left) {
  left: calc(10px + env(safe-area-inset-left, 0px)) !important;
  top: calc(10px + env(safe-area-inset-top, 0px)) !important;
}

:deep(.mapboxgl-ctrl-top-right) {
  right: calc(10px + env(safe-area-inset-right, 0px)) !important;
  top: calc(10px + env(safe-area-inset-top, 0px)) !important;
}

:deep(.mapboxgl-ctrl-bottom-left) {
  left: calc(env(safe-area-inset-left, 0px)) !important;
  bottom: calc(env(safe-area-inset-bottom, 0px)) !important;
}

/* Mobile-specific adjustments with safe area insets */
@media (max-width: 768px) {
  :deep(.mapboxgl-ctrl-bottom-right) {
    right: calc(env(safe-area-inset-right, 0px)) !important;
    bottom: calc(env(safe-area-inset-bottom, 0px)) !important;
  }
}

/* Make sure controls have pointer events */
:deep(.mapboxgl-ctrl) {
  pointer-events: auto;
}

/* Mobile-specific adjustments */
@media (max-width: 768px) {
  :deep(.mapboxgl-ctrl-top-left),
  :deep(.mapboxgl-ctrl-top-right) {
    top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
  }
  
  :deep(.mapboxgl-ctrl-bottom-left),
  :deep(.mapboxgl-ctrl-bottom-right) {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 12px) !important;
  }

  .has-mobile-nav :deep(.mapboxgl-ctrl-bottom-left),
  .has-mobile-nav :deep(.mapboxgl-ctrl-bottom-right) {
    bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 12px) !important;
  }
}

/* Ensure controls have proper z-index and pointer events */
:deep(.mapboxgl-control-container) {
  pointer-events: none;
  z-index: 2;
}

:deep(.mapboxgl-ctrl) {
  pointer-events: auto;
  clear: both;
}

/* Update existing control styles with better touch targets */
:deep(.mapboxgl-ctrl-group) {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.05);
  border-radius: 12px;
  overflow: hidden;
}

:deep(.mapboxgl-ctrl-group > button) {
  width: 44px; /* Slightly larger touch targets */
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Update the loading indicator position for safe areas */
.loading-indicator {
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  left: calc(16px + env(safe-area-inset-left, 0px));
}
</style>
