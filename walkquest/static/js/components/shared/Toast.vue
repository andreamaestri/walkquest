<template>
  <Teleport to="#portal-root">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id" 
          class="toast" 
          :class="getToastClass(toast.type)"
          @click="dismissToast(toast.id)"
        >
          <div class="toast-icon">
            <Icon :icon="getIconForType(toast.type)" />
          </div>
          <div class="toast-content">
            <p class="toast-message">{{ toast.message }}</p>
          </div>
          <button class="toast-dismiss" @click.stop="dismissToast(toast.id)" aria-label="Dismiss">
            <Icon icon="mdi:close" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useToastStore } from '../../stores/toast';

const toastStore = useToastStore();

// Get toasts from store
const toasts = computed(() => toastStore.messages);

// Get icon for toast type
function getIconForType(type) {
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
}

// Get CSS class for toast type
function getToastClass(type) {
  return `toast-${type}`;
}

// Dismiss a toast
function dismissToast(id) {
  toastStore.dismiss(id);
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1050;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: calc(100vw - 32px);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  box-shadow: var(--md-sys-elevation-2);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-success {
  background-color: rgb(var(--md-sys-color-success-container));
  color: rgb(var(--md-sys-color-on-success-container));
}

.toast-error {
  background-color: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
}

.toast-warning {
  background-color: rgb(var(--md-sys-color-warning-container, 255, 251, 232));
  color: rgb(var(--md-sys-color-on-warning-container, 52, 46, 0));
}

.toast-info {
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 12px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.toast-dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  color: currentColor;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.toast-dismiss:hover {
  opacity: 1;
}

/* Toast animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Mobile adjustments */
@media (max-width: 600px) {
  .toast-container {
    top: auto;
    bottom: 16px;
    left: 16px;
    right: 16px;
  }
  
  .toast {
    width: 100%;
    max-width: 100%;
  }
}
</style>