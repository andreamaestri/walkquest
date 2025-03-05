<template>
  <div>
    <!-- Navigation Drawer for mobile -->
    <Transition :css="false" @enter="onDrawerEnter" @leave="onDrawerLeave">
      <div
        v-if="mobileMenuOpen && isMobile"
        ref="drawerRef"
        class="fixed inset-0 z-20 m3-navigation-drawer transform-gpu"
        @click.self="closeMobileMenu"
      >
        <div class="m3-drawer-content h-full flex flex-col">
          <!-- Drawer Header -->
          <div class="px-6 py-4 flex justify-between items-center">
            <span class="m3-headline-small">WalkQuest</span>
            <button
              @click="closeMobileMenu"
              class="m3-icon-button"
            >
              <div class="m3-state-layer">
                <Icon icon="mdi:close" class="text-[24px]" />
              </div>
            </button>
          </div>
          <!-- Drawer Content -->
          <div class="flex-1 overflow-hidden">
            <WalkList
              :error="error"
              :walks="walks"
              :selected-walk-id="selectedWalkId"
              :expanded-walk-ids="expandedWalkIds"
              @walk-selected="handleWalkSelection"
              @walk-expanded="handleWalkExpanded"
            />
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mobile toggle button -->
    <Transition
      :css="false"
      @enter="onMobileButtonEnter"
      @leave="onMobileButtonLeave"
    >
      <button
        v-if="isMobile && !mobileMenuOpen"
        ref="mobileButtonRef"
        @click="openMobileMenu"
        class="m3-fab-mobile"
      >
        <i class="icon-menu"></i>
        <span class="sr-only">Open menu</span>
      </button>
    </Transition>

    <!-- Mobile location search bottom sheet -->
    <BottomSheet
      v-if="isMobile"
      v-model="isLocationSearchVisible"
      :blocking="false"
      class="pb-safe-area-inset-bottom"
    >
      <div class="p-4">
        <SearchView
          v-model="searchQuery"
          :search-mode="'locations'"
          :mapbox-token="mapboxToken"
          @location-selected="handleLocationSelected"
        />
      </div>
    </BottomSheet>

    <!-- Mobile navigation bar -->
    <div
      v-if="isMobile"
      class="fixed bottom-0 left-0 right-0 bg-surface z-40 shadow-lg"
    >
      <div class="flex justify-around items-center h-16 px-4">
        <button
          class="m3-nav-button"
          :class="{ active: searchMode === 'walks' }"
          @click="setSearchMode('walks')"
        >
          <Icon icon="mdi:compass-outline" class="text-2xl" />
          <span class="text-xs">Explore</span>
        </button>
        <button
          class="m3-nav-button"
          :class="{ active: searchMode === 'locations' }"
          @click="setSearchMode('locations')"
        >
          <Icon icon="mdi:map-search" class="text-2xl" />
          <span class="text-xs">Find Nearby</span>
        </button>
        <button class="m3-nav-button" @click="openMobileMenu">
          <Icon icon="mdi:menu" class="text-2xl" />
          <span class="text-xs">Menu</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { animate } from "motion";
import { Icon } from "@iconify/vue";
import { useUiStore } from "../../stores/ui";
import { useSearchStore } from "../../stores/searchStore";
import WalkList from "../WalkList.vue";
import BottomSheet from '@douxcode/vue-spring-bottom-sheet';
import SearchView from "../SearchView.vue";

/**
 * Props definition with proper validation
 */
const props = defineProps({
  walks: {
    type: Array,
    required: true
  },
  selectedWalkId: {
    type: [String, Number],
    default: null
  },
  error: {
    type: [String, Error],
    default: null
  },
  mapboxToken: {
    type: String,
    required: true
  }
});

/**
 * Emits for component communication
 */
const emit = defineEmits(['walk-selected', 'walk-expanded', 'location-selected']);

// Component refs
const drawerRef = ref(null);
const mobileButtonRef = ref(null);

// Initialize stores
const uiStore = useUiStore();
const searchStore = useSearchStore();

// Component state
const expandedWalkIds = ref([]);

// Computed properties
const isMobile = computed(() => uiStore.isMobile);
const mobileMenuOpen = computed(() => uiStore.mobileMenuOpen);
const searchMode = computed(() => searchStore.searchMode);
const searchQuery = computed({
  get: () => searchStore.searchQuery,
  set: (value) => searchStore.setSearchQuery(value)
});

/**
 * Computed property for location search visibility
 */
const isLocationSearchVisible = computed({
  get: () => searchMode.value === "locations",
  set: (value) => {
    searchStore.setSearchMode(value ? "locations" : "walks");
  }
});

/**
 * Handle walk selection
 * Closes mobile menu and emits selection event
 */
const handleWalkSelection = (walk) => {
  closeMobileMenu();
  emit('walk-selected', walk);

  // Use consistent route names with the rest of the app
  if (walk?.walk_id) {
    router.push({ name: 'walk', params: { walk_slug: walk.walk_id } });
  } else {
    router.push({ name: 'walk-by-id', params: { walk_id: walk.id } });
  }
};

/**
 * Handle walk expansion toggle
 * Updates expandedWalkIds and emits event
 */
const handleWalkExpanded = ({ walkId, expanded }) => {
  expandedWalkIds.value = expanded
    ? [...new Set([...expandedWalkIds.value, walkId])]
    : expandedWalkIds.value.filter((id) => id !== walkId);
  
  emit('walk-expanded', { walkId, expanded });
};

/**
 * Handle location selection
 * Emits event to parent component
 */
const handleLocationSelected = (location) => {
  emit('location-selected', location);
};

/**
 * Set search mode
 * Updates search mode in store
 */
const setSearchMode = (mode) => {
  searchStore.setSearchMode(mode);
  
  // When changing search mode, ensure we're on the home route
  router.push({ name: 'home' });
};

/**
 * Open mobile menu
 * Updates mobile menu state in store
 */
const openMobileMenu = () => {
  uiStore.setMobileMenuOpen(true);
};

/**
 * Close mobile menu
 * Updates mobile menu state in store
 */
const closeMobileMenu = () => {
  uiStore.setMobileMenuOpen(false);
};

/**
 * Animation functions for drawer and mobile button
 * Uses motion library for smooth animations
 */
async function onDrawerEnter(el, onComplete) {
  await animateInterfaceElement(
    el,
    { type: "entry", direction: "vertical" },
    onComplete
  );
}

async function onDrawerLeave(el, onComplete) {
  await animateInterfaceElement(
    el,
    { type: "exit", direction: "vertical" },
    onComplete
  );
}

async function onMobileButtonEnter(el, onComplete) {
  await animateInterfaceElement(
    el,
    { type: "entry", direction: "vertical" },
    onComplete
  );
}

async function onMobileButtonLeave(el, onComplete) {
  await animateInterfaceElement(
    el,
    { type: "exit", direction: "vertical" },
    onComplete
  );
}

/**
 * Helper function for interface element animations
 * Provides consistent animation behavior across components
 */
async function animateInterfaceElement(el, options = {}, onComplete) {
  const {
    type = "entry",
    direction = "vertical",
    duration = 0.3,
    easing = type === "entry" ? [0.2, 0, 0.2, 1] : [0.4, 0, 1, 1],
    reverseDirection = false,
  } = options;

  if (!el) {
    if (onComplete) onComplete();
    return;
  }

  const animation = {
    opacity: type === "entry" ? [0, 1] : [1, 0],
    scale: type === "entry" ? [0.95, 1] : [1, 0.95],
  };

  if (direction === "horizontal") {
    animation.x = type === "entry"
      ? [reverseDirection ? 100 : -100, 0]
      : [0, reverseDirection ? -100 : 100];
  } else {
    animation.y = type === "entry" ? [10, 0] : [0, 10];
  }

  try {
    await animate(el, animation, {
      duration,
      easing,
    }).finished;
  } catch (error) {
    console.error("Animation error:", error);
  }
  
  if (onComplete) onComplete();
}
</script>

<style scoped>
.m3-navigation-drawer {
  background-color: rgba(0, 0, 0, 0.4);
}

.m3-drawer-content {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 85%;
  max-width: 360px;
  background-color: rgb(var(--md-sys-color-surface));
  box-shadow: var(--md-sys-elevation-level3);
}

.m3-fab-mobile {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--md-sys-elevation-level3);
  z-index: 30;
}

.m3-nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.m3-nav-button.active {
  color: rgb(var(--md-sys-color-primary));
}

.bg-surface {
  background-color: rgb(var(--md-sys-color-surface));
}

.m3-headline-small {
  font-family: var(--md-sys-typescale-headline-small-font);
  font-size: var(--md-sys-typescale-headline-small-size);
  font-weight: var(--md-sys-typescale-headline-small-weight);
  line-height: var(--md-sys-typescale-headline-small-line-height);
  letter-spacing: var(--md-sys-typescale-headline-small-tracking);
  color: rgb(var(--md-sys-color-on-surface));
}

.m3-icon-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface));
  transition: background-color 0.2s;
}

.m3-icon-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
}

.m3-icon-button:active {
  background-color: rgba(var(--md-sys-color-on-surface), 0.12);
}

.m3-navigation-sheet {
  --vsbs-backdrop-bg: rgba(0, 0, 0, 0.4);
  --vsbs-shadow-color: rgba(0, 0, 0, 0.2);
  --vsbs-background: rgb(var(--md-sys-color-surface));
  --vsbs-border-radius: 28px 28px 0 0;
  --vsbs-max-width: 100%;
  --vsbs-border-color: rgba(var(--md-sys-color-outline), 0.12);
  --vsbs-padding-x: 0px;
  --vsbs-handle-background: rgba(var(--md-sys-color-on-surface), 0.28);
}

/* Ensure bottom sheet accounts for safe areas */
.m3-navigation-sheet :deep([data-vsbs-sheet]) {
  min-height: 200px !important;
  height: auto !important;
  max-height: calc(100vh - var(--sab, 0px)) !important;
  padding-top: env(safe-area-inset-top, 0px);
}

.m3-navigation-sheet :deep([data-vsbs-content]) {
  min-height: 200px;
  height: 100% !important;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  padding-top: env(safe-area-inset-top, 0px);
  box-sizing: border-box;
}
</style>