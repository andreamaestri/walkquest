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

      <!-- Map container with updated left margin -->
      <div class="m3-content-container hardware-accelerated pointer-events-auto" :style="mapContainerStyle"
        ref="mapContainerRef">
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
            @mb-created="handleMapCreated">
            
            <!-- Custom Markers -->
            <template v-for="walk in walks" :key="walk.id">
              <MapboxMarker
                :lng-lat="[Number(walk.longitude) || Number(walk.lng), Number(walk.latitude) || Number(walk.lat)]"
                :popup="true"
                :aria-selected="selectedWalkId === walk.id"
                @click="handleWalkSelection(walk)"
              >
                <!-- Popup Template -->
                <template #popup>
                  <div class="map-tooltip">
                    <div class="map-tooltip-content">
                      <div class="map-tooltip-header">
                        <h3 class="map-tooltip-title">{{ walk.title || walk.walk_name }}</h3>
                      </div>
                      <div class="map-tooltip-badges">
                        <div class="map-tooltip-badge difficulty" :class="walk.steepness_level?.toLowerCase()">
                          <iconify-icon icon="material-symbols:flag-rounded" />
                          {{ walk.steepness_level }}
                        </div>
                        <div class="map-tooltip-badge">
                          <iconify-icon icon="material-symbols:distance" />
                          {{ walk.distance }} km
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </MapboxMarker>
            </template>

            <!-- Add Distance Radius Circle -->
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

            <!-- Accessibility Description -->
            <div class="sr-only">
              Interactive map showing walk locations. Use arrow keys to navigate between markers.
            </div>

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
import mapboxgl from 'mapbox-gl'
import { MapboxMap, MapboxNavigationControl, MapboxMarker, MapboxLayer } from '@studiometa/vue-mapbox-gl'
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

// Initialize UI store with defaults
uiStore.$patch({
  error: null,
  mobileMenuOpen: false,
  fullscreen: false,
  showSidebar: !uiStore.isMobile,
  loadingStates: {
    walks: false,
    map: false,
    path: false,
    search: false,
    location: false
  }
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
const markerThresholdZoom = 13
const mapContainerVisible = useElementVisibility(mapContainerRef)
const mapRef = ref(null)

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
  cooperativeGestures: true,
  keyboard: true,
  maxBounds: CORNWALL_BOUNDS,
  center: CORNWALL_CENTER,
  zoom: 9,
  minZoom: 1,
  maxZoom: 35,
  terrain: null, // Remove terrain configuration
  controls: {
    navigation: true,
    scale: true,
    attribution: true
  }
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

// Updated toggleExpanded with smoother animations
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem("sidebarExpanded", isExpanded.value)

  if (sidebarRef.value) {
    // Animate the sidebar width with easing
    animate(
      sidebarRef.value,
      { 
        width: isExpanded.value ? "412px" : "80px",
      },
      {
        duration: 0.3,
        easing: [0.32, 0.72, 0, 1], // Custom easing for smooth motion
      }
    )

    // Animate the content opacity and translation
    const contentElements = sidebarRef.value.querySelectorAll(".m3-rail-content")
    contentElements.forEach((content, i) => {
      animate(
        content,
        {
          opacity: isExpanded.value ? [0, 1] : [1, 0],
          transform: isExpanded.value 
            ? ['translateX(-20px)', 'translateX(0)']
            : ['translateX(0)', 'translateX(-20px)']
        },
        {
          duration: 0.2,
          delay: isExpanded.value ? 0.1 + (i * 0.02) : 0,
          easing: [0.32, 0.72, 0, 1]
        }
      )
    })

    // Animate labels separately for smoother text transitions
    const labels = sidebarRef.value.querySelectorAll(".m3-rail-label, .m3-rail-fab-text")
    labels.forEach((label, i) => {
      animate(
        label,
        {
          opacity: isExpanded.value ? [0, 1] : [1, 0],
          transform: isExpanded.value 
            ? ['translateX(-12px)', 'translateX(0)']
            : ['translateX(0)', 'translateX(-12px)']
        },
        {
          duration: 0.2,
          delay: isExpanded.value ? 0.15 + (i * 0.02) : 0,
          easing: [0.32, 0.72, 0, 1]
        }
      )
    })
  }

  // Update map container width smoothly
  if (mapContainerRef.value) {
    animate(
      mapContainerRef.value,
      { 
        marginLeft: isExpanded.value ? "412px" : "80px" 
      },
      {
        duration: 0.3,
        easing: [0.32, 0.72, 0, 1]
      }
    ).finished.then(() => {
      // Trigger map resize after animation completes
      if (mapComponent.value?.map) {
        mapComponent.value.map.resize()
      }
    })
  }

  // Update sidebar width for Mapbox logo with transition
  document.documentElement.style.setProperty(
    "--sidebar-width",
    isExpanded.value ? "412px" : "80px"
  )
}

// Watch for expansion state changes
watch(isExpanded, (newValue) => {
  nextTick(() => {
    const scroller = document.querySelector(".m3-scroller")
    if (scroller) {
      scroller.style.opacity = "0"
      setTimeout(() => {
        scroller.style.opacity = "1"
      }, 300)
    }
  })
})

const handleWalkSelection = async (walk) => {
  if (walk) {
    await router.push({ 
      name: 'walk-detail',
      params: { id: walk.id }
    })
    
    if (!isExpanded.value) {
      isExpanded.value = true
      localStorage.setItem("sidebarExpanded", "true")
    }

    // Load and display the route
    try {
      const routeData = await getGeometry(walk.id)
      
      // Wait for map and source to be ready
      if (mapRef.value && mapRef.value.getSource('active-route')) {
        console.log('Setting route data:', routeData); // Debug log

        // Ensure the data is in the correct GeoJSON format
        const geoJsonData = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeData.geometry.coordinates
          }
        };

        // Update the source data
        mapRef.value.getSource('active-route').setData(geoJsonData);

        // Calculate bounds
        if (routeData.geometry.coordinates.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          
          // Extend bounds with all coordinates
          for (const coord of routeData.geometry.coordinates) {
            bounds.extend(coord);
          }

          // Fit map to route bounds
          mapRef.value.fitBounds(bounds, {
            padding: 50,
            pitch: 45,
            bearing: 0,
            duration: 1500
          });
        }
      } else {
        console.error('Map or source not ready');
      }
    } catch (err) {
      console.error('Error loading route:', err)
      uiStore?.setError('Failed to load route data')
    }
  } else {
    await router.push({ name: "home" })
    
    // Clear route when deselecting
    if (mapRef.value?.getSource('active-route')) {
      mapRef.value.getSource('active-route').setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      });

      // Reset map view
      mapRef.value.flyTo({
        center: CORNWALL_CENTER,
        zoom: 9,
        pitch: 0,
        bearing: 0,
        duration: 1500
      });
    }
  }

  if (isMobile.value) {
    uiStore?.setMobileMenuOpen(false)
  }
}

// Watch effects
watch(
  [isExpanded, showSidebar],
  ([newExpanded, newVisible]) => {
    if (!newVisible || !newExpanded) {
      nextTick(() => {
        const walkList = document.querySelector(".walk-list-container")
        if (walkList) {
          walkList.style.pointerEvents = "none"
        }
      })
    } else {
      setTimeout(() => {
        const walkList = document.querySelector(".walk-list-container")
        if (walkList) {
          walkList.style.pointerEvents = "auto"
        }
      }, 300)
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
    uiStore?.setLoading(true)
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
    uiStore?.setLoading(false)
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

const handleMapCreated = (map) => {
  mapRef.value = map
  setMapInstance(map)
  
  // Get initial zoom level
  currentZoom.value = map.getZoom()
  
  // Add source and layer for route display
  map.on('load', () => {
    // Add empty route source with proper GeoJSON structure
    map.addSource('active-route', {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'LineString',
          'coordinates': []
        }
      }
    });

    // Add route layer with proper styling
    map.addLayer({
      'id': 'active-route',
      'type': 'line',
      'source': 'active-route',
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-color': 'rgb(var(--md-sys-color-primary))',
        'line-width': 4
      }
    });

    // Enable map interactions after load
    map.dragPan.enable()
    map.scrollZoom.enable()
  })
  
  map.on('zoom', handleMapZoom)
}

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

// Update displayMarkers computed property
const displayMarkers = computed(() => {
  if (!walks.value) return []
  
  return walks.value.map(walk => ({
    walk,
    type: currentZoom.value >= markerThresholdZoom ? 'marker' : 'point'
  })).filter(item => 
    // Only show detailed markers when zoomed in
    currentZoom.value >= markerThresholdZoom ? item.type === 'marker' : item.type === 'point'
  )
})

// Add marker classes helper
const markerClasses = (item) => ({
  'marker-selected': selectedWalkId.value === item.walk.id,
  'marker-detailed': item.type === 'marker',
  'marker-point': item.type === 'point'
})

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

const handleLocationSelected = async (location) => {
  if (!location?.center) return
  
  await searchStore.handleLocationSelected(location)
  await flyToLocation({
    center: location.center,
    zoom: 14,
    pitch: 45
  })
}

// Window resize handling
let resizeTimeout
const handleResize = () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    if (mapComponent.value?.map?.map) {
      mapComponent.value.map.map.resize()
    }
  }, 250)
}

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

// Update search query watcher
watch(searchQuery, (newQuery) => {
  // If search is cleared, reset filtered results to all walks
  if (!newQuery?.trim()) {
    filteredResults.value = availableWalks.value
  }
})

// Initialize filtered results
onMounted(() => {
  filteredResults.value = availableWalks.value
})

const { initializeResponsiveState } = uiStore

// Update initialization sequence
const initializeInterface = async () => {
  try {
    const cleanup = initializeResponsiveState()
    await walksStore.loadWalks()
    
    if (walksStore.walks.length && !isMobile.value) {
      uiStore.setSidebarVisibility(true)
    }
    
    if (props.walkId) {
      const walk = walksStore.getWalkById(props.walkId)
      if (walk) {
        await handleWalkSelection(walk)
      }
    }
  } catch (error) {
    console.error("Failed to initialize:", error)
    uiStore.setError(error.message)
  }
}

onMounted(initializeInterface)

// Update computed properties
const showNavigationRail = computed(() => 
  !isMobile.value && showSidebar.value && !isFullscreen.value
)

const handleMapZoom = (e) => {
  currentZoom.value = e.target.getZoom()
}

// Add to your existing setup
onMounted(() => {
  if (mapRef.value) {
    mapRef.value.on('zoom', handleMapZoom)
  }
})

// Add geojsonData computed property
const geojsonData = computed(() => ({
  type: 'FeatureCollection',
  features: walks.value.map(walk => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [walk.longitude || walk.lng, walk.latitude || walk.lat]
    },
    properties: {
      id: walk.id,
      title: walk.title || walk.walk_name,
      difficulty: walk.difficulty,
      duration: walk.duration
    }
  }))
}))

// Add cluster click handler
const handleClusterClick = (e) => {
  const features = e.target.queryRenderedFeatures(e.point, {
    layers: ['clusters']
  })

  const clusterId = features[0].properties.cluster_id
  e.target.getSource('walks').getClusterExpansionZoom(
    clusterId,
    (err, zoom) => {
      if (err) return

      e.target.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom
      })
    }
  )
}

// Add computed for selected walk
const selectedWalk = computed(() => {
  if (!selectedWalkId.value) return null
  return walks.value.find(walk => walk.id === selectedWalkId.value)
})

// Add back button handler
const handleBackClick = async () => {
  if (mapComponent.value?.map) {
    mapComponent.value.map.flyTo({
      center: CORNWALL_CENTER,
      zoom: 9,
      pitch: 0,
      bearing: 0,
      duration: 1500,
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
