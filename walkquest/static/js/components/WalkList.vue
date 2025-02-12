<template>
  <div class="h-full flex flex-col overflow-hidden relative bg-white">
    <!-- Error state -->
    <div v-if="error" class="p-4 m-4 bg-red-100 border border-red-400 rounded-md text-red-800">
      {{ error }}
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex-1 p-4 overflow-y-auto">
      <div v-for="i in 3" :key="i" class="mb-4 p-4 border border-gray-200 rounded-lg">
        <div class="animate-pulse space-y-3">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>

    <!-- Walk list -->
    <div v-else-if="computedWalks.length" class="flex-1 overflow-y-auto">
      <div class="p-4 space-y-4">
        <TransitionGroup
          tag="div"
          class="space-y-4"
          name="walk-list"
        >
          <div 
            v-for="walk in computedWalks" 
            :key="walk.id"
            class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 walk-item opacity-100 transform translate-y-0 scale-100"
            :class="{ 
              'border-blue-500 bg-blue-50': selectedWalkId === walk.id,
              'pointer-events-none': isCardExpanding
            }"
            @click="handleWalkClick(walk)"
            :data-walk-id="walk.id"
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
              
              <!-- Expandable content -->
              <div class="expandable-content overflow-hidden">
                <div class="space-y-4 mt-4">
                  <div v-if="walk.categories?.length" class="flex flex-wrap gap-2">
                    <span 
                      v-for="category in walk.categories" 
                      :key="category"
                      class="category-tag px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full"
                    >
                      {{ category }}
                    </span>
                  </div>
                  
                  <div v-if="walk.description" class="prose prose-sm max-w-none">
                    <p>{{ walk.description }}</p>
                  </div>

                  <div class="flex flex-wrap gap-4">
                    <div v-if="walk.distance" class="flex items-center gap-1">
                      <span class="text-gray-500">Distance:</span>
                      <span class="font-medium">{{ walk.distance }}km</span>
                    </div>
                    <div v-if="walk.duration" class="flex items-center gap-1">
                      <span class="text-gray-500">Duration:</span>
                      <span class="font-medium">{{ walk.duration }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, TransitionGroup } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { useUiStore } from '../stores/ui'
import { getBadgeInfo } from '../utils/helpers'
import { useWalksStore } from '../stores/walks'
import debounce from 'lodash.debounce'
import { animate, scroll, inView } from 'motion'
import { useViewportAnimation } from '../composables/useViewportAnimation'

// Props and emits setup
const props = defineProps({
  error: { type: String, default: null },
  walks: { type: Array, default: () => [] },
  selectedWalkId: { type: [String, Number], default: null }
})

const emit = defineEmits(['walk-selected', 'walk-expanded'])
const uiStore = useUiStore()
const walksStore = useWalksStore()

// Animation state
const isCardExpanding = ref(false)
const revealedCards = ref(new Set())

// Loading and UI state
const loading = computed(() => walksStore.loading)
const containerHeight = ref(0)
const firstItemHeight = ref(0)
const scroller = ref(null)
let resizeObserver = null

// Debug computed property for walk data
const computedWalks = computed(() => {
  const rawWalks = props.walks ? [...props.walks] : []
  console.debug("WalkList.vue: Received walks from props:", rawWalks)
  const filteredWalks = rawWalks.filter(walk => walk?.id && walk?.walk_name)
  console.debug("WalkList.vue: Filtered walks:", filteredWalks)
  return filteredWalks
})

// Enhanced enter/leave transitions
const onBeforeEnter = (el) => {
  el.style.opacity = '0'
  el.style.transform = 'translateY(25px)'
}

const onEnter = async (el, done) => {
  await animate(el, {
    opacity: [0, 1],
    y: [25, 0],
    scale: [0.95, 1]
  }, {
    duration: 0.5,
    easing: [0.2, 0.8, 0.2, 1]
  })
  done()
}

const onLeave = async (el, done) => {
  await animate(el, {
    opacity: [1, 0],
    y: [0, -25],
    scale: [1, 0.95]
  }, {
    duration: 0.3,
    easing: [0.2, 0.8, 0.2, 1]
  })
  done()
}

// Enhanced card expansion animation
const handleWalkClick = async (walk) => {
  if (!walk || isCardExpanding.value) return
  
  isCardExpanding.value = true
  const card = document.querySelector(`[data-walk-id="${walk.id}"]`)
  
  try {
    if (props.selectedWalkId === walk.id) {
      await animate(card, {
        scale: [1.02, 1],
        y: [-4, 0],
        backgroundColor: ['rgb(239, 246, 255)', 'rgb(255, 255, 255)'],
        borderColor: ['rgb(59, 130, 246)', 'rgb(229, 231, 235)'],
      }, {
        duration: 0.3,
        easing: [0.2, 0.8, 0.2, 1]
      })
      emit('walk-selected', null)
    } else {
      await animate(card, {
        scale: [1, 1.02],
        y: [0, -4],
        backgroundColor: ['rgb(255, 255, 255)', 'rgb(239, 246, 255)'],
        borderColor: ['rgb(229, 231, 235)', 'rgb(59, 130, 246)'],
      }, {
        duration: 0.3,
        easing: [0.2, 0.8, 0.2, 1]
      })
      emit('walk-selected', walk)
    }
  } finally {
    isCardExpanding.value = false
  }
}

// Enhanced animation methods
const animateCard = async (card, shouldExpand = false) => {
  if (shouldExpand) {
    await animate(card, {
      scale: [1, 1.02],
      y: [0, -4],
      backgroundColor: ['rgb(255, 255, 255)', 'rgb(239, 246, 255)'],
      borderColor: ['rgb(229, 231, 235)', 'rgb(59, 130, 246)'],
    }, {
      duration: 0.3,
      easing: [0.2, 0.8, 0.2, 1]
    })
  } else {
    await animate(card, {
      opacity: [0, 1],
      y: [15, 0],
      scale: [0.97, 1]
    }, {
      duration: 0.5,
      easing: [0.2, 0.8, 0.2, 1]
    })
  }
}

const animateContent = async (content, shouldExpand) => {
  if (!content || !window.Motion) return;

  const title = content.querySelector('h3');
  if (shouldExpand) {
    content.style.display = 'block';
    const targetHeight = content.scrollHeight;
    await window.Motion.animate([
      [content, {
        height: [0, targetHeight],
        opacity: [0, 1],
        margin: [0, '1rem 0'],
        y: [-20, 0],
        scale: [0.95, 1]
      }, {
        duration: 0.5,
        easing: 'easeOutQuart'
      }],
      [content.querySelectorAll('img, .category-tag, p'), {
        opacity: [0, 1],
        y: [20, 0],
        scale: [0.9, 1]
      }, {
        duration: 0.4,
        delay: window.Motion.stagger(0.07, { start: 0.1 }),
        easing: 'easeOutCubic'
      }],
      [title, {
        opacity: [0, 1],
        y: [-30, 0],
        scale: [0.9, 1]
      }, {
        duration: 0.6,
        easing: 'easeOutQuart',
        at: "<"
      }]
    ]);
  } else {
    await window.Motion.animate([
      [content.querySelectorAll('img, .category-tag, p'), {
        opacity: [1, 0],
        y: [0, -10],
        scale: [1, 0.95]
      }, {
        duration: 0.3,
        delay: window.Motion.stagger(0.04),
        easing: 'easeInCubic'
      }],
      [title, {
        opacity: [1, 0],
        y: [0, -20],
        scale: [1, 0.95]
      }, {
        duration: 0.3,
        easing: 'easeInCubic',
        at: "<"
      }],
      [content, {
        height: 0,
        opacity: 0,
        margin: 0,
        scale: 0.95
      }, {
        duration: 0.3,
        easing: 'easeInCubic',
        at: "<"
      }]
    ]);
    content.style.display = 'none';
  }
}

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

const scrollAnimationCleanup = ref(null)

// Remove the initScrollAnimations function since we're using Vue transitions
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
  })

  // Initialize scroll animations for cards
  const cards = document.querySelectorAll('.walk-item')
  cards.forEach((card, index) => {
    const stopTracking = inView(card, () => {
      animate(card, { 
        opacity: [0, 1],
        y: [20, 0],
        scale: [0.95, 1]
      }, { 
        delay: index * 0.1,
        duration: 0.5,
        easing: [0.2, 0.8, 0.2, 1]
      })

      return () => {
        animate(card, { 
          opacity: 0,
          y: 20,
          scale: 0.95
        })
      }
    })

    // Store cleanup function
    if (!scrollAnimationCleanup.value) {
      scrollAnimationCleanup.value = []
    }
    scrollAnimationCleanup.value.push(stopTracking)
  })
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }

  // Cleanup scroll animations
  if (scrollAnimationCleanup.value) {
    scrollAnimationCleanup.value.forEach(cleanup => cleanup())
  }
})

// Watch for walk updates
watch(computedWalks, (newWalks) => {
  if (newWalks.length) {
    nextTick(() => {
      logDimensions('walks-updated')
      scroller.value?.forceUpdate()
    })
  }
})

// Add sidebar visibility tracking
watch(() => uiStore.showSidebar, (visible) => {
  if (visible) {
    nextTick(() => {
      logDimensions('sidebar-visible')
    })
  }
}, { immediate: true })
</script>

<style>
.walk-list-move,
.walk-list-enter-active,
.walk-list-leave-active {
  transition: all 0.5s ease;
}

.walk-list-enter-from,
.walk-list-leave-to {
  opacity: 0;
  transform: translateY(25px);
}

.walk-list-leave-active {
  position: absolute;
}
</style>
