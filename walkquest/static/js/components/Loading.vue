<template>
  <div class="loading-overlay" role="alert" aria-live="polite">
    <div class="loading-content">
      <div class="loading-spinner">
        <M3LoadingIndicator :size="56" contained />
      </div>
      <div v-if="message" class="loading-message">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useUiStore } from '../stores/ui'
import M3LoadingIndicator from './m3/M3LoadingIndicator.vue'

const uiStore = useUiStore()
const message = ref('')

const startLoading = (msg = '') => {
  message.value = msg
}

const stopLoading = () => {
  message.value = ''
}

defineExpose({
  startLoading,
  stopLoading
})

// Watch loading states to provide specific feedback
watch(() => uiStore.loadingStates, (states) => {
  if (states.walks) {
    startLoading('Loading walks...')
  } else if (states.location) {
    startLoading('Finding nearby walks...')
  } else if (states.map) {
    startLoading('Loading map...')
  } else if (states.search) {
    startLoading('Searching...')
  } else {
    stopLoading()
  }
}, { deep: true })
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--md-sys-color-surface) 90%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  background: var(--md-sys-color-surface-container);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  color: var(--md-sys-color-primary);
}

.loading-message {
  color: var(--md-sys-color-on-surface);
  font-size: 1rem;
}
</style>
