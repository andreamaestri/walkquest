<template>
  <BottomSheet 
    v-model="isOpen" 
    :snap-points="adjustedSnapPoints" 
    :default-snap-point="1"
    @max-height="handleMaxHeight" 
    :elevation="3" 
    :blocking="false"
    :can-swipe-close="false" 
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
    
    <!-- Search field -->
    <div class="md3-search-container px-4 py-2 mb-2">
      <div class="md3-search-field">
        <div class="md3-search-icon-container">
          <Icon icon="mdi:magnify" class="md3-search-icon" />
        </div>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search walks..." 
          class="md3-search-input"
          @focus="handleSearchFocus" 
        />
        <button 
          v-if="searchQuery" 
          @click="searchQuery = ''" 
          class="md3-search-clear" 
        >
          <Icon icon="mdi:close" />
        </button>
      </div>
    </div>
    
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
const isOpen = ref(true)  // Ensure it stays open
const maxHeight = ref(window.innerHeight)
const navHeight = 56  // Adjusted to standard Material Design nav height
const searchQuery = ref(''); // Add missing searchQuery ref

// Material Design 3 scrim color with 0.32 opacity
const scrimColor = computed(() => 'rgba(0, 0, 0, 0.32)');

// Adjusted snap points for better usability
const adjustedSnapPoints = computed(() => {
  const height = maxHeight.value - navHeight;
  return [
    Math.min(300, height / 2),     // Half expanded
    height - 20                    // Full height minus small margin
  ].sort((a, b) => a - b);
});

function handleMaxHeight(height) {
  maxHeight.value = height;
}

function handleWalkSelected(walk) {
  emit('walk-selected', walk)
  // Removed isOpen.value = false to prevent closing
}

function handleSearchFocus() {
  // Implement your search focus handling logic here
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

/* Layout and scroll handling */
:deep(.bottom-sheet__content) {
  height: 100%;  /* Take full height of container */
  display: flex;
  flex-direction: column;
  overflow: hidden;  /* Prevent double scrollbars */
}

/* Ensure WalkList takes remaining space and scrolls */
:deep(.walk-list-container) {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom);
}

/* Fix bottom sheet positioning */
.mobile-walk-list-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000; /* Ensure it's above the map */
  pointer-events: auto !important;
}

/* Enable pointer events on content */
:deep(.bottom-sheet__container) {
  pointer-events: auto !important;
  background: rgb(var(--md-sys-color-surface));
}

/* Content scroll handling */
:deep(.bottom-sheet__content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* List container scroll handling */
:deep(.walk-list-container) {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
  background: rgb(var(--md-sys-color-surface));
}

/* Header styling */
.mobile-walk-list-header {
  padding: 16px 16px 8px;
  background: rgb(var(--md-sys-color-surface));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
  position: sticky;
  top: 0;
  z-index: 1;
}
</style>
