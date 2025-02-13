<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col relative">
    <Loading ref="loadingComponent" />

    <div class="relative h-full w-full flex">
      <!-- Navigation Rail for desktop -->
      <Transition :css="false" @enter="onSidebarEnter" @leave="onSidebarLeave">
        <div
          v-if="showSidebar && !isMobile"
          ref="sidebarRef"
          class="md:flex flex-col fixed inset-y-0 left-0 z-10 transform-gpu m3-navigation-rail hardware-accelerated h-full"
          :class="[{ 'is-expanded': isExpanded }]"
        >
          <!-- Navigation buttons (icons only when collapsed; icon+label when expanded) -->
          <nav class="m3-rail-items flex flex-col items-center py-4 gap-3">
            <!-- Toggle/Menu button -->
            <button 
              class="m3-rail-item" 
              @click="toggleExpanded"
            >
              <div class="m3-state-layer">
                <iconify-icon 
                  :icon="isExpanded ? 'mdi:chevron-left' : 'mdi:menu'" 
                  class="text-[24px]"
                />
              </div>
              <span v-if="isExpanded" class="m3-rail-label">Menu</span>
            </button>

            <!-- Navigation destinations -->
            <button 
              class="m3-rail-item" 
              :class="{ 'is-active': !showRoutesDrawer }"
              @click="handleWalkSelection(null)"
            >
              <div class="m3-state-layer">
                <iconify-icon icon="mdi:compass" class="text-[24px]" />
              </div>
              <span v-if="isExpanded" class="m3-rail-label">Explore</span>
            </button>

            <!-- Walks List Integration -->
            <div class="m3-walks-section" :class="{ 'is-expanded': isExpanded }">
              <WalkList
                :error="error"
                :walks="availableWalks"
                :selected-walk-id="selectedWalkId"
                :expanded-walk-ids="expandedWalkIds"
                :is-compact="!isExpanded"
                @walk-selected="handleWalkSelection"
                @walk-expanded="handleWalkExpanded"
              />
            </div>
          </nav>
        </div>
      </Transition>

      <!-- Navigation Drawer for mobile -->
      <Transition :css="false" @enter="onDrawerEnter" @leave="onDrawerLeave">
        <div
          v-if="uiStore?.mobileMenuOpen && isMobile"
          class="fixed inset-0 z-20 m3-navigation-drawer transform-gpu"
          @click.self="uiStore?.setMobileMenuOpen(false)"
        >
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
        </div>
      </Transition>

      <!-- Updated standalone toggle button -->
      <button
        v-if="!showSidebar && !isMobile"
        @click="toggleSidebar"
        class="fixed top-4 left-4 z-20 material-fab"
      >
        <span class="sr-only">Open sidebar</span>
        <iconify-icon icon="mdi:hiking" class="text-xl" />
      </button>

      <!-- Map container with updated left margin -->
      <div
        class="flex-1 relative map-container hardware-accelerated"
        :style="mapContainerStyle"
        ref="mapContainerRef"
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
          <Transition :css="false" @enter="onMobileButtonEnter" @leave="onMobileButtonLeave">
            <button
              v-if="isMobile && !uiStore?.mobileMenuOpen"
              @click="uiStore?.setMobileMenuOpen(true)"
              class="absolute top-4 left-4 z-10 p-3 bg-white rounded-full shadow-lg"
            >
              <i class="icon-menu"></i>
              <span class="sr-only">Open menu</span>
            </button>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { animate } from 'motion'
import { useElementVisibility } from '@vueuse/core'
import { useUiStore } from '../stores/ui'
import { useWalksStore } from '../stores/walks'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import Loading from './Loading.vue'
import MapView from './MapView.vue'
import WalkList from './WalkList.vue'
import WalkCard from './WalkCard.vue'

// Props definition
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

// Store initialization
const router = useRouter()
const walksStore = useWalksStore()
const uiStore = useUiStore()

// Component refs and state
const loadingComponent = ref(null)
const mapComponent = ref(null)
const sidebarRef = ref(null)
const mapContainerRef = ref(null)
const expandedWalkIds = ref([])
const isExpanded = ref(localStorage.getItem('sidebarExpanded') === 'true')

// Computed properties
const error = computed(() => uiStore?.error)
const isFullscreen = computed(() => uiStore?.fullscreen)
const showSidebar = computed(() => uiStore?.showSidebar)
const isMobile = computed(() => uiStore?.isMobile)
const selectedWalkId = computed(() => props.walkId)
const availableWalks = computed(() => walksStore.walks)
const mapContainerVisible = useElementVisibility(mapContainerRef)

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem('sidebarExpanded', isExpanded.value)
  
  // Give the transition time to complete before forcing a scroller update
  setTimeout(() => {
    const recycleScroller = document.querySelector('.vue-recycle-scroller')
    if (recycleScroller && recycleScroller.__vueParentComponent?.ctx) {
      const ctx = recycleScroller.__vueParentComponent.ctx;
      if (typeof ctx.updateSize === 'function') {
        ctx.updateSize()
      }
      if (typeof ctx.scrollToPosition === 'function') {
        ctx.scrollToPosition(0)
      }
    }
  }, 50)
}

// Watch for expansion state changes
watch(isExpanded, (newValue) => {
  nextTick(() => {
    const scroller = document.querySelector('.m3-scroller')
    if (scroller) {
      scroller.style.opacity = '0'
      setTimeout(() => {
        scroller.style.opacity = '1'
      }, 300)
    }
  })
})

const handleWalkSelection = async (walk) => {
  console.log('Walk selection handler called:', walk?.id);
  if (walk) {
    await router.push({ name: 'walk-detail', params: { id: walk.id } });
  } else {
    await router.push({ name: 'home' });
  }
  
  if (isMobile.value) {
    uiStore?.setMobileMenuOpen(false);
  }
}

// Watch effects
watch([isExpanded, showSidebar], ([newExpanded, newVisible]) => {
  if (!newVisible || !newExpanded) {
    nextTick(() => {
      const walkList = document.querySelector('.walk-list-container')
      if (walkList) {
        walkList.style.pointerEvents = 'none'
      }
    })
  } else {
    setTimeout(() => {
      const walkList = document.querySelector('.walk-list-container')
      if (walkList) {
        walkList.style.pointerEvents = 'auto'
      }
    }, 300)
  }
}, { immediate: true })

// Ensure proper cleanup of items when visibility changes
watch([isExpanded, showSidebar], ([newExpanded, newVisible]) => {
  if (!newVisible || !newExpanded) {
    // Wait for transition to start
    requestAnimationFrame(() => {
      const scroller = document.querySelector('.vue-recycle-scroller')
      if (scroller && scroller.__vueParentComponent?.ctx) {
        const ctx = scroller.__vueParentComponent.ctx;
        if (typeof ctx.updateSize === 'function') {
          ctx.updateSize()
        }
      }
    })
  }
}, { immediate: true })

// Updated sidebar animation functions
async function onSidebarEnter(el, onComplete) {
  await animate(el, {
    x: ['-100%', '0%']
  }, {
    duration: 0.3,
    easing: 'var(--spring-regular)'
  })
  onComplete()
}

async function onSidebarLeave(el, onComplete) {
  await animate(el, {
    x: ['0%', '-100%']
  }, {
    duration: 0.3,
    easing: 'var(--spring-regular)'
  })
  onComplete()
}

async function onMobileButtonEnter(el, onComplete) {
  await animate(el, {
    opacity: [0, 1],
    scale: [0.8, 1]
  }, {
    duration: 0.3,
    easing: [.23,1,.32,1]
  })
  onComplete()
}

async function onMobileButtonLeave(el, onComplete) {
  await animate(el, {
    opacity: [1, 0],
    scale: [1, 0.8]
  }, {
    duration: 0.2
  })
  onComplete()
}

async function onDrawerEnter(el, onComplete) {
  await animate(el, {
    opacity: [0, 1],
    x: ['-100%', '0%'],
  }, {
    duration: 0.3,
    easing: 'var(--spring-regular)'
  })
  onComplete()
}

async function onDrawerLeave(el, onComplete) {
  await animate(el, {
    opacity: [1, 0],
    x: ['0%', '-100%'],
  }, {
    duration: 0.3,
    easing: 'var(--spring-regular)'
  })
  onComplete()
}

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
    uiStore?.setLoading(true)
    loadingComponent.value?.startLoading('Loading walks...')
    console.debug("WalkInterface.vue: Starting data initialization")
    
    await walksStore.loadWalks()
    console.debug("WalkInterface.vue: Walks loaded from store:", walksStore.walks)
    
    // Ensure walks are loaded before showing the sidebar
    await nextTick()
    
    if (walksStore.walks.length && !isMobile.value) {
      uiStore?.setSidebarVisibility(true)
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
    uiStore?.setError(error.message)
  } finally {
    uiStore?.setLoading(false)
    loadingComponent.value?.stopLoading()
    console.debug("WalkInterface.vue: Loading stopped")
  }
}

watch(availableWalks, (newVal) => {
  console.debug("WalkInterface.vue: availableWalks updated:", newVal)
}, { immediate: true })

const handleMapLoaded = (map) => {
  uiStore?.setMapLoading(false)
}

const handleMapError = (error) => {
  uiStore?.setError(error.message)
  uiStore?.setMapLoading(false)
}

const handleWalkExpanded = ({ walkId, expanded }) => {
  console.debug("WalkInterface.vue: Walk expansion toggled:", { walkId, expanded })
  
  expandedWalkIds.value = expanded 
    ? [...new Set([...expandedWalkIds.value, walkId])]
    : expandedWalkIds.value.filter(id => id !== walkId)
    
  console.debug("WalkInterface.vue: Updated expandedWalkIds:", expandedWalkIds.value)
  
  localStorage.setItem('expandedWalks', JSON.stringify(expandedWalkIds.value))
}

const toggleSidebar = () => {
  uiStore?.toggleSidebar()
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
    nextTick(() => {
      uiStore?.setSidebarVisibility(true)
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
      logContainerDimensions()
      if (mapComponent.value?.map?.map) {
        mapComponent.value.map.map.resize()
      }
    })
  }
})

const mapContainerStyle = computed(() => ({
  marginLeft: showSidebar.value && !isMobile.value 
    ? `${isExpanded.value ? 360 : 80}px` 
    : '0px',
  transition: 'margin-left var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized)'
}))

onMounted(async () => {
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

  const walkList = document.querySelector('.walk-list-container')
  if (walkList) {
    console.log('Initial walk list styles:', {
      pointerEvents: window.getComputedStyle(walkList).pointerEvents,
      transform: window.getComputedStyle(walkList).transform,
      zIndex: window.getComputedStyle(walkList).zIndex
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
})
</script>

<style>
.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
  contain: strict;
}

.sidebar-content.is-expanded {
  width: 360px;
}

:root {
  --md-sys-color-surface: 255, 255, 255;
  --md-sys-color-surface-container: 246, 248, 250;
  --md-sys-color-on-surface: 28, 27, 31;
  --md-sys-color-on-surface-variant: 73, 69, 79;
  --md-sys-color-primary: 103, 80, 164;
  --md-sys-elevation-1: 0px 1px 3px 1px rgba(0, 0, 0, 0.15),
    0px 1px 2px 0px rgba(0, 0, 0, 0.30);
  --md-sys-elevation-2: 0px 2px 6px 2px rgba(0, 0, 0, 0.15),
    0px 1px 2px 0px rgba(0, 0, 0, 0.30);
  --md-sys-color-surface-container-highest: 255, 255, 255;
  --md-sys-motion-easing-emphasized: cubic-bezier(0.4, 0, 0.2, 1);
  --md-sys-motion-duration-medium: 300ms;
  --md-sys-color-surface-container-low: 247, 242, 255;
  --md-sys-color-outline-variant: 196, 199, 197;
  --md-elevation-level2: 0 2px 6px 2px rgba(0, 0, 0, 0.15),
    0 1px 2px 0px rgba(0, 0, 0, 0.3);
  --md-elevation-level3: 0px 4px 8px 3px rgba(0, 0, 0, 0.15),
    0px 1px 3px 0px rgba(0, 0, 0, 0.3);
  --md-sys-color-surface-container-lowest: 255, 255, 255;
  --md-sys-color-surface-container-low: 248, 248, 248;
  --md-sys-color-surface-container: 241, 241, 241;
  --md-sys-color-surface-container-high: 235, 235, 235;
  --md-sys-color-surface-container-highest: 231, 231, 231;
  --md-sys-color-secondary-container: 232, 222, 248;
  --md-sys-color-on-secondary-container: 29, 25, 43;
  --md-sys-color-outline: 121, 116, 126;
  --md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0);
  --md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0.0, 0.8, 0.15);
  --md-sys-color-tertiary-container: 234, 247, 237;
  --md-sys-color-on-tertiary-container: 0, 107, 47;
  --md-sys-color-error-container: 252, 224, 220;
  --md-sys-color-on-error-container: 147, 0, 10;
}

.m3-navigation-rail {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 80px;
  background-color: rgb(var(--md-sys-color-surface));
  border-right: 1px solid rgb(var(--md-sys-color-outline-variant) / 0.2);
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  z-index: 30;
  padding: 12px 0;  /* Add vertical padding */
}

.m3-rail-items {
  display: flex;
  flex-direction: column;
  height: 100%; /* Fill available height */
  padding: 4px 12px;  /* Add padding around items */
  gap: 4px;  /* Add gap between items */
}

.m3-rail-item {
  width: 56px; /* MD3 spec: container for active indicator */
  height: 56px; /* MD3 spec: item height */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* When expanded, adjust the item layout */
.m3-navigation-rail.is-expanded {
  width: 412px; /* Updated to MD3 spec width */
}

.m3-navigation-rail.is-expanded .m3-rail-item {
  width: 100%;
  padding: 0 12px; /* MD3 spec: padding from edge */
}

.m3-navigation-rail.is-expanded .m3-state-layer {
  width: 100%;
  padding: 0 16px;
  justify-content: flex-start;
}

.m3-rail-label {
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: inherit;
  text-align: center;
}

/* Badge styles per MD3 spec */
.m3-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: rgb(var(--md-sys-color-error));
}

.m3-badge.large {
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: rgb(var(--md-sys-color-on-error));
}

/* Update menu icon size */
.m3-rail-item iconify-icon {
  font-size: 24px; /* MD3 spec: icon size */
  width: 24px;
  height: 24px;
}

.m3-rail-header {
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.m3-navigation-fab {
  position: absolute;
  top: 12px;
  right: 0;
  transform: translateX(50%);
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
  display: grid;
  place-items: center;
  box-shadow: var(--md-sys-elevation-1);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.m3-navigation-fab:hover {
  background: rgb(var(--md-sys-color-surface-container-highest) / 0.92);
  box-shadow: var(--md-sys-elevation-2);
}

.m3-navigation-fab.is-expanded {
  transform: translateX(50%) rotate(180deg);
}

.m3-navigation-drawer {
  display: none;
}

.m3-drawer-content {
  width: 412px; /* Updated to MD3 spec width */
  height: 100%;
  background-color: rgb(var(--md-sys-color-surface));
  box-shadow: var(--md-sys-elevation-2);
  overflow: hidden;
}

.m3-label-medium {
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.m3-headline-small {
  font-size: 24px;
  line-height: 32px;
  font-weight: 400;
  letter-spacing: 0;
  color: rgb(var(--md-sys-color-on-surface));
}

.m3-icon-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: rgb(var(--md-sys-color-on-surface));
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.m3-state-layer-container {
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
}

.m3-state-layer {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: inherit;
}

.m3-state-layer::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.m3-icon-button:hover .m3-state-layer::before {
  background-color: rgb(var(--md-sys-color-primary) / 0.08);
}

.m3-icon-button:active .m3-state-layer::before {
  background-color: rgb(var(--md-sys-color-primary) / 0.12);
}

.material-fab {
  position: fixed;
  left: 12px;
  top: 12px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-surface));
  box-shadow: var(--md-sys-elevation-1);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.material-fab:hover {
  box-shadow: var(--md-sys-elevation-2);
  background-color: rgb(var(--md-sys-color-primary) / 0.92);
}

.material-fab:active {
  box-shadow: var(--md-sys-elevation-1);
  background-color: rgb(var(--md-sys-color-primary) / 0.88);
}

.bg-surface {
  background-color: rgb(var(--md-sys-color-surface));
}

.m3-rail-item {
  width: 100%;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 12px;
  position: relative;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.m3-rail-item .m3-state-layer {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 4px;
  border-radius: 16px;
  position: relative;
}

.m3-rail-item.is-active {
  color: rgb(var(--md-sys-color-primary));
}

.m3-rail-item.is-active .m3-state-layer::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: rgb(var(--md-sys-color-secondary-container));
}

.m3-rail-label {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  position: relative;
  z-index: 1;
}

.m3-walks-section {
  flex: 1;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgb(var(--md-sys-color-surface));
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden; /* Contain the scrolling content */
  min-height: 0; /* Allow flex child to shrink */
  padding-top: 8px;  /* Add top spacing */
}

.m3-walks-section .walk-list-container {
  flex: 1;
  min-height: 0;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.m3-walks-section .scroller {
  position: absolute !important;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Map container styles */
.map-container {
  background: rgb(var(--md-sys-color-surface-container-lowest, 255, 255, 255));
  border-radius: 28px;
  margin: 24px;
  overflow: hidden;
}

.map-container > div {
  border-radius: 24px;
  overflow: hidden;
  margin: 8px;
}

/* Update map container margins based on rail state */
.map-container {
  transition: margin 300ms cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: calc(80px + 24px); /* Collapsed rail width + margin */
}

.m3-navigation-rail.is-expanded ~ .map-container {
  margin-left: calc(360px + 24px); /* Expanded rail width + margin */
}

/* Ensure proper spacing when rail is expanded */
.map-container.with-expanded-rail {
  margin-left: 376px; /* 360px rail width + 16px margin */
}

/* Update transitions */
.map-container {
  transition: margin var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

/* Remove the separate routes drawer styles since we're integrating it into the rail */
.m3-routes-drawer,
.m3-routes-drawer-content,
.m3-routes-drawer-header,
.m3-routes-drawer-body {
  display: none;
}

/* Ensure virtual scroll container fills remaining space */
.vue-recycle-scroller {
  height: 100% !important;
  min-height: 0;
  contain: strict;
}

.vue-recycle-scroller__item-wrapper {
  min-height: 100%;
}
</style>
