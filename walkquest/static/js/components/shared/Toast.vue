<template>
  <Teleport to="body">
    <Transition name="toast">
      <div 
        v-if="visible"
        class="toast-container"
        :class="[placement, type]"
      >
        <div class="toast">
          <Icon 
            :icon="icon" 
            class="toast-icon"
          />
          <span class="toast-message">{{ message }}</span>
          <button 
            v-if="action"
            class="toast-action"
            @click="$emit('action')"
          >
            {{ action }}
          </button>
          <button 
            class="toast-close"
            @click="$emit('close')"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'success', 'error'].includes(value)
  },
  placement: {
    type: String,
    default: 'bottom',
    validator: (value) => ['top', 'bottom'].includes(value)
  },
  action: {
    type: String,
    default: ''
  }
})

defineEmits(['close', 'action'])

// Compute icon based on type
const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return 'mdi:check-circle'
    case 'error':
      return 'mdi:alert-circle'
    default:
      return 'mdi:information'
  }
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;
}

.toast-container.bottom {
  bottom: 24px;
}

.toast-container.top {
  top: 24px;
}

.toast {
  background-color: rgb(var(--md-sys-color-inverse-surface));
  color: rgb(var(--md-sys-color-inverse-on-surface));
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--md-sys-elevation-3);
  min-width: 280px;
  max-width: 90vw;
  pointer-events: auto;
}

.toast.success {
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.toast.error {
  background-color: rgb(var(--md-sys-color-error-container));
  color: rgb(var(--md-sys-color-on-error-container));
}

.toast-icon {
  flex-shrink: 0;
  font-size: 20px;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  line-height: 20px;
}

.toast-action {
  background: none;
  border: none;
  padding: 8px;
  font-weight: 500;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.1px;
  cursor: pointer;
  color: inherit;
  margin-left: 8px;
}

.toast-close {
  background: none;
  border: none;
  padding: 8px;
  margin: -8px -8px -8px 0;
  border-radius: 50%;
  cursor: pointer;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-close:hover {
  background-color: rgba(var(--md-sys-color-inverse-on-surface), 0.08);
}

/* Toast animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>