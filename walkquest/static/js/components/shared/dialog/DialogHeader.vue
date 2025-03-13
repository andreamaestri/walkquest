<template>
  <div class="md3-dialog-header">
    <h2 class="md3-dialog-title">{{ title }}</h2>
    <button 
      type="button" 
      class="md3-close-button" 
      @click="$emit('close')"
      aria-label="Close"
    >
      <Icon icon="mdi:close" />
    </button>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  title: {
    type: String,
    required: true
  }
})

defineEmits(['close'])
</script>

<style scoped>
.md3-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background-color: rgb(var(--md-sys-color-surface-container));
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.md3-dialog-title {
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-close-button {
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: background-color 0.2s, color 0.2s;
}

.md3-close-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-close-button:active {
  background-color: rgba(var(--md-sys-color-on-surface), 0.12);
}
</style>