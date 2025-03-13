<template>
  <div class="md3-section">
    <div class="md3-section-header">
      <Icon icon="mdi:terrain" class="md3-section-icon" />
      <h3 class="md3-section-title">How challenging was your trek?</h3>
    </div>
    
    <div class="md3-difficulty-options">
      <div 
        v-for="level in difficultyLevels" 
        :key="level.value"
        class="md3-difficulty-card"
        :class="{ 'selected': modelValue === level.value }"
        @click="$emit('update:modelValue', level.value)"
      >
        <div class="md3-difficulty-icon-container">
          <Icon :icon="level.icon" class="md3-difficulty-icon" />
        </div>
        <div class="md3-difficulty-label">{{ level.label }}</div>
        <div class="md3-selection-indicator"></div>
      </div>
    </div>
    <div v-if="errors" class="md3-error-message">{{ errors }}</div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { nextTick, watch } from 'vue'
import { useAnimations } from '../../../composables/useAnimations'

const { animateDrawerElement } = useAnimations()

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  difficultyLevels: {
    type: Array,
    required: true
  },
  errors: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue'])

// Watch for changes to animate selection
watch(() => props.modelValue, (newVal) => {
  if (!newVal) return
  
  // Find the selected element and animate it
  nextTick(() => {
    const element = document.querySelector(`.md3-difficulty-card.selected`)
    if (element) {
      animateDrawerElement(element, { 
        scale: [1, 1.05, 1],
        backgroundColor: [
          'rgb(var(--md-sys-color-surface-container))',
          'rgb(var(--md-sys-color-primary-container))'
        ]
      }, { duration: 0.3, easing: [0.2, 0, 0, 1] })
    }
  })
}, { immediate: false })
</script>

<style scoped>
.md3-section {
  background-color: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 16px;
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.md3-section:hover {
  transform: translateY(-2px);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.md3-section-icon {
  font-size: 24px;
  color: rgb(var(--md-sys-color-primary));
}

.md3-section-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
}

/* Difficulty Cards */
.md3-difficulty-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.md3-difficulty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  border-radius: 16px;
  background-color: rgb(var(--md-sys-color-surface-container));
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
  text-align: center;
  border: 1px solid rgba(var(--md-sys-color-outline), 0.3);
}

.md3-difficulty-card:hover {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  transform: translateY(-2px);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-difficulty-card.selected {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
  border-color: rgb(var(--md-sys-color-primary));
}

.md3-difficulty-icon-container {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(var(--md-sys-color-primary), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  transition: all 0.25s;
}

.md3-difficulty-card.selected .md3-difficulty-icon-container {
  background-color: rgba(var(--md-sys-color-primary), 0.2);
  transform: scale(1.1);
}

.md3-difficulty-icon {
  font-size: 24px;
  color: rgb(var(--md-sys-color-primary));
}

.md3-difficulty-label {
  font-size: 14px;
  font-weight: 500;
}

.md3-selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.md3-difficulty-card.selected .md3-selection-indicator {
  border-color: rgb(var(--md-sys-color-primary));
  background-color: rgb(var(--md-sys-color-primary));
}

.md3-difficulty-card.selected .md3-selection-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
}

.md3-error-message {
  font-size: 12px;
  color: rgb(var(--md-sys-color-error));
  margin-top: 8px;
  margin-left: 4px;
}

@media (max-width: 600px) {
  .md3-difficulty-options {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .md3-section {
    padding: 16px;
  }
}
</style>