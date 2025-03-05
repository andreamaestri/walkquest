<template>
  <div class="mobile-walk-drawer-sheet">
    <BottomSheet 
      ref="bottomSheetRef"
      :blocking="false"
      :can-swipe-close="false"
      :default-snap-point="300"
      :snap-points="snapPoints"
      :duration="320"
      :expand-on-content-drag="false"
      @max-height="(n) => (maxHeight = n)"
      @closed="onClosed"
      @opened="onOpened"
    >
      <template #header>
        <div class="header-with-handle">
          <div class="drag-handle"></div>
          <WalkDrawerHeader 
            :walk="walk" 
            :isMobile="true"
            @close="close"
            class="walk-drawer-header"
          />
        </div>
      </template>
      
      <div class="walk-drawer-content">
        <WalkDrawerContent 
          :walk="walk"
          :isMobile="true"
          @start-walk="handleStartWalk"
          @save-walk="handleSaveWalk"
          @share="handleShare"
          @directions="() => {}"
          @recenter="$emit('recenter')"
        />
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue';
import BottomSheet from '@douxcode/vue-spring-bottom-sheet'
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

const emit = defineEmits(['update:modelValue', 'close', 'start-walk', 'save-walk', 'directions', 'category-selected', 'recenter']);

const bottomSheetRef = ref(null);
const isOpen = ref(props.modelValue);
const maxHeight = ref(window.innerHeight);

// Function to calculate available height accounting for safe area
function calculateAvailableHeight() {
  // Get the safe area inset from the top of the screen
  const safeAreaTop = window.visualViewport ? 
    parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0 : 0;
  
  return window.innerHeight - safeAreaTop;
}

// Compute snap points based on max height
const snapPoints = computed(() => {
  const height = calculateAvailableHeight()
  return [
    Math.max(300, height / 3),      // Small view
    Math.max(450, height / 2),      // Half view
    Math.max(600, height / 1.5),    // Large view
    height                          // Full height
  ].sort((a, b) => a - b)
})

// Watch for changes to modelValue prop
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    nextTick(() => open());
  } else {
    close();
  }
});

// Watch for changes to isOpen and emit update
watch(() => isOpen.value, (newVal) => {
  emit('update:modelValue', newVal);
});

// Lifecycle hooks
onMounted(() => {
  console.log("MobileWalkDrawer mounted, bottomSheetRef:", bottomSheetRef.value);
  
  // Update max height initially
  maxHeight.value = calculateAvailableHeight();
  
  // Add resize listener
  const handleResize = () => {
    maxHeight.value = calculateAvailableHeight();
  };
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  
  // Cleanup
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
  });
  
  // Handle initial open state
  if (props.modelValue) {
    nextTick(() => open());
  }
});

// Methods to control the bottom sheet
function open() {
  console.log("Opening walk drawer");
  if (bottomSheetRef.value) {
    isOpen.value = true;
    nextTick(() => {
      if (bottomSheetRef.value) {
        bottomSheetRef.value.open();
      }
    });
  }
}

function close() {
  console.log("Closing walk drawer");
  if (bottomSheetRef.value) {
    // Ensure we set the state first before closing
    isOpen.value = false;
    emit('update:modelValue', false);
    
    // Use nextTick to ensure the state has been updated before attempting to close
    nextTick(() => {
      try {
        // Add additional check to prevent null reference error
        if (bottomSheetRef.value) {
          bottomSheetRef.value.close();
        }
      } catch (err) {
        console.error("Error closing bottom sheet:", err);
      }
    });
  }
}

function onOpened() {
  console.log("Walk drawer opened");
  isOpen.value = true;
  emit('update:modelValue', true);
}

function onClosed() {
  console.log("Walk drawer closed");
  isOpen.value = false;
  emit('update:modelValue', false);
  emit('close');
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

// Handler methods to forward events
function handleStartWalk() {
  emit('start-walk');
}

function handleSaveWalk() {
  emit('save-walk');
}

function handleCategorySelected(category) {
  emit('category-selected', category);
}
</script>

<style>
.mobile-walk-drawer-sheet {
  --vsbs-backdrop-bg: rgba(0, 0, 0, 0.5);
  --vsbs-shadow-color: rgba(89, 89, 89, 0.2);
  --vsbs-background: rgb(var(--md-sys-color-surface));
  --vsbs-border-radius: 28px 28px 0 0;
  --vsbs-max-width: 100%;
  --vsbs-border-color: rgba(var(--md-sys-color-outline), 0.12);
  --vsbs-padding-x: 0;
  --vsbs-handle-background: rgba(var(--md-sys-color-on-surface), 0.28);
}

.walk-drawer-bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  min-height: 300px !important;
  height: 100%; 
}

.walk-drawer-header {
  padding-top: 0!important;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.12);
  margin-top: 20px;
}

.walk-drawer-content {
  flex: 1;
  overflow-y: auto;
  height: 100%;
  min-height: 228px;
  padding: 0 16px;
}

/* Ensure bottom sheet accounts for mobile navigation */
.mobile-walk-drawer-sheet :deep([data-vsbs-sheet]) {
  min-height: 300px !important;
  height: auto !important;
  max-height: calc(100vh - var(--sab, 0px)) !important; /* Account for safe area top */
  padding-top: env(safe-area-inset-top, 0px);
}

.mobile-walk-drawer-sheet :deep([data-vsbs-content]) {
  min-height: 300px;
  height: 100% !important; /* Made important to ensure it takes effect */
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  /* Ensure content respects safe areas */
  padding-top: env(safe-area-inset-top, 0px);
  box-sizing: border-box;
}

/* Add missing content-wrapper styles */
.mobile-walk-drawer-sheet :deep([data-vsbs-content-wrapper]) {
  height: 100%; /* Critical height definition */
  overflow: hidden;
}

/* Smooth transition overrides */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__container) {
  transition: transform var(--md-sys-motion-duration-medium2, 320ms) 
              var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1.0));
  background: rgb(var(--md-sys-color-surface));
  pointer-events: auto !important;
  min-height: 300px;
  height: auto; /* Allow container to size properly */
}

/* Shadow adjustments for MD3 elevation */  
.mobile-walk-drawer-sheet :deep(.bottom-sheet__container--elevation-3) {
  box-shadow: var(--md-sys-elevation-3);
  border-radius: 28px 28px 0 0;
}

/* Make sure the bottom sheet container itself receives pointer events */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__header),
.mobile-walk-drawer-sheet :deep(.bottom-sheet__content) {
  pointer-events: auto;
}

/* Allow passive interaction with map behind the drawer with backdrop */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__backdrop) {
  pointer-events: auto;
}

/* Improve dragging experience */
.mobile-walk-drawer-sheet :deep([data-expandable="true"]) {
  touch-action: pan-y;
}

.header-container.mobile {
  border-top-left-radius: 16px!important;
  border-top-right-radius: 16px!important;
  background-color: #EADDFF!important;
}

[data-vsbs-header] {
  padding: 0!important;
  border-top-left-radius: 16px!important;
  border-top-right-radius: 16px!important;
  background-color: #EADDFF!important;
}

/* Drag handle styling */
.header-with-handle {
  position: relative;
  width: 100%;
}

.is-loading::before {
  display: none!important;
}
</style>