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
          closeButton: true,
          closeOnClick: true,
          className: 'm3-popup',
          maxWidth: 'none',
          focusTrap: true
        }"
        class="map-marker"
        @mounted="(marker) => handleMarkerMounted(marker, walk.id)"
        @click="() => handleMarkerClick(walk)"
      >
        <template #popup>
          <div class="flex flex-col walk-popup">
            <div class="p-4 pb-3">
              <h3 class="m3-title-medium mb-3">
                {{ walk.title || walk.walk_name }}
              </h3>
              <div class="flex flex-wrap gap-3 text-sm">
                <div class="flex items-center gap-2 popup-info-badge">
                  <Icon icon="mdi:map-marker-distance" class="w-4 h-4" />
                  <span>{{ walk.distance?.toFixed(1) || 0 }} miles</span>
                </div>
                <div v-if="walk.duration" class="flex items-center gap-2 popup-info-badge">
                  <Icon icon="mdi:clock-outline" class="w-4 h-4" />
                  <span>{{ walk.duration }} mins</span>
                </div>
                <div v-if="walk.steepness_level" class="flex items-center gap-2 popup-difficulty-badge"
                     :class="getDifficultyClass(walk.steepness_level)">
                  <Icon icon="mdi:terrain" class="w-4 h-4" />
                  <span>{{ walk.steepness_level }}</span>
                </div>
              </div>
              
              <div class="flex flex-wrap gap-2 mt-3">
                <div v-if="walk.has_pub" class="popup-feature-badge">
                  <Icon icon="mdi:beer" class="popup-feature-icon" />
                  <span>Pub</span>
                </div>
                <div v-if="walk.has_cafe" class="popup-feature-badge">
                  <Icon icon="mdi:coffee" class="popup-feature-icon" />
                  <span>Café</span>
                </div>
                <div v-if="walk.has_parking" class="popup-feature-badge">
                  <Icon icon="mdi:parking" class="popup-feature-icon" />
                  <span>Parking</span>
                </div>
              </div>
            </div>
            <div class="px-4 pb-4">
              <button
                @click="(event) => handlePopupOpenWalk(event, walk)"
                class="m3-button m3-button-filled"
                aria-label="View walk details"
                role="button"
              >
                <Icon icon="mdi:information-outline" class="mr-2 w-5 h-5" />
                <span class="m3-button-label">View Details</span>
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
 * Get CSS class for difficulty level
 */
const getDifficultyClass = (level) => {
  const levelMap = {
    "Village Trail": "difficulty-easy",
    "Merchant Path": "difficulty-medium",
    "Warden's Ascent": "difficulty-hard",
    "Easy": "difficulty-easy",
    "Moderate": "difficulty-medium",
    "Challenging": "difficulty-hard"
  };
  return levelMap[level] || "";
};

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
@import "tailwindcss";
@import "../../../css/material3.css";

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
</style>