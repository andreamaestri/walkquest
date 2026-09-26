<template>
  <Teleport to="#portal-root">
    <Transition name="fade">
      <div 
        v-if="message" 
        class="snackbar-container"
      >
        <div class="snackbar" :class="[`snackbar-${currentType}`, { 'show': show }]">
          <span class="snackbar-icon" v-if="currentType !== 'default'">
            <Icon :icon="getIconForType(currentType)" />
          </span>
          <span class="snackbar-message">{{ message }}</span>
          <button 
            v-if="actionLabel" 
            class="snackbar-action" 
            @click="handleAction"
          >
            {{ actionLabel }}
          </button>
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
const currentType = ref('default'); // default, success, error, info, warning
const actionLabel = ref('');
const actionCallback = ref(null);

// Get icon based on notification type
const getIconForType = (type) => {
  switch (type) {
    case 'success':
      return 'mdi:check-circle';
    case 'error':
      return 'mdi:alert-circle';
    case 'warning':
      return 'mdi:alert';
    case 'info':
    default:
      return 'mdi:information';
  }
};

const showMessage = (msg, type = 'default', duration = props.duration, action = null, actionCb = null) => {
  // Clear any existing timeout
  if (timeout.value) {
    clearTimeout(timeout.value);
  }
  
  // Set action if provided
  actionLabel.value = action || '';
  actionCallback.value = actionCb;
  
  // Set toast type
  currentType.value = type;
  
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
  if (duration > 0) {
    timeout.value = setTimeout(() => {
      hide();
    }, duration);
  }
};

const hide = () => {
  show.value = false;
  setTimeout(() => {
    message.value = '';
    actionLabel.value = '';
    actionCallback.value = null;
  }, 300); // Wait for fade animation
};

const handleAction = () => {
  if (typeof actionCallback.value === 'function') {
    actionCallback.value();
  }
  hide();
};

// Event handler for showing snackbar
const handleSnackbarEvent = (event) => {
  if (event.detail?.message) {
    const { message: msg, type = 'default', duration = props.duration, action, actionCallback: callback } = event.detail;
    showMessage(msg, type, duration, action, callback);
  }
};

// Handle hide all event
const handleHideAll = () => {
  hide();
};

// Expose methods for external use
defineExpose({
  showMessage,
  hide
});

// Listen for snackbar events
onMounted(() => {
  window.addEventListener('snackbar-show', handleSnackbarEvent);
  window.addEventListener('snackbar-hide-all', handleHideAll);
  
  // Process any Django messages on mount
  if (window.djangoMessages?.messages) {
    for (const message of window.djangoMessages.messages) {
      if (message.tags?.includes('md-snackbar')) {
        // Try to determine message type based on Django message tags
        let type = 'default';
        if (message.tags.includes('success')) type = 'success';
        else if (message.tags.includes('error')) type = 'error';
        else if (message.tags.includes('warning')) type = 'warning';
        else if (message.tags.includes('info')) type = 'info';
        
        showMessage(message.message, type);
      }
    }
    // Clear messages after processing
    window.djangoMessages.messages = [];
  }
});

onUnmounted(() => {
  window.removeEventListener('snackbar-show', handleSnackbarEvent);
  window.removeEventListener('snackbar-hide-all', handleHideAll);
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
  background-color: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  min-height: 48px;
  padding: 12px 16px;
  border-radius: var(--md-sys-shape-corner-extra-small);
  font-size: var(--md-sys-typescale-body-medium-size);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--md-sys-elevation-3);
  max-width: min(24rem, calc(100vw - 2rem));
  margin: 0 auto;
  transform: translateY(100px);
  opacity: 0;
  transition: transform var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial),
    opacity var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects);
  pointer-events: auto;
  will-change: transform, opacity;
}

.snackbar.show {
  transform: translateY(0);
  opacity: 1;
}

/* M3 snackbars always use the inverse surface; type is conveyed by the icon. */
.snackbar-success :deep(svg:first-child) { color: var(--md-sys-color-inverse-primary); }
.snackbar-error { box-shadow: inset 4px 0 0 var(--md-sys-color-error), var(--md-sys-elevation-3); }
.snackbar-warning :deep(svg:first-child) { color: var(--md-sys-color-tertiary-container); }
.snackbar-info :deep(svg:first-child) { color: var(--md-sys-color-inverse-primary); }

.snackbar-default :deep(svg:first-child) { color: var(--md-sys-color-inverse-primary); }

.snackbar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.snackbar-message {
  font-family: inherit;
  font-optical-sizing: auto;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.25rem;
  letter-spacing: 0.25px;
  flex: 1;
}

.snackbar-action {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: var(--md-sys-color-inverse-primary);
  padding: 4px 12px;
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
}

.snackbar-close {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: currentColor;
  padding: 6px;
  margin: -6px;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.7;
}

.snackbar-close:hover {
  background-color: color-mix(in srgb, var(--md-sys-color-inverse-on-surface) 8%, transparent);
}

.snackbar-close:active {
  background-color: color-mix(in srgb, var(--md-sys-color-inverse-on-surface) 12%, transparent);
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