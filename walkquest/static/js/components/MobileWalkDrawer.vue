<template>
  <BottomSheet 
    ref="bottomSheet"
    v-model="isOpen"
    elevation="3"
    :can-swipe-close="false"
    :default-snap-point="defaultSnapPoint"
    :snap-points="snapPoints"
    :expand-on-content-drag="true"
    @max-height="handleMaxHeight"
    @opened="onOpened"
    @closed="onClosed"
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
import { ref, watch, onMounted, computed } from 'vue';
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

const emit = defineEmits(['update:modelValue', 'close', 'start-walk', 'save-walk', 'directions', 'category-selected']);

const bottomSheet = ref(null);
const isOpen = ref(props.modelValue);

// Material Design 3 scrim color with 0.32 opacity
const scrimColor = computed(() => 'rgba(0, 0, 0, 0.32)');

// Sheet height management
const maxHeight = ref(window.innerHeight);
const defaultSnapPoint = computed(() => Math.min(500, maxHeight.value / 2));

// Calculate snap points based on max height
const snapPoints = computed(() => {
  const height = maxHeight.value;
  return [
    Math.min(200, height / 4),         // Peeking state
    Math.min(500, height / 2),         // Half expanded
    Math.min(800, height * 0.75),      // Most content visible
    height                             // Full height
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

// Lifecycle hooks
onMounted(() => {
  // Initialize maxHeight
  maxHeight.value = window.innerHeight;
  
  // Handle initial open state
  if (props.modelValue) {
    // Only open if modelValue is true initially
    open();
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
  // Snap to default point on open
  if (bottomSheet.value) {
    nextTick(() => {
      bottomSheet.value.snapToPoint(defaultSnapPoint.value);
    });
  }
}

function onClosed() {
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
</style>