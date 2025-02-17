<template>
  <div class="search-view">
    <div class="search-container">
      <div class="search-bar">
        <button class="icon-button leading" aria-label="Search">
          <iconify-icon icon="mdi:magnify" />
        </button>
        
        <div class="search-input-wrapper">
          <input
            type="text"
            :placeholder="placeholder"
            :value="modelValue"
            @input="emit('update:modelValue', $event.target.value)"
            class="search-input"
          />
          <button 
            v-if="modelValue"
            @click="emit('update:modelValue', '')" 
            class="clear-button"
          >
            <iconify-icon icon="mdi:close" />
          </button>
        </div>
      </div>

      <!-- Search status and chips could go here -->
      <div v-if="modelValue" class="search-meta">
        <slot name="meta"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: String,
  placeholder: {
    type: String,
    default: 'Search...'
  }
})

const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.search-view {
  position: relative;
  width: 100%;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.search-bar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 4px;
  background: rgb(var(--md-sys-color-surface-container-low));
  border-radius: 28px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface));
  font-family: inherit;
  font-size: 16px;
}

.search-input:focus {
  outline: none;
}

.icon-button, .clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
  border-radius: 24px;
  transition: all 0.2s ease;
}

.icon-button:hover, .clear-button:hover {
  background: rgb(var(--md-sys-color-on-surface-variant) / 0.08);
}

.search-meta {
  padding: 0 8px;
  font-size: 0.875rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}
</style>
