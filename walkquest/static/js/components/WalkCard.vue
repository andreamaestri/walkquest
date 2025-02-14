<template>
  <article
    class="md3-card"
    :class="{
      'md3-card--selected': isSelected,
      'md3-card--compact': isCompact
    }"
    @click="handleClick"
  >
    <!-- Compact View -->
    <div v-if="isCompact" class="md3-card__compact">
      <iconify-icon
        icon="mdi:map-marker-path"
        class="md3-icon md3-icon--large"
        :class="{ 'md3-icon--primary': isSelected }"
      />
      <div class="md3-card__indicator" :class="{ 'md3-card__indicator--active': isSelected }" />
    </div>

    <!-- Standard View -->
    <div v-else class="md3-card__content">
      <header class="md3-card__header">
        <div class="md3-card__title">
          <h3 class="md3-headline">{{ walk.walk_name }}</h3>
        </div>
        <span :class="['md3-badge', getBadgeInfo(walk.steepness_level)?.color]">
          {{ difficultyText }}
        </span>
      </header>
      <div class="categories">
        <span 
          v-for="(cat, index) in firstCategories" 
          :key="index"
          class="badge"
          :style="getCategoryStyle(cat)">
          {{ cat.name }}
        </span>
        <span 
          v-if="moreCount > 0" 
          class="badge more-badge">
          +{{ moreCount }}
        </span>
      </div>
      <footer class="md3-card__footer">
        <div class="md3-card__metrics">
          <span class="md3-label flex items-center gap-1">
            <iconify-icon icon="mdi:map-marker-distance" />
            {{ formatDistance(walk.distance) }}
          </span>
          <span class="md3-label flex items-center gap-1">
            <iconify-icon icon="mdi:clock-outline" />
            {{ formatDuration(walk.duration) }}
          </span>
        </div>
        <button
          @click.stop="handleFavorite"
          class="md3-button-text"
          :class="{
            'md3-button-text--favorited': walk.is_favorite,
            'md3-button-text--disabled': isPendingFavorite
          }"
          :disabled="isPendingFavorite"
        >
          <iconify-icon
            :icon="walk.is_favorite ? 'mdi:heart' : 'mdi:heart-outline'"
            :class="{ 'animate-bounce': isPendingFavorite }"
          />
        </button>
      </footer>
    </div>
  </article>
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
  isExpanded: {
    type: Boolean,
    default: false
  },
  isCompact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['walk-selected', 'walk-expanded'])
const walksStore = useWalksStore()

const isPendingFavorite = computed(() => walksStore.isPendingFavorite(props.walk.id))

const handleClick = () => {
  emit('walk-selected', props.walk)
}

const handleFavorite = async () => {
  try {
    await walksStore.toggleFavorite(props.walk.id)
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
  }
}

const formatDistance = (distance) => `${distance.toFixed(1)} km`

const formatDuration = (duration) => {
  if (duration == null) return ''
  const minutes = parseFloat(duration)
  if (isNaN(minutes)) return ''
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

const difficultyText = computed(() => {
  const level = Number(props.walk.steepness_level)
  if (level <= 2) return 'Easy'
  else if (level <= 4) return 'Medium'
  return 'Hard'
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
  if (cat.slug === 'circular-walks')
    return { backgroundColor: 'rgb(233,221,255)', color: 'rgb(77,61,117)' }
  else if (cat.slug === 'coastal-walks')
    return { backgroundColor: 'rgb(232,222,248)', color: 'rgb(74,68,88)' }
  else if (cat.slug === 'pub-walks')
    return { backgroundColor: 'rgb(255,217,227)', color: 'rgb(99,59,72)' }
  else 
    return { backgroundColor: '#eee', color: '#333' }
}
</script>

<style scoped>
/* MD3 Card Container without positioning */
.md3-card {
  width: 100%; /* Fill wrapper width */
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px; 
  box-shadow: 0 1px 3px rgba(var(--md-sys-color-on-surface), 0.1);
  transition: background-color 200ms ease, box-shadow 200ms ease;
  cursor: pointer;
  padding: 16px;
}
.md3-card:hover {
  background-color: rgb(var(--md-sys-color-surface-container-highest) / 0.95);
}
.md3-card--selected {
  background-color: rgb(var(--md-sys-color-secondary-container));
  border: 1px solid rgb(var(--md-sys-color-primary));
  box-shadow: 0 4px 8px rgba(var(--md-sys-color-on-surface), 0.2);
}

/* Compact Style Adjustments */
.md3-card--compact {
  min-height: 56px;
  height: 56px;
  padding: 0 16px;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}
.md3-card__compact {
  /* Removed position: relative; */
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Icon Styles */
.md3-icon {
  font-size: 24px;
}
.md3-icon--primary {
  color: rgb(var(--md-sys-color-primary));
}

/* Indicator for Compact Mode */
.md3-card__indicator {
  /* Positioning removed; use inline layout margin if needed */
  width: 3px;
  height: 24px;
  border-radius: 0 4px 4px 0;
  background: transparent;
  transition: all 300ms ease;
}
.md3-card__indicator--active {
  background: rgb(var(--md-sys-color-primary));
  height: 32px;
}

/* Content Layout */
.md3-card__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Header */
.md3-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px 0;
}
.md3-card__title {
  flex: 1;
  min-width: 0;
  padding-right: 12px; /* Increased spacing between title and badge */
}
.md3-headline {
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
}

/* Badge */
.md3-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  height: 24px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  background: linear-gradient(135deg, rgba(var(--md-sys-color-primary), 0.1), rgba(var(--md-sys-color-primary), 0.05));
  border: 1px solid rgba(var(--md-sys-color-primary), 0.3);
  transition: background 200ms ease, transform 200ms ease;
}
.md3-badge:hover {
  background: linear-gradient(135deg, rgba(var(--md-sys-color-primary), 0.2), rgba(var(--md-sys-color-primary), 0.1));
  transform: scale(1.05);
}

/* Body Text */
.md3-body {
  font-size: 14px;
  line-height: 20px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-top: 8px;
}

/* Footer Layout */
.md3-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 4px;
  position: relative; /* Create stacking context */
  z-index: 1; /* Ensure footer is above other content */
}
.md3-card__metrics {
  display: flex;
  gap: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}
.md3-label {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
}

/* Button Text */
.md3-button-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-primary));
  transition: background 200ms ease;
  /* Remove position: relative */
  /* Remove z-index */
  cursor: pointer;
  border: none;
  background: transparent;
}
.md3-button-text:hover {
  background: rgb(var(--md-sys-color-primary) / 0.08);
}
.md3-button-text:active {
  background: rgb(var(--md-sys-color-primary) / 0.12);
}
.md3-button-text--favorited {
  color: rgb(var(--md-sys-color-error));
}
.md3-button-text--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Bounce Animation for Pending State */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.animate-bounce {
  animation: bounce 1s infinite;
}

/* Minimal badge styling */
.badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
  margin-right: 4px;
  text-transform: capitalize;
  font-weight: 500;
}

.more-badge {
  background-color: #ddd;
  color: #333;
}
</style>
