<template>
  <div 
    :class="{
      'walk-item revealed': true,
      'is-expanded': walk.isExpanded,
      'is-selected': isSelected
    }"
    @click="handleClick"
  >
    <div class="p-4 bg-white rounded-lg border border-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-semibold text-gray-900">{{ walk.walk_name }}</h3>
        <div class="walk-badges">
          <span 
            :class="[
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium',
              getBadgeInfo(walk.steepness_level)?.color
            ]"
          >
            <Icon 
              :icon="getBadgeInfo(walk.steepness_level)?.icon" 
              class="mr-1 h-4 w-4"
            />
            {{ walk.steepness_level }}
          </span>
        </div>
      </div>

      <div class="space-y-4">
        <p class="text-sm text-gray-600">{{ walk.highlights }}</p>
        <Transition name="expand">
          <div v-if="walk.isExpanded" class="pt-4 mt-4 border-t border-gray-100">
            <div v-if="walk.pubs_list?.length" class="space-y-2">
              <h4 class="font-medium text-gray-900">Pubs Along Route:</h4>
              <ul class="space-y-1 text-sm text-gray-600">
                <li v-for="pub in walk.pubs_list" :key="pub.id">
                  {{ pub.name }}
                </li>
              </ul>
            </div>
          </div>
        </Transition>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          @click.stop="emit('expand', walk.id)"
          class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Icon :icon="walk.isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="mr-1 h-4 w-4" />
          {{ walk.isExpanded ? 'Show Less' : 'Show More' }}
        </button>
        <button
          @click.stop="emit('select', walk)"
          class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <Icon icon="mdi:map" class="mr-1 h-4 w-4" />
          View on Map
        </button>
        <button
          @click.stop="handleFavorite"
          :class="{
            'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors': true,
            'bg-pink-50 text-pink-600 hover:bg-pink-100': walk.is_favorite,
            'bg-gray-50 text-gray-700 hover:bg-gray-100': !walk.is_favorite,
            'opacity-50 cursor-not-allowed': isPendingFavorite
          }"
          :disabled="isPendingFavorite"
        >
          <Icon 
            :icon="walk.is_favorite ? 'mdi:heart' : 'mdi:heart-outline'" 
            class="mr-1 h-4 w-4" 
          />
          {{ walk.is_favorite ? 'Favorited' : 'Favorite' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { getBadgeInfo } from '../utils/helpers'
import { Icon } from '@iconify-prerendered/vue-mdi'

const props = defineProps({
  walk: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['select', 'expand'])

const walksStore = useWalksStore()
const uiStore = useUiStore()

const isSelected = computed(() => walksStore.selectedWalk?.id === props.walk.id)
const isPendingFavorite = computed(() => walksStore.isPendingFavorite(props.walk.id))

const handleClick = () => {
  if (isSelected.value) {
    walksStore.setSelectedWalk(null)
  } else {
    emit('select', props.walk)
  }
}

const handleFavorite = () => {
  walksStore.toggleFavorite(props.walk.id)
}
</script>

<style>
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