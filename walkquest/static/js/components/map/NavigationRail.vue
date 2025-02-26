<template>
  <div
    v-show="visible"
    ref="sidebarRef"
    class="m3-navigation-rail"
    :class="[
      { 'is-expanded': isExpanded },
      { 'is-collapsed': selectedWalkId },
    ]"
  >
    <div class="h-full flex flex-col relative">
      <!-- Rail Header -->
      <div class="m3-rail-header">
        <!-- Menu button -->
        <button class="m3-rail-item menu-button" @click="toggleExpanded">
          <div class="m3-state-layer">
            <Icon icon="mdi:menu" class="m3-rail-icon text-[24px]" />
          </div>
        </button>
        <!-- FAB -->
        <button class="m3-rail-fab" @click="handleFabClick">
          <Icon icon="mdi:hiking" class="text-[36px]" />
          <span class="m3-rail-fab-text" v-if="isExpanded">WalkQuest</span>
          <span class="sr-only">WalkQuest Home</span>
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
        >
          <div class="m3-rail-content">
            <div class="m3-rail-icon-container">
              <Icon icon="mdi:map-marker" class="m3-rail-icon filled-icon" />
              <Icon
                icon="mdi:map-marker-outline"
                class="m3-rail-icon outlined-icon"
              />
            </div>
            <span class="m3-rail-label">Find<br />Nearby</span>
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
const emit = defineEmits(['walk-selected', 'fab-click', 'walk-expanded']);

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
         !uiStore.fullscreen && 
         !props.selectedWalkId;
});

/**
 * Toggle sidebar expanded state
 * Persists state to localStorage for session continuity
 */
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
  localStorage.setItem("sidebarExpanded", isExpanded.value.toString());
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
  
  emit('fab-click');
};

/**
 * Handle walk selection
 * Collapses sidebar and emits selection event
 */
const handleWalkSelection = (walk) => {
  if (walk?.id) {
    isExpanded.value = false;
    emit('walk-selected', walk);
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
};

/**
 * Handle location search button click
 * Sets search mode to locations and expands sidebar
 */
const handleLocationSearchClick = () => {
  searchStore.setSearchMode("locations");
  
  if (!isExpanded.value) {
    isExpanded.value = true;
    localStorage.setItem("sidebarExpanded", "true");
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
/* Navigation rail styles */
.m3-navigation-rail {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 40;
  background: rgb(var(--md-sys-color-surface));
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
}

.m3-rail-content-area {
  transition: opacity 0.2s ease-out, visibility 0.2s ease-out;
}

.m3-rail-content-area.content-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.filled-icon {
  opacity: 0;
  transform: scale(0.8);
}

.outlined-icon {
  opacity: 1;
  transform: scale(1);
}

/* Show filled icon on hover and active states */
.m3-rail-item:hover .filled-icon,
.m3-rail-item.is-active .filled-icon {
  opacity: 1;
  transform: scale(1);
}

.m3-rail-item:hover .outlined-icon,
.m3-rail-item.is-active .outlined-icon {
  opacity: 0;
  transform: scale(1.1);
}
</style>