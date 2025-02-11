<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col relative">
    <Loading ref="loadingComponent" />
    
    <div class="relative h-full w-full flex">
      <!-- Sidebar for desktop -->
      <Transition 
      enter-active-class="transition-all duration-300 ease-in-out"
      leave-active-class="transition-all duration-300 ease-in-out"
      enter-from-class="-translate-x-full"
      leave-to-class="-translate-x-full"
      >
      <div 
        v-if="showSidebar && !isMobile"
        class="hidden md:flex flex-col fixed md:relative inset-y-0 left-0 z-10
           bg-white border-r border-gray-200 overflow-hidden
           w-md lg:w-xl
           transform md:transform-none"
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

        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
        <WalkList 
          :error="error"
          :walks="availableWalks"
          :selected-walk-id="selectedWalkId"
          @walk-selected="handleWalkSelection"
          @walk-expanded="handleWalkExpanded"
        />
        </div>
      </div>
      </Transition>

      <!-- Map container -->
      <div 
      class="flex-1 relative transition-[margin] duration-300"
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

    <!-- Mobile menu -->
    <MobileMenu v-if="isMobile" class="md:hidden">
      <div class="w-full h-full">
        <WalkList 
          :error="error"
          :walks="availableWalks"
          :selected-walk-id="selectedWalkId"
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

// Component refs
const loadingComponent = ref(null)
const mapComponent = ref(null)

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
    
    // Show sidebar if we have walks and not on mobile
    if (walksStore.walks.length && !isMobile.value) {
      await nextTick()
      uiStore.setSidebarVisibility(true)
      console.debug("WalkInterface.vue: Sidebar set visible, walks count:", walksStore.walks.length)
    } else {
      console.debug("WalkInterface.vue: Sidebar remains hidden. Walks count:", walksStore.walks.length, "isMobile:", isMobile.value)
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

const handleWalkExpanded = async (walkId) => {
  const walks = [...availableWalks.value]
  const walkIndex = walks.findIndex(w => w.id === walkId)
  if (walkIndex !== -1) {
    walks[walkIndex] = {
      ...walks[walkIndex],
      isExpanded: !walks[walkIndex].isExpanded
    }
    await walksStore.setWalks(walks)
  }
}

const toggleSidebar = () => {
  uiStore.toggleSidebar()
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
watch(() => walksStore.walks, (newWalks) => {
  console.log('Store walks updated:', newWalks?.length)
  if (newWalks?.length > 0 && !showSidebar.value && !isMobile.value) {
    uiStore.setSidebarVisibility(true)
  }
}, { deep: true })

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
      logContainerDimensions()
      if (mapComponent.value?.map?.map) {
        mapComponent.value.map.map.resize()
      }
    })
  }
})

// Lifecycle hooks
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await initializeData()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
})
</script>

<style>
</style>
