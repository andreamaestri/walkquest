<template>
  <div class="mobile-walk-list-sheet">
    <BottomSheet 
      ref="bottomSheetRef"
      :snap-points="adjustedSnapPoints" 
      :default-snap-point="1"
      @max-height="handleMaxHeight" 
      :blocking="false"
      :can-swipe-close="false" 
      :duration="320"
      @opened="handleOpened"
      @closed="handleClosed"
    >
      <template #header>
        <div class="mobile-walk-list-header">
          <h2 class="header-title">All Walks</h2>
          <div class="header-actions">
            <button class="header-button" @click="toggleFilters" aria-label="Filter walks">
              <Icon icon="mdi:filter-variant" />
            </button>
          </div>
        </div>
      </template>
      
      <!-- Walk list takes up the whole bottom sheet area -->
      <WalkList
        :walks="walks"
        :selected-walk-id="selectedWalkId"
        :is-compact="true"
        @walk-selected="handleWalkSelected"
      />
    </BottomSheet>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useWalksStore } from '../stores/walks'
import { useUiStore } from '../stores/ui'
import { useRouter } from 'vue-router'
import BottomSheet from '@douxcode/vue-spring-bottom-sheet'
import '@douxcode/vue-spring-bottom-sheet/dist/style.css'
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

// Component refs
const bottomSheetRef = ref(null)

// State management
const isOpen = ref(true)  // Ensure the walk list stays open as default state
const maxHeight = ref(window.innerHeight)
const navHeight = 80  // Updated to match the bottom nav height
const showFilters = ref(false)

// Store initialization
const walksStore = useWalksStore()
const uiStore = useUiStore()
const router = useRouter()

// Material Design 3 scrim color with 0.32 opacity
const scrimColor = computed(() => 'rgba(0, 0, 0, 0.32)')

// Adjusted snap points for better usability
const adjustedSnapPoints = computed(() => {
  const height = maxHeight.value - navHeight
  return [
    Math.min(300, height / 2),     // Half expanded
    height - 20                    // Full height minus small margin
  ].sort((a, b) => a - b)
})

// Update max height when window resizes
function updateMaxHeight() {
  maxHeight.value = window.innerHeight
}

function handleMaxHeight(height) {
  maxHeight.value = height
}

// Event handlers for bottom sheet
function handleOpened() {
  isOpen.value = true
}

function handleClosed() {
  isOpen.value = false
}

// Walk selection handler - now immediately emits event and doesn't keep sheet open
function handleWalkSelected(walk) {
  emit('walk-selected', walk)
  
  // When a walk is selected, ensure the sheet is closed
  // The parent component will remove it from the DOM
}

// Filter toggle
function toggleFilters() {
  showFilters.value = !showFilters.value
}

// Setup and teardown
onMounted(() => {
  window.addEventListener('resize', updateMaxHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMaxHeight)
})

// Watch for route changes to properly handle sheet visibility
watch(() => router.currentRoute.value.name, (routeName) => {
  // When route changes to home, ensure the sheet is open again
  if (routeName === 'home' && !props.selectedWalkId && bottomSheetRef.value) {
    bottomSheetRef.value.open();
  }
})

// Watch for selected walk changes
watch(() => props.selectedWalkId, (newId) => {
  // Ensure sheet is closed if a walk is selected
  if (newId) {
    if (bottomSheetRef.value && isOpen.value) {
      bottomSheetRef.value.close();
    }
  } else {
    // If no walk is selected and we're on home route, open the sheet
    if (router.currentRoute.value.name === 'home' && bottomSheetRef.value) {
      bottomSheetRef.value.open();
    }
  }
})

// Export method to open sheet for parent component
defineExpose({
  openSheet() {
    if (bottomSheetRef.value) {
      bottomSheetRef.value.open()
    }
  },
  closeSheet() {
    if (bottomSheetRef.value) {
      bottomSheetRef.value.close()
    }
  }
})
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

/* Bottom Sheet Styling */
.mobile-walk-list-sheet :deep(.bottom-sheet__container) {
  transition: transform var(--md-sys-motion-duration-medium2, 320ms) 
              var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1.0));
  border-radius: 28px 28px 0 0; /* Rounded top corners */
}

.mobile-walk-list-sheet :deep(.bottom-sheet__container--elevation-3) {
  box-shadow: var(--md-sys-elevation-3);
}

:deep(.bottom-sheet__content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.walk-list-container) {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: rgb(var(--md-sys-color-surface));
}

.mobile-walk-list-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  pointer-events: auto !important;
}

:deep(.bottom-sheet__container) {
  pointer-events: auto !important;
  background: rgb(var(--md-sys-color-surface));
}

.mobile-walk-list-header {
  padding: 16px 16px 8px;
  background: rgb(var(--md-sys-color-surface));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline-variant));
  position: sticky;
  top: 0;
  z-index: 1;
}
</style>
