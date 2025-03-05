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
import { Icon } from '@iconify/vue' 
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

const formatDistance = (distance) => {
  if (!distance) return '-- mi'
  return `${distance.toFixed(1)} mi`
}

const formatDuration = (duration) => {
  if (!duration) return ''
  return `${duration} min`
}

const difficultyClass = computed(() => {
  const difficulty = props.walk.difficulty?.toLowerCase() || 'easy'
  return {
    'easy': difficulty.includes('easy'),
    'medium': difficulty.includes('medium') || difficulty.includes('moderate'),
    'hard': difficulty.includes('hard') || difficulty.includes('challenging')
  }
})

const difficultyText = computed(() => {
  return props.walk.difficulty || 'Easy'
})

const firstCategories = computed(() => {
  const cats = props.walk.related_categories || []
  return cats.slice(0, 3)
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

<style>
.walk-card {
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 16px;
  margin: 4px 8px;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--md-sys-elevation-1);
  cursor: pointer;
  width: calc(100% - 16px); /* Ensure consistent width accounting for margins */
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
}

.walk-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(var(--md-sys-color-surface-variant), 0.5);
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.badge.distance {
  background: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
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
  width: calc(100% - 16px);
}

.walk-card.is-compact .walk-content {
  padding: 12px;
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

/* Mobile improvements */
@media (max-width: 768px) {
  .walk-card {
    margin: 8px 8px; /* Equal margins on all sides */
    border-radius: 20px;
    box-shadow: var(--md-sys-elevation-2);
    width: calc(100% - 16px); /* Ensure consistent width */
    max-width: 100%; /* Prevent overflow */
    box-sizing: border-box; /* Include borders and padding in width calculation */
  }
  
  .walk-content {
    padding: 16px;
  }
  
  .walk-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 10px;
    word-break: break-word; /* Handle long titles */
  }
  
  .badges {
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap; /* Ensure badges wrap on small screens */
  }
  
  .badge {
    padding: 6px 14px;
    font-size: 0.875rem;
    border-radius: 20px;
    white-space: nowrap; /* Prevent text wrapping inside badges */
  }
  
  .category-tag {
    padding: 6px 14px;
    font-size: 0.875rem;
    border-radius: 20px;
  }
  
  .walk-card:active {
    transform: scale(0.98);
  }
  
  /* Improve touch area */
  .walk-details {
    gap: 8px;
  }
  
  /* Add subtle animation */
  .walk-card {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  /* Add a subtle gradient effect to highlight importance */
  .walk-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(var(--md-sys-color-primary), 0.05),
      rgba(var(--md-sys-color-surface), 0.02)
    );
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .walk-card:hover::before,
  .walk-card:active::before {
    opacity: 1;
  }
}
</style>
