<template>
  <div class="h-full flex flex-col overflow-hidden relative bg-white">
    <!-- Error state -->
    <div v-if="error" class="p-4 m-4 bg-red-100 border border-red-400 rounded-md text-red-800">
      {{ error }}
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="p-4">
      <div v-for="i in 3" :key="i" class="mb-4 p-4 border border-gray-200 rounded-lg">
        <div>
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
          <div class="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
      </div>
    </div>

    <!-- Walk list -->
    <div v-else-if="computedWalks.length" class="flex-1 min-h-0 flex flex-col relative">
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Test card -->
        <div class="mb-8 bg-white rounded-lg border-2 border-blue-500 shadow-sm hover:shadow-md transition-all">
          <div class="p-4">
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-lg font-semibold">Test Walk Card</h3>
              <div class="flex gap-2">
                <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Test Badge
                </span>
              </div>
            </div>
            <div class="space-y-4">
              <p class="text-sm text-gray-600">
                This is a test walk card to verify styling and layout.
              </p>
              <div class="mt-4">
                <h4 class="font-medium mb-2">Test Details:</h4>
                <ul class="space-y-1 text-sm">
                  <li>Detail 1</li>
                  <li>Detail 2</li>
                </ul>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <button class="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                Show More
              </button>
              <button class="px-4 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-md transition-colors">
                View on Map
              </button>
            </div>
          </div>
        </div>

        <!-- Actual walk cards -->
        <div 
          v-for="walk in computedWalks.slice(0, 5)" 
          :key="walk.id"
          class="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all"
          :class="{ 'border-blue-500 bg-blue-50': selectedWalkId === walk.id }"
          @click="handleWalkClick(walk)"
        >
          <div class="p-4">
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-lg font-semibold">{{ walk.walk_name }}</h3>
              <div v-if="walk.steepness_level" class="flex gap-2">
                <span 
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="getBadgeInfo(walk.steepness_level)?.color"
                >
                  {{ walk.steepness_level }}
                </span>
              </div>
            </div>
            <p class="text-sm text-gray-600">{{ walk.highlights }}</p>
          </div>
        </div>
      </div>

      <!-- Debug info -->
      <div class="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50 font-mono text-xs opacity-90">
        <p>Total walks: {{ computedWalks.length }}</p>
        <p>Container height: {{ containerHeight }}px</p>
        <p>First item height: {{ firstItemHeight }}px</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="p-8 text-center text-gray-500">
      No walks available
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { useUiStore } from '../stores/ui'
import { getBadgeInfo } from '../utils/helpers'
import { useWalksStore } from '../stores/walks'
import debounce from 'lodash.debounce'

// Props and emits setup
const props = defineProps({
  error: { type: String, default: null },
  walks: { type: Array, default: () => [] },
  selectedWalkId: { type: [String, Number], default: null }
})

const emit = defineEmits(['walk-selected', 'walk-expanded'])
const uiStore = useUiStore()
const walksStore = useWalksStore()

// Debug computed property for walk data
const computedWalks = computed(() => {
  // Convert walks to a new array to avoid Proxy issues
  const rawWalks = props.walks ? [...props.walks] : []
  console.debug("WalkList.vue: Received walks from props:", rawWalks)
  const filteredWalks = rawWalks.filter(walk => walk?.id && walk?.walk_name)
  console.debug("WalkList.vue: Filtered walks:", filteredWalks)
  return filteredWalks
})

// Log right before render (using a watcher)
watch(computedWalks, (newWalks) => {
  console.debug("WalkList.vue: Final computedWalks ready for render:", newWalks)
}, { immediate: true })

// Item size - used by RecycleScroller
const minItemHeight = 160 // Adjusted based on content

// Add loading state
const loading = computed(() => walksStore.loading)

// Debug refs
const containerHeight = ref(0)
const firstItemHeight = ref(0)
const scroller = ref(null)
let resizeObserver = null

// Enhanced dimension logging with debug info update
const logDimensions = (event = 'check') => {
  const walkList = document.querySelector('.walk-list')
  const container = document.querySelector('.walk-list-container')
  const scrollerEl = document.querySelector('.scroller')
  const firstItem = document.querySelector('.walk-item')
  
  // Update debug refs
  containerHeight.value = container?.offsetHeight || 0
  firstItemHeight.value = firstItem?.offsetHeight || 0
  
  console.debug('WalkList dimensions:', {
    event,
    walkList: {
      height: walkList?.offsetHeight,
      rect: walkList?.getBoundingClientRect(),
      style: walkList?.style.height
    },
    container: {
      height: containerHeight.value,
      rect: container?.getBoundingClientRect(),
    },
    scroller: {
      height: scrollerEl?.offsetHeight,
      rect: scrollerEl?.getBoundingClientRect(),
    },
    firstItem: firstItemHeight.value,
    computedWalksLength: computedWalks.value?.length
  })
}

// Combined resize handler
const handleResize = debounce(() => {
  if (scroller.value?.$el) {
    nextTick(() => {
      scroller.value.updateSize?.()
      logDimensions('resize')
    })
  }
}, 100)

onMounted(() => {
  if (!window.ResizeObserver) {
    console.warn('ResizeObserver not available')
    return
  }
  
  // Initialize single ResizeObserver
  resizeObserver = new ResizeObserver(handleResize)
  
  const container = document.querySelector('.walk-list-container')
  if (container) {
    resizeObserver.observe(container)
  }
  
  nextTick(() => {
    logDimensions('mounted')
    // Add detailed mount checks
    console.debug('Walk list mount check:', {
      walkList: document.querySelector('.walk-list'),
      container: document.querySelector('.walk-list-container'),
      scroller: document.querySelector('.scroller'),
      testCard: document.querySelector('.test-card'),
      walkItems: document.querySelectorAll('.walk-item').length,
      computedWalksLength: computedWalks.value.length
    })
  })
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Watch for walk updates
watch(computedWalks, (newWalks) => {
  if (newWalks.length) {
    nextTick(() => {
      logDimensions('walks-updated')
      // Force scroller update
      scroller.value?.forceUpdate()
    })
  }
})

// Methods
const handleWalkClick = (walk) => {
  if (!walk) return
  if (props.selectedWalkId === walk.id) {
    emit('walk-selected', null)
  } else {
    selectWalk(walk)
  }
}

const selectWalk = (walk) => {
  if (!walk) return
  emit('walk-selected', walk)
}

const toggleExpand = (walk) => {
  if (!walk) return
  emit('walk-expanded', walk.id)
}

// Add sidebar visibility tracking
watch(() => uiStore.showSidebar, (visible) => {
  if (visible) {
    nextTick(() => {
      logDimensions('sidebar-visible')
    })
  }
}, { immediate: true })
</script>
