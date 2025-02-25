<template>
  <div class="h-screen w-screen overflow-hidden flex relative bg-surface">
    <!-- Sidebar for Desktop -->
    <div v-if="showNavigationRail" ref="sidebarRef" class="m3-navigation-rail" :class="[{ 'is-expanded': isExpanded }]">
      <Transition @enter="onSidebarEnter" @leave="onSidebarLeave" mode="out-in">
        <div class="h-full flex flex-col" :key="selectedWalkId ? 'drawer' : 'nav'">
          <!-- Normal Navigation Rail Content -->
          <template v-if="!selectedWalkId">
            <div class="m3-rail-header" v-motion :initial="{ opacity: 0, y: -20 }" :enter="{
              opacity: 1,
              y: 0,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 25
              }
            }">
              <!-- Menu button -->
              <button class="m3-rail-item menu-button" @click="toggleExpanded" v-motion
                :initial="{ scale: 0.9, opacity: 0 }" :enter="{
                  scale: 1,
                  opacity: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 20
                  }
                }">
                <div class="m3-state-layer">
                  <Icon icon="mdi:menu" class="m3-rail-icon text-[24px]" />
                </div>
              </button>
              <!-- FAB -->
              <button class="m3-rail-fab" @click="handleFabClick" v-motion :initial="{ scale: 0.9, opacity: 0 }" :enter="{
                scale: 1,
                opacity: 1,
                transition: {
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                  delay: 0.1
                }
              }">
                <Icon icon="mdi:hiking" class="text-[36px]" />
                <span class="m3-rail-fab-text" v-if="isExpanded">WalkQuest</span>
                <span class="sr-only">WalkQuest Home</span>
              </button>
            </div>
            <!-- Navigation items with animations -->
            <nav class="m3-rail-items" v-motion :initial="{ opacity: 0, y: 20 }" :enter="{
              opacity: 1,
              y: 0,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 25,
                delay: 0.2
              }
            }">
              <button class="m3-rail-item" :class="{
                'is-active': searchStore.searchMode === 'walks' && !selectedWalkId
              }" @click="handleExploreClick">
                <div class="m3-rail-content">
                  <div class="m3-rail-icon-container">
                    <Icon icon="mdi:compass" class="m3-rail-icon filled-icon" />
                    <Icon icon="mdi:compass-outline" class="m3-rail-icon outlined-icon" />
                  </div>
                  <span class="m3-rail-label">Explore</span>
                </div>
              </button>
              <!-- Location Search Button -->
              <button class="m3-rail-item" :class="{
                'is-active': searchStore.searchMode === 'locations'
              }" @click="handleLocationSearchClick">
                <div class="m3-rail-content">
                  <div class="m3-rail-icon-container">
                    <Icon icon="mdi:map-marker" class="m3-rail-icon filled-icon" />
                    <Icon icon="mdi:map-marker-outline" class="m3-rail-icon outlined-icon" />
                  </div>
                    <span class="m3-rail-label">Find<br>Nearby</span>
                </div>
              </button>
            </nav>
            <!-- Main Content Area with animations -->
            <div class="m3-rail-content-area" :class="{ 'content-hidden': !isExpanded }" v-motion
              :initial="{ opacity: 0, scale: 0.95 }" :enter="{
                opacity: 1,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: 0.3
                }
              }">
              <!-- Walk List -->
              <div class="m3-walks-list" :class="{ 'overflow-hidden': !isExpanded }">
                <WalkList v-model="searchQuery" :walks="filteredWalks" :selected-walk-id="selectedWalkId"
                  :expanded-walk-ids="expandedWalkIds" :is-compact="!isExpanded" @walk-selected="handleWalkSelection"
                  @walk-expanded="handleWalkExpanded" v-show="isExpanded" />
              </div>
            </div>
          </template>
          <!-- Walk Drawer with enhanced animation -->
          <WalkDrawer v-else-if="selectedWalk && showDrawer" :walk="selectedWalk" @close="handleDrawerClose" v-motion
            :initial="{
              opacity: 0,
              scale: 0.98,
              x: '3%'
            }" :enter="{
              opacity: 1,
              scale: 1,
              x: 0,
              transition: {
                type: 'spring',
                stiffness: 400,
                damping: 30,
                mass: 0.5,
                restSpeed: 0.001
              }
            }" :exit="{
              opacity: 0,
              scale: 0.98,
              x: '3%',
              transition: {
                type: 'spring',
                stiffness: 500,
                damping: 35,
                mass: 0.5,
                restSpeed: 0.001
              }
            }" style="
              position: absolute; 
              top: 0; 
              bottom: 0; 
              right: 0; 
              width: auto;
              transform-origin: right center;
              will-change: transform, opacity;
            " />
        </div>
      </Transition>
    </div>

    <!-- Header with Search Bar (positioned absolutely) -->
    <div class="fixed top-0 z-10 transition-all duration-300" :style="{
      marginLeft: showNavigationRail
        ? (isExpanded ? '410px' : '72px')
        : '0px'
    }">
      <header class="py-3 bg-surface-variant">
        <!-- Search Bar -->
        <div class="transition-all duration-300" :class="[
          showNavigationRail
            ? (isExpanded ? 'w-xl' : 'w-sm')
            : 'w-full'
        ]">
          <SearchView v-model="searchQuery" :search-mode="searchStore.searchMode" :mapbox-token="mapboxToken"
            @location-selected="handleLocationSelected" @walk-selected="handleWalkSelection"
            class="md3-search-bar px-4">
          </SearchView>
        </div>
      </header>
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
    <div class="m3-content-container hardware-accelerated pointer-events-auto" :class="{ 'drawer-open': isDrawerOpen }"
      :style="[
        mapContainerStyle,
        { 'marginTop': '64px' } // Add top margin to account for header
      ]" ref="mapContainerRef">
      <div class="m3-surface-container hardware-accelerated pointer-events-auto absolute inset-0">
        <MapboxMap ref="mapComponent" :access-token="mapboxToken" :map-style="mergedMapConfig.mapStyle"
          :max-bounds="mergedMapConfig.maxBounds" :center="mergedMapConfig.center" :zoom="mergedMapConfig.zoom"
          :min-zoom="mergedMapConfig.minZoom" :max-zoom="mergedMapConfig.maxZoom" :pitch="45" :bearing="0"
          :min-pitch="0" :max-pitch="85" :drag-rotate="true" :touch-zoom-rotate="true" :optimize-for-terrain="true"
          :touch-pitch="true" :cooperativeGestures="true" @mb-created="handleMapCreated" @mb-load="handleMapLoad"
          @mb-moveend="updateVisibleMarkers" class="h-full w-full absolute inset-0">
          <!-- Loading indicator -->
          <div v-if="loading" class="absolute bottom-4 left-4 z-50 bg-white rounded-full px-4 py-2 shadow-lg">
            <div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              <span class="text-on-surface text-sm">Loading route...</span>
            </div>
          </div>
          <!-- Route layers -->
          <template v-if="validRouteData">
            <MapboxSource :id="routeSourceId" :options="{
              type: 'geojson',
              data: validRouteData
            }" />
            <MapboxLayer :id="routeGlowLayerId" :options="{
              type: 'line',
              source: routeSourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#52ebff',
                'line-width': ['interpolate', ['linear'], ['zoom'], 10, 12, 15, 18],
                'line-opacity': 0.6,
                'line-blur': 8
              }
            }" />
            <MapboxLayer :id="routeBgLayerId" :options="{
              type: 'line',
              source: routeSourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': 'black',
                'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 8, 3],
                'line-opacity': 0.9
              }
            }" />
            <MapboxLayer :id="routeAnimatedLayerId" :options="{
              type: 'line',
              source: routeSourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#ffffff',
                'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 8],
                'line-opacity': 0.05,
                'line-dasharray': [0, 4, 3]
              }
            }" @mb-layer-loaded="handleRouteLayerLoaded" />
          </template>
          <!-- Walk markers -->
          <template v-if="mapLoaded">
            <template v-for="walk in visibleWalks" :key="`${walk.id}-${markerKey}`">
              <MapboxMarker :lng-lat="[
                Number(walk.longitude) || Number(walk.lng),
                Number(walk.latitude) || Number(walk.lat)
              ]" :color="selectedWalkId === walk.id ? '#6750A4' : '#3FB1CE'" :popup="{
                offset: 25,
                anchor: 'bottom',
                closeButton: false,
                closeOnClick: true,
                className: 'm3-popup'
              }" @mounted="marker => handleMarkerMounted(marker, walk.id)" @click="() => handleMarkerClick(walk)">
                <template #popup>
                  <div class="flex flex-col">
                    <div class="p-4 pb-3">
                      <h3 class="m3-title-medium">{{ walk.title || walk.walk_name }}</h3>
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
          </template>
          <!-- Mobile toggle button -->
          <Transition :css="false" @enter="onMobileButtonEnter" @leave="onMobileButtonLeave">
            <button v-if="isMobile && !uiStore?.mobileMenuOpen" ref="mobileButtonRef"
              @click="uiStore?.setMobileMenuOpen(true)" class="m3-fab-mobile">
              <i class="icon-menu"></i>
              <span class="sr-only">Open menu</span>
            </button>
          </Transition>
        </MapboxMap>
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
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, h, createApp, shallowRef } from "vue";
import { useRouter, useRoute } from "vue-router";
import { animate } from "motion";
import { useElementVisibility } from "@vueuse/core";
import { DynamicScroller, DynamicScrollerItem } from "vue-virtual-scroller";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
import {
  MapboxMap,
  MapboxMarker,
  MapboxLayer,
  MapboxSource,
} from '@studiometa/vue-mapbox-gl';
import { Icon } from '@iconify/vue';

import { useUiStore } from "../stores/ui";
import { useWalksStore } from "../stores/walks";
import { useLocationStore } from "../stores/locationStore";
import { useSearchStore } from "../stores/searchStore";
import { useMap } from "../composables/useMap";
import { storeToRefs } from 'pinia';

import WalkList from "./WalkList.vue";
import WalkCard from "./WalkCard.vue";
import BottomSheet from "./BottomSheet.vue";
import SearchView from "./SearchView.vue";
import LocationSearch from "./LocationSearch.vue";
import WalkRoute from "./WalkRoute.vue";
import RouteLayer from "./RouteLayer.vue";
import WalkDrawer from "./WalkDrawer.vue";

import { getGeometry } from "../services/api";
import { MD3_DURATION, MD3_EASING } from "../utils/motion";

// Resource Manager for better lifecycle management
const useResourceManager = () => {
  const eventListeners = ref(new Set())
  const timeouts = ref(new Set())
  const intervals = ref(new Set())
  const observers = ref(new Set())
  const animations = ref(new Set())

  // Register event listener with automatic cleanup
  const registerEventListener = (target, event, handler, options = {}) => {
    if (!target) return () => {}
    
    target.addEventListener(event, handler, options)
    
    const cleanup = () => {
      target.removeEventListener(event, handler, options)
    }
    
    eventListeners.value.add(cleanup)
    return cleanup
  }

  // Register timeout with automatic cleanup
  const registerTimeout = (callback, delay) => {
    const id = setTimeout(callback, delay)
    
    const cleanup = () => clearTimeout(id)
    timeouts.value.add(cleanup)
    
    return cleanup
  }

  // Register interval with automatic cleanup
  const registerInterval = (callback, delay) => {
    const id = setInterval(callback, delay)
    
    const cleanup = () => clearInterval(id)
    intervals.value.add(cleanup)
    
    return cleanup
  }

  // Register observer with automatic cleanup
  const registerObserver = (observer) => {
    if (!observer) return () => {}
    
    const cleanup = () => observer.disconnect()
    observers.value.add(cleanup)
    
    return cleanup
  }

  // Register animation frame with automatic cleanup
  const registerAnimationFrame = (callback) => {
    let frameId = requestAnimationFrame(callback)
    
    const cleanup = () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    }
    
    animations.value.add(cleanup)
    return cleanup
  }

  // Clean up all resources
  const cleanupAll = () => {
    eventListeners.value.forEach(cleanup => cleanup())
    timeouts.value.forEach(cleanup => cleanup())
    intervals.value.forEach(cleanup => cleanup())
    observers.value.forEach(cleanup => cleanup())
    animations.value.forEach(cleanup => cleanup())
    
    eventListeners.value.clear()
    timeouts.value.clear()
    intervals.value.clear()
    observers.value.clear()
    animations.value.clear()
  }

  return {
    registerEventListener,
    registerTimeout,
    registerInterval,
    registerObserver,
    registerAnimationFrame,
    cleanupAll
  }
}

// NEW: Add debounce helper
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  }
}

// Use resource manager
const resourceManager = useResourceManager()

async function onDrawerEnter(el, onComplete) {
  await animateElement(el, { type: 'entry', direction: 'vertical' }, onComplete)
}

async function onDrawerLeave(el, onComplete) {
  await animateElement(el, { type: 'exit', direction: 'vertical' }, onComplete)
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem("sidebarExpanded", isExpanded.value.toString())
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
const mapComponent = shallowRef(null)
const mapInstance = shallowRef(null);
const sidebarRef = shallowRef(null)
const drawerRef = shallowRef(null)
const mobileButtonRef = shallowRef(null)
const mapContainerRef = shallowRef(null)
const expandedWalkIds = ref([])
const isExpanded = ref(localStorage.getItem("sidebarExpanded") === "true")
const mapReady = ref(false)
const currentZoom = ref(8)
const mapContainerVisible = useElementVisibility(mapContainerRef)
const mapRef = shallowRef(null)
const isDrawerOpen = computed(() => selectedWalk.value && showDrawer.value);
const markerKey = ref(0);

// Update route data ref with better typing and structure
const routeData = shallowRef({
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

// Constants for map sources and layers
const MAP_SOURCE = {
  ROUTE: 'route-source'
}

const MAP_LAYER = {
  ROUTE: 'route-line',          // Adding this missing constant
  ROUTE_GLOW: 'route-line-glow',
  ROUTE_BG: 'route-line-background'
}

// Add mapLoaded state
const mapLoaded = ref(false)

// Add handleMapLoad method
const handleMapLoad = () => {
  mapLoaded.value = true;
  mapReady.value = true;
};
// Add Cornwall bounds constants
const CORNWALL_BOUNDS = [
  [-6.5, 49.5], // Southwest coordinates - expanded west and south
  [-3.5, 51.2]  // Northeast coordinates - expanded east and north
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
// Removed duplicate availableWalks declaration - using version defined later
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

  // Handle text search
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

  // Handle location-based filtering
  if (searchStore.searchMode === 'locations' && locationStore.userLocation) {
    return locationStore.nearbyWalks
  }

  return results
})

// NEW: Lift search query state
const searchQuery = computed({
  get: () => searchStore.searchQuery,
  set: (value) => searchStore.setSearchQuery(value)
})

// Add ref for filtered results
const filteredResults = shallowRef([])

// Add back availableWalks computed property
const availableWalks = computed(() => {
  if (searchStore.searchMode === 'locations' && locationStore.userLocation) {
    return displayedWalks.value;
  }
  return walks.value;
})

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

const handleRouteLayerLoaded = () => {
  if (!mapRef.value) return;
  
  // Check if layer exists before starting animation
  if (mapRef.value.getLayer(MAP_LAYER.ROUTE_ANIMATED)) {
    // Start animation only if we have valid route data
    if (validRouteData.value) {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      animationFrame = requestAnimationFrame(animateDashArray);
    }
  }
};

// Replace the handleWalkSelection function
const handleWalkSelection = async (walk) => {
  showDrawer.value = true
  // Auto expand when selecting a walk
  if (walk) {
    isExpanded.value = true
    localStorage.setItem("sidebarExpanded", "true")
  }

  // No need to set selectedWalk.value since it's now computed

  if (walk) {
    // Update URL with selected walk
    router.push({
      query: { walkId: walk.id },
      replace: true
    })

    try {
      loading.value = true
      // Update marker colors
      // updateAllMarkerColors(walk.id)
      recreateMarkers(walk.id);

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
    // updateAllMarkerColors(null)
    recreateMarkers(null);
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

// Replace existing handleDrawerClose function
const handleDrawerClose = () => {
  showDrawer.value = false
  // No need to set selectedWalk.value since it's computed
  routeData.value = null
  updateAllMarkerColors(null)
  // Clear the URL query parameter
  router.push({ query: {}, replace: true })
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
// Add helper for handling the "Open Walk" click from popup
const handlePopupOpenWalk = async (event, walk) => {
  event.stopPropagation();
  try {
    // Close all popups first
    if (mapRef.value) {
      const popups = document.getElementsByClassName('mapboxgl-popup');
      for (const popup of Array.from(popups)) {
        popup.remove();
      }
      
      // Fly to the walk location with enhanced view
      await mapRef.value.flyTo({
        center: [Number(walk.longitude) || Number(walk.lng), Number(walk.latitude) || Number(walk.lat)],
        zoom: 15.5, // Increased zoom level for closer view
        pitch: 65,  // Increased pitch for better perspective
        bearing: 30,
        duration: 2000,
        essential: true,
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        curve: 1.42,
        easing: t => t * (2 - t)
      });
    }
    // Select the walk to show route and details
    await handleWalkSelection(walk);
  } catch (error) {
    console.error('Error handling walk selection with flyTo:', error);
  }
}
// Reusable polished animation helper function
const animateElement = async (el, options, onComplete) => {
  // Default configuration for the animation
  const defaults = {
    type: 'entry',
    direction: 'vertical',
    duration: 0.3,
    easing: options.type === 'entry' ? [0.2, 0, 0.2, 1] : [0.4, 0, 1, 1],
    reverseDirection: false,
  };

  const config = { ...defaults, ...options };

  // Define the base properties. Using transform properties ensures the animation
  // does not trigger re-layout of the element.
  const baseAnimation = {
    opacity: config.type === 'entry' ? [0, 1] : [1, 0],
    scale: config.type === 'entry' ? [0.95, 1] : [1, 0.95],
  };

  // Add directional transforms
  if (config.direction === 'horizontal') {
    baseAnimation.x = config.type === 'entry'
      ? [config.reverseDirection ? 100 : -100, 0]
      : [0, config.reverseDirection ? -100 : 100];
  } else { // vertical animation
    baseAnimation.y = config.type === 'entry'
      ? [10, 0]
      : [0, 10];
  }

  // Apply will-change to hint the browser for performance optimizations
  el.style.willChange = 'opacity, transform';

  try {
    await animate(el, baseAnimation, {
      duration: config.duration,
      easing: config.easing,
    }).finished;
  } catch (error) {
    console.error('Animation error:', error);
  } finally {
    // Remove will-change after animation to optimize future rendering
    el.style.willChange = '';
    onComplete?.();
  }
}

// Simplified animation functions using the helper
async function onSidebarEnter(el, onComplete) {
  await animateElement(el, { type: 'entry', direction: 'horizontal' }, onComplete)
}

async function onSidebarLeave(el, onComplete) {
  await animateElement(el, { type: 'exit', direction: 'horizontal' }, onComplete)
}

async function onMobileButtonEnter(el, onComplete) {
  await animateElement(el, { type: 'entry', direction: 'vertical' }, onComplete)
}

async function onMobileButtonLeave(el, onComplete) {
  await animateElement(el, { type: 'exit', direction: 'vertical' }, onComplete)
}


// Section animations now use the same helper
const onWalksSectionEnter = (el, onComplete) =>
  animateElement(el, { type: 'entry' }, onComplete)

const onWalksSectionLeave = (el, onComplete) =>
  animateElement(el, { type: 'exit' }, onComplete)

const onPanelEnter = (el, onComplete) =>
  animateElement(el, { type: 'entry' }, onComplete)

const onPanelLeave = (el, onComplete) =>
  animateElement(el, { type: 'exit' }, onComplete)

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
  
  // Wait for style to load before enabling interactions
  map.once('style.load', () => {
    mapLoaded.value = true;
    mapReady.value = true;
  });

  // Listen to continuous map movement to update mapBounds
  map.on('move', updateVisibleMarkers);
};
// Add helper to check if layer exists
const layerExists = (layerId) => {
  if (!mapInstance.value || !layerId) return false;
  try {
    return !!mapInstance.value.getLayer(layerId);
  } catch (error) {
    console.warn(`Error checking if layer exists (${layerId}):`, error);
    return false;
  }
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
const effectiveFlyToOptions = (location) => ({
  center: [location.lon, location.lat],
  zoom: 14,
  padding: { top: 100, bottom: 100, left: 100, right: 100 },
  duration: 1200,
  easing: function(t) { return t * (1 - t) * (1 + t); }, // Fixed easing function
  essential: true
});

// Add watchers for search mode changes
watch(() => searchStore.searchMode, (newMode) => {
  if (newMode === 'locations') {
    // Ensure sidebar is expanded when switching to location search
    if (!isExpanded.value) {
      isExpanded.value = true
      localStorage.setItem("sidebarExpanded", "true")
    }
  }
})

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
  position: 'absolute',
  inset: '0',
  width: '100vw',
  height: '100vh',
  marginLeft: '0' // Remove left margin to allow map to extend under sidebar
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

  // Register event listeners
  resourceManager.registerEventListener(window, 'resize', handleResize)

  // Add keyboard accessibility for map
  if (mapRef.value) {
    resourceManager.registerEventListener(
      mapRef.value.getCanvas(),
      'keydown',
      handleMapKeyboard
    )
  }
}

// Consolidated resource cleanup function
const cleanupResources = () => {
  // 1. Clean up animations
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  
  // 2. Clean up event listeners
  window.removeEventListener('resize', handleResize);
  
  if (mapRef.value) {
    // Remove general map event listeners
    const mapEvents = ['mousemove', 'mouseleave', 'styledata'];
    for (const event of mapEvents) {
      // Remove all event listeners for this event type
      mapRef.value.off(event);
    }
    
    // Remove keyboard event listener
    if (mapRef.value.getCanvas()) {
      mapRef.value.getCanvas().removeEventListener('keydown', handleMapKeyboard);
    }
  }
  
  // 3. Reset state
  routeData.value = null;
  loading.value = false;
  mapLoaded.value = false;
  mapInstance.value = null;
  
  // 4. Clean up markers
  for (const marker of markerRefs.value.values()) {
    marker?.remove?.();
  }
  markerRefs.value.clear();
  markerKey.value = 0;
  
  // 5. Clear collections
  spatialIndex.value.clear();
  
  // 6. Clear refs
  mapRef.value = null;
  mapComponent.value = null;
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

// Add watch for route changes to handle direct URL access
watch(
  () => route.params,
  () => {
    // Your route change handling logic here
  }
);

// Update handleBackClick to use flyTo with optimized flight path parameters
const handleBackClick = async () => {
  if (mapComponent.value?.map) {
    mapComponent.value.map.flyTo({
      center: mergedMapConfig.value.center,
      zoom: mergedMapConfig.value.zoom,
      padding: { top: 100, bottom: 100, left: 100, right: 100 },
      duration: 1200,
      easing: function(t) { return t * (1 - t) * (1 + t); },
      essential: true
    });
  }
};

// Optimize search filtering
const searchResults = ref([])
const searchThrottleMs = 150

// Helper function for throttle
function throttle(fn, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = new Date().getTime();
    if (now - lastCall >= delay) {
      fn.apply(this, args);
      lastCall = now;
    }
  }
}

// Optimized search with throttle
const performSearch = throttle((query) => {
  // Implementation
  if (!query || query.length < 2) {
    searchResults.value = walks.value;
    return;
  }
  searchResults.value = walks.value.filter(walk => 
    walk.title.toLowerCase().includes(query.toLowerCase())
  );
}, searchThrottleMs);

// Replace existing search watcher with optimized version
watch(searchQuery, (newQuery) => {
  performSearch(newQuery)
}, { immediate: true })

// Update filtered results based on search results
watch(searchResults, (results) => {
  filteredResults.value = results
})

// Add handler for map movement
const updateVisibleMarkers = debounce(() => {
  // Implementation here
  const bounds = mapInstance.value.getBounds();
  // Additional code to update visible markers
}, 100);

// Define visibleWalks as a computed property
const visibleWalks = computed(() => {
  if (!mapBounds.value || !walks.value?.length) {
    return walks.value || [];
  }

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
      const cellKey = `${x}:${y}`;
      const cellWalks = spatialIndex.value.get(cellKey) || [];
      cellWalks.forEach(walk => visibleSet.add(walk));
    }
  }
  
  const currentVisibleWalks = Array.from(visibleSet);
  if (previousVisibleWalks.value && 
      JSON.stringify(currentVisibleWalks) === JSON.stringify(previousVisibleWalks.value)) {
    return previousVisibleWalks.value;
  }
  
  previousVisibleWalks.value = currentVisibleWalks;
  return currentVisibleWalks;
});

// Add a computed property to validate route data
const validRouteData = computed(() => {
  if (!routeData.value) return null;

  // Basic structure validation
  if (!routeData.value.type || !routeData.value.geometry) {
    console.warn("Invalid route data structure", routeData.value);
    return null;
  }

  return routeData.value;
});

// Add a new location-aware computed property for filtering walks
const displayedWalks = computed(() => {
  if (searchStore.searchMode === 'locations' && locationStore.userLocation) {
    // Apply location-based filtering logic here
    return filteredResults.value;
  }
  return visibleWalks.value;
});

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
];

let animationFrame = null;

const animateDashArray = (timestamp) => {
  if (!mapRef.value || !mapLoaded.value) return;
  
  // Update dash array based on current time
  const index = Math.floor((timestamp / 200) % dashArraySequence.length);
  const dashValue = dashArraySequence[index];
  
  if (mapRef.value.getLayer('route-animated')) {
    mapRef.value.setPaintProperty('route-animated', 'line-dasharray', dashValue);
  }
  
  // Continue animation loop
  animationFrame = requestAnimationFrame(animateDashArray);
};

// Start animation when map is loaded and valid route data exists
watch([mapLoaded, validRouteData], ([isLoaded, hasRoute]) => {
  if (isLoaded && hasRoute && mapRef.value) {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    animationFrame = requestAnimationFrame(animateDashArray);
  } else if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}, { immediate: true });

// Clean up animation on unmount
onBeforeUnmount(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
});

// Replace all marker-related functions with these enhanced versions
const updateMarkerColor = (marker, isSelected) => {
  if (!marker) return;
  const element = marker; // marker is already the correct element
  const svg = element.querySelector('svg');
  if (!svg) return;
  // Select the first <path> regardless of its attributes
  const targetPath = svg.querySelector('path[fill]');
  if (!targetPath) return;
  if (isSelected) {
    targetPath.style.fill = '#6750A4';
  } else {
    targetPath.style.fill = '#3FB1CE';
  }
};

const updateAllMarkerColors = (selectedId = null) => {
  markerRefs.value.forEach((marker, id) => {
    updateMarkerColor(marker, id === selectedId);
  });
};

// Add ref to store marker references
const markerRefs = shallowRef(new Map());

// Add spatial index structure
const spatialIndex = shallowRef(new Map())

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

  for (const walk of walks.value) {
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
  }

  spatialIndex.value = newIndex
}

// Update spatial index when walks change
watch(() => walks.value, updateSpatialIndex, { immediate: true })

// Add a ref at the top with your other refs (e.g., after spatialIndex definition)
const previousVisibleWalks = shallowRef(null)

// Add a reactive ref for the map bounds (place near other refs)
const mapBounds = shallowRef(null)

// Add the helper function (place it among your other functions/methods)
function areArraysShallowEqual(arrA, arrB) {
  if (!arrA || !arrB || arrA.length !== arrB.length) return false;
  const setB = new Set(arrB.map(walk => walk.id));
  for (const walkA of arrA) {
    if (!setB.has(walkA.id)) return false;
  }
  return true;
}

// Replace recreateMarkers function
const recreateMarkers = async (selectedWalkId = null) => {
  await nextTick();

  if (!mapComponent.value?.map) {
    console.warn('Map not ready');
    return;
  }

  // Clear existing markers
  for (const marker of markerRefs.value.values()) {
    marker?.remove?.();
  }
  markerRefs.value.clear();

  // Force template update by incrementing key
  markerKey.value++;

  // Update template to show markers
  mapReady.value = true;
};

// Add these helper methods:
const handleMarkerMounted = (marker, walkId) => {
  if (!marker) return;

  // Clean up old marker if it exists
  const oldMarker = markerRefs.value.get(walkId);
  if (oldMarker?.remove) {
    oldMarker.remove();
  }

  // Store new marker reference
  markerRefs.value.set(walkId, marker);
};

// Lifecycle hooks
onMounted(initializeInterface)
onBeforeUnmount(cleanupResources)

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

// Lifecycle hooks
onMounted(initializeInterface)
onBeforeUnmount(cleanupResources)

// Add new utility function near other helper functions
const processDogConsiderations = (consideration) => {
  if (!consideration) return { text: '', isDog: false };

  const startsWithDogs = consideration.trim().toLowerCase().startsWith('dogs');
  if (!startsWithDogs) return { text: consideration, isDog: false };

  // Remove "Dogs" from the start and trim
  const remainingText = consideration.replace(/^dogs\s*[:,-]?\s*/i, '').trim();
  return {
    text: remainingText,
    isDog: true
  };
};

// Add new methods for handling button clicks
const handleExploreClick = () => {
  searchStore.setSearchMode('walks')
  handleWalkSelection(null) // Clear selected walk
  // Clear any location search state
  locationStore.clearLocation()
  // Reset search error if any
  searchStore.setError(null)
}

const handleLocationSearchClick = () => {
  searchStore.setSearchMode('locations');
  // Expand sidebar if not already expanded
  if (!isExpanded.value) {
    isExpanded.value = true;
    localStorage.setItem("sidebarExpanded", "true");
  }
  // Clear any previous errors
  searchStore.setError(null);

  // If we have a saved location, make sure it's displayed
  if (locationStore.userLocation && mapRef.value) {
    nextTick(() => {
      handleLocationSelected({
        center: [locationStore.userLocation.longitude, locationStore.userLocation.latitude],
        zoom: 14,
        place_name: locationStore.userLocation.place_name,
        pitch: 60,
        bearing: 30
      });
    });
  }
};

// Add new transition function
async function onContentTransition(el, done) {
  await animate(
    el,
    {
      opacity: [0, 1],
      scale: [0.98, 1],
      y: [-10, 0]
    },
    {
      duration: 0.3,
      easing: [0.22, 1, 0.36, 1],
      onComplete: done
    }
  )
}

// Add a new location-aware computed property for filtering walks
const locationFilteredWalks = computed(() => {
  if (searchStore.searchMode === 'locations' && locationStore.userLocation) {
    return visibleWalks.value
      .filter(walk => {
        // Add distance info if not already present
        if (!walk.distance) {
          walk.distance = calculateDistance(
            locationStore.userLocation.latitude,
            locationStore.userLocation.longitude,
            walk.latitude || walk.lat,
            walk.longitude || walk.lng
          )
        }
        return true // Keep all walks with distance information
      })
      .sort((a, b) => (a.distance || 0) - (b.distance || 0)) // Sort by distance
  }
  return visibleWalks.value
})

// Add helper function for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon1 - lon2) * Math.PI / 180
  const a = // Add equals sign here
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c // Distance in km
  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

// Update handleLocationSelected to handle filtered walks
const handleLocationSelected = async (location) => {
  if (!location?.center) {
    searchStore.setError(null)
    locationStore.clearLocation()
    return
  }

  try {
    uiStore.setLoadingState('location', true)

    // Ensure map is ready
    if (!mapRef.value) {
      console.log('Waiting for map to be ready...')
      await new Promise(resolve => {
        const unwatch = watch(mapRef, (newVal) => {
          if (newVal) {
            unwatch()
            resolve()
          }
        })
      })
    }

    // Update map view with location
    await flyToLocation({
      ...location,
      callback: () => {
        if (!isExpanded.value) {
          isExpanded.value = true
          localStorage.setItem("sidebarExpanded", "true")
        }
        
        // Update markers after location change
        nextTick(() => {
          if (displayedWalks.value.length) {
            recreateMarkers()
          }
        })
      }
    })

    // Store the selected location
    if (location.center && location.place_name) {
      await locationStore.setUserLocation({
        latitude: location.center[1],
        longitude: location.center[0],
        place_name: location.place_name
      })
    }

    searchStore.setError(null)

  } catch (error) {
    console.error('Error handling location selection:', error)
    searchStore.setError('Failed to process location selection')
  } finally {
    uiStore.setLoadingState('location', false)
  }
}

// Generate unique IDs for map sources and layers
const routeSourceId = ref(`route-source-${Math.random().toString(36).substring(2, 10)}`);
const routeGlowLayerId = ref(`route-glow-layer-${Math.random().toString(36).substring(2, 10)}`);
const routeBgLayerId = ref(`route-bg-layer-${Math.random().toString(36).substring(2, 10)}`);
const routeAnimatedLayerId = ref(`route-animated-layer-${Math.random().toString(36).substring(2, 10)}`);

// Add helper to check if source exists
const sourceExists = (sourceId) => {
  if (!mapInstance.value || !sourceId) return false;
  try {
    return !!mapInstance.value.getSource(sourceId);
  } catch (error) {
    console.warn(`Error checking if source exists (${sourceId}):`, error);
    return false;
  }
};

// Add cleanup function for layers and sources
const cleanupMapResources = () => {
  if (!mapInstance.value) return;
  
  try {
    // Always remove layers before removing sources
    if (routeGlowLayerId.value && layerExists(routeGlowLayerId.value)) {
      mapInstance.value.removeLayer(routeGlowLayerId.value);
    }
    
    if (routeBgLayerId.value && layerExists(routeBgLayerId.value)) {
      mapInstance.value.removeLayer(routeBgLayerId.value);
    }
    
    if (routeAnimatedLayerId.value && layerExists(routeAnimatedLayerId.value)) {
      mapInstance.value.removeLayer(routeAnimatedLayerId.value);
    }
    
    // After all layers are removed, remove sources
    if (routeSourceId.value && sourceExists(routeSourceId.value)) {
      mapInstance.value.removeSource(routeSourceId.value);
    }
    
    console.log('Map resources cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up map resources:', error);
  }
};
</script>

<style>
@import "tailwindcss";
@import '../../css/material3.css';

/* Add these new styles */
.m3-rail-content-area {
  transition: opacity 0.2s ease-out, visibility 0.2s ease-out;
}

.m3-rail-content-area.content-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* Updated popup styles */
.mapboxgl-popup {
  max-width: none !important;
  width: min(280px, calc(100vw - 32px));
  font-family: "Roboto", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.mapboxgl-popup-content {
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

.mapboxgl-popup-content h3 {
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 500;
  margin: 0;
  letter-spacing: 0.15px;
}

.mapboxgl-popup-content .m3-button {
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

.mapboxgl-popup-content .m3-button:hover {
  background-color: rgb(var(--md-sys-color-primary) / 0.92);
}

.mapboxgl-popup-content .m3-button:active {
  background-color: rgb(var(--md-sys-color-primary) / 0.85);
  transform: scale(0.98);
}

/* Hide the popup tip */
.mapboxgl-popup-tip {
  display: none !important;
}

/* Add elevation when popup is open */
.mapboxgl-popup {
  will-change: transform;
  transform-origin: bottom center;
}

/* Add subtle surface tint */
.mapboxgl-popup-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(var(--md-sys-color-surface-tint));
  opacity: 0.05;
  pointer-events: none;
}

/* Ensure proper text wrapping */
.mapboxgl-popup-content .m3-title-medium {
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
}

@media (max-width: 640px) {
  .mapboxgl-popup {
    width: calc(100vw - 32px);
  }
}

/* Add these new styles */
.m3-dog-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-dog-badge .iconify {
  font-size: 1.25rem;
  color: var(--md-sys-color-secondary);
}

/* Add these styles at the bottom of your style section */
.m3-location-panel {
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 16px;
  margin: 8px;
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
