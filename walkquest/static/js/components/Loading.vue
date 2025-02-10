<template>
  <div>
    <div v-if="isLoading || error" class="loading-overlay">
      <div v-if="isLoading" class="loading-content">
        <div class="loading-spinner"></div>
        <p v-if="message" class="loading-message">{{ message }}</p>
      </div>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, watch } from 'vue'

const isLoading = ref(false)
const error = ref(null)
const message = ref('')
const timeoutId = ref(null)

const startLoading = (msg = '') => {
  isLoading.value = true
  message.value = msg
  error.value = null
}

const stopLoading = (err = null) => {
  isLoading.value = false
  error.value = err
}

const handleError = (err) => {
  console.error('Loading error:', err)
  error.value = err?.message || 'An unexpected error occurred'
  stopLoading(error.value)
}

// Watch for loading state changes
watch(isLoading, (value) => {
  if (!value) {
    timeoutId.value = setTimeout(() => {
      error.value = null
      message.value = ''
    }, 300)
  }
})

// Cleanup on component destruction
onBeforeUnmount(() => {
  if (timeoutId.value) {
    clearTimeout(timeoutId.value)
  }
})

// Expose methods for parent components
defineExpose({
  startLoading,
  stopLoading,
  handleError
})
</script>
