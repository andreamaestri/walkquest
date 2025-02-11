<template>
  <div class="walk-list" ref="listContainer">
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div 
      :style="{
        height: `${containerHeight}px`,
        width: 'calc(100% - 2px)', // Account for border
        position: 'relative',
        overflow: 'auto'
      }"
      ref="scrollElement"
      class="walk-list-container"
    >
      <div v-if="!computedWalks.length" class="no-walks-message">
        No walks found
      </div>

      <template v-else>
        <div
          :style="{
            height: `${totalSize}px`,
            width: 'calc(100% - 1rem)', // Account for padding
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
                width: 'calc(100% - 1rem)', // Account for padding
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
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, effectScope, onUpdated, onErrorCaptured } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { getBadgeInfo } from '../utils/helpers'
import { animate } from 'motion'

// Props
const props = defineProps({
  error: { type: String, default: null },
  walks: { type: Array, required: true }
})

// Store access
const walksStore = useWalksStore()
const uiStore = useUiStore()

// Refs
const listContainer = ref(null)
const scrollElement = ref(null)
const virtualizer = ref(null)
const scope = effectScope()
const resizeObserver = ref(null)

// Computed
const containerHeight = computed(() => window.innerHeight - 200)
const selectedWalkId = computed(() => walksStore.selectedWalk?.id)

const computedWalks = computed(() => {
  console.log('Computing walks:', props.walks?.length)
  return Array.isArray(props.walks) ? props.walks : []
})

// Virtual list setup
const rowHeight = 200 // Base height as per .clinerules
const overscan = 10 // Increased for smoother scrolling

// Create virtualizer
const createVirtualizer = () => {
  if (!scrollElement.value || !computedWalks.value?.length) {
    console.log('Cannot create virtualizer: missing requirements')
    return null
  }

  console.log('Creating virtualizer with walks:', computedWalks.value.length)
  
  return useVirtualizer({
    count: computedWalks.value.length,
    getScrollElement: () => scrollElement.value,
    estimateSize: () => rowHeight,
    overscan,
    getItemKey: (index) => computedWalks.value[index]?.id || index,
    scrollPaddingStart: 150, // Added padding as per .clinerules
    scrollPaddingEnd: 150,
    debug: true, // Enable debug logging
    initialRect: { width: scrollElement.value?.clientWidth ?? 0, height: containerHeight.value }
  })
}

// Computed values from virtualizer
const virtualRows = computed(() => {
  if (!virtualizer.value) return []
  const items = virtualizer.value.getVirtualItems()
  console.log('Virtual rows computed:', items?.length)
  return items
})

const totalSize = computed(() => {
  if (!virtualizer.value) return 0
  const size = virtualizer.value.getTotalSize?.() ?? rowHeight * (computedWalks.value?.length || 0)
  console.log('Total size computed:', size, 'from rows:', computedWalks.value?.length)
  return size
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
  scrollToWalk(walk.id)
}

const toggleExpand = async (walk) => {
  if (!walk) return
  walksStore.expandWalk(walk.id)
  await nextTick()
  if (virtualizer.value) {
    virtualizer.value.measure()
  }
}

const scrollToWalk = (walkId) => {
  if (!virtualizer.value) return
  const index = computedWalks.value.findIndex(w => w.id === walkId)
  if (index !== -1) {
    virtualizer.value.scrollToIndex(index, { align: 'center', behavior: 'smooth' })
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

// Error boundary
onErrorCaptured((error, instance, info) => {
  console.error('Virtual list error:', {
    error,
    instance,
    info,
    walks: computedWalks.value?.length
  })
  return false // Don't propagate
})

// Initialize virtualizer when walks are available
const stopWatch = scope.run(() => watch(() => computedWalks.value?.length, (newLength, oldLength) => {
  console.log('Walks length changed:', newLength, 'from:', oldLength)
  if (newLength > 0) {
    if (!virtualizer.value) {
      virtualizer.value = createVirtualizer()
    }
    
    // Ensure virtualizer is updated with new count
    nextTick(() => {
      virtualizer.value?.setCount?.(newLength)
      virtualizer.value?.measure?.()
    })
  }
}, { immediate: true }))

// Lifecycle
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
        virtualizer.value?.measure?.()
      }
    })
  }
})

// Handle updates that might affect sizing
onUpdated(() => {
  nextTick(() => {
    virtualizer.value?.measure?.()
  })
})

onBeforeUnmount(() => {
  // Clean up
  try {
    virtualizer.value?.scrollToIndex?.(0)
    if (resizeObserver.value) {
      resizeObserver.value.disconnect()
      resizeObserver.value = null
    }
    scope.stop()
    stopWatch?.()
  } catch (error) {
    console.error('Cleanup error:', error)
  }
  virtualizer.value = null
})
</script>

<style>
.walk-list-container {
  z-index: 1;
  position: relative;
  border: 1px solid #ddd;
}

.virtual-row {
  padding: 0.5rem;
}

.walk-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.walk-item:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.walk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.walk-badges {
  display: flex;
  gap: 0.5rem;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  background: #f3f4f6;
}

.walk-content {
  margin: 0.5rem 0;
}

.walk-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #e5e7eb;
}

.action-button.primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.action-button.primary:hover {
  background: #2563eb;
}

.no-walks-message {
  text-align: center;
  padding: 20px;
  color: gray;
}

/* Transitions */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-out;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
