<template>
  <Teleport to="#portal-root">
    <Transition name="fade">
      <div 
        v-if="message" 
        class="snackbar-container"
      >
        <div class="snackbar" :class="{ 'show': show }">
          <span class="snackbar-message">{{ message }}</span>
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
  
  // If a message is already showing, hide it first
  if (show.value) {
    hide();
    // Wait for hide animation to complete
    setTimeout(() => {
      message.value = msg;
      requestAnimationFrame(() => {
        show.value = true;
      });
    }, 300);
  } else {
    message.value = msg;
    requestAnimationFrame(() => {
      show.value = true;
    });
  }
  
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

// Expose methods for external use
defineExpose({
  showMessage,
  hide
});

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
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}

.snackbar {
  background-color: #322F35;
  color: #D0BCFF;
  max-height: 48px;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--md-sys-elevation-3);
  max-width: min(24rem, calc(100vw - 2rem));
  margin: 0 auto;
  transform: translateY(100px);
  opacity: 0;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  pointer-events: auto;
  will-change: transform, opacity;
}

.snackbar.show {
  transform: translateY(0);
  opacity: 1;
}

.snackbar-message {
  font-family: 'Inter', system-ui, sans-serif;
  font-optical-sizing: auto;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.25rem;
  letter-spacing: 0.25px;
  color: #F5EFF7;
  flex: 1;
}

.snackbar-close:hover {
  background-color: rgba(208, 188, 255, 0.08);
}

.snackbar-close:active {
  background-color: rgba(208, 188, 255, 0.12);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .snackbar {
    margin-bottom: env(safe-area-inset-bottom, 0px);
  }
}
</style>