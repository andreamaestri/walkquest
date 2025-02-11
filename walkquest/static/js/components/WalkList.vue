<template>
  <div class="walk-list debug-bg">
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-placeholder" v-for="i in 3" :key="i">
        <div class="animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>

    <div v-else-if="computedWalks.length" class="walk-list-container debug-border">
      <DynamicScroller
        ref="scroller"
        class="scroller debug-border"
        :items="computedWalks"
        :min-item-size="minItemHeight"
        key-field="id"
      >
        <template #default="{ item: walk, index, active }">
          <DynamicScrollerItem
            :item="walk"
            :active="active"
            :data-index="index"
            :size-dependencies="[
              walk.isExpanded,
              walk.walk_name,
              walk.highlights,
              walk.pubs_list?.length
            ]"
          >
            <div 
              :class="{
                'walk-item': true,
                'is-expanded': walk.isExpanded,
                'is-selected': selectedWalkId === walk.id
              }"
              @click="handleWalkClick(walk)"
            >
              <div class="walk-header">
                <h3 class="text-lg font-semibold">{{ walk.walk_name }}</h3>
                <div class="walk-badges">
                  <span 
                    v-if="walk.steepness_level"
                    :class="getBadgeInfo(walk.steepness_level)?.color"
                    class="badge"
                  >
                    {{ walk.steepness_level }}
                  </span>
                </div>
              </div>

              <div class="walk-content">
                <p class="text-sm text-gray-600">{{ walk.highlights }}</p>
                
                <div v-if="walk.isExpanded" class="walk-details mt-4">
                  <div v-if="walk.pubs_list?.length">
                    <h4 class="font-medium mb-2">Pubs Along Route:</h4>
                    <ul class="space-y-1">
                      <li v-for="pub in walk.pubs_list" :key="pub.id">
                        {{ pub.name }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div class="walk-actions">
                <button
                  @click.stop="toggleExpand(walk)"
                  class="action-button"
                >
                  {{ walk.isExpanded ? 'Show Less' : 'Show More' }}
                </button>
                <button
                  @click.stop="selectWalk(walk)"
                  class="action-button primary"
                >
                  View on Map
                </button>
              </div>
            </div>
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>
    </div>

    <div v-else class="no-walks-message">
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

// Add ResizeObserver for RecycleScroller
const scroller = ref(null)
let resizeObserver = null

// Enhanced dimension logging
const logDimensions = (event = 'check') => {
  const walkList = document.querySelector('.walk-list')
  const container = document.querySelector('.walk-list-container')
  const scroller = document.querySelector('.scroller')
  
  console.debug('WalkList dimensions:', {
    event,
    walkList: {
      height: walkList?.offsetHeight,
      rect: walkList?.getBoundingClientRect(),
      style: walkList?.style.height
    },
    container: {
      height: container?.offsetHeight,
      rect: container?.getBoundingClientRect(),
      style: container?.style.height
    },
    scroller: {
      height: scroller?.offsetHeight,
      rect: scroller?.getBoundingClientRect(),
      style: scroller?.style.height
    },
    computedWalksLength: computedWalks.value?.length,
    firstWalkHeight: document.querySelector('.walk-item')?.offsetHeight
  })
}

// Handle scroller resize
const handleScrollerResize = () => {
  logDimensions('resize')
}

onMounted(() => {
  if (!window.ResizeObserver) {
    console.warn('ResizeObserver not available')
    return
  }
  
  resizeObserver = new ResizeObserver(debounce(() => {
    if (scroller.value?.$el) {
      nextTick(() => {
        // Call updateSize on the RecycleScroller instance
        scroller.value.updateSize?.()
      })
    }
  }, 100))
  
  if (scroller.value?.$el) {
    resizeObserver.observe(scroller.value.$el)
  }

  nextTick(() => {
    logDimensions('mounted')
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
</script>

<style scoped>
.walk-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.walk-list-container {
  flex: 1;
  min-height: 0; /* Important for Firefox */
  position: relative;
  display: flex;
  flex-direction: column;
}

.scroller {
  height: 100% !important;
  overflow-y: auto !important;
}

.walk-item {
  box-sizing: border-box;
  margin: 0.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.walk-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.walk-item.is-selected {
  border-color: #3b82f6;
  background: #f0f7ff;
}

.walk-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.walk-badges {
  display: flex;
  gap: 0.5rem;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.walk-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #e5e7eb;
}

.action-button.primary {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.action-button.primary:hover {
  background: #2563eb;
}

.error-message {
  padding: 1rem;
  margin: 1rem;
  background: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 0.375rem;
  color: #b91c1c;
}

.no-walks-message {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

/* Transitions */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-out;
  max-height: 300px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.loading-state {
  padding: 1rem;
}

.loading-placeholder {
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Debug styles */
.debug-bg {
  background: rgba(245, 245, 245, 0.5) !important;
}

.debug-border {
  border: 2px dashed rgba(255, 0, 0, 0.5) !important;
}
</style>
