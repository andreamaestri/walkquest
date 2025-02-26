<template>
  <div class="m3-content-container hardware-accelerated pointer-events-auto" :class="{ 'drawer-open': isDrawerOpen }"
    :style="[
      mapContainerStyle,
      { marginTop: '64px' }, // Add top margin to account for header
    ]" ref="mapContainerRef">
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
} from "@studiometa/vue-mapbox-gl";
import mapboxgl from 'mapbox-gl';
import { useMap } from "../../composables/useMap";
import { getGeometry } from "../../services/api";
import WalkRouteLayer from "./WalkRouteLayer.vue";
import WalkMarkers from "./WalkMarkers.vue";

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
  props.mapConfig.maxZoom || 35
);

/**
 * Computed property for map container style
 * Adjusts layout based on drawer state
 */
const mapContainerStyle = computed(() => ({
  position: "absolute",
  inset: "0",
  width: "100vw",
  height: "100vh",
  marginLeft: "var(--md-sys-sidebar-collapsed)", // Always keep margin for sidebar
  paddingRight: "0", // No padding needed on right side
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

  // Setup Mapbox logo positioning
  watchEffect(() => {
    const logoElement = document.querySelector('.mapboxgl-ctrl-logo');
    if (logoElement) {
      const sidebarWidth = 80; // --md-sys-sidebar
      const drawerWidth = props.isDrawerOpen ? 320 : 0;
      const totalWidth = sidebarWidth + drawerWidth;

      logoElement.style.position = 'fixed';
      logoElement.style.bottom = '10px';
      logoElement.style.left = `${totalWidth + 10}px`;
      logoElement.style.right = 'auto';
      logoElement.style.zIndex = '45';
      logoElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  });

  // Wait for style to load before enabling interactions
  map.once("style.load", () => {
    mapLoaded.value = true;
    mapReady.value = true;
  });

  // Listen to continuous map movement to update mapBounds
  map.on("move", () => {
    // Update mapBounds when the map moves
    mapBounds.value = map.getBounds();
    if (!props.selectedWalkId) updateVisibleMarkers(); // Only update markers if no walk is selected
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
  if (!walk) return;

  // Update any selected state
  updateAllMarkerColors(walk.id);

  // Handle the walk selection
  emit('walk-selected', walk);
};

/**
 * Handle popup open walk button click
 * Flies to walk location and emits selection event
 */
const handlePopupOpenWalk = async (event, walk) => {
  event.stopPropagation();
  try {
    // Close all popups first
    if (mapInstance.value) {
      const popups = document.getElementsByClassName("mapboxgl-popup");
      for (const popup of Array.from(popups)) {
        popup.remove();
      }
    }
    // Select the walk to show route and details - the route loading will handle the camera movement
    emit('walk-selected', walk);
  } catch (error) {
    console.error("Error handling walk selection:", error);
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
 * Update marker color
 * Changes marker color based on selection state
 */
const updateMarkerColor = (marker, isSelected) => {
  if (!marker) return;
  const element = marker; // marker is already the correct element
  const svg = element.querySelector("svg");
  if (!svg) return;
  // Select the first <path> regardless of its attributes
  const targetPath = svg.querySelector("path[fill]");
  if (!targetPath) return;
  if (isSelected) {
    targetPath.style.fill = "#6750A4";
  } else {
    targetPath.style.fill = "#3FB1CE";
  }
};

/**
 * Update all marker colors
 * Updates colors for all markers based on selection state
 */
const updateAllMarkerColors = (selectedId = null) => {
  markerRefs.value.forEach((marker, id) => {
    updateMarkerColor(marker, id === selectedId);
  });
};

/**
 * Handle route layer loaded
 * Starts route animation
 */
const handleRouteLayerLoaded = () => {
  console.log(`Route layer loaded`);
};

/**
 * Handle glow layer loaded
 * Logs successful loading of glow layer
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
        setTimeout(() => {
          try {
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

              mapInstance.value.flyTo({
                center: [
                  (bounds.minLng + bounds.maxLng) / 2,
                  (bounds.minLat + bounds.maxLat) / 2
                ],
                zoom: 13,
                pitch: 65,
                bearing: 30,
                duration: 2000,
                essential: true,
                padding: {
                  top: 50,
                  bottom: 50,
                  left: 50,
                  right: 50
                }
              }, {
                // Prevent the moveend event from triggering any route changes
                preserveDrawingBuffer: true
              });
            } else if (coordinates.length === 1) {
              mapInstance.value.flyTo({
                center: coordinates[0],
                zoom: 13,
                pitch: 65,
                bearing: 30,
                duration: 2000,
                essential: true,
                padding: {
                  top: 50,
                  bottom: 50,
                  left: 50,
                  right: 50
                }
              }, {
                preserveDrawingBuffer: true
              });
            }
          } catch (e) {
            console.error("Error with camera movement:", e);
          }
        }, 100);
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

// Lifecycle hooks
onMounted(() => {
  // Initialize spatial index
  updateSpatialIndex();

  // Load route data if walk is selected
  if (props.selectedWalkId) {
    loadRouteData(props.selectedWalkId);
  }
});

onBeforeUnmount(() => {
  // Clean up markers
  for (const marker of markerRefs.value.values()) {
    marker?.remove?.();
  }
  markerRefs.value.clear();

  // Clear collections
  spatialIndex.value.clear();
});
</script>

<style scoped>
.hardware-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
}

.m3-content-container {
  position: absolute;
  inset: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Update to adjust map when drawer is open but keep sidebar visible */
.m3-content-container.drawer-open {
  margin-left: calc(var(--md-sys-sidebar-collapsed) + 320px);
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
</style>