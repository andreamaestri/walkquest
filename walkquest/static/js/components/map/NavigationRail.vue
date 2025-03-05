<template>
  <div
    ref="sidebarRef"
    class="m3-navigation-rail"
    :class="[
      { 'is-expanded': isExpanded },
      { 'is-collapsed': selectedWalkId },
    ]"
    role="navigation"
    aria-label="Main navigation"
  >
    <div class="h-full flex flex-col relative">
      <!-- Rail Header -->
      <div class="m3-rail-header">
        <!-- Menu button -->
        <button class="m3-rail-item menu-button" @click="toggleExpanded" aria-label="Toggle menu">
          <div class="m3-state-layer">
            <Icon icon="mdi:menu" class="m3-rail-icon text-[24px]" />
          </div>
        </button>
        <!-- FAB - keeping color as requested -->
        <button class="m3-rail-fab" @click="handleFabClick" aria-label="WalkQuest Home">
          <Icon icon="mdi:hiking" class="text-[24px]" />
          <span class="m3-rail-fab-text" v-if="isExpanded">WalkQuest</span>
        </button>
      </div>
      
      <!-- Navigation items -->
      <nav class="m3-rail-items">
        <button
          class="m3-rail-item"
          :class="{
            'is-active': searchMode === 'walks' && !selectedWalkId,
          }"
          @click="handleExploreClick"
          aria-label="Explore walks"
        >
          <div class="m3-rail-content">
            <div class="m3-rail-icon-container">
              <Icon icon="mdi:compass" class="m3-rail-icon filled-icon" />
              <Icon
                icon="mdi:compass-outline"
                class="m3-rail-icon outlined-icon"
              />
            </div>
            <span class="m3-rail-label">Explore</span>
          </div>
        </button>
        
        <!-- Location Search Button -->
        <button
          class="m3-rail-item"
          :class="{
            'is-active': searchMode === 'locations',
          }"
          @click="handleLocationSearchClick"
          aria-label="Find nearby walks"
        >
          <div class="m3-rail-content">
            <div class="m3-rail-icon-container">
              <Icon icon="mdi:map-marker" class="m3-rail-icon filled-icon" />
              <Icon
                icon="mdi:map-marker-outline"
                class="m3-rail-icon outlined-icon"
              />
            </div>
            <span class="m3-rail-label">Nearby</span>
          </div>
        </button>
        
        <!-- Categories Button -->
        <button
          class="m3-rail-item"
          :class="{
            'is-active': searchMode === 'categories',
          }"
          @click="handleCategoriesClick"
          aria-label="Browse by categories"
        >
          <div class="m3-rail-content">
            <div class="m3-rail-icon-container">
              <Icon icon="mdi:tag-multiple" class="m3-rail-icon filled-icon" />
              <Icon
                icon="mdi:tag-multiple-outline"
                class="m3-rail-icon outlined-icon"
              />
            </div>
            <span class="m3-rail-label">Categories</span>
          </div>
        </button>
      </nav>
      
      <!-- Main Content Area -->
      <div
        class="m3-rail-content-area"
        :class="{ 'content-hidden': !isExpanded }"
      >
        <!-- Walk List -->
        <div
          class="m3-walks-list"
          :class="{ 'overflow-hidden': !isExpanded }"
        >
          <WalkList
            v-model="searchQuery"
            :walks="filteredWalks"
            :selected-walk-id="selectedWalkId"
            :expanded-walk-ids="expandedWalkIds"
            :is-compact="!isExpanded"
            @walk-selected="handleWalkSelection"
            @walk-expanded="handleWalkExpanded"
            v-show="isExpanded"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { animate } from "motion";
import { Icon } from "@iconify/vue";
import { useUiStore } from "../../stores/ui";
import { useSearchStore } from "../../stores/searchStore";
import { useLocationStore } from "../../stores/locationStore";
import WalkList from "../WalkList.vue";

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
  filteredWalks: {
    type: Array,
    required: true
  }
});

/**
 * Emits for component communication
 */
const emit = defineEmits(['walk-selected', 'fab-click', 'walk-expanded', 'drawer-closed', 'location-selected']);

// Router and stores
const router = useRouter();
const route = useRoute();
const uiStore = useUiStore();
const searchStore = useSearchStore();
const locationStore = useLocationStore();

// Component state
const sidebarRef = ref(null);
const expandedWalkIds = ref(
  localStorage.getItem("expandedWalks") 
    ? JSON.parse(localStorage.getItem("expandedWalks")) 
    : []
);
const isExpanded = ref(localStorage.getItem("sidebarExpanded") === "true");

// Computed properties
const searchQuery = computed({
  get: () => searchStore.searchQuery,
  set: (value) => searchStore.setSearchQuery(value)
});

const searchMode = computed(() => searchStore.searchMode);

/**
 * Computed property to determine sidebar visibility
 * Combines multiple conditions for better readability
 */
const visible = computed(() => {
  return !uiStore.isMobile && 
         uiStore.showSidebar && 
         !uiStore.fullscreen;
});

/**
 * Toggle sidebar expanded state
 * Persists state to localStorage for session continuity
 */
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
  localStorage.setItem("sidebarExpanded", isExpanded.value.toString());
  
  // If we're expanding and have a selected walk, emit to close drawer
  if (isExpanded.value && props.selectedWalkId) {
    emit('walk-selected', null);
  }
};

/**
 * Explicitly expand the sidebar
 * Used when closing the drawer to return to expanded state
 */
const expandSidebar = () => {
  if (!isExpanded.value) {
    isExpanded.value = true;
    localStorage.setItem("sidebarExpanded", "true");
  }
};

/**
 * Handle FAB button click
 * Navigates to home and expands sidebar
 */
const handleFabClick = async () => {
  await router.push({ name: "home" });
  
  if (!isExpanded.value) {
    expandSidebar();
  }
  
  // If we have a selected walk, deselect it
  if (props.selectedWalkId) {
    emit('walk-selected', null);
  }
  
  emit('fab-click');
};

/**
 * Handle walk selection
 * Collapses sidebar and emits selection event
 */
const handleWalkSelection = (walk) => {
  if (walk?.id) {
    // Always collapse sidebar when a walk is selected
    isExpanded.value = false;
    localStorage.setItem("sidebarExpanded", "false");
    emit('walk-selected', walk);

    // Use walk.walk_id for the slug-based route if available
    if (walk.walk_id) {
      router.push({ name: 'walk', params: { walk_slug: walk.walk_id } });
    } else {
      router.push({ name: 'walk-by-id', params: { walk_id: walk.id } });
    }
  }
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
  emit('walk-expanded', { walkId, expanded });
};

/**
 * Handle explore button click
 * Sets search mode to walks and clears location
 */
const handleExploreClick = () => {
  searchStore.setSearchMode("walks");
  locationStore.clearLocation();
  searchStore.setError(null);
  
  // If we have a selected walk, deselect it
  if (props.selectedWalkId) {
    emit('walk-selected', null);
  }
  
  // Always ensure sidebar is expanded when using Explore
  expandSidebar();
};

/**
 * Handle location search button click
 * Sets search mode to locations and expands sidebar
 */
const handleLocationSearchClick = () => {
  searchStore.setSearchMode("locations");
  
  // Always ensure sidebar is expanded when using Find Nearby
  expandSidebar();
  
  // If we have a selected walk, deselect it and return to home
  if (props.selectedWalkId) {
    emit('walk-selected', null);
    router.push({ name: 'home' });
  }
  
  searchStore.setError(null);

  // If we have a saved location, make sure it's displayed
  if (locationStore.userLocation) {
    nextTick(() => {
      emit('location-selected', {
        center: [
          locationStore.userLocation.longitude,
          locationStore.userLocation.latitude,
        ],
        zoom: 14,
        place_name: locationStore.userLocation.place_name,
        pitch: 60,
        bearing: 30,
      });
    });
  }
};

/**
 * Handle categories button click
 * Sets search mode to categories and expands sidebar
 */
const handleCategoriesClick = () => {
  searchStore.setSearchMode("categories");
  
  // Always ensure sidebar is expanded when using Categories
  expandSidebar();
  
  // If we have a selected walk, deselect it and return to home
  if (props.selectedWalkId) {
    emit('walk-selected', null);
    router.push({ name: 'home' });
  }
  
  searchStore.setError(null);
};

// Make the expandSidebar function available to parent components
defineExpose({ expandSidebar });

// Watch for search mode changes
watch(
  () => searchStore.searchMode,
  (newMode) => {
    if (newMode === "locations") {
      // Ensure sidebar is expanded when switching to location search
      if (!isExpanded.value) {
        isExpanded.value = true;
        localStorage.setItem("sidebarExpanded", "true");
      }
    }
  }
);

// Watch for sidebar visibility changes
watch(
  [isExpanded, visible],
  ([newExpanded, newVisible]) => {
    nextTick(() => {
      // Handle scroller updates
      const scroller = document.querySelector(".vue-recycle-scroller");
      if (scroller?.__vueParentComponent?.ctx?.updateSize) {
        scroller.__vueParentComponent.ctx.updateSize();
      }
    });
  }
);

// Watch for changes in selectedWalkId to ensure UI is consistent
watch(
  () => props.selectedWalkId,
  (newSelectedWalkId) => {
    if (newSelectedWalkId) {
      // When a walk is selected (from any source including search),
      // ensure the rail is collapsed
      isExpanded.value = false;
      localStorage.setItem("sidebarExpanded", "false");
    }
  }
);

// Animate rail elements on mount
onMounted(() => {
  // Animate rail header
  const railHeader = document.querySelector(".m3-rail-header");
  if (railHeader) {
    animate(
      railHeader,
      { opacity: [0, 1], y: [-20, 0] },
      { duration: 0.4, easing: [0.2, 0, 0.2, 1] }
    );
  }

  // Animate menu button
  const menuButton = document.querySelector(".menu-button");
  if (menuButton) {
    animate(
      menuButton,
      { scale: [0.9, 1], opacity: [0, 1] },
      {
        duration: 0.4,
        easing: [0.2, 0, 0.2, 1],
        delay: 0.1,
      }
    );
  }

  // Animate FAB
  const fab = document.querySelector(".m3-rail-fab");
  if (fab) {
    animate(
      fab,
      { scale: [0.9, 1], opacity: [0, 1] },
      {
        duration: 0.4,
        easing: [0.2, 0, 0.2, 1],
        delay: 0.1,
      }
    );
  }

  // Animate nav items
  const navItems = document.querySelector(".m3-rail-items");
  if (navItems) {
    animate(
      navItems,
      { opacity: [0, 1], y: [20, 0] },
      {
        duration: 0.4,
        easing: [0.2, 0, 0.2, 1],
        delay: 0.2,
      }
    );
  }

  // Animate content area
  const contentArea = document.querySelector(".m3-rail-content-area");
  if (contentArea) {
    animate(
      contentArea,
      { opacity: [0, 1], scale: [0.95, 1] },
      {
        duration: 0.4,
        easing: [0.2, 0, 0.2, 1],
        delay: 0.3,
      }
    );
  }
});
</script>

<style scoped>
/* Navigation rail styles - updated to MD3 specs */
.m3-navigation-rail { 
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 30; /* Higher z-index to ensure proper layering on top of drawer */
  background: rgb(var(--md-sys-color-surface));
  box-shadow: var(--md-sys-elevation-1);
  transition: transform 0.3s var(--md-sys-motion-easing-standard), 
              box-shadow 0.3s var(--md-sys-motion-easing-standard),
              width 0.3s var(--md-sys-motion-easing-standard); /* Added width transition */
  visibility: visible !important;
  pointer-events: auto !important;
  width: var(--md-sys-sidebar-collapsed);
  isolation: isolate; /* Creates a new stacking context for proper z-index */
  border-radius: 0 16px 16px 0; /* MD3 rounded corners */
  overflow: hidden;
  @media (max-width: 768px) {
    display: none;
  }
}

/* Add expanded state width */
.m3-navigation-rail.is-expanded {
  width: 412px; /* Standard navigation drawer width */
}

/* Interaction styles for when drawer is open */
.m3-navigation-rail.is-collapsed {
  box-shadow: none;
  z-index: 40; /* Increase z-index when navigation needs to be above drawer */
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: 1px solid rgba(var(--md-sys-color-outline-variant), 0.5);
  transition: cubic-bezier(0.075, 0.82, 0.165, 1) 0.3s;
  box-shadow: var(--md-sys-elevation-1);
}

/* Content area transitions */
.m3-rail-content-area {
  transition: opacity 0.25s var(--md-sys-motion-easing-standard), 
              visibility 0.25s var(--md-sys-motion-easing-standard);
}

.m3-rail-content-area.content-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* Rail header & items */
.m3-rail-header {
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Menu button - conforms to MD3 icon button specs */
.menu-button {
  width: 48px;
  height: 48px;
  margin: 0 auto 4px;
  padding: 0;
  border-radius: 50%;
}

/* Rail FAB - kept original styling as requested */
.m3-rail-fab {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  margin: 8px auto;
  transition: all 0.2s var(--md-sys-motion-easing-standard);
}

.m3-rail-fab-text {
  text-align: center;
  margin-left: -22px;
  flex: 1;
  justify-items: center;
  font-size: 27px;
  font-weight: 400;
}

/* Navigation items container - keep centered even when expanded */
.m3-rail-items {
  display: flex;
  flex-direction: column;
  align-items: center; /* Always center-aligned */
  width: 100%;
  padding: 4px 0;
  gap: 12px; /* MD3 standard spacing */
  z-index: 10; /* Ensure these are on top of drawer content */
}

/* Remove alignment changes for expanded state */
.is-expanded .m3-rail-items {
  padding: 4px 0; /* Keep padding consistent with collapsed state */
}

/* Navigation item styling - maintain vertical layout */
.m3-rail-item {
  width: 56px;
  height: 28px;
  margin-bottom: 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 16px; /* Add border radius for active state */
  transition: background-color 0.2s var(--md-sys-motion-easing-standard);
  z-index: 1; /* Ensure items are above other elements in the rail */
}

/* Keep rail items same size and layout when expanded */
.is-expanded .m3-rail-item {
  width: 56px; /* Keep consistent width */
  height: 28px; /* Keep consistent height */
  padding: 0;  /* Keep consistent padding */
  justify-content: center; /* Keep centered */
}

/* Content layout - always vertical */
.m3-rail-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  transition: all 0.3s var(--md-sys-motion-easing-standard);
}

/* Keep rail content in column direction even when expanded */
.is-expanded .m3-rail-content {
  flex-direction: column;
  padding-left: 0;
}

/* Icon container - consistent in both states */
.m3-rail-icon-container {
  position: relative;
  width: 24px;
  height: 32px;
  display: flex;
  top: 18px;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  border-radius: 16px;
  transition: all 0.3s var(--md-sys-motion-easing-standard);
}

/* Keep icon container positioning the same when expanded */
.is-expanded .m3-rail-icon-container {
  top: 10px; /* Keep same top position */
  margin-bottom: 10px; /* Keep same bottom margin */
  margin-right: 0; /* No right margin */
}

/* Only modify the FAB when expanded */
.is-expanded .m3-rail-fab {
  width: calc(100% - 24px);
  border-radius: 28px;
  justify-content: flex-start;
  padding-left: 16px;
}

/* Improved icon animations */
.filled-icon, .outlined-icon {
  position: absolute;
  left: 0;
  top: 0;
  width: 24px;
  height: 24px;
  transition: opacity 0.3s var(--md-sys-motion-easing-emphasized);
  font-size: 24px;
}

/* Icon state transitions */
.filled-icon {
  opacity: 0;
}

.outlined-icon {
  opacity: 1;
}

/* Hover and active states for icons */
.m3-rail-item:hover .filled-icon,
.m3-rail-item.is-active .filled-icon {
  opacity: 1;
}

.m3-rail-item:hover .outlined-icon,
.m3-rail-item.is-active .outlined-icon {
  opacity: 0;
}

/* Explicitly set the expanded state icon behavior to match collapsed state */
.is-expanded .m3-rail-item:hover .filled-icon,
.is-expanded .m3-rail-item.is-active .filled-icon {
  opacity: 1;
}

.is-expanded .m3-rail-item:hover .outlined-icon,
.is-expanded .m3-rail-item.is-active .outlined-icon {
  opacity: 0;
}

/* Label styling per MD3 */
.m3-rail-label {
  display: block;
  margin-top: 4px;
  font-size: var(--md-sys-typescale-label-medium-size, 12px);
  line-height: var(--md-sys-typescale-label-medium-line-height, 16px);
  font-weight: var(--md-sys-typescale-label-medium-weight, 500);
  letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
  text-align: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: color 0.2s var(--md-sys-motion-easing-standard),
              margin-top 0.3s var(--md-sys-motion-easing-standard);
}

/* Adjust label position and style in expanded mode */
.is-expanded .m3-rail-label {
  margin-top: 4px; /* Keep consistent with collapsed state */
  text-align: center; /* Keep text centered */
  font-size: var(--md-sys-typescale-label-medium-size, 12px); /* Keep consistent font size */
}

/* Apply active background to rail item instead */
.m3-rail-item.is-active {
  background-color: rgb(var(--md-sys-color-secondary-container));
}

/* Ensure this still applies in expanded state */
.is-expanded .m3-rail-item.is-active {
  background-color: rgb(var(--md-sys-color-secondary-container));
}

/* Active state for labels */
.m3-rail-item.is-active .m3-rail-label {
  color: rgb(var(--md-sys-color-on-secondary-container));
  font-weight: var(--md-sys-typescale-label-medium-weight-prominent, 600);
}

/* Ensure active state for labels still applies in expanded state */
.is-expanded .m3-rail-item.is-active .m3-rail-label {
  color: rgb(var(--md-sys-color-on-secondary-container));
  font-weight: var(--md-sys-typescale-label-medium-weight-prominent, 600);
}
</style>