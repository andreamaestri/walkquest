<template>
  <div 
    :class="{
      'walk-item revealed': true,
      'is-expanded': walk.isExpanded,
      'is-selected': isSelected
    }"
    @click="handleClick"
  >
    <div class="walk-header">
      <h3 class="text-lg font-semibold">{{ walk.walk_name }}</h3>
      <div class="walk-badges">
        <span 
          :class="getBadgeInfo(walk.steepness_level)?.color"
          class="badge"
        >
          {{ getBadgeInfo(walk.steepness_level)?.icon }}
          {{ walk.steepness_level }}
        </span>
      </div>
    </div>

    <div class="walk-content">
      <p class="text-sm text-gray-600">{{ walk.highlights }}</p>
      <Transition name="expand">
        <div v-if="walk.isExpanded" class="walk-details">
          <div v-if="walk.pubs_list?.length" class="pubs-list">
            <h4 class="font-medium mb-2">Pubs Along Route:</h4>
            <ul class="space-y-1">
              <li v-for="pub in walk.pubs_list" :key="pub.id">
                {{ pub.name }}
              </li>
            </ul>
          </div>
        </div>
      </Transition>
    </div>

    <div class="walk-actions">
      <button
        @click.stop="toggleExpand"
        class="action-button"
      >
        {{ walk.isExpanded ? 'Show Less' : 'Show More' }}
      </button>
      <button
        @click.stop="handleSelect"
        class="action-button primary"
      >
        View on Map
      </button>
      <button
        @click.stop="toggleFavorite"
        :class="{
          'action-button': true,
          'is-favorite': walk.is_favorite,
          'is-pending': isPendingFavorite
        }"
        :disabled="isPendingFavorite"
      >
        ♥ {{ walk.is_favorite ? 'Favorited' : 'Favorite' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { getBadgeInfo } from '../utils/helpers'
import { animate } from 'motion'

const props = defineProps({
  walk: {
    type: Object,
    required: true
  }
})

const walksStore = useWalksStore()
const uiStore = useUiStore()

const isSelected = computed(() => walksStore.selectedWalk?.id === props.walk.id)
const isPendingFavorite = computed(() => walksStore.isPendingFavorite(props.walk.id))

const handleClick = () => {
  if (isSelected.value) {
    walksStore.setSelectedWalk(null)
  } else {
    handleSelect()
  }
}

const handleSelect = async () => {
  const card = document.querySelector(`[data-walk-id="${props.walk.id}"]`)
  if (card) {
    await animate(card,
      { scale: [1, 1.02, 1] },
      { duration: 0.3, easing: [0.2, 0.8, 0.2, 1] }
    )
  }

  walksStore.setSelectedWalk(props.walk)
  uiStore.showSidebar = true
}

const toggleExpand = () => {
  walksStore.expandWalk(props.walk.id)
}

const toggleFavorite = () => {
  walksStore.toggleFavorite(props.walk.id)
}
</script>

<style scoped>
.walk-item {
  padding: 1rem;
  background: white;
  border: 1px solid #eee;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.walk-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.walk-item.is-selected {
  border-color: #4299e1;
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
}

.walk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.walk-content {
  margin: 1rem 0;
}

.walk-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.walk-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: #f3f4f6;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: #e5e7eb;
}

.action-button.primary {
  background-color: #4299e1;
  color: white;
}

.action-button.primary:hover {
  background-color: #3182ce;
}

.action-button.is-favorite {
  color: #e53e3e;
  background-color: #fff5f5;
}

.action-button.is-pending {
  opacity: 0.5;
  cursor: not-allowed;
}

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
</style>