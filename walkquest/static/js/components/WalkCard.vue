<template>
  <div 
    class="walk-card"
    :class="{
      'is-selected': isSelected,
      'is-compact': isCompact
    }"
    @click="$emit('walk-selected', walk)"
  >
    <div class="walk-content">
      <div class="walk-info">
        <h3 class="walk-title">{{ walk.walk_name || walk.title }}</h3>
      </div>
      
      <div class="walk-details">
        <div class="badges">
          <div class="badge difficulty" :class="difficultyClass">
            <Icon icon="mdi:flag" />
            <span>{{ difficultyText }}</span>
          </div>
          <div class="badge distance">
            <Icon icon="mdi:map-marker-distance" />
            <span>{{ formatDistance(walk.distance) }}</span>
          </div>
        </div>
        
        <div class="walk-categories" v-if="walk.related_categories?.length">
          <span 
            v-for="category in firstCategories" 
            :key="category.id"
            class="category-tag"
            :style="getCategoryStyle(category)"
          >
            {{ category.name }}
          </span>
          <span v-if="moreCount > 0" class="more-count">
            +{{ moreCount }} more
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWalksStore } from '../stores/walks'
import { getBadgeInfo } from '../utils/helpers'

const props = defineProps({
  walk: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isCompact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['walk-selected'])
const walksStore = useWalksStore()

const isPendingFavorite = computed(() => walksStore.isPendingFavorite(props.walk.id))

const handleFavorite = async () => {
  try {
    await walksStore.toggleFavorite(props.walk.id)
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
  }
}

const formatDuration = (duration) => {
  if (duration == null) return ''
  const minutes = Number.parseFloat(duration)
  if (Number.isNaN(minutes)) return ''
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

const formatDistance = (distance) => {
  if (!distance) return ''
  // Convert km to miles (1 km = 0.621371 miles)
  const miles = (Number.parseFloat(distance) * 0.621371).toFixed(1)
  return `${miles} miles`
}

const difficultyText = computed(() => {
  console.log('Steepness level:', props.walk.steepness_level) // Debug log
  const level = props.walk.steepness_level?.toUpperCase()
  if (!level) return 'Unknown'
  
  switch (level) {
    case 'NOVICE WANDERER':
      return 'Easy'
    case "GREY'S PATHFINDER":
    case 'TRAIL RANGER':
      return 'Medium'
    case "WARDEN'S ASCENT":
    case 'MASTER WAYFARER':
      return 'Hard'
    default:
      console.log('Unmatched level:', level) // Debug log
      return 'Unknown'
  }
})

const difficultyClass = computed(() => {
  const level = props.walk.steepness_level?.toUpperCase()
  if (!level) return 'medium'
  
  switch (level) {
    case 'NOVICE WANDERER':
      return 'easy'
    case "GREY'S PATHFINDER":
    case 'TRAIL RANGER':
      return 'medium'
    case "WARDEN'S ASCENT":
    case 'MASTER WAYFARER':
      return 'hard'
    default:
      return 'medium'
  }
})

const firstCategories = computed(() => {
  const cats = props.walk.related_categories || []
  return cats.slice(0, 3).map(cat => ({
    ...cat,
    name: cat.name.charAt(0).toUpperCase() + cat.name.slice(1)
  }))
})

const moreCount = computed(() => {
  const cats = props.walk.related_categories || []
  return cats.length > 3 ? cats.length - 3 : 0
})

const getCategoryStyle = (cat) => {
  if (cat.slug === 'circular-walks') {
    return { backgroundColor: 'rgb(233,221,255)', color: 'rgb(77,61,117)' }
  }
  if (cat.slug === 'coastal-walks') {
    return { backgroundColor: 'rgb(232,222,248)', color: 'rgb(74,68,88)' }
  }
  if (cat.slug === 'pub-walks') {
    return { backgroundColor: 'rgb(255,217,227)', color: 'rgb(99,59,72)' }
  }
  return { backgroundColor: '#eee', color: '#333' }
}
</script>

<style scoped>
.walk-card {
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 16px;
  margin: 4px 8px;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--md-sys-elevation-1);
  cursor: pointer;
}

.walk-card:hover {
  background: rgb(var(--md-sys-color-surface-container));
  box-shadow: var(--md-sys-elevation-2);
  transform: translateY(-1px);
}

.walk-card.is-selected {
  background: rgb(var(--md-sys-color-surface-container-highest));
  border: 1px solid rgb(var(--md-sys-color-primary));
}

.walk-content {
  padding: 16px;
}

.walk-info {
  margin-bottom: 12px;
}

.walk-title {
  font-size: 1rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0 0 4px 0;
  line-height: 1.5;
}

.walk-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  line-height: 1.25;
}

.location {
  display: flex;
  align-items: center;
  gap: 4px;
}

.location Icon {
  color: rgb(var(--md-sys-color-primary));
  font-size: 16px;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  background: rgb(var(--md-sys-color-surface-container-highest));
}

.badge Icon {
  font-size: 18px;
}

.badge.difficulty {
  background: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.badge.difficulty.easy {
  background: rgb(var(--md-sys-color-tertiary-container));
  color: rgb(var(--md-sys-color-on-tertiary-container));
}

.badge.difficulty.medium {
  background: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.badge.difficulty.hard {
  background: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
}

.walk-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.category-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
}

.more-count {
  font-size: 0.75rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
  padding: 4px 8px;
}

/* Compact mode */
.walk-card.is-compact {
  margin: 2px 8px;
  border-radius: 8px;
}

.walk-card.is-compact .walk-content {
  padding: 12px;
}

.walk-card.is-compact .walk-title {
  font-size: 0.875rem;
}

.walk-card.is-compact .walk-meta {
  font-size: 0.75rem;
}

.walk-card.is-compact .badges {
  margin-bottom: 8px;
}

.walk-card.is-compact .badge {
  padding: 2px 8px;
  font-size: 0.75rem;
}
</style>
