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
          enter-active-class="transition-all duration-300 ease-linear"
          enter-from-class="opacity-0 -translate-x-8"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition-all duration-300 ease-linear absolute"
          leave-from-class="opacity-100 translate-x-0"
          leave-to-class="opacity-0 -translate-x-8"
          move-class="transition-all duration-300 ease-linear"
        >
          <div 
            v-for="walk in computedWalks" 
            :key="walk.id"
            class="bg-white rounded-lg border border-gray-200 shadow-sm walk-item relative"
            :class="{ 
              'border-blue-500 bg-blue-50 shadow-md': selectedWalkId === walk.id,
              'pointer-events-none': isCardExpanding
            }"
            @click="handleWalkClick(walk)"
            :data-walk-id="walk.id"
            :data-expanded="walk.isExpanded"
          >
            <div class="p-4">
              <!-- Header with walk name, badges & favorite button -->
              <div class="flex justify-between items-center mb-2">
                <div>
                  <h3 class="text-lg font-semibold">{{ walk.walk_name }}</h3>
                  <div class="flex space-x-2">
                    <span v-if="walk.difficulty" class="text-xs uppercase font-bold text-gray-700">
                      {{ walk.difficulty }}
                    </span>
                    <span v-if="walk.duration" class="text-xs uppercase font-bold text-gray-700">
                      {{ walk.duration }}
                    </span>
                  </div>
                </div>
                <button @click.stop="toggleFavorite(walk)" class="favorite-btn p-1 rounded-full hover:bg-gray-100">
                  <iconify-icon :icon="isFavorite(walk) ? 'mdi:heart' : 'mdi:heart-outline'" class="w-5 h-5 text-red-500"></iconify-icon>
                </button>
              </div>
              
              <p class="text-sm text-gray-600">{{ walk.highlights }}</p>
              
              <!-- Debug info -->
              <div class="text-xs text-gray-400 mt-1">
                ID: {{ walk.id }} | Expanded: {{ walk.isExpanded }}
              </div>
              
              <!-- Additional details displayed when expanded -->
              <Transition 
                @before-enter="beforeEnter"
                @enter="enter"
                @after-enter="afterEnter"
                @before-leave="beforeLeave"
                @leave="leave"
                @after-leave="afterLeave"
              >
                <div 
                  v-show="walk.isExpanded" 
                  class="mt-4 border-t pt-2 transition-all duration-300 ease-out"
                >
                  <!-- Detailed info row with staggered animation -->
                  <div class="flex justify-between items-center text-sm mb-2 transition-all duration-300 delay-75">
                    <span class="transition-all duration-300 delay-100">Distance: {{ convertToMiles(walk.distance) }} miles</span>
                    <span class="transition-all duration-300 delay-150">Steepness: {{ walk.steepness_level }}</span>
                  </div>
                  <!-- Expandable content with staggered animations -->
                  <div class="space-y-2">
                    <div class="highlights-description text-sm transition-all duration-300 delay-200">
                      <p>{{ walk.description }}</p>
                    </div>
                    <div class="points-of-interest text-sm transition-all duration-300 delay-300">
                      <p><strong>Points of Interest:</strong> {{ walk.pointsOfInterest || 'N/A' }}</p>
                    </div>
                    <div class="pubs-list text-sm transition-all duration-300 delay-[400ms]">
                      <p><strong>Pubs:</strong> {{ walk.pubs?.join(', ') || 'N/A' }}</p>
                    </div>
                    <div class="trail-considerations text-sm transition-all duration-300 delay-[500ms]">
                      <p><strong>Trail Considerations:</strong> {{ walk.trailConsiderations || 'N/A' }}</p>
                    </div>
                  </div>
                </div>
              </Transition>
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
import isEqual from 'lodash.isequal'
import { animate, scroll, inView, hover, press } from 'motion'
import { useViewportAnimation } from '../composables/useViewportAnimation'

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

// Animation state
const isCardExpanding = ref(false)
const revealedCards = ref(new Set())
const gestureCleanup = ref([])

// Loading and UI state
const loading = computed(() => walksStore.loading)
const containerHeight = ref(0)
const firstItemHeight = ref(0)
const scroller = ref(null)
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
  
  console.debug("WalkList.vue: Raw Data:", {
    walks: rawWalks,
    expandedIds,
    selectedId: props.selectedWalkId
  })
  
  const filteredWalks = rawWalks
    .filter(walk => walk?.id && walk?.walk_name)
    .map(walk => {
      const isExpanded = expandedIds.includes(walk.id)
      console.debug(`Walk ${walk.id} expanded state:`, isExpanded)
      
      return {
        ...walk,
        isExpanded,
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
      }
    })
  
  console.debug("WalkList.vue: Processed walks:", {
    total: filteredWalks.length,
    expanded: filteredWalks.filter(w => w.isExpanded).length,
    walks: filteredWalks.map(w => ({
      id: w.id,
      name: w.walk_name,
      isExpanded: w.isExpanded
    }))
  })
  
  return filteredWalks
})

// Enhanced card expansion animation with proper state management
const handleWalkClick = async (walk) => {
  if (!walk || isCardExpanding.value) return
  
  const card = document.querySelector(`[data-walk-id="${walk.id}"]`)
  if (!card || card.classList.contains('pointer-events-none')) return
  
  isCardExpanding.value = true
  const wasSelected = props.selectedWalkId === walk.id
  const wasExpanded = props.expandedWalkIds.includes(walk.id)
  
  try {
    // Clear any ongoing animations by resetting gesture state
    if (gestureState.value[walk.id]) {
      gestureState.value[walk.id].isHovered = false
      gestureState.value[walk.id].isPressed = false
    }
    
    // Emit events
    emit('walk-selected', wasSelected ? null : walk)
    emit('walk-expanded', { 
      walkId: walk.id, 
      expanded: !wasExpanded 
    })
    
    // Animate with priority over gestures
    await animate(card, {
      scale: wasSelected ? [1.02, 1] : [1, 1.02],
      y: wasSelected ? [-4, 0] : [0, -4],
      backgroundColor: wasSelected 
        ? ['rgb(239, 246, 255)', 'rgb(255, 255, 255)']
        : ['rgb(255, 255, 255)', 'rgb(239, 246, 255)'],
      borderColor: wasSelected
        ? ['rgb(59, 130, 246)', 'rgb(229, 231, 235)']
        : ['rgb(229, 231, 235)', 'rgb(59, 130, 246)']
    }, {
      duration: 0.3,
      easing: [0.2, 0.8, 0.2, 1]
    })
  } finally {
    // Re-enable gestures
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
      duration: 0.2,
      easing: 'easeOutQuad'
    })
  } else {
    await animate(card, {
      opacity: [0, 1],
      y: [15, 0],
      scale: [0.97, 1]
    }, {
      duration: 0.3,
      easing: 'easeOutQuad'
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
        duration: 0.3,
        easing: 'easeOutQuart'
      }],
      [content.querySelectorAll('img, .category-tag, p'), {
        opacity: [0, 1],
        y: [20, 0],
        scale: [0.9, 1]
      }, {
        duration: 0.25,
        delay: window.Motion.stagger(0.05, { start: 0.1 }),
        easing: 'easeOutCubic'
      }],
      [title, {
        opacity: [0, 1],
        y: [-30, 0],
        scale: [0.9, 1]
      }, {
        duration: 0.3,
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
        duration: 0.2,
        delay: window.Motion.stagger(0.04),
        easing: 'easeInCubic'
      }],
      [title, {
        opacity: [1, 0],
        y: [0, -20],
        scale: [1, 0.95]
      }, {
        duration: 0.2,
        easing: 'easeInCubic',
        at: "<"
      }],
      [content, {
        height: 0,
        opacity: 0,
        margin: 0,
        scale: 0.95
      }, {
        duration: 0.2,
        easing: 'easeInCubic',
        at: "<"
      }]
    ]);
    content.style.display = 'none';
  }
}

// Transition hooks for dynamic height animation
const beforeEnter = (el) => {
  el.style.overflow = 'hidden'
  el.style.maxHeight = '0px'
  el.style.opacity = '0'
  el.style.transform = 'translateY(-10px)'
}

const enter = (el, done) => {
  nextTick(() => {
    const height = el.scrollHeight
    animate(el, {
      maxHeight: [0, height],
      opacity: [0, 1],
      y: [-10, 0]
    }, {
      duration: 0.5,
      easing: [0.4, 0, 0.2, 1],
      onComplete: done
    })
  })
}

const afterEnter = (el) => {
  el.style.overflow = ''
  el.style.maxHeight = ''
  el.style.opacity = ''
  el.style.transform = ''
}

const beforeLeave = (el) => {
  el.style.overflow = 'hidden'
  el.style.maxHeight = `${el.scrollHeight}px`
  el.style.opacity = '1'
}

const leave = (el, done) => {
  animate(el, {
    maxHeight: 0,
    opacity: [1, 0],
    y: [0, -10]
  }, {
    duration: 0.3,
    easing: [0.4, 0, 0.2, 1],
    onComplete: done
  })
}

const afterLeave = (el) => {
  el.style.overflow = ''
  el.style.maxHeight = ''
  el.style.opacity = ''
  el.style.transform = ''
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

// Add animation state tracking
const gestureState = ref({})

// Add debounced animation handler
const handleCardAnimation = debounce((card, cardId) => {
  if (!isCardExpanding.value && !card.classList.contains('pointer-events-none')) {
    const animation = getCombinedAnimation(cardId)
    if (animation) {
      animate(card, animation.props, animation.options)
    }
  }
}, 16) // Roughly 60fps

// Add helper for getting combined animation state
const getCombinedAnimation = (cardId) => {
  const state = gestureState.value[cardId]
  if (!state) return null

  // Priority: pressed > hovered > default
  if (state.isPressed) {
    return {
      props: { 
        scale: 0.98,
        backgroundColor: 'rgb(243, 244, 246)',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
      },
      options: { 
        duration: 0.1,
        easing: 'ease-in'
      }
    }
  }
  
  if (state.isHovered) {
    return {
      props: { 
        scale: 1.02,
        y: -4,
        backgroundColor: 'rgb(239, 246, 255)',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
      },
      options: { 
        duration: 0.2,
        easing: [0.34, 1.56, 0.64, 1]
      }
    }
  }

  return {
    props: { 
      scale: 1,
      y: 0,
      backgroundColor: 'rgb(255, 255, 255)',
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
    },
    options: { 
      duration: 0.2,
      easing: 'ease-out'
    }
  }
}

const attachGestures = () => {
  // Clean up any existing gestures first
  gestureCleanup.value.forEach(cleanup => cleanup?.())
  gestureCleanup.value = []

  // Find all cards and attach new gestures
  const cards = document.querySelectorAll('.walk-item')
  cards.forEach(card => {
    const cardId = card.dataset.walkId
    gestureState.value[cardId] = { isHovered: false, isPressed: false }

    const hoverCleanup = hover(card, () => {
      if (gestureState.value[cardId]) {
        gestureState.value[cardId].isHovered = true
        handleCardAnimation(card, cardId)
      }

      return () => {
        if (gestureState.value[cardId]) {
          gestureState.value[cardId].isHovered = false
          handleCardAnimation(card, cardId)
        }
      }
    })

    const pressCleanup = press(card, () => {
      if (gestureState.value[cardId]) {
        gestureState.value[cardId].isPressed = true
        handleCardAnimation(card, cardId)
      }

      return (_, { success }) => {
        if (gestureState.value[cardId]) {
          gestureState.value[cardId].isPressed = false
          handleCardAnimation(card, cardId)
        }
      }
    })

    gestureCleanup.value.push(hoverCleanup, pressCleanup)
  })
}

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

  // Initialize scroll animations for cards with improved reactive inView
  const cards = document.querySelectorAll('.walk-item')
  cards.forEach(card => {
    const stopTracking = inView(card, (element, entry) => {
      // Use intersectionRatio to compute a dynamic delay; the more visible, the shorter the delay
      const delay = (1 - entry.intersectionRatio) * 0.2
      animate(element, { 
        opacity: [0, 1],
        y: [20, 0],
        scale: [0.95, 1]
      }, { 
        delay,
        duration: 0.5,
        easing: [0.2, 0.8, 0.2, 1]
      })
      return () => {
        animate(element, { 
          opacity: 0,
          y: 20,
          scale: 0.95
        })
      }
    }, {
      threshold: [0, 0.25, 0.5, 0.75, 1] // More reactive threshold values
    })
    if (!scrollAnimationCleanup.value) {
      scrollAnimationCleanup.value = []
    }
    scrollAnimationCleanup.value.push(stopTracking)
  })

  // Initialize gestures
  nextTick(() => {
    attachGestures()
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

  // Clean up Motion gestures
  gestureCleanup.value.forEach(cleanup => cleanup?.())

  // Cleanup for gesture state when component unmounts
  gestureState.value = {}
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

// Watch for changes in the computed walks to reattach gestures
watch(computedWalks, () => {
  nextTick(() => {
    attachGestures()
  })
}, { flush: 'post' })

// Watch for changes to expandedWalkIds
watch(() => props.expandedWalkIds, (newIds, oldIds) => {
  if (!isEqual(newIds, oldIds)) {
    console.debug("WalkList.vue: expandedWalkIds changed:", { 
      new: newIds, 
      old: oldIds 
    })
    // Force a re-computation of walks
    nextTick(() => {
      logDimensions('expansion-change')
    })
  }
}, { deep: true })

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
/* Only keeping styles that might be needed for other purposes */
.walk-list-leave-active {
  position: absolute;
}
</style>
