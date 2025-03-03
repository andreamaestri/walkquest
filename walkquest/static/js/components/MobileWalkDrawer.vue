<template>
  <BottomSheet 
    ref="bottomSheet"
    v-model="isOpen"
    elevation="3"
    :blocking="false"
    :can-swipe-close="false"
    :default-snap-point="defaultSnapPoint"
    :snap-points="snapPoints"
    :expand-on-content-drag="true"
    :duration="320" 
    :scrim-color="scrimColor"
    @max-height="handleMaxHeight"
    @opened="onOpened"
    @closed="onClosed"
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
      @start-walk="$emit('start-walk', walk)"
      @save-walk="$emit('save-walk', walk)"
      @share="handleShare"
      @directions="$emit('directions', walk)"
      @category-selected="$emit('category-selected', $event)"
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

const emit = defineEmits(['update:modelValue', 'close', 'start-walk', 'save-walk', 'directions', 'category-selected', 'map-interaction']);

const bottomSheet = ref(null);
const isOpen = ref(props.modelValue);

// Material Design 3 scrim color with 0.32 opacity
const scrimColor = computed(() => 'rgba(0, 0, 0, 0.32)');

// Sheet height management with bottom nav adjustment
const maxHeight = ref(window.innerHeight);
const navHeight = 80; // Height of the mobile navigation bar
const safeAreaInset = typeof window !== 'undefined' ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0') : 0;
  
// Adjust default snap point to account for navigation bar
const defaultSnapPoint = computed(() => Math.min(500, (maxHeight.value - navHeight) / 2));

// Compute snap points with map interaction behavior
const snapPoints = computed(() => {
  const height = maxHeight.value - navHeight; // Adjust for nav bar
  return [
    Math.min(200, height / 4),         // Peek mode - show map
    Math.min(500, height / 2),         // Half expanded - show map with context
    height                             // Full height - hide map
  ].sort((a, b) => a - b); // Ensure points are in ascending order
});

function handleMaxHeight(height) {
  maxHeight.value = height;
}

// Watch for changes to modelValue prop
watch(() => props.modelValue, (newVal) => {
  isOpen.value = newVal;
});

// Watch for changes to isOpen and emit update
watch(() => isOpen.value, (newVal) => {
  emit('update:modelValue', newVal);
});

// Watch for props.modelValue changes to handle external state changes
watch(() => props.modelValue, (newVal) => {
  if (newVal !== isOpen.value) {
    isOpen.value = newVal;
    if (newVal) {
      nextTick(() => {
        if (bottomSheet.value) {
          bottomSheet.value.snapToPoint(defaultSnapPoint.value);
        }
      });
    }
  }
});

// Watch snap point changes to update map visibility
watch(() => currentSnapPoint.value, (newSnapPoint) => {
  if (props.walk && bottomSheet.value) {
    const height = snapPoints.value[newSnapPoint];
    const maxViewHeight = maxHeight.value - navHeight;
    const visibilityRatio = 1 - (height / maxViewHeight);
    
    // Emit map interaction event
    emit('map-interaction', {
      visibilityRatio,
      isMapVisible: visibilityRatio > 0.3, // Map is visible when sheet is less than 70% of view
      coords: [props.walk.longitude, props.walk.latitude]
    });
  }
});

// Lifecycle hooks
onMounted(() => {
  // Initialize maxHeight
  maxHeight.value = window.innerHeight;
  
  // Handle initial open state
  if (props.modelValue) {
    // Only open if modelValue is true initially
    open();
  }

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
      // Start with peek mode to show the map
      bottomSheet.value.snapToPoint(snapPoints.value[0]);
      
      // Emit map interaction to focus the location
      if (props.walk) {
        emit('map-interaction', {
          visibilityRatio: 0.8, // Show most of the map
          isMapVisible: true,
          coords: [props.walk.longitude, props.walk.latitude]
        });
      }
      
      // After a short delay, expand to half height
      setTimeout(() => {
        bottomSheet.value.snapToPoint(snapPoints.value[1]);
      }, 1000);
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
}

/* Smooth transition overrides */
.mobile-walk-drawer-sheet :deep(.bottom-sheet__container) {
  transition: transform var(--md-sys-motion-duration-medium2, 320ms) var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1.0));
}

/* Shadow adjustments for MD3 elevation */  
.mobile-walk-drawer-sheet :deep(.bottom-sheet__container--elevation-3) {
  box-shadow: var(--md-sys-elevation-3);
}
</style>