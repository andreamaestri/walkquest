<template>
  <div class="md3-form-actions">
    <button 
      type="button" 
      class="md3-button md3-text-button" 
      @click="$emit('cancel')"
    >
      Cancel
    </button>
    <button 
      type="submit" 
      class="md3-button md3-filled-button"
      :disabled="isSubmitting"
    >
      <span v-if="isSubmitting" class="md3-button-spinner">
        <Icon icon="mdi:loading" class="spinner-icon" />
      </span>
      <span v-else>Log Adventure</span>
    </button>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  isSubmitting: {
    type: Boolean,
    default: false
  }
})

defineEmits(['cancel'])
</script>

<style scoped>
/* Action Buttons */
.md3-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background-color: var(--md-sys-color-surface-container-high);
  border-top: 1px solid color-mix(in srgb, var(--md-sys-color-outline) 10%, transparent);
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.md3-button {
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.1px;
}

.md3-filled-button {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-filled-button:hover {
  background-color: var(--md-sys-color-primary);
  filter: brightness(1.1);
  box-shadow: var(--md-sys-elevation-2);
}

.md3-filled-button:active {
  transform: scale(0.98);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-filled-button:disabled {
  background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  box-shadow: none;
  cursor: not-allowed;
}

.md3-text-button {
  background-color: transparent;
  color: var(--md-sys-color-primary);
}

.md3-text-button:hover {
  background-color: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
}

.md3-text-button:active {
  transform: scale(0.98);
  background-color: color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent);
}

.md3-button-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

.spinner-icon {
  font-size: 18px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>