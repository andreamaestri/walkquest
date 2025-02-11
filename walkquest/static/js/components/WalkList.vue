<template>
  <div class="walk-list" ref="listContainer">
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div 
      :style="{
        height: `${containerHeight}px`,
        width: '100%',
        position: 'relative',
        overflow: 'auto'
      }"
      ref="scrollElement"
      class="walk-list-container"
    >
      <div
        :style="{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }"
      >
        <div
          v-for="virtualRow in virtualRows"
          :key="virtualRow.key"
          :data-walk-id="walks[virtualRow.index].id"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }"
        >
          <div 
            :class="{
              'walk-item revealed': true, // Always add revealed class
              'is-expanded': walks[virtualRow.index].isExpanded,
              'is-selected': selectedWalkId === walks[virtualRow.index].id
            }"
            @click="handleWalkClick(walks[virtualRow.index])"
          >
            <div class="walk-header">
              <h3 class="text-lg font-semibold">{{ walks[virtualRow.index].walk_name }}</h3>
              <div class="walk-badges">
                <span 
                  :class="getBadgeInfo(walks[virtualRow.index].steepness_level).color"
                  class="badge"
                >
                  {{ getBadgeInfo(walks[virtualRow.index].steepness_level).icon }}
                  {{ walks[virtualRow.index].steepness_level }}
                </span>
              </div>
            </div>

            <div class="walk-content">
              <p class="text-sm text-gray-600">{{ walks[virtualRow.index].highlights }}</p>
              <Transition name="expand">
                <div v-if="walks[virtualRow.index].isExpanded" class="walk-details">
                  <div v-if="walks[virtualRow.index].pubs_list?.length" class="pubs-list">
                    <h4 class="font-medium mb-2">Pubs Along Route:</h4>
                    <ul class="space-y-1">
                      <li v-for="pub in walks[virtualRow.index].pubs_list" :key="pub.id">
                        {{ pub.name }}
                      </li>
                    </ul>
                  </div>
                </div>
              </Transition>
            </div>

            <div class="walk-actions">
              <button
                @click.stop="toggleExpand(walks[virtualRow.index])"
                class="action-button"
              >
                {{ walks[virtualRow.index].isExpanded ? 'Show Less' : 'Show More' }}
              </button>
              <button
                @click.stop="selectWalk(walks[virtualRow.index])"
                class="action-button primary"
              >
                View on Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { getBadgeInfo } from '../utils/helpers'
import { animate } from 'motion'

const props = defineProps({
  error: {
    type: String,
    default: null
  }
})

const listContainer = ref(null)
const scrollElement = ref(null)
const containerHeight = computed(() => window.innerHeight - 200) // Dynamic height based on viewport
const rowHeight = 200 // Estimated height for each walk item

const walksStore = useWalksStore()
const uiStore = useUiStore()

const walks = computed(() => walksStore.walks)
const selectedWalkId = computed(() => walksStore.selectedWalk?.id)

const virtualizer = useVirtualizer({
  count: computed(() => walks.value.length),
  getScrollElement: () => scrollElement.value,
  estimateSize: () => rowHeight,
  overscan: 5
})

const virtualRows = computed(() => virtualizer.virtualItems)

const handleWalkClick = (walk) => {
  if (selectedWalkId.value === walk.id) {
    walksStore.setSelectedWalk(null)
  } else {
    selectWalk(walk)
  }
}

const selectWalk = async (walk) => {
  const card = document.querySelector(`[data-walk-id="${walk.id}"]`)
  if (card) {
    await animate(card, 
      { scale: [1, 1.02, 1] },
      { duration: 0.3, easing: [0.2, 0.8, 0.2, 1] }
    )
  }

  walksStore.setSelectedWalk(walk)
  uiStore.showSidebar = true
  scrollToWalk(walk.id)
}

const toggleExpand = async (walk) => {
  walksStore.expandWalk(walk.id)
  
  await nextTick()
}

const scrollToWalk = (walkId) => {
  const index = walks.value.findIndex(w => w.id === walkId)
  if (index !== -1) {
    virtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' })
  }
}

const fetchWalks = async () => {
  try {
    uiStore.setLoading(true)
    await walksStore.loadWalks()
  } catch (error) {
    uiStore.setError(error.message)
  } finally {
    uiStore.setLoading(false)
  }
}

// Watch for changes in virtual items and update measurements
watch(virtualRows, () => {
  nextTick(() => {
  })
})

onMounted(() => {
  fetchWalks()
  nextTick(() => {
  })
})
</script>

<style>
.walk-list-container {
  z-index: 1;
  position: relative;
}

.walk-item {
  margin-bottom: 1rem;
  opacity: 1 !important;
  pointer-events: auto !important;
  transform: none !important;
}
</style>