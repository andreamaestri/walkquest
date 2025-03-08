<template>
  <Teleport to="#portal-root">
    <Transition name="fade">
      <div 
        v-if="message" 
        class="snackbar-container"
      >
        <div class="snackbar" :class="{ 'show': show }">
          <span class="snackbar-message">{{ message }}</span>
          <button 
            class="snackbar-close"
            @click="hide"
            aria-label="Close"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
  duration: {
    type: Number,
    default: 5000
  }
});

const message = ref('');
const show = ref(false);
const timeout = ref(null);

const showMessage = (msg) => {
  // Clear any existing timeout
  if (timeout.value) {
    clearTimeout(timeout.value);
  }
  
  message.value = msg;
  show.value = true;
  
  // Auto-hide after duration
  timeout.value = setTimeout(() => {
    hide();
  }, props.duration);
};

const hide = () => {
  show.value = false;
  setTimeout(() => {
    message.value = '';
  }, 300); // Wait for fade animation
};

// Event handler for showing snackbar
const handleSnackbarEvent = (event) => {
  if (event.detail?.message) {
    showMessage(event.detail.message);
  }
};

// Listen for snackbar events
onMounted(() => {
  window.addEventListener('snackbar-show', handleSnackbarEvent);
  
  // Process any Django messages on mount
  if (window.djangoMessages?.messages) {
    for (const message of window.djangoMessages.messages) {
      if (message.tags?.includes('md-snackbar')) {
        showMessage(message.message);
      }
    }
    // Clear messages after processing
    window.djangoMessages.messages = [];
  }
});

onUnmounted(() => {
  window.removeEventListener('snackbar-show', handleSnackbarEvent);
  if (timeout.value) {
    clearTimeout(timeout.value);
  }
});
</script>

<style scoped>
.snackbar-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  pointer-events: none;
}

.snackbar {
  background-color: rgb(var(--md-sys-color-inverse-surface));
  color: rgb(var(--md-sys-color-inverse-on-surface));
  min-height: 48px; /* Single line height */
  padding: 0 16px;
  border-radius: 4px; /* md.sys.shape.corner.extra-small */
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--md-sys-elevation-3);
  max-width: 24rem;
  margin: 0 auto;
  transform: translateY(100%);
  opacity: 0;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  pointer-events: auto;
  padding-bottom: calc(0px + env(safe-area-inset-bottom, 0px));
}

.snackbar.show {
  transform: translateY(0);
  opacity: 1;
}

.snackbar-message {
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size, 0.875rem);
  font-weight: var(--md-sys-typescale-label-large-weight, 500);
  line-height: var(--md-sys-typescale-label-large-line-height, 1.25rem);
  letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
  color: rgb(var(--md-sys-color-inverse-primary));
  flex: 1;
}

.snackbar-close {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-inverse-on-surface));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.snackbar-close:hover {
  background-color: rgba(var(--md-sys-color-inverse-on-surface), 0.08);
}

/* When message has multiple lines */
.snackbar:has(.snackbar-message:not(:empty)) {
  min-height: 68px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>