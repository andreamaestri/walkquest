<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col relative bg-surface">
    <div class="relative h-full w-full flex">
      <!-- Navigation Rail for desktop with streamlined motion animation -->
      <div v-if="showNavigationRail" ref="sidebarRef" class="m3-navigation-rail"
        :class="[{ 'is-expanded': isExpanded }]">
        <Transition @enter="onSidebarEnter" @leave="onSidebarLeave" mode="out-in">
          <div class="h-full flex flex-col" :key="selectedWalkId ? 'drawer' : 'nav'">
            <!-- Normal Navigation Rail Content -->
            <template v-if="!selectedWalkId">
              <div class="m3-rail-header">
                <!-- Menu button - centered and properly styled -->
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
                <button class="m3-rail-item" :class="{ 'is-active': !showRoutesDrawer }"
                  @click="handleWalkSelection(null)">
                  <div class="m3-rail-content">
                    <div class="m3-rail-icon-container">
                      <Icon icon="mdi:compass-outline" class="m3-rail-icon" />
                    </div>
                    <span class="m3-rail-label">Explore</span>
                  </div>
                </button>

                <!-- New Location Search Button - Using helper -->
                <button class="m3-rail-item" @click="setSearchMode('locations')">
                  <div class="m3-rail-content">
                    <div class="m3-rail-icon-container">
                      <Icon icon="mdi:map-search" class="m3-rail-icon" />
                    </div>
                    <span class="m3-rail-label">Find Nearby</span>
                  </div>
                </button>
              </nav>

              <!-- Main Content Area - Using simplified computed -->
              <div class="m3-rail-content-area">
                <div v-if="searchStore.searchMode === 'locations'" class="m3-location-panel">
                  <LocationSearch @location-selected="handleLocationSelected" />
                </div>

                <!-- Walk List with simplified props -->
                <div class="m3-walks-list">
                  <WalkList 
                    v-model="searchQuery" 
                    :walks="filteredWalks" 
                    :selected-walk-id="selectedWalkId"
                    :expanded-walk-ids="expandedWalkIds" 
                    :is-compact="!isExpanded" 
                    @walk-selected="handleWalkSelection"
                    @walk-expanded="handleWalkExpanded" 
                  />
                </div>
              </div>
            </template>

            <!-- Walk Drawer -->
            <WalkDrawer 
              v-if="selectedWalk" 
              :walk="selectedWalk" 
              @close="handleDrawerClose"
            />
          </div>
        </Transition>
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
                  <Icon icon="mdi:close" class="text-[24px]" />
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

      <!-- Map container with simplified config -->
      <div class="m3-content-container hardware-accelerated pointer-events-auto" :style="mapContainerStyle"
        ref="mapContainerRef">
        <div class="m3-surface-container hardware-accelerated pointer-events-auto h-full">
          <MapboxMap 
            ref="mapComponent" 
            :access-token="mapboxToken"
            :map-style="mergedMapConfig.mapStyle"
            :max-bounds="mergedMapConfig.maxBounds"
            :center="mergedMapConfig.center"
            :zoom="mergedMapConfig.zoom"
            :min-zoom="mergedMapConfig.minZoom"
            :max-zoom="mergedMapConfig.maxZoom"
            @mb-created="handleMapCreated" 
            @mb-load="handleMapLoad"
            @mb-moveend="updateVisibleMarkers"
            class="h-full w-full absolute inset-0"
          >
            <!-- Loading indicator -->
            <div v-if="loading"
              class="absolute bottom-4 left-4 z-50 bg-white rounded-full px-4 py-2 shadow-lg">
              <div class="flex items-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                <span class="text-on-surface text-sm">Loading route...</span>
              </div>
            </div>

            <!-- Only render source and layer after map is loaded -->
            <template v-if="mapLoaded">
              <!-- Route layers -->
              <template v-if="validRouteData">
                <MapboxSource :id="MAP_SOURCE.ROUTE" :options="{
                  type: 'geojson',
                  data: validRouteData
                }" />
                <!-- Glow effect layer (rendered first) -->
                <MapboxLayer :id="MAP_LAYER.ROUTE_GLOW" :options="{
                  type: 'line',
                  source: MAP_SOURCE.ROUTE,
                  layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                  },
                  paint: {
                    'line-color': '#52ebff',
                    'line-width': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      10, 12,
                      15, 18
                    ],
                    'line-opacity': 0.6,
                    'line-blur': 8
                  }
                }" />
                <!-- Solid route base -->
                <MapboxLayer :id="MAP_LAYER.ROUTE_BG" :options="{
                  type: 'line',
                  source: MAP_SOURCE.ROUTE,
                  layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                  },
                  paint: {
                    'line-color': '#52ebff',
                    'line-width': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      10, 6,
                      15, 10
                    ],
                    'line-opacity': 0.9
                  }
                }" />
                <!-- Animated dashed overlay -->
                <MapboxLayer :id="MAP_LAYER.ROUTE_ANIMATED" :options="{
                  type: 'line',
                  source: MAP_SOURCE.ROUTE,
                  layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                  },
                  paint: {
                    'line-color': '#ffffff',
                    'line-width': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      10, 4,
                      15, 8
                    ],
                    'line-opacity': 0.8,
                    'line-dasharray': [0, 4, 3]
                  }
                }" />
              </template>

              <!-- Walk markers -->
              <template v-for="walk in visibleWalks" :key="walk.id">
                <MapboxMarker
                  ref="el => { if (el) markerRefs.value.set(walk.id, el) }"
                  :lng-lat="[Number(walk.longitude) || Number(walk.lng), Number(walk.latitude) || Number(walk.lat)]"
                  :popup="{
                    offset: 25,
                    anchor: 'bottom',
                    closeButton: false
                  }"
                  @mb-added="marker => updateMarkerColor(marker, selectedWalkId === walk.id)"
                  @click="handleWalkSelection(walk)"
                >
                  <template #popup>
                    <div class="p-2">
                      <h3 class="font-medium">{{ walk.title || walk.walk_name }}</h3>
                      <p class="text-sm text-on-surface-variant">{{ walk.location }}</p>
                    </div>
                  </template>
                </MapboxMarker>
              </template>
            </template>

          </MapboxMap>
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
      <BottomSheet v-if="isMobile" v-model="isLocationSearchVisible" class="pb-safe-area-inset-bottom">
        <div class="p-4">
          <SearchView v-model="searchStore.searchQuery" :search-mode="'locations'"
            @location-selected="handleLocationSelected" />
        </div>
      </BottomSheet>

      <!-- Mobile navigation bar -->
      <div v-if="isMobile" class="fixed bottom-0 left-0 right-0 bg-surface z-40 shadow-lg">
        <div class="flex justify-around items-center h-16 px-4">
          <button class="m3-nav-button" :class="{ 'active': searchStore.searchMode === 'walks' }"
            @click="searchStore.setSearchMode('walks')">
            <Icon icon="mdi:compass-outline" class="text-2xl" />
            <span class="text-xs">Explore</span>
          </button>

          <button class="m3-nav-button" :class="{ 'active': searchStore.searchMode === 'locations' }"
            @click="searchStore.setSearchMode('locations')">
            <Icon icon="mdi:map-search" class="text-2xl" />
            <span class="text-xs">Find Nearby</span>
          </button>

          <button class="m3-nav-button" @click="uiStore?.setMobileMenuOpen(true)">
            <Icon icon="mdi:menu" class="text-2xl" />
            <span class="text-xs">Menu</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useElementVisibility } from "@vueuse/core"
import { useUiStore } from "../stores/ui"
import { useWalksStore } from "../stores/walks"
import { DynamicScroller, DynamicScrollerItem } from "vue-virtual-scroller"
import { MapboxMap, MapboxNavigationControl, MapboxMarker, MapboxLayer, MapboxSource } from '@studiometa/vue-mapbox-gl'
import "vue-virtual-scroller/dist/vue-virtual-scroller.css"
import WalkList from "./WalkList.vue"
import WalkCard from "./WalkCard.vue"
import { useLocationStore } from '../stores/locationStore'
import BottomSheet from './BottomSheet.vue'
import { useMap } from '../composables/useMap'
import { useSearchStore } from '../stores/searchStore'
import SearchView from './SearchView.vue'
import LocationSearch from './LocationSearch.vue'
import WalkRoute from './WalkRoute.vue'
import { getGeometry } from '../services/api'
import RouteLayer from './RouteLayer.vue'
import WalkDrawer from "./WalkDrawer.vue" // <-- new import
import { MD3_EASING, MD3_DURATION, createMotion } from '../utils/motion.js'

// NEW: Add debounce helper
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  }
}

// Extract setMapInstance from useMap
const { setMapInstance, flyToLocation } = useMap()

// Props definition
const props = defineProps({
  mapboxToken: {
    type: String,
    required: true,
  },
  mapConfig: {
    type: Object,
    default: () => ({}),
  }
});

// Initialize stores
const router = useRouter()
const route = useRoute()
const walksStore = useWalksStore()
const uiStore = useUiStore()
// Initialize stores
const router = useRouter()
const route = useRoute()
const walksStore = useWalksStore()
const uiStore = useUiStore()
const locationStore = useLocationStore()
const searchStore = useSearchStore()

// Remove loading states from UI store initialization
uiStore.$patch({
  error: null,
  mobileMenuOpen: false,
  fullscreen: false,
  showSidebar: !uiStore.isMobile
  // Remove loadingStates object
})

// Initialize search store
searchStore.$patch({
  searchQuery: '',
  searchMode: 'walks',
  error: null,
  isLoading: false,
  searchHistory: []
})

// Component refs and state
const mapComponent = ref(null)
const sidebarRef = ref(null)
const drawerRef = ref(null)
const mobileButtonRef = ref(null)
const mapContainerRef = ref(null)
const expandedWalkIds = ref([])
const isExpanded = ref(localStorage.getItem("sidebarExpanded") === "true")
const mapReady = ref(false)
const currentZoom = ref(8)
const mapContainerVisible = useElementVisibility(mapContainerRef)
const mapRef = ref(null)

// Add toggleExpanded function
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem("sidebarExpanded", String(isExpanded.value))
}

// Update route data ref with better typing and structure
const routeData = ref({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: []
  }
})

// Update function to validate simplified GeoJSON structure
const isValidGeoJSON = (data) => {
  return (
    data &&
    data.type === "Feature" &&
    typeof data.geometry === "object" &&
    typeof data.properties === "object"
  )
}

// Add DEV mode test data
if (import.meta.env.DEV) {
  routeData.value = {
    type: 'Feature',
    properties: { id: 'test' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-4.95, 50.4],
        [-4.96, 50.41],
        [-4.97, 50.42]
      ]
    }
  }
  console.log("🧪 Test route data set")
}

// Add mapLoaded state
const mapLoaded = ref(false)

// Add handleMapLoad method
const handleMapLoad = () => {
  mapLoaded.value = true
}

// Add Cornwall bounds constants
const CORNWALL_BOUNDS = [
  [-5.7, 49.9], // Southwest coordinates
  [-4.2, 50.9]  // Northeast coordinates
]

// Add Cornwall center
const CORNWALL_CENTER = [-4.95, 50.4]

// New: Merge default map values with the mapConfig prop
const mergedMapConfig = computed(() => ({
  mapStyle: props.mapConfig.mapStyle || 'mapbox://styles/andreamaestri/cm79fegfl000z01sdhl4u32jv?optimize=true',
  maxBounds: props.mapConfig.maxBounds || CORNWALL_BOUNDS,
  center: props.mapConfig.center || CORNWALL_CENTER,
  zoom: props.mapConfig.zoom || 9,
  minZoom: props.mapConfig.minZoom || 1,
  maxZoom: props.mapConfig.maxZoom || 35,
}))

// Computed properties
const error = computed(() => uiStore?.error)
const isFullscreen = computed(() => uiStore?.fullscreen)
const showSidebar = computed(() => uiStore?.showSidebar)
const isMobile = computed(() => uiStore?.isMobile)
const selectedWalkId = computed(() => props.walkId)
const availableWalks = computed(() => walksStore.walks)
const walks = computed(() => {
  if (!Array.isArray(walksStore.walks)) return []
  return walksStore.walks.map(walk => ({
    id: walk.id,
    lat: walk.latitude,
    lng: walk.longitude,
    title: walk.title || walk.walk_name,  // Normalize title
    location: walk.location,
    ...walk
  }))
})

// Added to define showRoutesDrawer and avoid Vue warn
const showRoutesDrawer = ref(false)

// Add new computed property for filtered walks
const filteredWalks = computed(() => {
  let results = availableWalks.value

  if (searchQuery.value?.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    results = results.filter(walk => {
      const text = [
        walk.title,
        walk.location,
        walk.description
      ].filter(Boolean).join(' ').toLowerCase()
      return text.includes(query)
    })
  }

  return results
})

// NEW: Lift search query state
const searchQuery = computed({
  get: () => searchStore.searchQuery,
  set: (value) => searchStore.setSearchQuery(value)
})

// Add ref for filtered results
const filteredResults = ref([])

// Update the location search visibility computed property
const isLocationSearchVisible = computed({
  get: () => searchStore.searchMode === 'locations',
  set: (value) => {
    searchStore.setSearchMode(value ? 'locations' : 'walks')
  }
})

// Add loading state
const loading = ref(false)

// Add drawer visibility control
const showDrawer = ref(false)

// Add computed for selected walk (move this up)
const selectedWalk = computed(() => {
  if (!selectedWalkId.value) return null
  return walks.value.find(walk => walk.id === selectedWalkId.value)
})

// Replace the handleWalkSelection function
const handleWalkSelection = async (walk) => {
  if (walk) {
    // Update URL with selected walk
    router.push({ 
      query: { walkId: walk.id },
      replace: true 
    })
    
    try {
      loading.value = true
      // Update marker colors
      updateAllMarkerColors(walk.id)

      // Close any open marker popups
      const marker = markerRefs.value.get(walk.id)
      if (marker?.getPopup) {
        marker.getPopup()?.remove()
      }

      // Fetch route geometry
      const response = await fetch(`/api/walks/${walk.id}/geometry`)
      if (!response.ok) throw new Error('Failed to fetch route')
      
      const data = await response.json()
      if (isValidGeoJSON(data)) {
        routeData.value = data
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      loading.value = false
    }
  } else {
    // Clear selection  
    router.push({ query: {}, replace: true })
    routeData.value = null
    updateAllMarkerColors(null)
  }
}

// Add a watch for the route query
watch(
  () => route.query.walkId,
  async (newWalkId) => {
    if (newWalkId && !selectedWalk.value) {
      const walk = walks.value.find(w => w.id === newWalkId)
      if (walk) {
        await handleWalkSelection(walk)
      }
    }
  },
  { immediate: true }
)

// Simplified drawer close handler
const handleDrawerClose = () => {
  handleWalkSelection(null)
}

// Watch effects
watch(
  [isExpanded, showSidebar], 
  ([newExpanded, newVisible]) => {
    requestAnimationFrame(() => {
      // Handle pointer events
      const walkList = document.querySelector(".walk-list-container")
      if (walkList) {
        walkList.style.pointerEvents = !newVisible || !newExpanded ? "none" : "auto"
      }

      // Handle scroller updates
      const scroller = document.querySelector(".vue-recycle-scroller")
      const scrollerCtx = scroller?.__vueParentComponent?.ctx
      
      // Only update scroller size when closing
      if ((!newVisible || !newExpanded) && scrollerCtx?.updateSize) {
        scrollerCtx.updateSize()
      }
      
      // Force reflow to ensure proper transitions
      scroller?.offsetHeight
    })
  },
  { immediate: true }
)

// Replace all simple animation functions with enhanced MD3 versions
const onSidebarEnter = (el, done) => {
  animate(
    el,
    {
      transform: ['translateX(-20px)', 'translateX(0)'],
      opacity: [0, 1],
      scale: [0.95, 1]
    },
    createMotion({
      duration: MD3_DURATION.medium4,
      easing: MD3_EASING.emphasizedDecelerate
    })
  ).finished.then(done)
}

const onSidebarLeave = (el, done) => {
  animate(
    el,
    {
      transform: ['translateX(0)', 'translateX(-20px)'],
      opacity: [1, 0],
      scale: [1, 0.95]
    },
    createMotion({
      duration: MD3_DURATION.medium3,
      easing: MD3_EASING.emphasizedAccelerate
    })
  ).finished.then(done)
}

const onDrawerEnter = (el, done) => {
  animate(
    el,
    {
      transform: ['translateX(100%)', 'translateX(0)'],
      opacity: [0.5, 1]
    },
    createMotion({
      duration: MD3_DURATION.medium4,
      easing: MD3_EASING.emphasizedDecelerate
    })
  ).finished.then(done)
}

const onDrawerLeave = (el, done) => {
  animate(
    el,
    {
      transform: ['translateX(0)', 'translateX(100%)'],
      opacity: [1, 0.5]
    },
    createMotion({
      duration: MD3_DURATION.medium3,
      easing: MD3_EASING.emphasizedAccelerate
    })
  ).finished.then(done)
}

const onMobileButtonEnter = (el, done) => {
  animate(
    el,
    {
      transform: ['translateY(20px)', 'translateY(0)'],
      opacity: [0, 1],
      scale: [0.9, 1]
    },
    createMotion({
      duration: MD3_DURATION.medium2,
      easing: MD3_EASING.standardDecelerate
    })
  ).finished.then(done)
}

const onMobileButtonLeave = (el, done) => {
  animate(
    el,
    {
      transform: ['translateY(0)', 'translateY(20px)'],
      opacity: [1, 0],
      scale: [1, 0.9]
    },
    createMotion({
      duration: MD3_DURATION.medium2,
      easing: MD3_EASING.standardAccelerate
    })
  ).finished.then(done)
}

// Route update handling using composition API
watch(
  () => props.walkId,
  async (newId, oldId) => {
    if (newId !== oldId) {
      const walk = walksStore.getWalkById(newId)
      if (walk) {
        walksStore.setSelectedWalk(walk)
      }
    }
  }
)

// Methods
const initializeData = async () => {
  try {
    console.debug("WalkInterface.vue: Starting data initialization")

    await walksStore.loadWalks()
    console.debug(
      "WalkInterface.vue: Walks loaded from store:",
      walksStore.walks
    )

    // Ensure walks are loaded before showing the sidebar
    await nextTick()

    if (walksStore.walks.length && !isMobile.value) {
      uiStore?.setSidebarVisibility(true)
      console.debug(
        "WalkInterface.vue: Sidebar set visible, walks count:",
        walksStore.walks.length
      )

      // Force a reflow to ensure proper rendering
      await nextTick()
      const walkList = document.querySelector(".walk-list")
      if (walkList) {
        walkList.style.display = "none"
        walkList.offsetHeight // Force reflow
        walkList.style.display = ""
      }
    }
  } catch (error) {
    console.error("WalkInterface.vue: Data initialization failed:", error)
    uiStore?.setError(error.message)
  } finally {
    console.debug("WalkInterface.vue: Loading stopped")
  }
}

watch(
  availableWalks,
  (newVal) => {
    console.debug("WalkInterface.vue: availableWalks updated:", newVal)
  },
  { immediate: true }
)

// Add more detailed logging in handleMapCreated
const handleMapCreated = (map) => {
  console.log('Map created');
  mapRef.value = map;
  mapInstance.value = map;
  setMapInstance(map);
  currentZoom.value = map.getZoom();
  // Listen to continuous map movement to update mapBounds
  map.on('move', updateVisibleMarkers);
};

// Handle map keyboard navigation
const handleMapKeyboard = (e) => {
  const KEYBOARD_OFFSET = 50 // pixels to pan per key press

  if (!e.target.mapInstance) return
  const map = e.target.mapInstance

  switch (e.key) {
    case 'ArrowRight':
      map.panBy([KEYBOARD_OFFSET, 0])
      break
    case 'ArrowLeft':
      map.panBy([-KEYBOARD_OFFSET, 0])
      break
    case 'ArrowUp':
      map.panBy([0, -KEYBOARD_OFFSET])
      break
    case 'ArrowDown':
      map.panBy([0, KEYBOARD_OFFSET])
      break
  }
}

const handleWalkExpanded = ({ walkId, expanded }) => {
  console.debug("WalkInterface.vue: Walk expansion toggled:", {
    walkId,
    expanded,
  })

  expandedWalkIds.value = expanded
    ? [...new Set([...expandedWalkIds.value, walkId])]
    : expandedWalkIds.value.filter((id) => id !== walkId)

  console.debug(
    "WalkInterface.vue: Updated expandedWalkIds:",
    expandedWalkIds.value
  )

  localStorage.setItem("expandedWalks", JSON.stringify(expandedWalkIds.value))
}

const toggleSidebar = () => {
  uiStore?.toggleSidebar()
}

const handleFabClick = async () => {
  // Navigate home
  await router.push({ name: "home" })
  // Expand the sidebar if it's not already expanded
  if (!isExpanded.value) {
    isExpanded.value = true
    localStorage.setItem("sidebarExpanded", "true")
  }
}

// Add a helper to compute effective flyTo options for better centering
const effectiveFlyToOptions = (location) => {
  // Use a different offset on mobile vs desktop for improved centering
  const defaultOffset = isMobile.value ? [0, 0] : [0, -100];
  return {
    center: location.center,
    zoom: location.zoom || 14,
    pitch: location.pitch !== undefined ? location.pitch : 60,
    bearing: location.bearing !== undefined ? location.bearing : 30,
    offset: location.offset || defaultOffset,
    duration: location.duration || 2000,
    easing: location.easing || ((t) => t * (2 - t)),
    essential: true
  };
};

// Modify handleLocationSelected to use the new flyTo options
const handleLocationSelected = async (location) => {
  if (!location?.center) return;
  await searchStore.handleLocationSelected(location);
  await flyToLocation(effectiveFlyToOptions(location));
};

// Refactor handleResize using debounce instead of manual clearTimeout
const handleResize = debounce(() => {
  if (mapComponent.value?.map?.map) {
    mapComponent.value.map.map.resize();
  }
}, 250);

// Add window resize listener on mount and remove on unmount
onMounted(() => {
  // ...existing onMounted code...
  window.addEventListener('resize', handleResize);
  // ...existing onMounted code...
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  // ...existing onBeforeUnmount code...
});

// Watch for changes in walk data
watch(
  () => walksStore.walks,
  (newWalks) => {
    console.log("Store walks updated:", newWalks?.length)
    if (newWalks?.length > 0 && !showSidebar.value && !isMobile.value) {
      nextTick(() => {
        uiStore?.setSidebarVisibility(true)
      })
    }
  },
  { deep: true, immediate: true }
)

// Add dimension logging
const logContainerDimensions = () => {
  const sidebar = document.querySelector(".sidebar")
  const content = document.querySelector(".sidebar-content")

  console.debug("WalkInterface dimensions:", {
    sidebar: sidebar?.getBoundingClientRect(),
    content: content?.getBoundingClientRect(),
  })
}

// Watch for sidebar visibility
watch(showSidebar, (visible) => {
  console.log("Sidebar visibility changed:", visible)
  if (visible) {
    nextTick(() => {
      logContainerDimensions()
      if (mapComponent.value?.map?.map) {
        mapComponent.value.map.map.resize()
      }
    })
  }
})

const mapContainerStyle = computed(() => ({
  flex: "1 1 auto",
  width: "100%",
  height: "100%",
  marginLeft: "0" // ensures the map container fills its parent
}))

// Add handler for filtered walks
const updateDisplayedWalks = (walks) => {
  filteredResults.value = walks
}

// NEW: Debounce update for filtered results on search change
const debouncedUpdateFilteredResults = debounce(() => {
  filteredResults.value = availableWalks.value;
}, 300);

watch(searchQuery, (newQuery) => {
  if (!newQuery?.trim()) {
    debouncedUpdateFilteredResults();
  }
});

// Initialize filtered results
onMounted(() => {
  filteredResults.value = availableWalks.value
})

const { initializeResponsiveState } = uiStore

// Simplify initialization
const initializeInterface = () => {
  const cleanup = initializeResponsiveState()
  walksStore.loadWalks()

  if (walksStore.walks.length && !isMobile.value) {
    uiStore.setSidebarVisibility(true)
  }

  if (props.walkId) {
    const walk = walksStore.getWalkById(props.walkId)
    if (walk) {
      handleWalkSelection(walk)
    }
  }
}

onMounted(initializeInterface)

// Update computed properties
const showNavigationRail = computed(() =>
  !isMobile.value && showSidebar.value && !isFullscreen.value
)

// Update handleBackClick to use flyTo with optimized flight path parameters
const handleBackClick = async () => {
  if (mapComponent.value?.map) {
    mapComponent.value.map.flyTo({
      center: mergedMapConfig.value.center,
      zoom: mergedMapConfig.value.zoom,
      pitch: 0,
      bearing: 0,
      padding: { top: 100, bottom: 100, left: 100, right: 100 },
      duration: 1200,
      easing: (t) => (--t) * t * t + 1, // easeOutCubic
      essential: true
    })
  }
  await router.push({ name: 'home' })
}

// Add watch for route changes to handle direct URL access
watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      const walk = walks.value.find(w => w.id === newId)
      if (walk) {
        await handleWalkSelection(walk)
      }
    }
  },
  { immediate: true }
)

// Optimize search filtering
const searchResults = ref([])
const searchThrottleMs = 150

// Optimized search with throttle
const performSearch = throttle((query) => {
  if (!query?.trim()) {
    searchResults.value = availableWalks.value
    return
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/)

  searchResults.value = availableWalks.value.filter(walk => {
    const text = [
      walk.title,
      walk.location,
      walk.description,
      walk.difficulty
    ].filter(Boolean).join(' ').toLowerCase()

    return searchTerms.every(term => text.includes(term))
  })
}, searchThrottleMs)

// Replace existing search watcher with optimized version
watch(searchQuery, (newQuery) => {
  performSearch(newQuery)
}, { immediate: true })

// Helper function for throttle
function throttle(fn, delay) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      fn.apply(this, args)
      lastCall = now
    }
  }
}

// Update filtered results based on search results
watch(searchResults, (results) => {
  filteredResults.value = results
})

// Add cleanup
onBeforeUnmount(() => {
  // Clean up map event listeners
  if (mapRef.value) {
    mapRef.value.off('styledata')
  }

  // Clear refs
  mapRef.value = null
  mapComponent.value = null
})

// Add handler for map movement
const updateVisibleMarkers = debounce(() => {
  if (mapRef.value) {
    try {
      mapBounds.value = mapRef.value.getBounds()  // update reactive bounds
    } catch (error) {
      console.error('Error updating visible markers:', error)
      // Don't throw - silently recover from map errors
      return
    }
  }
}, 100) // Debounce map updates
// Add a computed property to validate route data
const validRouteData = computed(() => {
  if (!routeData.value) return null

  // Basic structure validation
  if (!routeData.value.type || !routeData.value.geometry) {
    console.error('Invalid route data structure:', routeData.value)
    return null
  }

  return routeData.value
})

// Simplifying the route data watcher to focus on essential updates
watch(routeData, (newData) => {
  if (newData) {
    console.log('Route data updated:', {
      type: newData.type,
      coordinates: newData.geometry?.coordinates?.length
    })
  }
}, { deep: true })

// Add constants for map source and layer IDs
const MAP_SOURCE = {
  ROUTE: 'walkquest-route-source'
};

const MAP_LAYER = {
  ROUTE_GLOW: 'walkquest-route-glow',
  ROUTE_BG: 'walkquest-route-bg',
  ROUTE_ANIMATED: 'walkquest-route-animated'
};

// Add map reference and initialization state
const mapInstance = ref(null);

// Add route hover effect handler
const addRouteHoverEffect = () => {
  if (!mapRef.value) return

  mapRef.value.on('mousemove', MAP_LAYER.ROUTE, (e) => {
    if (e.features.length > 0) {
      mapRef.value.setFeatureState(
        { source: MAP_SOURCE.ROUTE, id: e.features[0].id },
        { hover: true }
      )
    }
  })

  mapRef.value.on('mouseleave', MAP_LAYER.ROUTE, () => {
    mapRef.value.setFeatureState(
      { source: MAP_SOURCE.ROUTE },
      { hover: false }
    )
  })
}

// Add cleanup for hover effects
onBeforeUnmount(() => {
  if (mapRef.value) {
    mapRef.value.off('mousemove', MAP_LAYER.ROUTE)
    mapRef.value.off('mouseleave', MAP_LAYER.ROUTE)
  }
})
// Improved animation logic for irregular linestrings
const dashArraySequence = [
  [0, 4, 3],      // 1. Start - Dash is present
  [0.2, 4, 2.8],  // 2.
  [0.4, 4, 2.6],  // 3.
  [0.6, 4, 2.4],  // 4.
  [0.8, 4, 2.2],  // 5.
  [1, 4, 2],      // 6.
  [1.2, 4, 1.8],  // 7.
  [1.4, 4, 1.6],  // 8.
  [1.6, 4, 1.4],  // 9.
  [1.8, 4, 1.2],  // 10.
  [2, 4, 1],      // 11.
  [2.2, 4, 0.8],  // 12.
  [2.4, 4, 0.6],  // 13.
  [2.6, 4, 0.4],  // 14.
  [2.8, 4, 0.2],  // 15.
  [3, 4, 0],      // 16. Dash disappears
  [2.5, 4, 0.5],  // 17. Start bringing dash back, offset decreasing
  [2, 4, 1],      // 18.
  [1.5, 4, 1.5],  // 19.
  [1, 4, 2],      // 20.
  [0.5, 4, 2.5],  // 21.
  [0, 4, 3]       // 22. Back to the start - Smooth loop point!
];

let animationFrame = null;

const animateDashArray = (timestamp) => {
  if (!mapRef.value) return;

  const animationDuration = 5000;
  const progress = (timestamp % animationDuration) / animationDuration;

  const dashSeqLength = dashArraySequence.length;
  const targetIndex = progress * dashSeqLength;
  const lowerIdx = Math.floor(targetIndex);
  const fraction = targetIndex - lowerIdx;

  // Adjusted Indexing for Circularity:
  const currentIdx = lowerIdx % dashSeqLength; // Ensure index wraps around
  const nextIdx = (lowerIdx + 1) % dashSeqLength; // Ensure next index wraps around

  // Interpolate between two consecutive dash array values
  const interpolatedDashArray = dashArraySequence[currentIdx].map((value, i) => {
    const nextValue = dashArraySequence[nextIdx][i];
    return value + (nextValue - value) * fraction;
  });

  mapRef.value.setPaintProperty(
    MAP_LAYER.ROUTE_ANIMATED,
    'line-dasharray',
    interpolatedDashArray
  );

  animationFrame = requestAnimationFrame(animateDashArray);
};

// Start animation when map is loaded and valid route data exists
watch([mapLoaded, validRouteData], ([isLoaded, hasRoute]) => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  
  if (isLoaded && hasRoute) {
    nextTick(() => {
      animationFrame = requestAnimationFrame(animateDashArray);
    });
  }
}, { immediate: true });

// Clean up animation on unmount
onBeforeUnmount(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});

// Replace all marker-related functions with these enhanced versions
const updateMarkerColor = (marker, isSelected) => {
  if (!marker) return;
  const element = marker; // marker is already the correct element
  const svg = element.querySelector('svg');
  if (!svg) return;
  // Select the first <path> regardless of its attributes
  const targetPath = svg.querySelector('path');
  if (targetPath) {
    targetPath.style.fill = isSelected ? '#6750A4' : '#3FB1CE';
  }
};

const updateAllMarkerColors = (selectedId = null) => {
  markerRefs.value.forEach((marker, id) => {
    updateMarkerColor(marker, id === selectedId);
  });
};

// Add ref to store marker references
const markerRefs = ref(new Map());

// Add spatial index structure
const spatialIndex = ref(new Map())

// Consolidated sidebar state watcher
watch(
  [isExpanded, showSidebar],
  ([newExpanded, newVisible]) => {
    // Handle pointer events
    const walkList = document.querySelector(".walk-list-container")
    if (walkList) {
      walkList.style.pointerEvents = !newVisible || !newExpanded ? "none" : "auto"
    }

    // Handle scroller updates
    if (!newVisible || !newExpanded) {
      requestAnimationFrame(() => {
        const scroller = document.querySelector(".vue-recycle-scroller")
        if (scroller?.__vueParentComponent?.ctx?.updateSize) {
          scroller.__vueParentComponent.ctx.updateSize()
        }
      })
    }
  },
  { immediate: true }
)

// Optimized visible walks computation with spatial indexing
const updateSpatialIndex = () => {
  const newIndex = new Map()
  const cellSize = 0.1 // roughly 11km at equator

  walks.value.forEach(walk => {
    const lng = Number(walk.longitude) || Number(walk.lng)
    const lat = Number(walk.latitude) || Number(walk.lat)
    
    // Get grid cell coordinates
    const cellX = Math.floor(lng / cellSize)
    const cellY = Math.floor(lat / cellSize)
    
    // Create cell key
    const key = `${cellX}:${cellY}`
    
    if (!newIndex.has(key)) {
      newIndex.set(key, [])
    }
    newIndex.get(key).push(walk)
  })
  
  spatialIndex.value = newIndex
}

// Update spatial index when walks change
watch(() => walks.value, updateSpatialIndex, { immediate: true })

// Add a ref at the top with your other refs (e.g., after spatialIndex definition)
const previousVisibleWalks = ref(null)

// Add a reactive ref for the map bounds (place near other refs)
const mapBounds = ref(null)

// Replace your existing visibleWalks computed property with the optimized version:
const visibleWalks = computed(() => {
  // Use mapBounds as a dependency so that changes trigger recomputation.
  if (!mapBounds.value || spatialIndex.value.size === 0) return walks.value;
  
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
      const key = `${x}:${y}`;
      const cellWalks = spatialIndex.value.get(key);
      if (cellWalks) {
        cellWalks.forEach(walk => visibleSet.add(walk));
      }
    }
  }
  
  const currentVisibleWalks = Array.from(visibleSet);
  
  if (
    previousVisibleWalks.value &&
    areArraysShallowEqual(previousVisibleWalks.value, currentVisibleWalks)
  ) {
    return previousVisibleWalks.value;
  } else {
    previousVisibleWalks.value = currentVisibleWalks;
    return currentVisibleWalks;
  }
});

// Add the helper function (place it among your other functions/methods)
function areArraysShallowEqual(arrA, arrB) {
  if (!arrA || !arrB || arrA.length !== arrB.length) return false;
  const setB = new Set(arrB.map(walk => walk.id));
  for (const walkA of arrA) {
    if (!setB.has(walkA.id)) return false;
  }
  return true;
}

// Consolidated cleanup
onBeforeUnmount(() => {
  // 1. Clean up animations
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  // 2. Clean up event listeners
  const cleanupEvents = () => {
    window.removeEventListener('resize', handleResize)
    
    if (!mapRef.value) return
    
    // Map event handlers
    const mapEvents = ['mousemove', 'mouseleave', 'styledata']
    mapEvents.forEach(event => {
      mapRef.value.off(event, MAP_LAYER.ROUTE)
    })
  }
  cleanupEvents()

  // 3. Reset state
  routeData.value = null
  loading.value = false
  mapLoaded.value = false

  // 4. Clear collections
  markerRefs.value.clear()
  spatialIndex.value.clear()

  // 5. Clear refs after cleanup
  if (mapRef.value) {
    mapRef.value = null
    mapComponent.value = null
  }
})

// SearchStore helpers
const setSearchMode = (mode) => searchStore.setSearchMode(mode)

// Title normalization helper
const getWalkTitle = (walk) => walk?.title || walk?.walk_name || ''

// Map resize helper
const resizeMap = () => {
  if (mapComponent.value?.map?.map) {
    mapComponent.value.map.map.resize()
  }
}


// Simplified GeoJSON validation and handling
const processRouteData = (data) => {
  if (!data?.type || !data?.geometry?.coordinates) {
    console.error('Invalid route data structure:', data)
    return null
  }
  return data
}

// Consolidated cleanup function
const cleanup = () => {
  // 1. Clean up animations
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  // 2. Clean up event listeners
  window.removeEventListener('resize', handleResize)
  
  if (mapRef.value) {
    ['mousemove', 'mouseleave', 'styledata'].forEach(event => {
      mapRef.value.off(event, MAP_LAYER.ROUTE)
    })
  }

  // 3. Reset state
  routeData.value = null
  loading.value = false
  mapLoaded.value = false

  // 4. Clear collections
  markerRefs.value.clear()
  spatialIndex.value.clear()

  // 5. Clear refs
  mapRef.value = null
  mapComponent.value = null
}

// Lifecycle hooks
onMounted(initializeInterface)
onBeforeUnmount(cleanup)

</script>

<style>
@import '../../css/material3.css';
</style>
