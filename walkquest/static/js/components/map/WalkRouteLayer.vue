<template>
  <div>
    <MapboxSource
      v-if="isValidSourceData"
      :id="routeSourceId"
      :options="{
        type: 'geojson',
        data: validRouteData,
      }"
    />
    <MapboxLayer
      v-if="isValidSourceData"
      :id="routeGlowLayerId"
      :options="{
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#52ebff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            12,
            15,
            18,
          ],
          'line-opacity': 0.6,
          'line-blur': 8,
        },
      }"
      @mb-layer-loaded="handleGlowLayerLoaded"
    />
    <MapboxLayer
      v-if="isValidSourceData"
      :id="routeBgLayerId"
      :options="{
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': 'black',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6,
            1,
            8,
            3,
          ],
          'line-opacity': 0.9,
        },
      }"
    />
    <MapboxLayer
      v-if="isValidSourceData"
      :id="routeAnimatedLayerId"
      :options="{
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            4,
            15,
            8,
          ],
          'line-opacity': 0.8,
          'line-dasharray': [0, 4, 3],
        },
      }"
      @mb-layer-loaded="handleRouteLayerLoaded"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { MapboxSource, MapboxLayer } from "@studiometa/vue-mapbox-gl";
import { useMap } from "../../composables/useMap";

/**
 * Props definition with proper validation
 */
const props = defineProps({
  routeData: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && value.type && value.geometry && Array.isArray(value.geometry.coordinates);
    }
  }
});

/**
 * Emits for component communication
 */
const emit = defineEmits(['route-layer-loaded', 'glow-layer-loaded']);

// Get map instance from composable
const { mapInstance } = useMap();

// Animation frame reference for cleanup
let animationFrame = null;

// Generate unique IDs for map sources and layers
const routeSourceId = ref(
  `route-source-${Math.random().toString(36).substring(2, 10)}`
);
const routeGlowLayerId = ref(
  `route-glow-layer-${Math.random().toString(36).substring(2, 10)}`
);
const routeBgLayerId = ref(
  `route-bg-layer-${Math.random().toString(36).substring(2, 10)}`
);
const routeAnimatedLayerId = ref(
  `route-animated-layer-${Math.random().toString(36).substring(2, 10)}`
);

/**
 * Computed property to validate route data
 * Ensures data is properly structured before rendering
 */
const validRouteData = computed(() => {
  if (!props.routeData) return null;

  // Basic structure validation
  if (!props.routeData.type || !props.routeData.geometry) {
    console.warn("Invalid route data structure", props.routeData);
    return null;
  }

  // Check coordinates
  const coords = props.routeData.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) {
    console.warn("Invalid coordinates in route data", props.routeData);
    return null;
  }

  // Validate each coordinate
  for (const coord of coords) {
    if (!Array.isArray(coord) || coord.length < 2 || 
        isNaN(coord[0]) || isNaN(coord[1])) {
      console.warn("Invalid coordinate found", coord);
      return null;
    }
  }

  return props.routeData;
});

/**
 * Computed property to safely render MapboxSource
 * Ensures all dependencies are available before rendering
 */
const isValidSourceData = computed(() => {
  return validRouteData.value !== null && routeSourceId.value;
});

/**
 * Handle route layer loaded event
 * Starts dash animation for route layer
 */
const handleRouteLayerLoaded = () => {
  console.log(`Route layer ${routeAnimatedLayerId.value} loaded`);
  
  if (!mapInstance.value) {
    console.warn("Map reference not available");
    return;
  }

  try {
    // Check if the layer exists before starting animation
    if (mapInstance.value.getLayer(routeAnimatedLayerId.value)) {
      console.log("Starting dash animation for route layer");
      
      // Cancel any existing animation
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      
      // Start a new animation
      animationFrame = requestAnimationFrame(animateDashArray);
    } else {
      console.warn(`Layer ${routeAnimatedLayerId.value} not found after load event`);
    }
  } catch (error) {
    console.error("Error starting animation:", error);
  }
  
  emit('route-layer-loaded');
};

/**
 * Handle glow layer loaded event
 * Emits event to parent component
 */
const handleGlowLayerLoaded = () => {
  console.log('Glow layer loaded');
  emit('glow-layer-loaded');
};

/**
 * Dash array sequence for animation
 * Creates a smooth flowing effect along the route
 */
const dashArraySequence = [
  [0, 4, 3], // 1. Start - Dash is present
  [0.2, 4, 2.8], // 2.
  [0.4, 4, 2.6], // 3.
  [0.6, 4, 2.4], // 4.
  [0.8, 4, 2.2], // 5.
  [1, 4, 2], // 6.
  [1.2, 4, 1.8], // 7.
  [1.4, 4, 1.6], // 8.
  [1.6, 4, 1.4], // 9.
  [1.8, 4, 1.2], // 10.
  [2, 4, 1], // 11.
  [2.2, 4, 0.8], // 12.
  [2.4, 4, 0.6], // 13.
  [2.6, 4, 0.4], // 14.
  [2.8, 4, 0.2], // 15.
];

/**
 * Animate dash array
 * Updates line-dasharray property to create flowing effect
 */
const animateDashArray = (timestamp) => {
  if (!mapInstance.value) {
    // If map isn't ready, don't continue animation
    return;
  }

  try {
    // Check if the layer exists before attempting to modify it
    if (mapInstance.value.getLayer(routeAnimatedLayerId.value)) {
      // Update dash array based on current time
      const index = Math.floor((timestamp / 200) % dashArraySequence.length);
      const dashValue = dashArraySequence[index];

      mapInstance.value.setPaintProperty(
        routeAnimatedLayerId.value,
        "line-dasharray",
        dashValue
      );
      
      // Continue animation loop if the layer still exists
      animationFrame = requestAnimationFrame(animateDashArray);
    } else {
      console.warn(`Layer ${routeAnimatedLayerId.value} not found, stopping animation`);
    }
  } catch (error) {
    console.error("Error during animation:", error);
    // Clean up animation on error
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }
};

// Clean up animation on unmount
onBeforeUnmount(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
});
</script>