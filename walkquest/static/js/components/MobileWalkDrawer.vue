<template>
  <BottomSheet 
    ref="bottomSheet"
    v-model="isOpen"
    elevation="3"
    :blocking="true"
    :can-swipe-close="false"
    :can-overlay-close="true"
    :default-snap-point="defaultSnapPoint"
    :snap-points="snapPoints"
    :expand-on-content-drag="true"
    :duration="320" 
    @max-height="handleMaxHeight"
    @opened="onOpened"
    @closed="onClosed"
    @snap-point-changed="handleSnapPointChange"
    class="mobile-walk-drawer-sheet"
  >
    <template #header>
      <WalkDrawerHeader 
        :walk="walk" 
        :isMobile="true"
        @close="close"
      />
    </template>
    
    <WalkDrawerContent 
      :walk="walk"
      :isMobile="true"
      @start-walk="handleStartWalk"
      @save-walk="handleSaveWalk"
      @share="handleShare"
      @directions="() => {}"
      @category-selected="handleCategorySelected"
      @recenter="$emit('recenter')"
    />
  </BottomSheet>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick, onBeforeUnmount } from 'vue';
import { Icon } from '@iconify/vue';
import BottomSheet from './BottomSheet.vue';
import WalkDrawerHeader from './shared/WalkDrawerHeader.vue';
import WalkDrawerContent from './shared/WalkDrawerContent.vue';

const props = defineProps({
  walk: {
    type: Object,
    required: true
  },
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'close', 'start-walk', 'save-walk', 'directions', 'category-selected', 'snap-point-changed', 'recenter']);

const bottomSheet = ref(null);
const isOpen = ref(props.modelValue);

// Material Design 3 scrim color with 0.32 opacity
const scrimColor = computed(() => 'rgba(0, 0, 0, 0.32)');

// Sheet height management with bottom nav adjustment
const maxHeight = ref(window.innerHeight);
const navHeight = 80; // Height of the mobile navigation bar
const safeAreaInset = typeof window !== 'undefined' ? 
  parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0') : 0;
  
// Set default snap point to half-height for better initial view
const defaultSnapPoint = computed(() => 1); // Index of the second snap point (half height)

// Calculate snap points based on max height with adjustment for bottom nav
const snapPoints = computed(() => {
  const height = maxHeight.value - navHeight - safeAreaInset; // Adjust for nav bar and safe area
  return [
    Math.min(320, height * 0.4),   // Peeking state (~40% of available height)
    Math.min(550, height * 0.65),  // Half expanded (~65% of available height)
    height                         // Full height (excluding nav bar and safe area)
  ].sort((a, b) => a - b); // Ensure points are in ascending order
});

function handleMaxHeight(height) {
  maxHeight.value = height;
}

// Handle snap point changes
function handleSnapPointChange(index) {
  emit('snap-point-changed', index);
}

// Watch for changes to modelValue prop
watch(() => props.modelValue, (newVal) => {
  isOpen.value = newVal;
});

// Watch for changes to isOpen and emit update
watch(() => isOpen.value, (newVal) => {
  emit('update:modelValue', newVal);
});

// Lifecycle hooks
onMounted(() => {
  // Initialize maxHeight with window height
  maxHeight.value = window.innerHeight;
  
  // Handle initial open state
  if (props.modelValue) {
    // Only open if modelValue is true initially
    nextTick(() => open());
  }
  
  // Update dimensions on resize
  const updateMaxHeight = () => {
    maxHeight.value = window.innerHeight;
  };
  
  window.addEventListener('resize', updateMaxHeight);
  
  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateMaxHeight);
  });
});

// Methods to control the bottom sheet
function open() {
  if (bottomSheet.value) {
    isOpen.value = true;
    bottomSheet.value.open();
  }
}

function close() {
  if (bottomSheet.value) {
    bottomSheet.value.close();
  }
}

function onOpened() {
  // Snap to default point on open
  if (bottomSheet.value) {
    nextTick(() => {
      bottomSheet.value.snapToPoint(defaultSnapPoint.value);
    });
  }
}

function onClosed() {
  emit('close');
  
  // Reset to default snap point for next opening
  nextTick(() => {
    if (bottomSheet.value) {
      bottomSheet.value.snapToPoint(defaultSnapPoint.value);
    }
  });
}

// Share handler
function handleShare() {
  if (!props.walk) return;

  const walkPath = props.walk.slug
    ? `/${props.walk.slug}`
    : `/walk/${props.walk.id}`;

  const shareUrl = `${window.location.origin}${walkPath}`;

  if (navigator.share) {
    navigator
      .share({
        title: props.walk.title || props.walk.walk_name,
        text: props.walk.description,
        url: shareUrl,
      })
      .catch(console.error);
  } else {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        // Success message could be shown here
      })
      .catch(console.error);
  }
}
</script>

<style>
.mobile-walk-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

.mobile-walk-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 16px 24px;
}

/* Ensure bottom sheet accounts for mobile navigation */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__content) {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
}

/* Smooth transition overrides */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__container) {
  transition: transform var(--md-sys-motion-duration-medium2, 320ms) 
              var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1.0));
}

/* Shadow adjustments for MD3 elevation */  
.mobile-walk-drawer-sheet :deep(.bottom-sheet__container--elevation-3) {
  box-shadow: var(--md-sys-elevation-3);
  border-radius: 28px 28px 0 0;
}

/* Make sure the bottom sheet container itself receives pointer events */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__container) {
  pointer-events: auto !important;
  background: rgb(var(--md-sys-color-surface));
}

/* Ensure header and content are clickable too */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__header),
.mobile-walk-drawer-sheet :deep(.bottom-sheet__content) {
  pointer-events: auto;
}

/* Allow passive interaction with map behind the drawer with backdrop */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__backdrop) {
  pointer-events: auto;
}
</style>