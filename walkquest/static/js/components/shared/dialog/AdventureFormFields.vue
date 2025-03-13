<template>
  <div class="adventure-form-fields">
    <div class="md3-text-field-container">
      <label for="adventure-title" class="md3-text-field-label">Adventure Title</label>
      <div 
        class="md3-text-field"
        :class="{ 
          'focused': activeField === 'title',
          'error': errors.title
        }"
      >
        <input
          id="adventure-title"
          type="text"
          class="md3-text-field-input"
          :value="title"
          @input="$emit('update:title', $event.target.value)"
          @focus="$emit('update:active-field', 'title')"
          @blur="$emit('update:active-field', null)"
          placeholder="Enter adventure title"
        />
      </div>
      <div v-if="errors.title" class="md3-text-field-error">
        {{ errors.title }}
      </div>
      <div v-else class="md3-text-field-helper">
        Required. Maximum 100 characters.
      </div>
    </div>
    
    <div class="md3-text-field-container mt-4">
      <label for="adventure-description" class="md3-text-field-label">Description</label>
      <div 
        class="md3-text-field textarea"
        :class="{ 
          'focused': activeField === 'description',
          'error': errors.description
        }"
      >
        <textarea
          id="adventure-description"
          class="md3-text-field-input"
          :value="description"
          @input="$emit('update:description', $event.target.value)"
          @focus="$emit('update:active-field', 'description')"
          @blur="$emit('update:active-field', null)"
          rows="4"
          placeholder="Describe your adventure"
        ></textarea>
      </div>
      <div v-if="errors.description" class="md3-text-field-error">
        {{ errors.description }}
      </div>
      <div v-else class="md3-text-field-helper">
        Optional. Maximum 500 characters.
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  activeField: {
    type: String,
    default: null
  },
  errors: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['update:title', 'update:description', 'update:active-field'])
</script>

<style scoped>
.adventure-form-fields {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.md3-text-field-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.md3-text-field-label {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-bottom: 4px;
}

.md3-text-field {
  position: relative;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-radius: 4px;
  border: 1px solid rgba(var(--md-sys-color-outline), 0.5);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.md3-text-field.focused {
  border-color: rgb(var(--md-sys-color-primary));
  box-shadow: 0 0 0 2px rgba(var(--md-sys-color-primary), 0.2);
}

.md3-text-field.error {
  border-color: rgb(var(--md-sys-color-error));
}

.md3-text-field-input {
  width: 100%;
  padding: 16px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: rgb(var(--md-sys-color-on-surface));
}

.md3-text-field-input:focus {
  outline: none;
}

.md3-text-field.textarea {
  min-height: 120px;
}

.md3-text-field-input::placeholder {
  color: rgba(var(--md-sys-color-on-surface), 0.6);
}

.md3-text-field-helper {
  font-size: 12px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-top: 4px;
}

.md3-text-field-error {
  font-size: 12px;
  color: rgb(var(--md-sys-color-error));
  margin-top: 4px;
}

.mt-4 {
  margin-top: 16px;
}
</style>