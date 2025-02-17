<template>
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    leave-active-class="transition-opacity duration-150 ease-in"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm"
    >
      <div class="m3-loading-container">
        <div class="m3-circular-progress" role="progressbar">
          <svg class="m3-circular-progress-svg" viewBox="0 0 48 48">
            <circle
              class="m3-circular-progress-track"
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke-width="4"
            />
            <circle
              class="m3-circular-progress-indicator"
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke-width="4"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <span v-if="message" class="m3-loading-message">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')

// Methods exposed to parent components
const show = (msg = '') => {
  message.value = msg
  visible.value = true
}

const hide = () => {
  visible.value = false
  message.value = ''
}

// Expose methods to parent
defineExpose({
  show,
  hide
})
</script>

<style>
.m3-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.m3-circular-progress {
  width: 48px;
  height: 48px;
  animation: rotate 1.4s linear infinite;
}

.m3-circular-progress-svg {
  width: 100%;
  height: 100%;
}

.m3-circular-progress-track {
  stroke: rgb(var(--md-sys-color-surface-container-highest));
}

.m3-circular-progress-indicator {
  stroke: rgb(var(--md-sys-color-primary));
  stroke-dasharray: 126;
  stroke-dashoffset: 126;
  animation: progress 1.4s ease-in-out infinite;
}

.m3-loading-message {
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: rgb(var(--md-sys-color-on-surface));
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes progress {
  0% {
    stroke-dashoffset: 126;
  }
  50% {
    stroke-dashoffset: 32;
  }
  100% {
    stroke-dashoffset: 126;
  }
}
</style>