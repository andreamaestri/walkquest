<template>
  <div class="md3-toast" role="alert" aria-live="polite">
    <Icon icon="mdi:check-circle-outline" class="md3-toast-icon" />
    <span class="md3-toast-message">{{ message }}</span>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  message: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.md3-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgb(var(--md-sys-color-inverse-surface));
  color: rgb(var(--md-sys-color-inverse-on-surface));
  padding: 12px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--md-sys-elevation-2);
  z-index: 3000;
  animation: toast-appear 0.3s ease;
}

.md3-toast-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.md3-toast-message {
  font-size: 14px;
  font-weight: 500;
}

@keyframes toast-appear {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

@media (max-width: 600px) {
  .md3-toast {
    width: calc(100% - 32px);
    max-width: 100%;
  }
}
</style>