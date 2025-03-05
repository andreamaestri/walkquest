<template>
  <BottomSheet 
    ref="bottomSheet"
    :blocking="false"
    :can-swipe-close="false"
    :default-snap-point="0"
    :snap-points="[maxHeight / 4, maxHeight / 1.5, maxHeight]"
    @max-height="(n) => (maxHeight = n)"
    @closed="onClosed"
    @opened="onOpened"
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
import { ref, watch, onMounted, nextTick } from 'vue';
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

const bottomSheet = ref(null);
const isOpen = ref(props.modelValue);
const maxHeight = ref(window.innerHeight);

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
  // Handle initial open state
  if (props.modelValue) {
    nextTick(() => open());
  }
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
  isOpen.value = true;
  emit('update:modelValue', true);
}

function onClosed() {
  isOpen.value = false;
  emit('update:modelValue', false);
  emit('close');
  
  // Reset to default snap point for next opening
  nextTick(() => {
    if (bottomSheet.value) {
      bottomSheet.value.snapToPoint(1);
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
/* Improve dragging experience */
.mobile-walk-drawer-sheet :deep([data-expandable="true"]) {
  touch-action: pan-y;
}
</style>