<template>
  <div class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ title }}</h2>
        <button
          class="close-btn"
          @click="$emit('cancel')"
          aria-label="Close"
        >
          <Icon icon="mdi:close" />
        </button>
      </div>
      <div class="modal-body">
        <div class="icon-container" :class="{ 'danger': dangerAction }">
          <Icon :icon="dangerAction ? 'mdi:alert' : 'mdi:help-circle'" />
        </div>
        <p class="message">{{ message }}</p>
      </div>
      <div class="modal-footer">
        <button
          class="btn cancel-btn"
          @click="$emit('cancel')"
          :disabled="isSubmitting"
        >
          {{ cancelText }}
        </button>
        <button
          class="btn confirm-btn"
          :class="{ 'danger': dangerAction }"
          @click="$emit('confirm')"
          :disabled="isSubmitting"
        >
          <Icon v-if="isSubmitting" icon="mdi:loading" class="loading-icon" />
          <span>{{ confirmText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  dangerAction: {
    type: Boolean,
    default: false
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
});

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 28px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-3);
  animation: modal-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline));
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  color: rgb(var(--md-sys-color-on-surface));
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
}

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.icon-container {
  width: 64px;
  height: 64px;
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
  font-size: 36px;
  border-radius: 50%;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-container.danger {
  background-color: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
}

.message {
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 1rem;
  line-height: 1.5;
}

.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid rgb(var(--md-sys-color-outline-variant));
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: transparent;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.cancel-btn:hover:not(:disabled) {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

.confirm-btn {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
}

.confirm-btn:hover:not(:disabled) {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}

.confirm-btn.danger {
  background-color: rgb(var(--md-sys-color-error));
  color: rgb(var(--md-sys-color-on-error));
}

.confirm-btn.danger:hover:not(:disabled) {
  background-color: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Loading animation */
.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal-container {
    border-radius: 24px 24px 0 0;
    margin-top: auto;
    margin-bottom: 0;
    max-height: 85vh;
  }
}
</style>