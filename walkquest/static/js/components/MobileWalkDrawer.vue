<template>
  <BottomSheet 
    ref="bottomSheet"
    v-model="isOpen"
    :can-overlay-close="true"
    :snap-points="[300, 500, '90vh']"
    :default-snap-point="500"
    @opened="onOpened"
    @closed="onClosed"
  >
    <template #header>
      <WalkDrawerHeader 
        :walk="walk" 
        :isMobile="true"
        @close="close"
      >
        <template #header-image>
          <div class="mobile-walk-header__image-container">
            <img 
              v-if="walk.image_url" 
              :src="walk.image_url" 
              :alt="walk.title" 
              class="mobile-walk-header__image"
            />
            <div v-else class="mobile-walk-header__placeholder">
              <Icon icon="mdi:image-outline" class="placeholder-icon" />
            </div>
          </div>
        </template>
      </WalkDrawerHeader>
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
import { ref, watch, onMounted } from 'vue';
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
  if (props.modelValue) {
    open();
  }
});

// Methods to control the bottom sheet
function open() {
  if (bottomSheet.value) {
    bottomSheet.value.open();
  }
}

function close() {
  if (bottomSheet.value) {
    bottomSheet.value.close();
  }
}

function onOpened() {
  // Any additional logic when sheet is opened
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

.mobile-walk-header__image-container {
  width: 100%;
  height: 180px;
  overflow: hidden;
  margin: 8px 0 16px;
  border-radius: 16px;
  background-color: rgb(var(--md-sys-color-surface-variant));
}

.mobile-walk-header__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mobile-walk-header__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.placeholder-icon {
  font-size: 48px;
  opacity: 0.5;
}

.mobile-walk-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 16px 24px;
}
</style>