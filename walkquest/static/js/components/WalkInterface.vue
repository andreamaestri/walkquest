<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col relative bg-surface">
    <div class="relative h-full w-full flex">
      <!-- Navigation Rail for desktop with simplified animation -->
      <div 
        v-if="showNavigationRail" 
        ref="sidebarRef" 
        class="m3-navigation-rail"
        :class="[{ 'is-expanded': isExpanded }]"
      >
        <Transition name="fade" mode="out-in">
          <!-- Normal Navigation Rail Content -->
          <div v-if="!selectedWalkId" key="nav" class="h-full flex flex-col">
            <div class="m3-rail-header">
              <!-- Menu button - centered and properly styled -->
              <button class="m3-rail-item menu-button" @click="toggleExpanded">
                <div class="m3-state-layer">
                  <iconify-icon icon="mdi:menu" class="m3-rail-icon text-[24px]" />
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
              <button class="m3-rail-item" @click="searchStore.setSearchMode('locations')">
                <div class="m3-rail-content">
                  <div class="m3-rail-icon-container">
                    <iconify-icon icon="mdi:map-search" class="m3-rail-icon" />
                  </div>
                  <span class="m3-rail-label">Find Nearby</span>
                </div>
              </button>
            </nav>

            <!-- Main Content Area -->
            <div class="m3-rail-content-area">
              <!-- Location Search Panel -->
              <div v-if="searchStore.searchMode === 'locations'" class="m3-location-panel">
                <LocationSearch @location-selected="handleLocationSelected" />
              </div>

              <!-- Walk List -->
              <div class="m3-walks-list">
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
            </div>
          </div>

          <!-- Walk Detail View -->
          <div v-else key="detail" class="h-full flex flex-col">
            <div class="m3-detail-header">
              <button class="m3-icon-button" @click="handleBackClick">
                <div class="m3-state-layer">
                  <iconify-icon icon="material-symbols:arrow-back-rounded" class="text-[24px]" />
                </div>
              </button>
              <h2 class="m3-title-large">{{ selectedWalk?.title || selectedWalk?.walk_name }}</h2>
            </div>
            <div class="m3-walk-detail">
              <WalkCard 
                :walk="selectedWalk"
                :expanded="true"
                class="m3-elevated-card"
              />
              <WalkRoute
                v-if="selectedWalk"
                :walk-id="selectedWalk.id"
                :walk-title="selectedWalk.title || selectedWalk.walk_name"
                :initial-route-data="selectedWalk.routeData"
              />
            </div>
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

      <!-- Map container -->
      <div class="m3-content-container hardware-accelerated pointer-events-auto" :style="mapContainerStyle" ref="mapContainerRef">
        <div class="m3-surface-container hardware-accelerated pointer-events-auto h-full">
          <MapboxMap
            ref="mapComponent"
            :access-token="mapboxToken"
            :map-style="'mapbox://styles/andreamaestri/cm79fegfl000z01sdhl4u32jv'"
            :center="CORNWALL_CENTER"
            :zoom="9"
            :min-zoom="1"
            :max-zoom="35"
            :max-bounds="CORNWALL_BOUNDS"
            :cooperative-gestures="true"
            :keyboard="true"
            :bearing-snap="7"
            :pitch-with-rotate="true"
            :drag-rotate="true"
            :touch-zoom-rotate="{ around: 'center' }"
            :touch-pitch="true"
            :min-pitch="0"
            :max-pitch="85"
            :scroll-zoom="{ 
              smooth: true, 
              speed: 0.5,
              around: 'center'
            }"
            :drag-pan="{
              smooth: true,
              inertia: true,
              maxSpeed: 1400,
              linearity: 0.3,
              deceleration: 2500
            }"
            class="h-full w-full absolute inset-0"
            @mb-created="handleMapCreated"
            @mb-load="handleMapLoad"
            @mb-moveend="updateVisibleMarkers">
            
            <!-- Loading indicator -->
            <div v-if="loading" class="absolute bottom-4 left-4 z-50 bg-surface-container-high rounded-full px-4 py-2 shadow-lg">
              <div class="flex items-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                <span class="text-on-surface text-sm">Loading route...</span>
              </div>
            </div>

            <!-- Only render source and layer after map is loaded -->
            <template v-if="mapLoaded && validRouteData">
                <MapboxSource
                  :id="MAP_SOURCE.ROUTE"
                  :options="{
                    type: 'geojson',
                    data: validRouteData
                  }"
                />
                <MapboxLayer
                  :id="MAP_LAYER.ROUTE"
                  :options="{
                    type: 'line',
                    source: MAP_SOURCE.ROUTE,
                    layout: {
                      'line-join': 'round',
                      'line-cap': 'round',
                      visibility: 'visible'
                    },
                    paint: {
                      'line-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#FF8A65',  // Hover color
                        '#FF5722'   // Default color
                      ],
                      'line-width': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 3,    // Width at zoom level 10
                        15, 6     // Width at zoom level 15
                      ],
                      'line-opacity': 0.85,
                      'line-dasharray': [0.8, 1.6],
                      'line-blur': 0.5
                    }
                  }"
                />
                <!-- Debug overlay -->
                <div class="absolute top-4 right-4 bg-white p-2 rounded shadow z-50">
                  <p class="text-sm">Route coordinates: {{ validRouteData?.geometry?.coordinates?.length || 0 }}</p>
                </div>
              </template>
            <!-- Markers -->
            <MapboxMarker
              v-for="walk in visibleWalks"
              :key="walk.id"
              :anchor="bottom"
              :lng-lat="[Number(walk.longitude) || Number(walk.lng), Number(walk.latitude) || Number(walk.lat)]"
              :popup="false"
              :color="selectedWalkId === walk.id ? '#6750A4' : '#625B71'" 
              :class="{ 'mapboxgl-marker-selected': selectedWalkId === walk.id }"
              @click="handleWalkSelection(walk)"
            />

            <!-- MapboxMap Controls -->
            <MapboxNavigationControl position="top-left" />

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
      <BottomSheet 
        v-if="isMobile"
        v-model="isLocationSearchVisible"
        class="pb-safe-area-inset-bottom"
      >
        <div class="p-4">
          <SearchView
            v-model="searchStore.searchQuery"
            :search-mode="'locations'"
            @location-selected="handleLocationSelected"
          />
        </div>
      </BottomSheet>

      <!-- Mobile navigation bar -->
      <div v-if="isMobile" class="fixed bottom-0 left-0 right-0 bg-surface z-40 shadow-lg">
        <div class="flex justify-around items-center h-16 px-4">
          <button 
            class="m3-nav-button" 
            :class="{ 'active': searchStore.searchMode === 'walks' }"
            @click="searchStore.setSearchMode('walks')"
          >
            <iconify-icon icon="mdi:compass-outline" class="text-2xl" />
            <span class="text-xs">Explore</span>
          </button>
          
          <button 
            class="m3-nav-button" 
            :class="{ 'active': searchStore.searchMode === 'locations' }"
            @click="searchStore.setSearchMode('locations')"
          >
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue"
import { useRouter, useRoute } from "vue-router"
import { animate } from "motion"
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

// NEW: Add debounce helper
function debounce(fn, delay) {
  let timer;
  return function(...args) {
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
  },
  walkId: {
    type: [String, Number],
    default: null,
  },
});

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

// Update StoreLocator configuration
const mapConfig = computed(() => ({
  mapStyle: 'mapbox://styles/andreamaestri/cm79fegfl000z01sdhl4u32jv?optimize=true',
  maxBounds: CORNWALL_BOUNDS,
  center: CORNWALL_CENTER,
  zoom: 9,
  minZoom: 1,
  maxZoom: 35,
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

// Update handleWalkSelection with simpler GeoJSON handling
const handleWalkSelection = async (walk) => {
  if (!walk) {
    routeData.value = null
    return
  }

  try {
    loading.value = true
    console.log("🚶‍♂️ Fetching geometry for walk:", walk.id)

    const response = await fetch(`/api/walks/${walk.id}/geometry`)
    if (!response.ok) {
      throw new Error(`Failed to fetch route geometry: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!isValidGeoJSON(data)) {
      throw new Error('Invalid GeoJSON data structure received')
    }

    // Store the raw GeoJSON response
    routeData.value = {
      type: "Feature",
      geometry: data.geometry || {},
      properties: {
        ...data.properties,
        id: walk.id,
        name: walk.title || walk.walk_name
      }
    }

    // Update map view if we have geometry
    if (data.geometry) {
      mapRef.value?.flyTo({
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        pitch: 45,
        bearing: 0,
        duration: 2000,
        essential: true,
        maxZoom: 15
      })
    }

  } catch (error) {
    console.error("❌ Error loading route:", error)
    uiStore?.setError(error.message)
    routeData.value = null
  } finally {
    loading.value = false
  }
}

// Watch effects
watch(
  [isExpanded, showSidebar],
  ([newExpanded, newVisible]) => {
    if (!newVisible || !newExpanded) {
      const walkList = document.querySelector(".walk-list-container")
      if (walkList) {
        walkList.style.pointerEvents = "none"
      }
    } else {
      const walkList = document.querySelector(".walk-list-container")
      if (walkList) {
        walkList.style.pointerEvents = "auto"
      }
    }
  },
  { immediate: true }
)

// Ensure proper cleanup of items when visibility changes
watch(
  [isExpanded, showSidebar],
  ([newExpanded, newVisible]) => {
    if (!newVisible || !newExpanded) {
      // Wait for transition to start
      requestAnimationFrame(() => {
        const scroller = document.querySelector(".vue-recycle-scroller")
        if (scroller && scroller.__vueParentComponent?.ctx) {
          const ctx = scroller.__vueParentComponent.ctx
          if (typeof ctx.updateSize === "function") {
            ctx.updateSize()
          }
        }
      })
    }
  },
  { immediate: true }
)

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
  ])

  onComplete()
}

async function onSidebarLeave(el, onComplete) {
  const currentWidth = isExpanded.value ? "412px" : "80px"
  const widthAnim = animate(
    el,
    { width: [currentWidth, "80px"] },
    { duration: 0.4, easing: "spring(1, 80, 10, 0)" }
  )
  const innerEls = el.querySelectorAll(".m3-rail-item, .m3-rail-fab-text")
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
  )
  await Promise.all([widthAnim.finished, ...innerAnims])
  onComplete()
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
  )

  await animation.finished
  onComplete()
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
  )

  await animation.finished
  onComplete()
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
  ])

  onComplete()
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
  ])

  onComplete()
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
  ).finished

  onComplete()
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
  ).finished

  onComplete()
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
  ).finished
  onComplete()
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
  ).finished
  onComplete()
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
};

// Handle map keyboard navigation
const handleMapKeyboard = (e) => {
  const KEYBOARD_OFFSET = 50 // pixels to pan per key press
  
  if (!e.target.mapInstance) return
  const map = e.target.mapInstance
  
  switch(e.key) {
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

// Update handleLocationSelected to use enhanced 3D flyTo options
const handleLocationSelected = async (location) => {
  if (!location?.center) return
  
  await searchStore.handleLocationSelected(location)
  await flyToLocation({
    center: location.center,
    zoom: 14,
    pitch: 60,           // increased pitch for a 3D view
    bearing: 30,         // added bearing
    offset: [0, -150],   // Adjusted offset
    duration: 2000,      // increased duration for smoother transition
    easing: (t) => t * (2 - t),  // ease-out easing function
    essential: true
  })
}

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

// Add computed for selected walk
const selectedWalk = computed(() => {
  if (!selectedWalkId.value) return null
  return walks.value.find(walk => walk.id === selectedWalkId.value)
})

// Update handleBackClick to use flyTo with optimized flight path parameters
const handleBackClick = async () => {
  if (mapComponent.value?.map) {
    mapComponent.value.map.flyTo({
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

// Add virtual rendering computed property
const visibleWalks = computed(() => {
  if (!mapRef.value || walks.value.length === 0) return [];

  const bounds = mapRef.value.getBounds();
  const padding = 0.1; // 10% padding around viewport

  // Calculate extended bounds
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const minLng = sw.lng - padding;
  const minLat = sw.lat - padding;
  const maxLng = ne.lng + padding;
  const maxLat = ne.lat + padding;

  return walks.value.filter(walk => {
    const lng = Number(walk.longitude) || Number(walk.lng);
    const lat = Number(walk.latitude) || Number(walk.lat);
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  });
});

// Add handler for map movement
const updateVisibleMarkers = () => {
  // Force recomputation of visibleWalks
  if (mapRef.value) {
    const bounds = mapRef.value.getBounds();
    // Trigger reactive update
    visibleWalks.value;
  }
}
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
  ROUTE: 'walkquest-route-layer'
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

</script>

<style>
@import '../../css/material3.css';

/* Navigation Rail Styles */
.m3-navigation-rail {
  display: flex;
  flex-direction: column;
  width: 80px;
  height: 100%;
  background: rgb(var(--md-sys-color-surface-container));
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  z-index: 10;
  border-right: 1px solid rgb(var(--md-sys-color-outline-variant));
}

.m3-navigation-rail.is-expanded {
  width: 412px;
}

.m3-rail-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
  flex-shrink: 0;
}

.m3-rail-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 4px 0;
}

.m3-rail-fab:hover {
  background: rgb(var(--md-sys-color-primary-container-hover));
}

.m3-rail-fab-text {
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.is-expanded .m3-rail-fab {
  width: 90%;
  margin: 4px 16px;
}

.is-expanded .m3-rail-fab-text {
  opacity: 1;
}

.m3-rail-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  flex-shrink: 0;
}

.m3-rail-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  width: 100%;
  border-radius: 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0 12px;
}

.m3-rail-item:hover {
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.m3-rail-item.is-active {
  background: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.m3-rail-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.m3-rail-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.m3-rail-icon {
  font-size: 24px;
}

.m3-rail-label {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.is-expanded .m3-rail-label {
  opacity: 1;
}

.m3-rail-content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Location Panel */
.m3-location-panel {
  padding: 8px;
  background: rgb(var(--md-sys-color-surface-container));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
}

/* Walks List */
.m3-walks-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Detail View */
.m3-detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgb(var(--md-sys-color-surface-container));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
}

.m3-title-large {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0;
  line-height: 1.4;
}

.m3-walk-detail {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.m3-elevated-card {
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-1);
  margin-bottom: 16px;
}
</style>
