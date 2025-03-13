<template>
  <div class="md3-section">
    <div class="md3-section-header">
      <Icon icon="mdi:tag-multiple" class="md3-section-icon" />
      <h3 class="md3-section-title">What categories best describe it?</h3>
    </div>
    
    <div class="md3-categories-container">
      <div 
        v-for="category in availableCategories" 
        :key="category.slug"
        class="md3-category-chip"
        :class="{ 'selected': modelValue.includes(category.slug) }"
        :data-slug="category.slug"
        @click="toggleCategory(category.slug)"
      >
        <span class="md3-category-text">{{ category.name }}</span>
        <Icon v-if="modelValue.includes(category.slug)" icon="mdi:check" class="md3-category-check" />
      </div>
    </div>
    <div v-if="errors" class="md3-error-message">{{ errors }}</div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { watch, nextTick } from 'vue'
import { useAnimations } from '../../../composables/useAnimations'
const { animateDrawerElement } = useAnimations()

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  availableCategories: {
    type: Array,
    required: true
  },
  errors: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

// Toggle category selection with animation
function toggleCategory(slug) {
  const wasSelected = props.modelValue.includes(slug)
  const newValue = wasSelected 
    ? props.modelValue.filter(s => s !== slug) 
    : [...props.modelValue, slug]
  
  emit('update:modelValue', newValue)
  
  // Animate the chip after update
  nextTick(() => {
    const chip = document.querySelector(`.md3-category-chip[data-slug="${slug}"]`)
    if (chip) {
      if (wasSelected) {
        // Animate deselection
        animateDrawerElement(chip, { 
          scale: [1, 0.95, 1],
          backgroundColor: [
            'rgb(var(--md-sys-color-secondary-container))',
            'rgb(var(--md-sys-color-surface-container))'
          ]
        }, { duration: 0.25, easing: [0.2, 0, 0, 1] })
      } else {
        // Animate selection
        animateDrawerElement(chip, { 
          scale: [1, 1.05, 1],
          backgroundColor: [
            'rgb(var(--md-sys-color-surface-container))',
            'rgb(var(--md-sys-color-secondary-container))'
          ]
        }, { duration: 0.25, easing: [0.2, 0, 0, 1] })
      }
    }
  })
}
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

/* Categories */
.md3-categories-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.md3-category-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 16px;
  background-color: rgb(var(--md-sys-color-surface-container));
  border: 1px solid rgba(var(--md-sys-color-outline), 0.4);
  cursor: pointer;
  transition: all 0.25s;
  will-change: transform, background-color;
  position: relative;
  overflow: hidden;
}

.md3-category-chip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(var(--md-sys-color-primary), 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.md3-category-chip:hover {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  transform: translateY(-1px);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-category-chip:hover::before {
  opacity: 1;
}

.md3-category-chip.selected {
  background-color: rgb(var(--md-sys-color-secondary-container));
  border-color: rgb(var(--md-sys-color-secondary));
  color: rgb(var(--md-sys-color-on-secondary-container));
}

.md3-category-text {
  font-size: 14px;
}

.md3-category-check {
  font-size: 16px;
}

.md3-error-message {
  font-size: 12px;
  color: rgb(var(--md-sys-color-error));
  margin-top: 8px;
  margin-left: 4px;
}
</style>