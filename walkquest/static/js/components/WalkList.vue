<template>
  <div class="walk-list" ref="listContainer">
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div 
      v-if="computedWalks.length"
      :style="{
        height: `${containerHeight}px`,
        width: 'calc(100% - 2px)', 
        position: 'relative',
        overflow: 'auto'
      }"
      ref="scrollElement"
      class="walk-list-container"
    >
      <div
        :style="{
          height: `${totalSize}px`,
          width: 'calc(100% - 1rem)', 
          position: 'relative'
        }"
      >
        <template v-if="virtualRows.length">
          <div
            v-for="virtualRow in virtualRows"
            :key="virtualRow.key"
            :data-index="virtualRow.index"
            :data-walk-id="computedWalks[virtualRow.index]?.id"
            class="virtual-row"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 'calc(100% - 1rem)', 
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }"
          >
            <div 
              v-if="computedWalks[virtualRow.index]"
              :class="{
                'walk-item': true,
                'is-expanded': computedWalks[virtualRow.index]?.isExpanded,
                'is-selected': selectedWalkId === computedWalks[virtualRow.index]?.id
              }"
              @click="handleWalkClick(computedWalks[virtualRow.index])"
            >
              <div class="walk-header">
                <h3 class="text-lg font-semibold">{{ computedWalks[virtualRow.index]?.walk_name }}</h3>
                <div class="walk-badges">
                  <span 
                    :class="getBadgeInfo(computedWalks[virtualRow.index]?.steepness_level)?.color"
                    class="badge"
                  >
                    {{ getBadgeInfo(computedWalks[virtualRow.index]?.steepness_level)?.icon }}
                    {{ computedWalks[virtualRow.index]?.steepness_level }}
                  </span>
                </div>
              </div>

              <div class="walk-content">
                <p class="text-sm text-gray-600">{{ computedWalks[virtualRow.index]?.highlights }}</p>
                <Transition name="expand">
                  <div v-if="computedWalks[virtualRow.index]?.isExpanded" class="walk-details">
                    <div v-if="computedWalks[virtualRow.index]?.pubs_list?.length" class="pubs-list">
                      <h4 class="font-medium mb-2">Pubs Along Route:</h4>
                      <ul class="space-y-1">
                        <li v-for="pub in computedWalks[virtualRow.index]?.pubs_list" :key="pub.id">
                          {{ pub.name }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </Transition>
              </div>

              <div class="walk-actions">
                <button
                  @click.stop="toggleExpand(computedWalks[virtualRow.index])"
                  class="action-button"
                >
                  {{ computedWalks[virtualRow.index]?.isExpanded ? 'Show Less' : 'Show More' }}
                </button>
                <button
                  @click.stop="selectWalk(computedWalks[virtualRow.index])"
                  class="action-button primary"
                >
                  View on Map
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-else class="no-walks-message">
      No walks available
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, shallowRef } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { getBadgeInfo } from '../utils/helpers'
import { animate } from 'motion'

// Props
const props = defineProps({
  error: { type: String, default: null },
  walks: { 
    type: Array, 
    default: () => [],
    validator: (value) => Array.isArray(value)
  }
})

// Emits
const emit = defineEmits(['walk-selected'])

// Store access
const walksStore = useWalksStore()
const uiStore = useUiStore()

// Refs
const listContainer = ref(null)
const scrollElement = ref(null)
const virtualizer = ref(null)
const resizeObserver = ref(null)

// Computed
const containerHeight = computed(() => window.innerHeight - 200)
const selectedWalkId = computed(() => walksStore.selectedWalk?.id)

const computedWalks = computed(() => {
  const walks = props.walks?.length ? props.walks : []
  console.log('Computing walks:', walks.length)
  return walks
})

// Virtual list setup
const rowHeight = 200 // Base height as per .clinerules
const overscan = 10 // Increased for smoother scrolling

// Create virtualizer with safe initialization
const createVirtualizer = () => {
  if (!scrollElement.value || !computedWalks.value?.length) {
    console.warn('Virtualizer initialization skipped: missing requirements')
    return null
  }

  try {
    return useVirtualizer({
      count: computedWalks.value.length,
      getScrollElement: () => scrollElement.value,
      estimateSize: () => rowHeight,
      overscan,
      getItemKey: (index) => computedWalks.value[index]?.id || index,
      scrollPaddingStart: 150,
      scrollPaddingEnd: 150,
      debug: true,
      initialRect: { 
        width: scrollElement.value?.clientWidth ?? 0, 
        height: containerHeight.value 
      }
    })
  } catch (error) {
    console.error('Virtualizer creation error:', error)
    return null
  }
}

// Computed values from virtualizer
const virtualRows = computed(() => {
  if (!virtualizer.value) return [] 
  try {
    const items = virtualizer.value.getVirtualItems()
    console.log('Virtual rows computed:', items?.length)
    return items
  } catch (error) {
    console.error('Error getting virtual items:', error)
    return []
  }
})

const totalSize = computed(() => {
  if (!virtualizer.value) return 0
  try {
    const size = virtualizer.value.getTotalSize?.() ?? rowHeight * (computedWalks.value?.length || 0)
    console.log('Total size computed:', size, 'from rows:', computedWalks.value?.length)
    return size
  } catch (error) {
    console.error('Error computing total size:', error)
    return rowHeight * (computedWalks.value?.length || 0)
  }
})

// Methods
const handleWalkClick = (walk) => {
  if (!walk) return
  if (selectedWalkId.value === walk.id) {
    walksStore.setSelectedWalk(null)
  } else {
    selectWalk(walk)
  }
}

const selectWalk = async (walk) => {
  if (!walk) return
  
  const card = document.querySelector(`[data-walk-id="${walk.id}"]`)
  if (card) {
    await animate(card, 
      { scale: [1, 1.02, 1] },
      { duration: 0.3, easing: [0.2, 0.8, 0.2, 1] }
    )
  }

  walksStore.setSelectedWalk(walk)
  uiStore.setSidebarVisibility(true)
  emit('walk-selected', walk)
  scrollToWalk(walk.id)
}

const toggleExpand = async (walk) => {
  if (!walk) return
  walksStore.expandWalk(walk.id)
  await nextTick()
  try {
    virtualizer.value?.measure?.()
  } catch (error) {
    console.error('Error measuring virtualizer:', error)
  }
}

const scrollToWalk = (walkId) => {
  if (!virtualizer.value) return
  const index = computedWalks.value.findIndex(w => w.id === walkId)
  if (index !== -1) {
    try {
      virtualizer.value.scrollToIndex(index, { align: 'center', behavior: 'smooth' })
    } catch (error) {
      console.error('Error scrolling to walk:', error)
    }
  }
}

// Handle resize
const handleResize = () => {
  if (!virtualizer.value || !scrollElement.value) return
  
  try {
    virtualizer.value.measure()
  } catch (error) {
    console.error('Error measuring virtualizer:', error)
  }
}

// Lifecycle
const watchStop = watch(() => computedWalks.value?.length, (newLength) => {
  if (newLength > 0) {
    if (!virtualizer.value) {
      virtualizer.value = createVirtualizer()
    }
    
    // Ensure virtualizer is updated with new count
    nextTick(() => {
      try {
        virtualizer.value?.setCount?.(newLength)
        virtualizer.value?.measure?.()
      } catch (error) {
        console.error('Error updating virtualizer:', error)
      }
    })
  }
}, { immediate: true })

onMounted(() => {
  if (computedWalks.value?.length > 0) {
    // Set up resize observer
    resizeObserver.value = new ResizeObserver(handleResize)
    if (scrollElement.value) {
      resizeObserver.value.observe(scrollElement.value)
    }
    
    // Initial measure
    nextTick(handleResize)
    nextTick(() => {
      if (!virtualizer.value) {
        virtualizer.value = createVirtualizer()
        try {
          virtualizer.value?.measure?.()
        } catch (error) {
          console.error('Error measuring virtualizer on mount:', error)
        }
      }
    })
  }
})

onBeforeUnmount(() => {
  // Clean up
  try {
    virtualizer.value?.scrollToIndex?.(0)
    if (resizeObserver.value) {
      resizeObserver.value.disconnect()
      resizeObserver.value = null
    }
    
    // Stop the watch
    watchStop()
    
    // Nullify virtualizer
    virtualizer.value = null
  } catch (error) {
    console.error('Cleanup error:', error)
  }
})
</script>

<style scoped>
/* Existing styles remain the same */
</style>
