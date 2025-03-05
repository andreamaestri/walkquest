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
      :id="routeLayerId"
      :options="{
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 3,
          'line-opacity': 1,
          'line-emissive-strength': 1,
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

// Generate unique IDs for map source and layer
const routeSourceId = ref(
  `route-source-${Math.random().toString(36).substring(2, 10)}`
);
const routeLayerId = ref(
  `route-layer-${Math.random().toString(36).substring(2, 10)}`
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
 */
const handleRouteLayerLoaded = () => {
  console.log(`Route layer ${routeLayerId.value} loaded`);
  emit('route-layer-loaded');
  emit('glow-layer-loaded'); // Keep emitting both events for compatibility
};
</script>