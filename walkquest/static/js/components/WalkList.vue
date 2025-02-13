<template>
  <div class="h-full flex flex-col" ref="container" style="min-height: 400px; height: 100vh;">
    <!-- Error state -->
    <Transition :css="false" @enter="onErrorEnter" @leave="onErrorLeave">
      <div
        v-if="error"
        class="p-4 m-4 bg-red-100 border border-red-400 rounded-md text-red-800"
      >
        {{ error }}
      </div>
    </Transition>

    <!-- Loading state -->
    <div v-if="loading" class="flex-1 p-4 overflow-y-auto" style="min-height: 100px">
      <div v-for="i in 3" :key="i" class="mb-4 p-4 border border-gray-200 rounded-lg">
        <div class="animate-pulse space-y-3">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <!-- Changed: Use a static class for scrolling -->
    <div class="flex-1 overflow-y-auto">
      <DynamicScroller
        ref="dynamicScroller"
        :items="computedWalks"
        :min-item-size="128"
        class="h-full relative overflow-y-auto"
        :listClass="'walk-list'"
        @resize="handleResize"
        :style="{ minHeight: '200px', visibility: 'visible' }"
      >
        <template #default="{ item: walk, index, active }">
          <DynamicScrollerItem :item="walk" :active="active" :size-dependencies="[walk.walk_name, walk.difficulty, walk.duration, walk.highlights]" class="card-item">
            <div 
              class="card-wrapper"
              :class="{ 'animated': active }"
              :ref="el => setScrollItemRef(el, walk.id)"
              :data-walk-id="walk.id"
            >
              <!-- Updated: Added hover and press event listeners -->
              <div
                class="card-content cursor-pointer group"
                :ref="setCardRef(walk.id)"
                @click="handleWalkClick(walk)"
                @mouseover="handleCardHover(walk.id, true)"
                @mouseleave="handleCardHover(walk.id, false)"
                @mousedown="handleCardPress(walk.id, true)"
                @mouseup="handleCardPress(walk.id, false)"
              >
                <!-- Content wrapper -->
                <div class="p-4 space-y-3">
                  <h3 class="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                    {{ walk.walk_name }}
                  </h3>

                  <!-- Interactive badges -->
                  <div class="flex gap-2">
                    <span
                      v-if="walk.difficulty"
                      class="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors"
                    >
                      {{ walk.difficulty }}
                    </span>
                    <span
                      v-if="walk.duration"
                      class="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors"
                    >
                      {{ walk.duration }}
                    </span>
                  </div>

                  <p class="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                    {{ walk.highlights }}
                  </p>

                  <button
                    @click.stop="toggleFavorite(walk)"
                    class="absolute top-3 right-3 p-2 rounded-full transition-all duration-300 hover:bg-red-50 hover:scale-125 active:scale-95"
                  >
                    <iconify-icon
                      :icon="isFavorite(walk) ? 'mdi:heart' : 'mdi:heart-outline'"
                      class="w-5 h-5"
                      :class="isFavorite(walk) ? 'text-red-500' : 'text-gray-400'"
                    />
                  </button>
                </div>
              </div>
            </div>
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, reactive } from 'vue'
import { useUiStore } from '../stores/ui'
import { getBadgeInfo } from '../utils/helpers'
import { useWalksStore } from '../stores/walks'
import { animate, inView, press } from 'motion'
import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { DynamicScroller, DynamicScrollerItem, RecycleScroller } from 'vue-virtual-scroller'

// Add a global WeakMap for animation state (placed at the top level in <script setup>)
const animationState = new WeakMap()

// Props and emits setup
const props = defineProps({
  error: { type: String, default: null },
  walks: { type: Array, default: () => [] },
  selectedWalkId: { type: [String, Number], default: null },
  expandedWalkIds: { type: Array, default: () => [] }
})

const emit = defineEmits(['walk-selected', 'walk-expanded'])
const uiStore = useUiStore()
const walksStore = useWalksStore()

// Add scroll state management
const scrollState = reactive({
  isScrolling: false,
  scrollDirection: 'none',
  lastScrollTop: 0,
  scrollTimeout: null
})

// Refs for animations
const container = ref(null)
const dynamicScroller = ref(null)
const listContainer = ref(null)
const cardRefs = ref({})
const visibleItems = ref(new Set())
let stopViewTracking

// Animation functions
async function onErrorEnter(el, onComplete) {
  await animate(el, { 
    opacity: [0, 1], 
    y: [-20, 0] 
  }, { duration: 0.3 })
  onComplete()
}

async function onErrorLeave(el, onComplete) {
  await animate(el, { 
    opacity: [1, 0], 
    y: [0, -20] 
  }, { duration: 0.3 })
  onComplete()
}

async function onHeaderEnter(el, onComplete) {
  await animate(el, { 
    opacity: [0, 1], 
    scale: [0.95, 1],
    y: [-20, 0] 
  }, { 
    duration: 0.5,
    easing: [.23,1,.32,1]
  })
  onComplete()
}

function beforeCardEnter(el) {
  el.style.opacity = '0'
  el.style.transform = 'translateY(30px) scale(0.9)'
}

async function onCardEnter(el, onComplete) {
  const index = parseInt(el.dataset.index) || 0
  const isRevealed = el.classList.contains('revealed')
  const delay = isRevealed ? 0 : index * 50 // Only stagger new cards
  
  await animate(el, 
    { 
      opacity: [0, 1], 
      y: [10, 0], // Reduced translateY value
      scale: [0.95, 1],
      filter: ['blur(4px)', 'blur(0px)']
    }, 
    { 
      duration: 0.6,
      delay,
      easing: [.23, 1, .32, 1]
    }
  )
  onComplete()
}

async function afterCardEnter(el) {
  // Add subtle floating animation after entry
  animate(
    el,
    { y: [0, -3, 0] },
    { 
      duration: 2,
      repeat: Infinity,
      easing: 'ease-in-out'
    }
  )
}

async function onCardLeave(el, onComplete) {
  const rect = el.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const direction = rect.top > viewportHeight / 2 ? 1 : -1

  await animate(el, 
    { 
      opacity: [1, 0],
      y: [0, 30 * direction],
      scale: [1, 0.9],
      filter: ['blur(0px)', 'blur(4px)']
    },
    { 
      duration: 0.4,
      easing: [.23, 1, .32, 1]
    }
  )
  onComplete()
}

// Loading and UI state
const loading = computed(() => {
  const isLoading = walksStore.loading
  console.log("loading.value:", isLoading)
  return isLoading
})

let resizeObserver = null

// Favorite handling state and helpers
const favoriteWalks = ref(new Set())
const toggleFavorite = (walk) => {
  if (favoriteWalks.value.has(walk.id)) {
    favoriteWalks.value.delete(walk.id)
  } else {
    favoriteWalks.value.add(walk.id)
  }
}
const isFavorite = (walk) => favoriteWalks.value.has(walk.id)
const convertToMiles = (km) => (km * 0.621371).toFixed(1)

// Enhanced computed property for walk data
const computedWalks = computed(() => {
  const rawWalks = props.walks ? [...props.walks] : []
  const expandedIds = props.expandedWalkIds || []
  
  console.log("props.walks in computedWalks:", props.walks)
  const processedWalks = rawWalks
    .filter(walk => {
      const hasIdAndName = walk?.id && walk?.walk_name
      if (!hasIdAndName) {
        console.log("Filtered out walk due to missing id/name:", walk)
      }
      return hasIdAndName
    })
    .map(walk => ({
      ...walk,
      isExpanded: expandedIds.includes(walk.id),
      pointsOfInterest: Array.isArray(walk.points_of_interest) 
          ? walk.points_of_interest.join(', ')
          : walk.points_of_interest || '',
      pubs: Array.isArray(walk.pubs) 
          ? walk.pubs 
          : (walk.pubs ? [walk.pubs] : []),
      trailConsiderations: walk.trail_considerations || '',
      features: Array.isArray(walk.features) 
          ? walk.features 
          : (walk.features ? [walk.features] : [])
    }))
  console.log("computedWalks processed:", processedWalks)
  return processedWalks
})

// Simplified click handler (old animation logic removed)
const handleWalkClick = (walk) => {
  if (!walk) return
  console.log('Walk clicked:', walk.id)
  const wasSelected = props.selectedWalkId === walk.id
  const wasExpanded = props.expandedWalkIds.includes(walk.id)
  emit('walk-selected', wasSelected ? null : walk)
  emit('walk-expanded', { walkId: walk.id, expanded: !wasExpanded })
}

// Combined resize handler
const handleResize = debounce(() => {
  if (dynamicScroller.value && typeof dynamicScroller.value.updateSize === 'function') {
    dynamicScroller.value.updateSize()
  }
}, 100)

const scrollAnimationCleanup = ref(null)

const handleCardHover = (walkId, isHovered) => {
  if (!walkId || !cardRefs.value[walkId]) return
  
  if (isHovered) {
    animate(cardRefs.value[walkId], {
      scale: 1.02,
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
    }, { 
      duration: 0.3,
      easing: [.23, 1, .32, 1]
    })
  } else {
    animate(cardRefs.value[walkId], {
      scale: 1,
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
    }, { 
      duration: 0.2,
      easing: [.23, 1, .32, 1]
    })
  }
}

const handleCardPress = (walkId, isPressed) => {
  if (!walkId || !cardRefs.value[walkId]) return
  
  if (isPressed) {
    animate(cardRefs.value[walkId], {
      scale: 0.98
    }, { duration: 0.1 })
  } else {
    animate(cardRefs.value[walkId], {
      scale: 1
    }, { duration: 0.2 })
  }
}

// Remove touch interaction state
const touchState = ref({
  startX: 0,
  startY: 0,
  moveX: 0,
  moveY: 0,
  activeCard: null
})

const handleTouchStart = (event, walkId) => {
  if (!walkId) return
  const touch = event.touches[0]
  touchState.value = {
    startX: touch.clientX,
    startY: touch.clientY,
    moveX: touch.clientX,
    moveY: touch.clientY,
    activeCard: walkId
  }
}

// Remove handleTouchMove function

const handleTouchEnd = (walkId) => {
  if (!walkId || touchState.value.activeCard !== walkId) return
  
  // Spring back to original position using animate instead of useMotion
  if (cardRefs.value[walkId]) {
    animate(
      cardRefs.value[walkId],
      { 
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        y: 0
      },
      { 
        duration: 0.3,
        easing: [.23, 1, .32, 1]
      }
    )
  }
  
  touchState.value = {
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0,
    activeCard: null
  }
}

// Enhanced card hover handler with tilt effect
const scrollY = ref(0)
const scrollOffset = ref(0)

// Scroll handling for parallax and animation states
const handleScroll = debounce((e) => {
  const scroller = dynamicScroller.value
  if (!scroller?.continuous) return
  
  const newVisibleItems = new Set(
    scroller.continuous
      .filter(item => item?.data)
      .map(item => item.data.id)
  )
  
  visibleItems.value = newVisibleItems
}, 50) // Increased debounce to 50ms

// Animation presets for different elements
const getFloatingAnimation = (index, delay) => ({
  initial: { y: 0 },
  animate: {
    y: [-1, 1],
    transition: {
      duration: 2,
      delay: index * 0.05 + delay,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut'
    }
  }
})

const getPopAnimation = (index, delay) => ({
  initial: { scale: 0.9, opacity: 0 },
  enter: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 15,
      mass: 0.5,
      delay: index * 0.05 + delay
    }
  }
})

const getFadeAnimation = (index, delay) => ({
  initial: { opacity: 0, y: 10 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      delay: index * 0.05 + delay
    }
  }
})

// Refactor getCardStyle function to avoid direct manipulation of transform property
const getCardStyle = (walkId) => {
  const isHovered = hoverStates.value[walkId]
  return {
    willChange: 'transform, box-shadow',
    transform: isHovered ? 'translateZ(10px)' : 'none'
  }
}

// Track hover states
const hoverStates = ref({})

onMounted(() => {
  // Initialize hover states
  props.walks.forEach(walk => {
    hoverStates.value[walk.id] = false
  })
})

onMounted(() => {
  if (!window.ResizeObserver) {
    console.warn('ResizeObserver not available')
    return
  }
  
  // Initialize single ResizeObserver
  resizeObserver = new ResizeObserver(handleResize)
  
  const container = document.querySelector('.scroller')
  if (container) {
    resizeObserver.observe(container)
    // Debug element state
    const style = window.getComputedStyle(container)
    console.log('Container debug:', {
      pointerEvents: style.pointerEvents,
      zIndex: style.zIndex,
      position: style.position,
      overflow: style.overflow
    })

    // Check if any elements are overlapping the cards
    const cards = document.querySelectorAll('.walk-item')
    cards.forEach(card => {
      const rect = card.getBoundingClientRect()
      const elements = document.elementsFromPoint(rect.left + rect.width/2, rect.top + rect.height/2)
      console.log('Elements at card center:', elements.map(el => el.className))
    })
  }
})

// Watch for walk updates
watch(computedWalks, (newWalks) => {
  if (newWalks.length) {
    console.log("Walks updated:", newWalks.length)
  }
})

// Watch for changes and reattach gestures
watch([computedWalks, () => props.expandedWalkIds], () => {
  // Small delay to ensure DOM updates are complete
  setTimeout(() => {
    // Removed: attachGestures()
  }, 50)
}, { deep: true })

watch(() => computedWalks.value, (newWalks) => {
  if (newWalks?.length) {
    nextTick(() => {
      const scroller = document.querySelector('.scroller')
      if (scroller) {
        scroller.addEventListener('scroll', handleScroll)
      }
    })
  }
}, { immediate: true })

onMounted(() => {
  // Setup viewport detection
  stopViewTracking = inView(container.value, (info) => {
    animate(container.value, { 
      opacity: [0, 1],
      y: [20, 0]
    }, { 
      duration: 0.5,
      easing: [.23,1,.32,1]
    })

    return () => {
      animate(container.value, { 
        opacity: [1, 0],
        y: [0, 20]
      }, { duration: 0.3 })
    }
  })

  // Implement press gesture
  for (const walk of props.walks) {
    if (cardRefs.value[walk.id]) {
      press(cardRefs.value[walk.id], (element) => {
        handleCardPress(walk.id, true)
        return () => {
          handleCardPress(walk.id, false)
        }
      })
    }
  }

  nextTick(() => {
    const cards = document.querySelectorAll('.card-wrapper')
    cards.forEach((card, index) => {
      animate(
        card,
        { 
          opacity: [0, 1],
          y: [20, 0],
          scale: [0.95, 1]
        },
        { 
          duration: 0.5,
          delay: index * 0.1,
          easing: [.23, 1, .32, 1]
        }
      )
    })
  })
})

// Add scroll handling for parallax effect
onMounted(() => {
  // Setup scroll listener on dynamicScroller DOM element
  nextTick(() => {
    if (dynamicScroller.value?.$el) {
      dynamicScroller.value.$el.addEventListener('scroll', handleScroll, { passive: true })
    }
    // Force recalculation after initial render
    if (dynamicScroller.value && typeof dynamicScroller.value.updateSize === 'function') {
      dynamicScroller.value.updateSize()
    }
  })
})

onBeforeUnmount(() => {
  if (dynamicScroller.value?.$el) {
    dynamicScroller.value.$el.removeEventListener('scroll', handleScroll)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Debug logging for data state
watch(() => props.walks, (newWalks) => {
  console.debug('WalkList: props.walks updated:', {
    length: newWalks?.length ?? 0,
    hasInvalidItems: newWalks?.some(w => !w?.id || !w?.walk_name) ?? false
  })
}, { immediate: true, deep: true })

// Added helper to reliably register card elements
const setCardRef = (id) => (el) => {
  cardRefs.value[id] = el
}

// Replace the problematic resize observer code with simpler initialization
onMounted(() => {
  if (!window.ResizeObserver) return
  
  resizeObserver = new ResizeObserver(() => {
    if (dynamicScroller.value) {
      const scroller = dynamicScroller.value
      if (typeof scroller.updateSize === 'function') {
        scroller.updateSize()
      }
    }
  })
  
  if (container.value) {
    resizeObserver.observe(container.value)
  }
})

// Clean up old size observers and handlers
onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Add new refs for scroll animations
const scrollItemRefs = ref({})
let scrollObserver = null

// Add ref to track cleanup functions
const inViewCleanupFns = ref(new Map())

// Replace the entire setScrollItemRef implementation with this version
const setScrollItemRef = (el, id) => {
  if (!el || typeof el !== 'object') return

  // Use WeakMap instead of reactive refs to store animation states
  if (!animationState.has(el)) {
    // Set initial styles without triggering reactivity
    el.style.setProperty('opacity', '0.01')
    el.style.setProperty('transform', 'translateY(20px) scale(0.95)')
    
    const cleanup = inView(el, (element) => {
      if (!element || !element.isConnected || animationState.has(element)) return
      
      // Mark as animated
      animationState.set(element, true)
      
      // Run animation outside Vue's reactivity system
      requestAnimationFrame(() => {
        animate(
          element,
          { 
            opacity: [0, 1],
            y: [20, 0],
            scale: [0.95, 1]
          },
          { 
            duration: 0.6,
            easing: [.23, 1, .32, 1],
            delay: 0.15
          }
        )
      })
    }, { 
      root: dynamicScroller.value?.$el,
      amount: 0.3,
      margin: '50px',
      once: true // Only trigger once per element
    })

    // Store cleanup in WeakMap to avoid reactive updates
    if (inViewCleanupFns.value) {
      inViewCleanupFns.value.set(id, cleanup)
    }
  }
}

// Update cleanup on unmount
onBeforeUnmount(() => {
  // Clean up all inView observers
  inViewCleanupFns.value.forEach(cleanup => cleanup())
  inViewCleanupFns.value.clear()
  
  // ...existing cleanup code...
})

</script>

<style>
.card-wrapper {
  opacity: 0.01;
  transform: translateY(20px) scale(0.95);
  will-change: transform, opacity;
  transition: none; /* Ensure no CSS transitions interfere */
  contain: content; /* Add content containment */
}

.card-wrapper.animated {
  opacity: 1;
  transform: none;
}
</style>
