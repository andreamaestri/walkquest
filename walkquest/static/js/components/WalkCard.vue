<template>
  <div 
    class="walk-card"
    role="button"
    tabindex="0"
    :aria-label="`Open walk ${walk.walk_name || walk.title}`"
    :class="{
      'is-selected': isSelected,
      'is-compact': isCompact
    }"
    @click="$emit('walk-selected', walk)"
    @keydown.enter="$emit('walk-selected', walk)"
    @keydown.space.prevent="$emit('walk-selected', walk)"
  >
    <div class="walk-content">
      <div class="walk-info">
        <div class="title-row">
          <h3 class="walk-title">{{ walk.walk_name || walk.title }}</h3>
          <button
            type="button"
            class="favorite-icon"
            :aria-label="walk.is_favorite ? 'Remove from favorites' : 'Save to favorites'"
            @click.stop="handleFavorite"
          >
            <Icon :icon="walk.is_favorite ? 'material-symbols:star-rounded' : 'material-symbols:star-outline-rounded'" 
                  :class="{'is-favorite': walk.is_favorite, 'is-pending': isPendingFavorite}" />
          </button>
        </div>
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
            :class="`category-${category.slug || 'default'}`"
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
import { getBadgeInfo, normalizeLevel } from '../utils/helpers'
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

const getDifficultyLevel = (steepnessLevel) => {
  const normalizedLevel = normalizeLevel(steepnessLevel || 'NOVICE WANDERER');

  if (normalizedLevel === "NOVICE WANDERER") return 'easy';
  if (normalizedLevel === "GREY'S PATHFINDER" || normalizedLevel === "TRAIL RANGER") return 'medium';
  if (normalizedLevel === "TRAIL RANGER") return 'medium';
  if (normalizedLevel === "WARDEN'S ASCENT" || normalizedLevel === "MASTER WAYFARER") return 'hard';
  if (normalizedLevel === "MASTER WAYFARER") return 'hard';

  // Simplified fallback detection using fewer keywords
  const difficulty = (steepnessLevel || 'easy').toLowerCase();
  if (difficulty.includes('novice')) return 'easy';
  if (difficulty.includes('pathfinder') || difficulty.includes('ranger')) return 'medium';
  if (difficulty.includes('ascend') || difficulty.includes('master')) return 'hard';

  return 'easy';
}

const difficultyClass = computed(() => {
  const steepnessLevel = props.walk.steepness_level || props.walk.difficulty;
  return getDifficultyLevel(steepnessLevel);
})

const difficultyText = computed(() => {
  const steepnessLevel = props.walk.steepness_level || props.walk.difficulty;
  const level = getDifficultyLevel(steepnessLevel);
  // Capitalize first letter for display
  return level.charAt(0).toUpperCase() + level.slice(1);
})

const firstCategories = computed(() => {
  const cats = props.walk.related_categories || []
  return cats.slice(0, 3)
})

const moreCount = computed(() => {
  const cats = props.walk.related_categories || []
  return cats.length > 3 ? cats.length - 3 : 0
})

</script>

<style>
.walk-card {
  background: rgb(var(--md-sys-color-surface-container-low));
  border: 1px solid rgba(var(--md-sys-color-outline), 0.12);
  border-radius: var(--md-sys-shape-lg, 16px);
  margin: 4px 8px;
  overflow: hidden;
  transition: background-color var(--md-sys-motion-duration-short2), border-color var(--md-sys-motion-duration-short2), box-shadow var(--md-sys-motion-duration-short2), transform var(--md-sys-motion-duration-short1);
  cursor: pointer;
  width: calc(100% - 16px); /* Ensure consistent width accounting for margins */
}

.walk-card:hover {
  background: rgb(var(--md-sys-color-surface-container));
  border-color: rgb(var(--md-sys-color-primary));
  box-shadow: var(--md-sys-elevation-1);
  transform: translateY(-1px);
}

.walk-card.is-selected {
  background: rgb(var(--md-sys-color-secondary-container));
  border-color: rgb(var(--md-sys-color-primary));
  box-shadow: var(--md-sys-elevation-1);
}

.walk-content {
  padding: 16px;
}

.walk-info {
  margin-bottom: 12px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.walk-title {
  flex-grow: 1;
  margin-right: 8px;
  font-size: 1rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  margin: 0 0 4px 0;
  line-height: 1.5;
}

.favorite-icon {
  border: 0;
  background: transparent;
  font-size: 1.5rem;
  color: rgb(var(--md-sys-color-outline));
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.favorite-icon:focus-visible {
  outline: 3px solid rgb(var(--md-sys-color-primary) / 0.48);
  outline-offset: 2px;
}

.favorite-icon .is-favorite {
  color: rgb(var(--md-sys-color-primary));
}

.favorite-icon .is-pending {
  opacity: 0.6;
}

.favorite-icon:hover {
  transform: scale(1.1);
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
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgb(var(--category-background, var(--md-sys-color-surface-variant)));
  color: rgb(var(--category-foreground, var(--md-sys-color-on-surface-variant)));
}

.category-circular-walks { --category-background: 234, 221, 255; --category-foreground: 54, 30, 105; }
.category-coastal-walks { --category-background: 211, 238, 242; --category-foreground: 0, 53, 59; }
.category-pub-walks { --category-background: 255, 217, 226; --category-foreground: 73, 37, 49; }
.category-linear-walks { --category-background: 218, 237, 255; --category-foreground: 0, 47, 78; }
.category-woodland-walks { --category-background: 213, 239, 220; --category-foreground: 20, 63, 34; }

:is([data-theme="dark"]) .category-tag {
  filter: saturate(0.88) brightness(0.82);
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

  .favorite-icon {
    font-size: 1.75rem;
    padding: 8px;
  }
}
</style>
