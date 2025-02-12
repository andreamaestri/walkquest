<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col relative">
    <Loading ref="loadingComponent" />
    
    <div class="relative h-full w-full flex">
      <!-- Sidebar for desktop -->
      <div 
        v-if="showSidebar && !isMobile"
        ref="sidebarRef"
        class="hidden md:flex flex-col fixed md:relative inset-y-0 left-0 z-10
           bg-white border-r border-gray-200
           w-md lg:w-xl h-full"
      >
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 class="text-xl font-semibold">Available Walks</h2>
        <button 
          @click="toggleSidebar"
          class="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <span class="sr-only">Toggle sidebar</span>
          <i class="icon-chevron-left"></i>
        </button>
        </div>

        <div class="flex-1 overflow-hidden">
        <WalkList 
          :error="error"
          :walks="availableWalks"
          :selected-walk-id="selectedWalkId"
          :expanded-walk-ids="expandedWalkIds"
          @walk-selected="handleWalkSelection"
          @walk-expanded="handleWalkExpanded"
        />
        </div>
      </div>

      <!-- Map container with animation -->
      <div 
        class="flex-1 relative transition-[margin] duration-300 map-container"
        :class="{
          'md:ml-80 lg:ml-96': showSidebar && !isMobile
        }"
      >
        <div class="absolute inset-0">
        <MapView
        ref="mapComponent"
        :mapbox-token="mapboxToken"
        :config="mapConfig"
        @map-loaded="handleMapLoaded"
        @map-error="handleMapError"
        />
        <!-- Mobile toggle button -->
        <button 
        v-if="isMobile"
        @click="uiStore.setMobileMenuOpen(true)"
        class="absolute top-4 left-4 z-10 p-3 bg-white rounded-full shadow-lg"
        >
        <i class="icon-menu"></i>
        <span class="sr-only">Open menu</span>
        </button>
      </div>
      </div>
    </div>

    <!-- Mobile menu with animation -->
    <!-- Note: Added Tailwind utilities for transform and transition -->
    <MobileMenu 
      v-if="isMobile" 
      class="mobile-menu md:hidden transform transition delay-150 duration-300 ease-in-out translate-x-full"
    >
      <div class="w-full h-full">
        <WalkList 
          :error="error"
          :walks="availableWalks"
          :selected-walk-id="selectedWalkId"
          :expanded-walk-ids="expandedWalkIds"
          @walk-selected="handleWalkSelection"
          @walk-expanded="handleWalkExpanded"
        />
      </div>
    </MobileMenu>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { animate, inView } from 'motion'
import { useUiStore } from '../stores/ui'
import { useWalksStore } from '../stores/walks'
import Loading from './Loading.vue'
import MapView from './MapView.vue'
import WalkList from './WalkList.vue'
import MobileMenu from './MobileMenu.vue'

const props = defineProps({
  mapboxToken: {
    type: String,
    required: true
  },
  mapConfig: {
    type: Object,
    default: () => ({})
  },
  walkId: {
    type: [String, Number],
    default: null
  }
})

// Component refs and state
const loadingComponent = ref(null)
const mapComponent = ref(null)
const sidebarRef = ref(null)
const expandedWalkIds = ref([])
let stopViewTracking

// Store and router access
const router = useRouter()
const walksStore = useWalksStore()
const uiStore = useUiStore()

// Computed properties
const error = computed(() => uiStore.error)
const isFullscreen = computed(() => uiStore.fullscreen)
const showSidebar = computed(() => uiStore.showSidebar)
const isMobile = computed(() => uiStore.isMobile)
const selectedWalkId = computed(() => props.walkId)
const availableWalks = computed(() => walksStore.walks)

// Route update handling using composition API
watch(() => props.walkId, async (newId, oldId) => {
  if (newId !== oldId) {
    const walk = walksStore.getWalkById(newId)
    if (walk) {
      walksStore.setSelectedWalk(walk)
    }
  }
})

// Methods
const initializeData = async () => {
  try {
    uiStore.setLoading(true)
    loadingComponent.value?.startLoading('Loading walks...')
    console.debug("WalkInterface.vue: Starting data initialization")
    
    await walksStore.loadWalks()
    console.debug("WalkInterface.vue: Walks loaded from store:", walksStore.walks)
    
    // Ensure walks are loaded before showing the sidebar
    await nextTick()
    
    if (walksStore.walks.length && !isMobile.value) {
      uiStore.setSidebarVisibility(true)
      console.debug("WalkInterface.vue: Sidebar set visible, walks count:", walksStore.walks.length)
      
      // Force a reflow to ensure proper rendering
      await nextTick()
      const walkList = document.querySelector('.walk-list')
      if (walkList) {
        walkList.style.display = 'none'
        walkList.offsetHeight // Force reflow
        walkList.style.display = ''
      }
    }
  } catch (error) {
    console.error("WalkInterface.vue: Data initialization failed:", error)
    uiStore.setError(error.message)
  } finally {
    uiStore.setLoading(false)
    loadingComponent.value?.stopLoading()
    console.debug("WalkInterface.vue: Loading stopped")
  }
}

watch(availableWalks, (newVal) => {
  console.debug("WalkInterface.vue: availableWalks updated:", newVal)
}, { immediate: true })

const handleMapLoaded = (map) => {
  uiStore.setMapLoading(false)
}

const handleMapError = (error) => {
  uiStore.setError(error.message)
  uiStore.setMapLoading(false)
}

const handleWalkSelection = (walk) => {
  if (walk) {
    router.push({ name: 'walk-detail', params: { id: walk.id } })
  } else {
    router.push({ name: 'home' })
  }
  
  if (isMobile.value) {
    uiStore.setMobileMenuOpen(false)
  }
}

// Expanded walks state management
const handleWalkExpanded = ({ walkId, expanded }) => {
  console.debug("WalkInterface.vue: Walk expansion toggled:", { walkId, expanded })
  
  // Create a new array to trigger reactivity
  expandedWalkIds.value = expanded 
    ? [...new Set([...expandedWalkIds.value, walkId])]
    : expandedWalkIds.value.filter(id => id !== walkId)
    
  console.debug("WalkInterface.vue: Updated expandedWalkIds:", expandedWalkIds.value)
  
  // Save to localStorage for persistence
  localStorage.setItem('expandedWalks', JSON.stringify(expandedWalkIds.value))
}

const toggleSidebar = () => {
  uiStore.toggleSidebar()
}

// Enhanced sidebar transition
const toggleSidebarWithAnimation = async () => {
  const sidebar = sidebarRef.value
  if (!sidebar) return

  if (showSidebar.value) {
    await animate(sidebar, 
      { x: ['-100%', '0%'], opacity: [0, 1] },
      { duration: 0.3, easing: [0.2, 0.8, 0.2, 1] }
    )
  } else {
    await animate(sidebar, 
      { x: ['0%', '-100%'], opacity: [1, 0] },
      { duration: 0.3, easing: [0.2, 0.8, 0.2, 1] }
    )
  }
}

// Enhanced mobile menu transition
const handleMobileMenuTransition = async (isOpen) => {
  const menu = document.querySelector('.mobile-menu')
  if (!menu) return

  if (isOpen) {
    await animate(menu,
      { 
        x: ['100%', '0%'],
        opacity: [0, 1]
      },
      { 
        duration: 0.3,
        easing: [0.2, 0.8, 0.2, 1]
      }
    )
  } else {
    await animate(menu,
      { 
        x: ['0%', '100%'],
        opacity: [1, 0]
      },
      { 
        duration: 0.3,
        easing: [0.2, 0.8, 0.2, 1]
      }
    )
  }
}

// Watch for mobile menu state changes
watch(() => uiStore.isMobileMenuOpen, (isOpen) => {
  handleMobileMenuTransition(isOpen)
})

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
watch(() => walksStore.walks, (newWalks) => {
  console.log('Store walks updated:', newWalks?.length)
  if (newWalks?.length > 0 && !showSidebar.value && !isMobile.value) {
    nextTick(() => {
      uiStore.setSidebarVisibility(true)
    })
  }
}, { deep: true, immediate: true })

// Add dimension logging
const logContainerDimensions = () => {
  const sidebar = document.querySelector('.sidebar')
  const content = document.querySelector('.sidebar-content')
  
  console.debug('WalkInterface dimensions:', {
    sidebar: sidebar?.getBoundingClientRect(),
    content: content?.getBoundingClientRect()
  })
}

// Watch for sidebar visibility
watch(showSidebar, (visible) => {
  console.log('Sidebar visibility changed:', visible)
  if (visible) {
    nextTick(() => {
      toggleSidebarWithAnimation()
      logContainerDimensions()
      if (mapComponent.value?.map?.map) {
        mapComponent.value.map.map.resize()
      }
    })
  }
})

onMounted(async () => {
  // Load saved expanded states from localStorage
  try {
    const savedExpandedIds = JSON.parse(localStorage.getItem('expandedWalks') || '[]')
    if (Array.isArray(savedExpandedIds)) {
      expandedWalkIds.value = savedExpandedIds
    }
  } catch (e) {
    console.error('Failed to load saved expanded states:', e)
  }

  window.addEventListener('resize', handleResize)
  await initializeData()

  // Setup viewport tracking for map container
  const mapContainer = document.querySelector('.map-container')
  if (mapContainer) {
    stopViewTracking = inView(mapContainer, () => {
      animate(mapContainer, { scale: [0.95, 1], opacity: [0, 1] }, {
        duration: 0.5,
        easing: [0.2, 0.8, 0.2, 1]
      })

      return () => {
        animate(mapContainer, { scale: 0.95, opacity: 0 })
      }
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
  if (stopViewTracking) {
    stopViewTracking()
  }
})
</script>
