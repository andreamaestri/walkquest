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
import { nextTick } from 'vue'
import { useAnimations } from '../../../composables/useAnimations'
import { animate } from 'motion'  // Add this import for the animate function
const { } = useAnimations()

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
    validator: (value) => {
      return Array.isArray(value) && value.every(item => typeof item === 'string')
    }
  },
  availableCategories: {
    type: Array,
    required: true,
    validator: (value) => {
      return Array.isArray(value) && value.every(cat => 'slug' in cat && 'name' in cat)
    }
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
        animate(chip, { 
          scale: [1, 0.95, 1],
          backgroundColor: [
            'var(--md-sys-color-secondary-container)',
            'var(--md-sys-color-surface-container)'
          ]
        }, { duration: 0.25, ease: [0.2, 0, 0, 1] })
      } else {
        // Animate selection
        animate(chip, { 
          scale: [1, 1.05, 1],
          backgroundColor: [
            'var(--md-sys-color-surface-container)',
            'var(--md-sys-color-secondary-container)'
          ]
        }, { duration: 0.25, ease: [0.2, 0, 0, 1] })
      }
    }
  })
}
</script>

<style scoped>
.md3-section {
  background-color: var(--md-sys-color-surface-container-low);
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
  color: var(--md-sys-color-primary);
}

.md3-section-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  color: var(--md-sys-color-on-surface);
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
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid color-mix(in srgb, var(--md-sys-color-outline) 40%, transparent);
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
  background: radial-gradient(circle at center, color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.md3-category-chip:hover {
  background-color: var(--md-sys-color-surface-container-high);
  transform: translateY(-1px);
  box-shadow: var(--md-sys-elevation-1);
}

.md3-category-chip:hover::before {
  opacity: 1;
}

.md3-category-chip.selected {
  background-color: var(--md-sys-color-secondary-container);
  border-color: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary-container);
}

.md3-category-text {
  font-size: 14px;
}

.md3-category-check {
  font-size: 16px;
}

.md3-error-message {
  font-size: 12px;
  color: var(--md-sys-color-error);
  margin-top: 8px;
  margin-left: 4px;
}
</style>