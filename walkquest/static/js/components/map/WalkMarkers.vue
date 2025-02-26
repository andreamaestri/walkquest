<template>
  <div>
    <template
      v-for="walk in walks"
      :key="`${walk.id}-${markerKey}`"
    >
      <MapboxMarker
        :lng-lat="[
          Number(walk.longitude) || Number(walk.lng),
          Number(walk.latitude) || Number(walk.lat),
        ]"
        :color="selectedWalkId === walk.id ? '#6750A4' : '#3FB1CE'"
        :popup="{
          offset: 25,
          anchor: 'bottom',
          closeButton: false,
          closeOnClick: true,
          className: 'm3-popup',
        }"
        @mounted="(marker) => handleMarkerMounted(marker, walk.id)"
        @click="() => handleMarkerClick(walk)"
      >
        <template #popup>
          <div class="flex flex-col">
            <div class="p-4 pb-3">
              <h3 class="m3-title-medium">
                {{ walk.title || walk.walk_name }}
              </h3>
            </div>
            <div class="px-2 pb-2">
              <button
                @click="(event) => handlePopupOpenWalk(event, walk)"
                class="m3-button m3-button-filled w-full"
              >
                <span class="m3-button-label">Open Walk</span>
              </button>
            </div>
          </div>
        </template>
      </MapboxMarker>
    </template>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { MapboxMarker } from "@studiometa/vue-mapbox-gl";

/**
 * Props definition with proper validation
 */
const props = defineProps({
  walks: {
    type: Array,
    required: true,
    validator: (value) => {
      return Array.isArray(value) && value.every(walk => 
        walk && 
        (typeof walk.longitude === 'number' || typeof walk.lng === 'number') &&
        (typeof walk.latitude === 'number' || typeof walk.lat === 'number')
      );
    }
  },
  selectedWalkId: {
    type: [String, Number],
    default: null
  }
});

/**
 * Emits for component communication
 */
const emit = defineEmits(['marker-click', 'marker-mounted', 'popup-open-walk']);

// Component state
const markerKey = ref(0);

/**
 * Handle marker click
 * Emits event to parent component
 */
const handleMarkerClick = (walk) => {
  emit('marker-click', walk);
};

/**
 * Handle marker mounted
 * Emits event to parent component with marker reference
 */
const handleMarkerMounted = (marker, walkId) => {
  emit('marker-mounted', marker, walkId);
};

/**
 * Handle popup open walk button click
 * Emits event to parent component
 */
const handlePopupOpenWalk = (event, walk) => {
  emit('popup-open-walk', event, walk);
};

/**
 * Refresh markers
 * Forces re-rendering of markers by updating key
 */
const refreshMarkers = () => {
  markerKey.value++;
};

// Expose methods to parent component
defineExpose({
  refreshMarkers
});
</script>

<style scoped>
/* Popup styles */
:deep(.m3-popup) {
  max-width: none !important;
  width: min(280px, calc(100vw - 32px));
  font-family: "Roboto", system-ui, -apple-system, BlinkMacSystemFont,
    sans-serif;
}

:deep(.mapboxgl-popup-content) {
  border-radius: 12px;
  box-shadow: var(--md-sys-elevation-2);
  padding: 0 !important;
  background: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
  min-width: 0;
  width: 100%;
  border: 1px solid rgb(var(--md-sys-color-outline-variant));
  overflow: hidden;
}

:deep(.mapboxgl-popup-content h3) {
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 500;
  margin: 0;
  letter-spacing: 0.15px;
}

:deep(.mapboxgl-popup-content .m3-button) {
  width: 100%;
  min-height: 40px;
  justify-content: center;
  margin: 0;
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.1px;
  padding: 0 16px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.mapboxgl-popup-content .m3-button:hover) {
  background-color: rgb(var(--md-sys-color-primary) / 0.92);
}

:deep(.mapboxgl-popup-content .m3-button:active) {
  background-color: rgb(var(--md-sys-color-primary) / 0.85);
  transform: scale(0.98);
}

/* Hide the popup tip */
:deep(.mapboxgl-popup-tip) {
  display: none !important;
}

/* Add elevation when popup is open */
:deep(.mapboxgl-popup) {
  will-change: transform;
  transform-origin: bottom center;
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
</style>