<template>
  <div 
    class="m3-walk-card"
    :class="{ 
      'is-selected': isSelected,
      'is-compact': isCompact
    }"
    @click="handleClick"
  >
    <!-- Compact View -->
    <div v-if="isCompact" class="m3-walk-card-compact">
      <iconify-icon 
        icon="mdi:map-marker-path" 
        class="text-[24px]"
        :class="{ 'text-primary': isSelected }"
      />
      <div class="m3-walk-card-indicator" :class="{ 'is-active': isSelected }" />
    </div>
    <!-- Standard View - simplified structure removed nested container -->
    <div v-else class="m3-walk-card-content">
      <!-- Header -->
      <div class="m3-card-header">
        <div class="m3-title-wrapper">
          <h3 class="m3-headline">{{ walk.walk_name }}</h3>
        </div>
        <!-- Difficulty Badge updated to show context text -->
        <span 
          :class="[
            'm3-badge',
            getBadgeInfo(walk.steepness_level)?.color
          ]"
        >
          {{ difficultyText }}
        </span>
      </div>
      <!-- Description and Actions -->
      <p class="m3-body-medium text-on-surface-variant mt-2 line-clamp-2">
        {{ walk.highlights }}
      </p>
      <div class="flex items-center justify-between mt-auto">
        <div class="flex items-center gap-4 text-on-surface-variant">
          <span class="m3-label-large flex items-center gap-1">
            <Icon icon="mdi:map-marker-distance" />
            {{ formatDistance(walk.distance) }}
          </span>
          <span class="m3-label-large flex items-center gap-1">
            <Icon icon="mdi:clock-outline" />
            {{ formatDuration(walk.duration) }}
          </span>
        </div>
        <div class="flex gap-2">
          <!-- Removed More/Less button -->
          <button
            @click.stop="handleFavorite"
            class="m3-button-text"
            :class="{ 
              'is-favorited': walk.is_favorite,
              'is-disabled': isPendingFavorite 
            }"
            :disabled="isPendingFavorite"
          >
            <Icon 
              :icon="walk.is_favorite ? 'mdi:heart' : 'mdi:heart-outline'"
              :class="{ 'animate-bounce': isPendingFavorite }"
            />
          </button>
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

const formatDistance = (distance) => {
  return `${distance.toFixed(1)} km`
}

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

// New computed property returning difficulty context
const difficultyText = computed(() => {
  const level = Number(props.walk.steepness_level)
  if (level <= 2) return 'Easy'
  else if (level <= 4) return 'Medium'
  return 'Hard'
})
</script>

<style>
.m3-walk-card {
  display: flex;
  flex-direction: column;
  min-height: 80px;
  background: rgb(var(--md-sys-color-surface-container));
  border-radius: 12px;
  transition: background-color 200ms cubic-bezier(0.2, 0, 0.2, 1);
  border: 1px solid rgba(var(--md-sys-color-on-surface), 0.1);
  transition: background-color 200ms ease, border 200ms ease;
}

.m3-walk-card:hover {
  background: rgb(var(--md-sys-color-surface-container-highest) / 0.95);
  cursor: pointer;
  /* Removed elevation on hover */
}

.m3-walk-card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Remove .m3-walk-card-expanded styles entirely or reset */
.m3-walk-card-expanded {
  display: none;
}

.m3-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.m3-title-wrapper {
  flex: 1;
  min-width: 0;
}

.m3-headline {
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  letter-spacing: 0.15px;
  color: rgb(var(--md-sys-color-on-surface));
  margin-bottom: 4px;
}

.m3-supporting-text {
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0.25px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin: 8px 0;
}

.m3-walk-card.is-compact {
  min-height: 56px;
  height: 56px;
  padding: 0 16px;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

.m3-state-layer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  transition: background-color 200ms cubic-bezier(0.2, 0, 0.2, 1);
}

.m3-walk-card-indicator {
  position: absolute;
  left: 0;
  width: 3px;
  height: 24px;
  border-radius: 0 4px 4px 0;
  background: transparent;
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.m3-walk-card-indicator.is-active {
  background: rgb(var(--md-sys-color-primary));
  height: 32px;
}

.m3-walk-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: -1;
  background-color: transparent;
}

.m3-walk-card:hover::before {
  background-color: rgb(var(--md-sys-color-on-surface) / 0.08);
}

.m3-walk-card:active::before {
  background-color: rgb(var(--md-sys-color-on-surface) / 0.12);
}

.m3-walk-card.is-selected {
  background: rgb(var(--md-sys-color-secondary-container));
  border-color: rgb(var(--md-sys-color-primary));
}

.m3-walk-card.is-compact:hover::before {
  background-color: rgb(var(--md-sys-color-primary) / 0.08);
}

.m3-walk-card.is-compact.is-selected::before {
  background-color: rgb(var(--md-sys-color-primary) / 0.08);
}

.m3-title-large {
  font-size: 22px;
  line-height: 28px;
  font-weight: 400;
}

.m3-body-medium {
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
  letter-spacing: 0.25px;
}

.m3-label-large {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: 0.1px;
}

.text-on-surface-variant {
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.m3-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  height: 24px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, rgba(var(--md-sys-color-primary), 0.1), rgba(var(--md-sys-color-primary), 0.05));
  border: 1px solid rgba(var(--md-sys-color-primary), 0.3);
  border-radius: 8px; /* slightly smaller for a refined touch */
  transition: background 200ms ease, transform 200ms ease;
}

.m3-badge:hover {
  background: linear-gradient(135deg, rgba(var(--md-sys-color-primary), 0.2), rgba(var(--md-sys-color-primary), 0.1));
  transform: scale(1.05);
}

.m3-button-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-primary));
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.m3-button-text:hover {
  background: rgb(var(--md-sys-color-primary) / 0.08);
}

.m3-button-text:active {
  background: rgb(var(--md-sys-color-primary) / 0.12);
}

.m3-button-text.is-favorited {
  color: rgb(var(--md-sys-color-error));
}

.m3-button-text.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.animate-bounce {
  animation: bounce 1s infinite;
}

.m3-state-layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1);
  will-change: background-color;
  transform: translateZ(0);
}

.m3-walk-card:hover .m3-state-layer {
  background-color: rgb(var(--md-sys-color-on-surface) / 0.08);
}

.m3-walk-card:active .m3-state-layer {
  background-color: rgb(var(--md-sys-color-on-surface) / 0.12);
}

.m3-walk-card.is-compact:hover .m3-state-layer {
  background-color: rgb(var(--md-sys-color-primary) / 0.08);
}

.m3-walk-card.is-compact:active .m3-state-layer {
  background-color: rgb(var(--md-sys-color-primary) / 0.12);
}

.m3-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.m3-headline {
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  letter-spacing: 0.15px;
  color: rgb(var(--md-sys-color-on-surface));
}

.m3-supporting-text {
  font-size: 13px;
  line-height: 18px;
  letter-spacing: 0.25px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-top: 4px;
}

.m3-title-wrapper {
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}

.m3-headline {
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.m3-supporting-text {
  font-size: 13px;
  line-height: 18px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}
</style>