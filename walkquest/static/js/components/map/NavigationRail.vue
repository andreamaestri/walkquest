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
            <Icon icon="mdi:menu" class="m3-rail-icon text-[24px]" :class="{ 'rotate-icon': isExpanded }" />
          </div>
        </button>
        <!-- FAB - keeping color as requested -->
        <button class="m3-rail-fab" @click="handleFabClick" aria-label="WalkQuest Home">
          <Icon icon="mdi:hiking" class="text-[24px] menu-icon" />
          <span class="m3-rail-fab-text" :class="{ 'text-visible': isExpanded }">WalkQuest</span>
        </button>
      </div>
      
      <!-- Navigation items -->
      <nav class="m3-rail-items">
        <button
          class="m3-rail-item"
          :class="{
            'is-active': searchMode === 'walks' && !selectedWalkId,
            'item-expanded': isExpanded
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
            'item-expanded': isExpanded
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
            'item-expanded': isExpanded
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
            <span class="m3-rail-label" style="right: 5px;">Categories</span>
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
import { useUiStore } from "../../stores/ui";
import { useSearchStore } from "../../stores/searchStore";
import { useLocationStore } from "../../stores/locationStore";
import { useMotionV } from "../../composables/useMotionV";
import { Icon } from "@iconify/vue";
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

// Get motion from our new composable
const { 
  animate, 
  stagger, 
  animateElement, 
  staggerElements 
} = useMotionV();

// Component state
const sidebarRef = ref(null);
const expandedWalkIds = ref(
  localStorage.getItem("expandedWalks") 
    ? JSON.parse(localStorage.getItem("expandedWalks")) 
    : []
);
const isExpanded = ref(localStorage.getItem("sidebarExpanded") === "true");

// Animation configurations with improved spring physics
const springEasing = [0.34, 1.56, 0.64, 1]; // Improved spring curve
const standardEasing = [0.2, 0, 0.2, 1]; // Standard Material motion
const mdEmphasizedEasing = [0.2, 0, 0, 1]; // Material emphasized curve

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
 * Toggle sidebar expanded state with enhanced animation
 * Persists state to localStorage for session continuity
 */
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
  localStorage.setItem("sidebarExpanded", isExpanded.value.toString());
  
  // Animate the content transition
  const contentArea = document.querySelector(".m3-rail-content-area");
  if (contentArea) {
    if (isExpanded.value) {
      animateElement(
        contentArea,
        { opacity: [0, 1], scale: [0.97, 1] },
        { duration: 0.35, easing: springEasing, delay: 0.05 }
      );
    } else {
      animateElement(
        contentArea,
        { opacity: [1, 0], scale: [1, 0.97] },
        { duration: 0.25, easing: standardEasing }
      );
    }
  }
  
  // If we're expanding and have a selected walk, emit to close drawer
  if (isExpanded.value && props.selectedWalkId) {
    emit('walk-selected', null);
  }
};

/**
 * Explicitly expand the sidebar with animation
 * Used when closing the drawer to return to expanded state
 */
const expandSidebar = () => {
  if (!isExpanded.value) {
    isExpanded.value = true;
    localStorage.setItem("sidebarExpanded", "true");
    
    // Animate the content appearance
    nextTick(() => {
      const contentArea = document.querySelector(".m3-rail-content-area");
      if (contentArea) {
        animateElement(
          contentArea,
          { 
            opacity: [0, 1], 
            scale: [0.97, 1],
            y: [-5, 0] 
          },
          { duration: 0.35, easing: springEasing, delay: 0.05 }
        );
      }
    });
  }
};

/**
 * Handle FAB button click with tactile animation
 * Navigates to home and expands sidebar
 */
const handleFabClick = async () => {
  // Add tactile feedback animation
  const fab = document.querySelector(".m3-rail-fab");
  if (fab) {
    await animateElement(
      fab,
      { scale: [1, 0.92, 1] },
      { duration: 0.4, easing: springEasing }
    ).finished;
  }
  
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

// Other event handlers and methods remain unchanged
const handleWalkSelection = (walk) => {
  if (walk?.id) {
    // Always collapse sidebar when a walk is selected
    isExpanded.value = false;
    localStorage.setItem("sidebarExpanded", "false");
    emit('walk-selected', walk);
    // Use walk.walk_id for the slug-based route if available
    if (walk.walk_id) {
      router.push({ name: 'walk', params: { walk_id: walk.walk_id } });
    } else {
      router.push({ name: 'walk-by-id', params: { walk_id: walk.id } });
    }
  }
};

const handleWalkExpanded = ({ walkId, expanded }) => {
  expandedWalkIds.value = expanded
    ? [...new Set([...expandedWalkIds.value, walkId])]
    : expandedWalkIds.value.filter((id) => id !== walkId);
    
  localStorage.setItem("expandedWalks", JSON.stringify(expandedWalkIds.value));
  emit('walk-expanded', { walkId, expanded });
};

/**
 * Handle explore button click with tactile feedback
 * Sets search mode to walks and clears location
 */
const handleExploreClick = async () => {
  // Get the button element and add tactile feedback
  const button = document.querySelector(".m3-rail-item:nth-child(1)");
  if (button) {
    await animateElement(
      button,
      { scale: [1, 0.95, 1] },
      { duration: 0.3, easing: springEasing }
    ).finished;
  }

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
 * Handle location search button click with feedback animation
 * Sets search mode to locations and expands sidebar
 */
const handleLocationSearchClick = async () => {
  // Get the button element and add tactile feedback
  const button = document.querySelector(".m3-rail-item:nth-child(2)");
  if (button) {
    await animateElement(
      button,
      { scale: [1, 0.95, 1] },
      { duration: 0.3, easing: springEasing }
    ).finished;
  }

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
 * Handle categories button click with feedback animation
 * Sets search mode to categories and expands sidebar
 */
const handleCategoriesClick = async () => {
  // Get the button element and add tactile feedback
  const button = document.querySelector(".m3-rail-item:nth-child(3)");
  if (button) {
    await animateElement(
      button,
      { scale: [1, 0.95, 1] },
      { duration: 0.3, easing: springEasing }
    ).finished;
  }

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

// Watch for search mode changes with smooth animations
watch(
  () => searchStore.searchMode,
  (newMode) => {
    if (newMode === "locations") {
      // Ensure sidebar is expanded when switching to location search
      if (!isExpanded.value) {
        isExpanded.value = true;
        localStorage.setItem("sidebarExpanded", "true");
        
        // Animate the content appearance
        nextTick(() => {
          const contentArea = document.querySelector(".m3-rail-content-area");
          if (contentArea) {
            animateElement(
              contentArea,
              { opacity: [0, 1], scale: [0.97, 1] },
              { duration: 0.35, easing: springEasing, delay: 0.05 }
            );
          }
        });
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

// Animate rail elements on mount with improved sequencing
onMounted(() => {
  // Animate rail header with improved physics
  const railHeader = document.querySelector(".m3-rail-header");
  if (railHeader) {
    animateElement(
      railHeader,
      { opacity: [0, 1], y: [-15, 0] },
      { duration: 0.45, easing: mdEmphasizedEasing }
    );
  }

  // Animate menu button with slight bounce
  const menuButton = document.querySelector(".menu-button");
  if (menuButton) {
    animateElement(
      menuButton,
      { scale: [0.8, 1], opacity: [0, 1] },
      {
        duration: 0.5,
        easing: springEasing,
        delay: 0.1,
      }
    );
  }

  // Animate FAB with spring physics
  const fab = document.querySelector(".m3-rail-fab");
  if (fab) {
    animateElement(
      fab,
      { scale: [0.85, 1], opacity: [0, 1] },
      {
        duration: 0.55,
        easing: springEasing,
        delay: 0.15,
      }
    );
  }

  // Animate nav items with staggered entrance
  const navItems = document.querySelectorAll(".m3-rail-item:not(.menu-button)");
  if (navItems.length) {
    staggerElements(
      navItems,
      { opacity: [0, 1], y: [15, 0] },
      {
        duration: 0.4,
        easing: mdEmphasizedEasing,
        interval: 0.08, // Staggered delay for each item
        delay: 0.2, // Base delay before sequence starts
      }
    );
  }

  // Animate content area if expanded
  if (isExpanded.value) {
    const contentArea = document.querySelector(".m3-rail-content-area");
    if (contentArea) {
      animateElement(
        contentArea,
        { opacity: [0, 1], x: [-20, 0] },
        {
          duration: 0.45,
          easing: mdEmphasizedEasing,
          delay: 0.4,
        }
      );
    }
  }
});
</script>

<style scoped>
/* Navigation rail styles - updated to MD3 specs with improved animations */
.m3-navigation-rail { 
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 30;
  background: rgb(var(--md-sys-color-surface));
  box-shadow: var(--md-sys-elevation-1);
  transition: width 0.35s cubic-bezier(0.2, 0, 0, 1),
              box-shadow 0.35s cubic-bezier(0.2, 0, 0, 1),
              transform 0.35s cubic-bezier(0.2, 0, 0, 1); 
  visibility: visible !important;
  pointer-events: auto !important;
  width: var(--md-sys-sidebar-collapsed);
  isolation: isolate;
  border-radius: 0 16px 16px 0;
  overflow: hidden;
  transform: translateZ(0); /* Force GPU acceleration */
  will-change: width, transform;
  @media (max-width: 768px) {
    display: none;
  }
}

/* Add expanded state width with improved transition */
.m3-navigation-rail.is-expanded {
  width: 412px;
  box-shadow: var(--md-sys-elevation-2);
}

/* Interaction styles for when drawer is open */
.m3-navigation-rail.is-collapsed {
  box-shadow: none;
  z-index: 40;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: 1px solid rgba(var(--md-sys-color-outline-variant), 0.5);
  transition: all 0.35s cubic-bezier(0.2, 0, 0, 1);
}

/* Content area transitions with improved animation */
.m3-rail-content-area {
  transition: opacity 0.35s cubic-bezier(0.2, 0, 0, 1),
              visibility 0.35s cubic-bezier(0.2, 0, 0, 1),
              transform 0.35s cubic-bezier(0.2, 0, 0, 1);
  will-change: opacity, transform;
  transform: translateZ(0);
}

.m3-rail-content-area.content-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(-5px);
}

/* Rail header & items */
.m3-rail-header {
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Menu button - with improved interaction feedback */
.menu-button {
  width: 48px;
  height: 48px;
  margin: 0 auto 4px;
  padding: 0;
  border-radius: 50%;
  transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden;
}

.menu-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
}

.menu-button:active {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.12);
  transform: scale(0.95);
}

/* Menu icon rotation animation */
.rotate-icon {
  transform: rotate(90deg);
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Rail FAB - kept original styling with enhanced interaction */
.m3-rail-fab {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  margin: 8px auto;
  transition: all 0.35s cubic-bezier(0.2, 0, 0, 1),
              transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
  position: relative;
}

.m3-rail-fab:hover {
  transform: translateY(-2px);
  box-shadow: var(--md-sys-elevation-2);
}

.m3-rail-fab:active {
  transform: translateY(-1px) scale(0.97);
}

.menu-icon {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.m3-rail-fab:hover .menu-icon {
  transform: rotate(-10deg) scale(1.1);
}

.m3-rail-fab-text {
  position: absolute;
  text-align: center;
  margin-left: 40px; /* Adjusted to be properly positioned */
  flex: 1;
  justify-items: center;
  font-size: 27px;
  font-weight: 400;
  opacity: 0;
  transform: translateX(-10px);
  transition: opacity 0.35s cubic-bezier(0.2, 0, 0, 1),
              transform 0.35s cubic-bezier(0.2, 0, 0, 1);
  pointer-events: none; /* Prevents text from interfering with clicks */
}

.text-visible {
  opacity: 1 !important;
  transform: translateX(0) !important;
}

/* Navigation items container */
.m3-rail-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 4px 0;
  gap: 12px;
  z-index: 10;
}

/* Navigation item styling with enhanced hover effects */
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
  border-radius: 16px;
  transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1),
              transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
              width 0.35s cubic-bezier(0.2, 0, 0, 1);
  z-index: 1;
  overflow: visible; /* Changed from hidden to allow labels to be visible */
}

/* Styles for navigation items when the sidebar is expanded */
.m3-rail-item.item-expanded {
  width: calc(100% - 24px);
  height: 48px;
  margin-left: 12px;
  margin-right: 12px;
  flex-direction: row;
  justify-content: flex-start;
  padding-left: 16px;
  border-radius: 28px;
}

.m3-rail-item.item-expanded .m3-rail-content {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
}

.m3-rail-item.item-expanded .m3-rail-label {
  position: static;
  margin-top: 0;
  font-size: 14px;
  text-align: left;
  width: auto;
}

/* Only modify the FAB when expanded - improved transitions */
.is-expanded .m3-rail-fab {
  width: calc(100% - 24px);
  border-radius: 28px;
  justify-content: flex-start;
  padding-left: 16px;
}

/* Add specific styles for FAB in collapsed state */
.m3-navigation-rail:not(.is-expanded) .m3-rail-fab {
  overflow: visible; /* Allow text to be visible outside the button */
}

span.m3-rail-label {
  top: 5px;
  bottom: 0px;
}

/* Label styling with enhanced transitions */
.m3-rail-label {
  display: block;
  margin-top: 28px; /* Adjusted to position better below icon */
  font-size: var(--md-sys-typescale-label-medium-size, 12px);
  line-height: var(--md-sys-typescale-label-medium-line-height, 16px);
  font-weight: var(--md-sys-typescale-label-medium-weight, 500);
  letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
  text-align: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: color 0.35s cubic-bezier(0.2, 0, 0, 1),
              transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: absolute;
  width: 100%;
  bottom: -12px; /* Position label below the icon */
}

/* Icon container with enhanced animations */
.m3-rail-icon-container {
  position: relative;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  transition: all 0.35s cubic-bezier(0.2, 0, 0, 1),
              transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Content layout with improved transitions */
.m3-rail-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  position: relative; /* Added to help with absolute positioning of label */
  transition: all 0.35s cubic-bezier(0.2, 0, 0, 1);
}

/* Improved icon animations */
.filled-icon, .outlined-icon {
  position: absolute;
  left: 0;
  top: 0;
  width: 24px;
  height: 24px;
  transition: opacity 0.35s cubic-bezier(0.2, 0, 0, 1),
              transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-size: 24px;
  will-change: opacity, transform;
}

/* Icon state transitions with enhanced animations */
.filled-icon {
  opacity: 0;
  transform: translateY(5px) scale(0.8);
}

.outlined-icon {
  opacity: 1;
}

/* Hover and active states for icons with improved animations */
.m3-rail-item:hover .filled-icon,
.m3-rail-item.is-active .filled-icon {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.m3-rail-item:hover .outlined-icon,
.m3-rail-item.is-active .outlined-icon {
  opacity: 0;
  transform: translateY(-5px) scale(1.2);
}

.m3-rail-item:hover .m3-rail-label {
  transform: translateY(-1px);
}

/* Special hover for expanded items to prevent label movement */
.m3-rail-item.item-expanded:hover .m3-rail-label {
  transform: none;
}

/* Apply active background to rail item with subtle animation */
.m3-rail-item.is-active {
  background-color: rgb(var(--md-sys-color-secondary-container));
}

.m3-rail-item.is-active .m3-rail-label {
  color: rgb(var(--md-sys-color-on-secondary-container));
  font-weight: var(--md-sys-typescale-label-medium-weight-prominent, 600);
}

/* Different styles for expanded active items */
.m3-rail-item.item-expanded.is-active {
  background-color: rgb(var(--md-sys-color-secondary-container));
  /* Can add additional styles specific to expanded active items */
}

/* Active state ripple effect */
.m3-rail-item.is-active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(var(--md-sys-color-on-secondary-container), 0.1) 0%, transparent 70%);
  border-radius: inherit;
  opacity: 0;
  animation: ripple 0.6s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes ripple {
  0% {
    opacity: 1;
    transform: scale(0.5);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}
</style>