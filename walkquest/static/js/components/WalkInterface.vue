<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col relative bg-surface">
    <Loading ref="loadingComponent" />

    <div class="relative h-full w-full flex">
      <!-- Navigation Rail for desktop with simplified animation -->
      <div v-if="showSidebar && !isMobile" ref="sidebarRef" class="m3-navigation-rail"
        :class="[{ 'is-expanded': isExpanded }]">
        <div class="m3-rail-header">
          <!-- Menu button - centered and properly styled -->
          <button class="m3-rail-item menu-button" @click="toggleExpanded">
            <div class="m3-state-layer">
              <div class="m3-icon-wrapper">
                <iconify-icon icon="mdi:menu" class="m3-rail-icon text-[24px]" />
              </div>
            </div>
          </button>

          <!-- FAB -->
          <button class="m3-rail-fab" @click="handleFabClick">
            <iconify-icon icon="mdi:hiking" class="text-[36px]" />
            <span class="m3-rail-fab-text" v-if="isExpanded">WalkQuest</span>
            <span class="sr-only">WalkQuest Home</span>
          </button>
        </div>

        <!-- Navigation items -->
        <nav class="m3-rail-items">
          <button class="m3-rail-item" :class="{ 'is-active': !showRoutesDrawer }" @click="handleWalkSelection(null)">
            <div class="m3-rail-content">
              <div class="m3-rail-icon-container">
                <iconify-icon icon="mdi:compass-outline" class="m3-rail-icon" />
              </div>
              <span class="m3-rail-label">Explore</span>
            </div>
          </button>

          <!-- New Location Search Button -->
          <button class="m3-rail-item" @click="toggleLocationSearch">
            <div class="m3-rail-content">
              <div class="m3-rail-icon-container">
                <iconify-icon icon="mdi:map-search" class="m3-rail-icon" />
              </div>
              <span class="m3-rail-label">Find Nearby</span>
            </div>
          </button>

          <!-- Updated Walks List with transition -->
          <Transition :css="false" @enter="onWalksSectionEnter" @leave="onWalksSectionLeave">
            <div v-if="isExpanded" class="m3-walks-section">
              <!-- Location Search Panel -->
              <Transition :css="false" @enter="onPanelEnter" @leave="onPanelLeave">
                <div v-if="showLocationSearch" class="m3-location-panel">
                  <LocationSearch @location-selected="handleLocationSelected" />
                </div>
              </Transition>

              <WalkList 
                v-model="searchQuery"
                :walks="availableWalks"
                :selected-walk-id="selectedWalkId"
                :expanded-walk-ids="expandedWalkIds"
                :is-compact="!isExpanded"
                @walk-selected="handleWalkSelection"
                @walk-expanded="handleWalkExpanded"
                @filtered-walks="updateDisplayedWalks"
              />
            </div>
          </Transition>
        </nav>
      </div>

      <!-- Navigation Drawer for mobile -->
      <Transition :css="false" @enter="onDrawerEnter" @leave="onDrawerLeave">
        <div v-if="uiStore?.mobileMenuOpen && isMobile" ref="drawerRef"
          class="fixed inset-0 z-20 m3-navigation-drawer transform-gpu" @click.self="uiStore?.setMobileMenuOpen(false)">
          <div class="m3-drawer-content h-full flex flex-col">
            <!-- Drawer Header -->
            <div class="px-6 py-4 flex justify-between items-center">
              <span class="m3-headline-small">WalkQuest</span>
              <button @click="uiStore?.setMobileMenuOpen(false)" class="m3-icon-button">
                <div class="m3-state-layer">
                  <iconify-icon icon="mdi:close" class="text-[24px]" />
                </div>
              </button>
            </div>

            <!-- Drawer Content -->
            <div class="flex-1 overflow-hidden">
              <WalkList :error="error" :walks="availableWalks" :selected-walk-id="selectedWalkId"
                :expanded-walk-ids="expandedWalkIds" @walk-selected="handleWalkSelection"
                @walk-expanded="handleWalkExpanded" />
            </div>
          </div>
        </div>
      </Transition>

      <!-- Map container with updated left margin -->
      <div class="m3-content-container hardware-accelerated pointer-events-auto" :style="mapContainerStyle"
        ref="mapContainerRef">
        <div class="m3-surface-container hardware-accelerated pointer-events-auto">
          <StoreLocator
            :items="walks"
            :item-zoom-level="14"
            :access-token="mapboxToken"
            :mapbox-map="mapConfig"
            :classes="{
              root: 'flex h-full w-full',
              region: {
                map: 'w-full h-full',
                list: 'hidden' // Hide the list region completely
              }
            }"
            @select-item="handleItemSelect"
            @map-created="handleMapCreated"
            class="hardware-accelerated pointer-events-auto">

            <!-- Remove the list slot since we're using WalkList elsewhere -->
            
            <!-- Custom Markers -->
            <template #markers>
              <template v-for="item in displayMarkers" :key="item.walk.id">
                <MapboxMarker
                  :lng-lat="[item.walk.lng, item.walk.lat]"
                  :popup-offset="[0, -15]"
                  :element="item.type === 'point' ? null : undefined"
                  :color="item.type === 'point' ? '#4A90E2' : null"
                  :scale="item.type === 'point' ? 0.7 : 1"
                  :aria-label="`${item.walk.title}, ${item.walk.difficulty} difficulty, ${item.walk.duration} duration`"
                  class="map-marker"
                  :class="{ 
                    'is-detailed': item.type === 'marker',
                    'is-simple': item.type === 'point',
                    active: selectedWalkId === item.walk.id,
                    nearby: locationStore.nearbyWalks.some(nearby => nearby.id === item.walk.id)
                  }"
                  @click="handleWalkSelection(item.walk)"
                >
                  <!-- Only render custom content for detailed markers -->
                  <div v-if="item.type === 'marker'" class="marker-content p-2 bg-white rounded-lg shadow-md">
                    <h4 class="text-sm font-medium">{{ item.walk.title }}</h4>
                    <div class="flex items-center gap-1 text-xs mt-1">
                      <iconify-icon icon="mdi:flag" class="text-primary" />
                      <span>{{ item.walk.difficulty }}</span>
                    </div>
                  </div>

                  <template #popup>
                    <div class="p-3">
                      <h3 class="text-lg font-semibold mb-2">{{ item.walk.title }}</h3>
                      <div class="space-y-2">
                        <div class="flex items-center gap-2">
                          <iconify-icon icon="mdi:map-marker" />
                          <span>{{ item.walk.location }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <iconify-icon icon="mdi:clock-outline" />
                          <span>{{ item.walk.duration }}</span>
                        </div>
                      </div>
                    </div>
                  </template>
                </MapboxMarker>
              </template>
            </template>

            <!-- Add Distance Radius Circle -->
            <template #before-markers>
              <template v-if="locationStore.userLocation && locationStore.searchRadius">
                <MapboxLayer
                  type="circle"
                  :paint="{
                    'circle-color': '#4A90E2',
                    'circle-opacity': 0.1,
                    'circle-radius': locationStore.searchRadius / 2
                  }"
                  :source="{
                    type: 'geojson',
                    data: {
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: [
                          locationStore.userLocation.longitude,
                          locationStore.userLocation.latitude
                        ]
                      }
                    }
                  }"
                />
              </template>
            </template>

            <template #before-map>
              <div class="sr-only">
                Interactive map showing walk locations. Use arrow keys to navigate between markers.
              </div>
            </template>

            <!-- Item Panel -->
            <template #panel="{ item, close }">
              <div class="p-4 max-w-sm" role="dialog" aria-labelledby="walk-title">
                <h3 id="walk-title" class="text-lg font-semibold mb-2">{{ item.title }}</h3>
                <div class="flex items-center gap-2 mb-2">
                  <iconify-icon icon="mdi:map-marker" aria-hidden="true" />
                  <span>{{ item.location }}</span>
                </div>
              </div>
            </template>

            <!-- MapboxMap Controls -->
            <MapboxNavigationControl position="top-left" />
            <MapboxCluster
              :radius="50"
              :max-zoom="13"
              :min-zoom="8"
              :cluster-properties="{
                sum: ['+', ['get', 'point_count']]
              }"
              :clusters-layout="{ visibility: 'visible' }"
              :clusters-paint="{
                'circle-color': [
                  'step',
                  ['get', 'point_count'],
                  'rgba(var(--md-sys-color-primary-rgb), 0.5)',
                  10,
                  'rgba(var(--md-sys-color-primary-rgb), 0.7)',
                  30,
                  'rgba(var(--md-sys-color-primary-rgb), 0.9)'
                ],
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  20,
                  10,
                  30,
                  30,
                  40
                ],
                'circle-stroke-width': 3,
                'circle-stroke-color': 'rgba(var(--md-sys-color-on-primary-container-rgb), 1)',
                'circle-stroke-opacity': 0.5
              }"
              :clusters-text-layout="{
                'text-field': '{point_count_abbreviated}',
                'text-font': ['Roboto Medium', 'Arial Unicode MS Bold'],
                'text-size': 12,
                'text-offset': [0, 0],
                'text-anchor': 'center'
              }"
              :clusters-text-paint="{ 'text-color': '#ffffff' }"
              :data="geojsonData"
              @mb-click="handleClusterClick"
            />
          </StoreLocator>
          <!-- Mobile toggle button -->
          <Transition :css="false" @enter="onMobileButtonEnter" @leave="onMobileButtonLeave">
            <button v-if="isMobile && !uiStore?.mobileMenuOpen" ref="mobileButtonRef"
              @click="uiStore?.setMobileMenuOpen(true)" class="m3-fab-mobile">
              <i class="icon-menu"></i>
              <span class="sr-only">Open menu</span>
            </button>
          </Transition>
        </div>
      </div>

      <!-- Mobile location search bottom sheet -->
      <BottomSheet v-model="showMobileLocationSearch" v-if="isMobile">
        <LocationSearch 
          @location-selected="handleLocationSelected" 
          class="pb-safe-area-inset-bottom"
        />
      </BottomSheet>

      <!-- Mobile navigation bar -->
      <div v-if="isMobile" class="fixed bottom-0 left-0 right-0 bg-surface z-40 shadow-lg">
        <div class="flex justify-around items-center h-16 px-4">
          <button class="m3-nav-button" @click="handleWalkSelection(null)">
            <iconify-icon icon="mdi:compass-outline" class="text-2xl" />
            <span class="text-xs">Explore</span>
          </button>
          
          <button class="m3-nav-button" @click="showMobileLocationSearch = true">
            <iconify-icon icon="mdi:map-search" class="text-2xl" />
            <span class="text-xs">Find Nearby</span>
          </button>
          
          <button class="m3-nav-button" @click="uiStore?.setMobileMenuOpen(true)">
            <iconify-icon icon="mdi:menu" class="text-2xl" />
            <span class="text-xs">Menu</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import { animate, inView } from "motion";
import { useElementVisibility } from "@vueuse/core";
import { useUiStore } from "../stores/ui";
import { useWalksStore } from "../stores/walks";
import { DynamicScroller, DynamicScrollerItem } from "vue-virtual-scroller";
import { StoreLocator, MapboxNavigationControl, MapboxMarker, MapboxMap, MapboxCluster } from '@studiometa/vue-mapbox-gl';
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
import Loading from "./Loading.vue";
import WalkList from "./WalkList.vue";
import WalkCard from "./WalkCard.vue";
import { useLocationStore } from '../stores/locationStore';
import LocationSearch from './LocationSearch.vue';
import BottomSheet from './BottomSheet.vue'
import { useMap } from '../composables/useMap'

// Props definition
const props = defineProps({
  mapboxToken: {
    type: String,
    required: true,
  },
  mapConfig: {
    type: Object,
    default: () => ({}),
  },
  walkId: {
    type: [String, Number],
    default: null,
  },
});

// Store initialization
const router = useRouter();
const walksStore = useWalksStore();
const uiStore = useUiStore();
const locationStore = useLocationStore();

// Component refs and state
const loadingComponent = ref(null);
const mapComponent = ref(null);
const sidebarRef = ref(null);
const drawerRef = ref(null);
const mobileButtonRef = ref(null);
const mapContainerRef = ref(null);
const expandedWalkIds = ref([]);
const isExpanded = ref(localStorage.getItem("sidebarExpanded") === "true");
const showLocationSearch = ref(false);
const showMobileLocationSearch = ref(false);
const mapReady = ref(false);
const currentZoom = ref(0); // Track current zoom level
const markerThresholdZoom = 13; // Increased threshold for better visibility

// Add Cornwall bounds constants
const CORNWALL_BOUNDS = [
  [-5.7, 49.9], // Southwest coordinates
  [-4.2, 50.9]  // Northeast coordinates
];

// Add Cornwall center
const CORNWALL_CENTER = [-4.95, 50.4];

// Update StoreLocator configuration
const mapConfig = computed(() => ({
  mapStyle: 'mapbox://styles/andreamaestri/cm79fegfl000z01sdhl4u32jv?optimize=true',
  cooperativeGestures: true,
  keyboard: true,
  maxBounds: CORNWALL_BOUNDS,
  center: CORNWALL_CENTER,
  zoom: 9,
  minZoom: 1,
  maxZoom: 16
}));

// Computed properties
const error = computed(() => uiStore?.error);
const isFullscreen = computed(() => uiStore?.fullscreen);
const showSidebar = computed(() => uiStore?.showSidebar);
const isMobile = computed(() => uiStore?.isMobile);
const selectedWalkId = computed(() => props.walkId);
const availableWalks = computed(() => walksStore.walks);
const walks = computed(() => 
  walksStore.walks.map(walk => ({
    id: walk.id,
    lat: walk.latitude,
    lng: walk.longitude,
    title: walk.title,
    location: walk.location,
    ...walk
  }))
);
const mapContainerVisible = useElementVisibility(mapContainerRef);

// Add a ref for animation tracking
let expandAnimation = null;

// Added to define showRoutesDrawer and avoid Vue warn
const showRoutesDrawer = ref(false);

// Add new computed property for filtered walks
const filteredWalks = computed(() => {
  let results = availableWalks.value;

  if (searchQuery.value?.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    results = results.filter(walk => {
      const text = [
        walk.title, 
        walk.location, 
        walk.description
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(query);
    });
  }

  return results;
});

// NEW: Lift search query state
const searchQuery = ref('');

// Add ref for filtered results
const filteredResults = ref([]);

// Updated toggleExpanded with sidebar width and inner elements animation
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
  localStorage.setItem("sidebarExpanded", isExpanded.value);

  if (sidebarRef.value) {
    // Snappier width animation
    animate(
      sidebarRef.value,
      { width: isExpanded.value ? "412px" : "80px" },
      {
        duration: 0.3, // Faster duration
        easing: [0.3, 0, 0.2, 1], // Sharper easing
      }
    );

    // Quick item animations
    const items = sidebarRef.value.querySelectorAll(".m3-rail-item");
    items.forEach((item, i) => {
      animate(
        item,
        {
          scale: [0.95, 1],
          opacity: [0.9, 1],
        },
        {
          duration: 0.2,
          delay: i * 0.02, // Tighter stagger
          easing: [0.3, 0, 0.2, 1],
        }
      );
    });

    // Snappy label animations
    const labels = sidebarRef.value.querySelectorAll(
      ".m3-rail-label, .m3-rail-fab-text"
    );
    labels.forEach((label, i) => {
      animate(
        label,
        {
          opacity: isExpanded.value ? [0, 1] : [1, 0],
          x: isExpanded.value ? [-12, 0] : [0, -12],
        },
        {
          duration: 0.15, // Very quick
          delay: i * 0.015 + (isExpanded.value ? 0.05 : 0), // Minimal delay
          easing: [0.3, 0, 0.2, 1],
        }
      );
    });
  }

  // Update sidebar width for Mapbox logo
  document.documentElement.style.setProperty(
    "--sidebar-width",
    isExpanded.value ? "412px" : "80px"
  );
};

// Watch for expansion state changes
watch(isExpanded, (newValue) => {
  nextTick(() => {
    const scroller = document.querySelector(".m3-scroller");
    if (scroller) {
      scroller.style.opacity = "0";
      setTimeout(() => {
        scroller.style.opacity = "1";
      }, 300);
    }
  });
});

const handleWalkSelection = async (walk) => {
  console.log("Walk selection handler called:", walk?.id);
  if (walk) {
    await router.push({ name: "walk-detail", params: { id: walk.id } });
  } else {
    await router.push({ name: "home" });
  }

  if (isMobile.value) {
    uiStore?.setMobileMenuOpen(false);
  }
};

// Watch effects
watch(
  [isExpanded, showSidebar],
  ([newExpanded, newVisible]) => {
    if (!newVisible || !newExpanded) {
      nextTick(() => {
        const walkList = document.querySelector(".walk-list-container");
        if (walkList) {
          walkList.style.pointerEvents = "none";
        }
      });
    } else {
      setTimeout(() => {
        const walkList = document.querySelector(".walk-list-container");
        if (walkList) {
          walkList.style.pointerEvents = "auto";
        }
      }, 300);
    }
  },
  { immediate: true }
);

// Ensure proper cleanup of items when visibility changes
watch(
  [isExpanded, showSidebar],
  ([newExpanded, newVisible]) => {
    if (!newVisible || !newExpanded) {
      // Wait for transition to start
      requestAnimationFrame(() => {
        const scroller = document.querySelector(".vue-recycle-scroller");
        if (scroller && scroller.__vueParentComponent?.ctx) {
          const ctx = scroller.__vueParentComponent.ctx;
          if (typeof ctx.updateSize === "function") {
            ctx.updateSize();
          }
        }
      });
    }
  },
  { immediate: true }
);

// Updated sidebar animation functions with MD3 motion specs
async function onSidebarEnter(el, onComplete) {
  await Promise.all([
    animate(
      el,
      {
        x: [-16, 0],
        opacity: [0.9, 1],
        scale: [0.98, 1],
      },
      {
        duration: 0.2,
        easing: [0.3, 0, 0.2, 1],
      }
    ).finished,

    // Quick staggered items
    ...Array.from(el.querySelectorAll(".m3-rail-item, .m3-rail-fab")).map(
      (item, i) =>
        animate(
          item,
          {
            opacity: [0, 1],
            scale: [0.95, 1],
            y: [8, 0],
          },
          {
            duration: 0.15,
            delay: i * 0.02,
            easing: [0.3, 0, 0.2, 1],
          }
        ).finished
    ),
  ]);

  onComplete();
}

async function onSidebarLeave(el, onComplete) {
  const currentWidth = isExpanded.value ? "412px" : "80px";
  const widthAnim = animate(
    el,
    { width: [currentWidth, "80px"] },
    { duration: 0.4, easing: "spring(1, 80, 10, 0)" }
  );
  const innerEls = el.querySelectorAll(".m3-rail-item, .m3-rail-fab-text");
  const innerAnims = Array.from(innerEls).map(
    (child, i) =>
      animate(
        child,
        {
          opacity: [1, 0],
          transform: ["translateX(0px)", "translateX(-20px)"],
        },
        { delay: i * 0.05, duration: 0.2, easing: "ease-in" }
      ).finished
  );
  await Promise.all([widthAnim.finished, ...innerAnims]);
  onComplete();
}

async function onMobileButtonEnter(el, onComplete) {
  const animation = animate(
    el,
    {
      opacity: [0, 1],
      scale: [0.8, 1],
      y: ["10%", "0%"],
    },
    {
      duration: 0.4,
      easing: [0.2, 0, 0, 1], // MD3 emphasized
    }
  );

  await animation.finished;
  onComplete();
}

async function onMobileButtonLeave(el, onComplete) {
  const animation = animate(
    el,
    {
      opacity: [1, 0],
      scale: [1, 0.8],
      y: ["0%", "10%"],
    },
    {
      duration: 0.3,
      easing: [0.4, 0, 1, 1], // MD3 emphasized-decelerate
    }
  );

  await animation.finished;
  onComplete();
}

async function onDrawerEnter(el, onComplete) {
  const animations = await Promise.all([
    // Animate backdrop
    animate(
      el,
      { opacity: [0, 1] },
      { duration: 0.3, easing: [0.4, 0, 0.2, 1] }
    ).finished,
    // Animate drawer
    animate(
      el.firstElementChild,
      {
        x: [-100, 0],
        opacity: [0.5, 1],
      },
      {
        duration: 0.5,
        easing: [0.2, 0, 0, 1],
      }
    ).finished,
  ]);

  onComplete();
}

async function onDrawerLeave(el, onComplete) {
  const animations = await Promise.all([
    // Animate backdrop
    animate(el, { opacity: [1, 0] }, { duration: 0.2, easing: [0.4, 0, 1, 1] })
      .finished,
    // Animate drawer
    animate(
      el.firstElementChild,
      {
        x: [0, -100],
        opacity: [1, 0.5],
      },
      {
        duration: 0.3,
        easing: [0.4, 0, 1, 1],
      }
    ).finished,
  ]);

  onComplete();
}

// Add new animation functions for walks section
async function onWalksSectionEnter(el, onComplete) {
  await animate(
    el,
    {
      opacity: [0, 1],
      height: [0, el.scrollHeight],
      scale: [0.95, 1],
    },
    {
      duration: 0.2,
      easing: [0.3, 0, 0.2, 1],
    }
  ).finished;

  onComplete();
}

async function onWalksSectionLeave(el, onComplete) {
  await animate(
    el,
    {
      opacity: [1, 0],
      height: [el.scrollHeight, 0],
      scale: [1, 0.95],
    },
    {
      duration: 0.15,
      easing: [0.3, 0, 0.2, 1],
    }
  ).finished;

  onComplete();
}

// Add new animation functions
async function onPanelEnter(el, onComplete) {
  await animate(
    el,
    {
      opacity: [0, 1],
      height: [0, el.scrollHeight],
      scale: [0.95, 1],
    },
    {
      duration: 0.2,
      easing: [0.3, 0, 0.2, 1],
    }
  ).finished;
  onComplete();
}

async function onPanelLeave(el, onComplete) {
  await animate(
    el,
    {
      opacity: [1, 0],
      height: [el.scrollHeight, 0],
      scale: [1, 0.95],
    },
    {
      duration: 0.15,
      easing: [0.3, 0, 0.2, 1],
    }
  ).finished;
  onComplete();
}

// Route update handling using composition API
watch(
  () => props.walkId,
  async (newId, oldId) => {
    if (newId !== oldId) {
      const walk = walksStore.getWalkById(newId);
      if (walk) {
        walksStore.setSelectedWalk(walk);
      }
    }
  }
);

// Methods
const initializeData = async () => {
  try {
    uiStore?.setLoading(true);
    loadingComponent.value?.startLoading("Loading walks...");
    console.debug("WalkInterface.vue: Starting data initialization");

    await walksStore.loadWalks();
    console.debug(
      "WalkInterface.vue: Walks loaded from store:",
      walksStore.walks
    );

    // Ensure walks are loaded before showing the sidebar
    await nextTick();

    if (walksStore.walks.length && !isMobile.value) {
      uiStore?.setSidebarVisibility(true);
      console.debug(
        "WalkInterface.vue: Sidebar set visible, walks count:",
        walksStore.walks.length
      );

      // Force a reflow to ensure proper rendering
      await nextTick();
      const walkList = document.querySelector(".walk-list");
      if (walkList) {
        walkList.style.display = "none";
        walkList.offsetHeight; // Force reflow
        walkList.style.display = "";
      }
    }
  } catch (error) {
    console.error("WalkInterface.vue: Data initialization failed:", error);
    uiStore?.setError(error.message);
  } finally {
    uiStore?.setLoading(false);
    loadingComponent.value?.stopLoading();
    console.debug("WalkInterface.vue: Loading stopped");
  }
};

watch(
  availableWalks,
  (newVal) => {
    console.debug("WalkInterface.vue: availableWalks updated:", newVal);
  },
  { immediate: true }
);

const handleMapCreated = (map) => {
  uiStore?.setMapLoading(false);
  // Add keyboard event listeners for accessibility
  map.getCanvas().setAttribute('tabindex', '0');
  map.getCanvas().addEventListener('keydown', handleMapKeyboard);

  // Set map instance in useMap composable
  setMapInstance(map);

  // Get initial zoom level
  currentZoom.value = map.getZoom();

  // Update zoom level on map zoom
  map.on('zoom', () => {
    currentZoom.value = map.getZoom();
  });
};
 
// Handle map keyboard navigation
const handleMapKeyboard = (e) => {
  const KEYBOARD_OFFSET = 50; // pixels to pan per key press
  
  if (!e.target.mapInstance) return;
  const map = e.target.mapInstance;
  
  switch(e.key) {
    case 'ArrowRight':
      map.panBy([KEYBOARD_OFFSET, 0]);
      break;
    case 'ArrowLeft':
      map.panBy([-KEYBOARD_OFFSET, 0]);
      break;
    case 'ArrowUp':
      map.panBy([0, -KEYBOARD_OFFSET]);
      break;
    case 'ArrowDown':
      map.panBy([0, KEYBOARD_OFFSET]);
      break;
  }
};

// Computed property to determine which markers to display
const displayMarkers = computed(() => {
  return filteredResults.value.map(walk => ({
    type: currentZoom.value >= markerThresholdZoom ? 'marker' : 'point',
    walk: walk
  }));
});

const handleItemSelect = async (item) => {
  console.log("StoreLocator item selected:", item);
  await handleWalkSelection(item);
};

const handleWalkExpanded = ({ walkId, expanded }) => {
  console.debug("WalkInterface.vue: Walk expansion toggled:", {
    walkId,
    expanded,
  });

  expandedWalkIds.value = expanded
    ? [...new Set([...expandedWalkIds.value, walkId])]
    : expandedWalkIds.value.filter((id) => id !== walkId);

  console.debug(
    "WalkInterface.vue: Updated expandedWalkIds:",
    expandedWalkIds.value
  );

  localStorage.setItem("expandedWalks", JSON.stringify(expandedWalkIds.value));
};

const toggleSidebar = () => {
  uiStore?.toggleSidebar();
};

const handleFabClick = async () => {
  // Navigate home
  await router.push({ name: "home" });
  // Expand the sidebar if it's not already expanded
  if (!isExpanded.value) {
    isExpanded.value = true;
    localStorage.setItem("sidebarExpanded", "true");
  }
};

const toggleLocationSearch = () => {
  showLocationSearch.value = !showLocationSearch.value;
};

const handleLocationSelected = async (location) => {
  if (location) {
    await locationStore.findNearbyWalks();
  }
};

// Window resize handling
let resizeTimeout;
const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (mapComponent.value?.map?.map) {
      mapComponent.value.map.map.resize();
    }
  }, 250);
};

// Watch for changes in walk data
watch(
  () => walksStore.walks,
  (newWalks) => {
    console.log("Store walks updated:", newWalks?.length);
    if (newWalks?.length > 0 && !showSidebar.value && !isMobile.value) {
      nextTick(() => {
        uiStore?.setSidebarVisibility(true);
      });
    }
  },
  { deep: true, immediate: true }
);

// Add dimension logging
const logContainerDimensions = () => {
  const sidebar = document.querySelector(".sidebar");
  const content = document.querySelector(".sidebar-content");

  console.debug("WalkInterface dimensions:", {
    sidebar: sidebar?.getBoundingClientRect(),
    content: content?.getBoundingClientRect(),
  });
};

// Watch for sidebar visibility
watch(showSidebar, (visible) => {
  console.log("Sidebar visibility changed:", visible);
  if (visible) {
    nextTick(() => {
      logContainerDimensions();
      if (mapComponent.value?.map?.map) {
        mapComponent.value.map.map.resize();
      }
    });
  }
});

const mapContainerStyle = computed(() => ({
  flex: "1 1 auto",
  width: "100%",
  height: "100%",
  marginLeft: "0" // ensures the map container fills its parent
}))

// Add handler for filtered walks
const updateDisplayedWalks = (walks) => {
  filteredResults.value = walks;
};

// Update search query watcher
watch(searchQuery, (newQuery) => {
  // If search is cleared, reset filtered results to all walks
  if (!newQuery?.trim()) {
    filteredResults.value = availableWalks.value;
  }
});

// Initialize filtered results
onMounted(() => {
  filteredResults.value = availableWalks.value;
});

onMounted(async () => {
  try {
    const savedExpandedIds = JSON.parse(
      localStorage.getItem("expandedWalks") || "[]"
    );
    if (Array.isArray(savedExpandedIds)) {
      expandedWalkIds.value = savedExpandedIds;
    }
  } catch (e) {
    console.error("Failed to load saved expanded states:", e);
  }

  window.addEventListener("resize", handleResize);
  await initializeData();

  const walkList = document.querySelector(".walk-list-container");
  if (walkList) {
    console.log("Initial walk list styles:", {
      pointerEvents: window.getComputedStyle(walkList).pointerEvents,
      transform: window.getComputedStyle(walkList).transform,
      zIndex: window.getComputedStyle(walkList).zIndex,
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  clearTimeout(resizeTimeout);
});
</script>

<style>
@import '../../css/material3.css';

/* Update marker styles */
.map-marker {
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.map-marker:hover {
  transform: scale(1.05);
}

.map-marker.is-simple {
  cursor: pointer;
}

.map-marker.is-detailed {
  z-index: 2;
}

.map-marker.is-detailed .marker-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 8px;
  min-width: 120px;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.map-marker.active {
  z-index: 3;
}

.map-marker.active .marker-content {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.map-marker.nearby .marker-content {
  border: 2px solid var(--md-sys-color-primary);
}

/* Cluster styles */
.cluster-marker {
  background-color: white;
  border: 2px solid var(--md-sys-color-primary);
  border-radius: 50%;
  color: var(--md-sys-color-primary);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s ease-out;
}

.cluster-marker:hover {
  transform: scale(1.1);
  background-color: var(--md-sys-color-primary);
  color: white;
}

/* Improved marker styles */
.marker-content {
  background: white;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid rgba(0,0,0,0.1);
  min-width: 140px;
  transform: translateY(-50%);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.marker-content:hover {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>
