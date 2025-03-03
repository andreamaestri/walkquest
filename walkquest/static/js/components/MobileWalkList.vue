<template>
  <BottomSheet 
    v-model="isOpen" 
    :snap-points="adjustedSnapPoints"
    :default-snap-point="0"
    @max-height="handleMaxHeight"
    :elevation="3"
    :blocking="false"
    :can-swipe-close="true"
    :duration="320"
    :scrim-color="scrimColor"
    class="mobile-walk-list-sheet"
  >
    <template #header>
      <div class="mobile-walk-list-header">
        <h2 class="header-title">Nearby Walks</h2>
        <div class="header-actions">
          <button class="header-button">
            <Icon icon="mdi:filter-variant" />
          </button>
        </div>
      </div>
    </template>
    
    <WalkList
      :walks="walks"
      :selected-walk-id="selectedWalkId"
      :is-compact="true"
      @walk-selected="handleWalkSelected"
    />
  </BottomSheet>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import BottomSheet from './BottomSheet.vue'
import WalkList from './WalkList.vue'

const props = defineProps({
  walks: {
    type: Array,
    required: true
  },
  selectedWalkId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['walk-selected'])
const isOpen = ref(true)  // Start with sheet visible
const maxHeight = ref(window.innerHeight);
const navHeight = 80; // Height of the mobile navigation bar

// Material Design 3 scrim color with 0.32 opacity
const scrimColor = computed(() => 'rgba(0, 0, 0, 0.32)');

// Adjust snap points to account for bottom navigation
const adjustedSnapPoints = computed(() => {
  const height = maxHeight.value - navHeight;
  return [
    Math.min(200, height / 3),         // Peeking state
    Math.min(400, height / 1.8),       // Half expanded
    height                             // Full height (excluding nav bar)
  ].sort((a, b) => a - b);
});

function handleMaxHeight(height) {
  maxHeight.value = height;
}

function handleWalkSelected(walk) {
  emit('walk-selected', walk)
  isOpen.value = false
}
</script>

<style scoped>
.mobile-walk-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 16px;
}

.header-title {
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
  letter-spacing: 0.0125em;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.header-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: currentColor;
  border-radius: inherit;
  opacity: 0;
  transform: scale(0);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.header-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
  color: rgb(var(--md-sys-color-on-surface));
}

.header-button:hover::before {
  opacity: 0.08;
  transform: scale(1);
}

.header-button:active {
  transform: scale(0.92);
}

/* Smooth transitions with Material Design 3 motion easing */
.mobile-walk-list-sheet :deep(.bottom-sheet__container) {
  transition: transform var(--md-sys-motion-duration-medium2, 320ms) 
              var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1.0));
}

/* Shadow according to MD3 elevation levels */
.mobile-walk-list-sheet :deep(.bottom-sheet__container--elevation-3) {
  box-shadow: var(--md-sys-elevation-3);
}
</style>