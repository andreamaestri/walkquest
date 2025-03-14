<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ mode === 'create' ? 'Create New Adventure' : 'Edit Adventure' }}</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Close">
          <Icon icon="mdi:close" />
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="handleSubmit" class="adventure-form">
          <!-- Title Field -->
          <div class="form-group">
            <label for="adventure-title">Title <span class="required">*</span></label>
            <input 
              id="adventure-title"
              v-model="form.title"
              type="text"
              class="form-input"
              :class="{ 'error': validationErrors.title }"
              placeholder="Enter adventure title"
              required
            />
            <p v-if="validationErrors.title" class="error-text">{{ validationErrors.title }}</p>
          </div>
          
          <!-- Description Field -->
          <div class="form-group">
            <label for="adventure-description">Description</label>
            <textarea
              id="adventure-description"
              v-model="form.description"
              class="form-textarea"
              :class="{ 'error': validationErrors.description }"
              rows="4"
              placeholder="Describe your adventure"
            ></textarea>
            <p v-if="validationErrors.description" class="error-text">{{ validationErrors.description }}</p>
          </div>
          
          <!-- Location Fields -->
          <div class="form-row">
            <div class="form-group">
              <label for="adventure-start-location">Start Location <span class="required">*</span></label>
              <input
                id="adventure-start-location"
                v-model="form.start_location"
                type="text"
                class="form-input"
                :class="{ 'error': validationErrors.start_location }"
                placeholder="Starting point"
                required
              />
              <p v-if="validationErrors.start_location" class="error-text">{{ validationErrors.start_location }}</p>
            </div>
            
            <div class="form-group">
              <label for="adventure-end-location">End Location</label>
              <input
                id="adventure-end-location"
                v-model="form.end_location"
                type="text"
                class="form-input"
                :class="{ 'error': validationErrors.end_location }"
                placeholder="Ending point (optional)"
              />
              <p v-if="validationErrors.end_location" class="error-text">{{ validationErrors.end_location }}</p>
            </div>
          </div>
          
          <!-- Distance and Duration Fields -->
          <div class="form-row">
            <div class="form-group">
              <label for="adventure-distance">Distance (km)</label>
              <input
                id="adventure-distance"
                v-model.number="form.distance"
                type="number"
                step="0.1"
                min="0"
                class="form-input"
                :class="{ 'error': validationErrors.distance }"
                placeholder="Distance in kilometers"
              />
              <p v-if="validationErrors.distance" class="error-text">{{ validationErrors.distance }}</p>
            </div>
            
            <div class="form-group">
              <label for="adventure-duration">Est. Duration (min)</label>
              <input
                id="adventure-duration"
                v-model.number="form.duration"
                type="number"
                step="1"
                min="0"
                class="form-input"
                :class="{ 'error': validationErrors.duration }"
                placeholder="Time in minutes"
              />
              <p v-if="validationErrors.duration" class="error-text">{{ validationErrors.duration }}</p>
            </div>
          </div>
          
          <!-- Difficulty Select -->
          <div class="form-group">
            <label for="adventure-difficulty">Difficulty</label>
            <select
              id="adventure-difficulty"
              v-model="form.difficulty"
              class="form-select"
              :class="{ 'error': validationErrors.difficulty }"
            >
              <option value="">Select difficulty</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="challenging">Challenging</option>
              <option value="difficult">Difficult</option>
            </select>
            <p v-if="validationErrors.difficulty" class="error-text">{{ validationErrors.difficulty }}</p>
          </div>
          
          <!-- Public/Private Toggle -->
          <div class="form-group">
            <label class="switch-label">
              <span>Visibility</span>
              <div class="toggle-container">
                <span class="toggle-label">Private</span>
                <div class="toggle-switch">
                  <input
                    type="checkbox"
                    id="adventure-public"
                    v-model="form.is_public"
                  />
                  <label for="adventure-public"></label>
                </div>
                <span class="toggle-label">Public</span>
              </div>
            </label>
            <p class="help-text">{{ form.is_public ? 'Anyone can view this adventure' : 'Only you can view this adventure' }}</p>
          </div>
          
          <!-- Form Buttons -->
          <div class="form-actions">
            <button
              type="button"
              class="btn cancel-btn"
              @click="$emit('close')"
              :disabled="isSubmitting"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn submit-btn"
              :disabled="isSubmitting"
            >
              <Icon v-if="isSubmitting" icon="mdi:loading" class="loading-icon" />
              <span>{{ mode === 'create' ? 'Create Adventure' : 'Save Changes' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
  adventure: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'create',
    validator: (value) => ['create', 'edit'].includes(value)
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'save']);

// Initialize form with default values or existing adventure data
const form = ref({
  title: '',
  description: '',
  start_location: '',
  end_location: '',
  distance: null,
  duration: null,
  difficulty: '',
  is_public: false
});

// Validation errors state
const validationErrors = ref({});

// Initialize form with adventure data if provided (for editing)
watch(() => props.adventure, (newVal) => {
  if (newVal) {
    form.value = {
      title: newVal.title || '',
      description: newVal.description || '',
      start_location: newVal.start_location || '',
      end_location: newVal.end_location || '',
      distance: newVal.distance || null,
      duration: newVal.duration || null,
      difficulty: newVal.difficulty || '',
      is_public: newVal.is_public || false
    };
  }
}, { immediate: true });

// Form submission handler
const handleSubmit = () => {
  // Reset validation errors
  validationErrors.value = {};
  
  // Validate form
  let isValid = true;
  
  if (!form.value.title.trim()) {
    validationErrors.value.title = 'Title is required';
    isValid = false;
  } else if (form.value.title.length > 100) {
    validationErrors.value.title = 'Title cannot exceed 100 characters';
    isValid = false;
  }
  
  if (form.value.description && form.value.description.length > 1000) {
    validationErrors.value.description = 'Description cannot exceed 1000 characters';
    isValid = false;
  }
  
  if (!form.value.start_location.trim()) {
    validationErrors.value.start_location = 'Start location is required';
    isValid = false;
  }
  
  if (form.value.distance !== null && (isNaN(form.value.distance) || form.value.distance < 0)) {
    validationErrors.value.distance = 'Distance must be a positive number';
    isValid = false;
  }
  
  if (form.value.duration !== null && (isNaN(form.value.duration) || form.value.duration < 0)) {
    validationErrors.value.duration = 'Duration must be a positive number';
    isValid = false;
  }
  
  // If form is valid, emit save event with form data
  if (isValid) {
    emit('save', {
      ...form.value,
      // Convert numeric string values to numbers
      distance: form.value.distance !== null ? Number(form.value.distance) : null,
      duration: form.value.duration !== null ? Number(form.value.duration) : null
    });
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 28px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--md-sys-elevation-3);
  animation: modal-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgb(var(--md-sys-color-outline));
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  color: rgb(var(--md-sys-color-on-surface));
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(90vh - 70px);
}

.adventure-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

label {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.required {
  color: rgb(var(--md-sys-color-error));
}

.form-input,
.form-textarea,
.form-select {
  padding: 0.75rem;
  border: 1px solid rgb(var(--md-sys-color-outline));
  border-radius: 8px;
  background-color: rgb(var(--md-sys-color-surface-container));
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: rgb(var(--md-sys-color-primary));
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--md-sys-color-primary), 0.2);
}

.form-input.error,
.form-textarea.error,
.form-select.error {
  border-color: rgb(var(--md-sys-color-error));
}

.error-text {
  color: rgb(var(--md-sys-color-error));
  font-size: 0.8rem;
  margin: 0.25rem 0 0;
}

.help-text {
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-size: 0.8rem;
  margin: 0.25rem 0 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.submit-btn {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
}

.submit-btn:hover:not(:disabled) {
  background-color: rgb(var(--md-sys-color-primary-container));
  color: rgb(var(--md-sys-color-on-primary-container));
}

.cancel-btn {
  background-color: transparent;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.cancel-btn:hover:not(:disabled) {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Toggle switch styles */
.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-label {
  font-size: 0.8rem;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border: 1px solid rgb(var(--md-sys-color-outline));
  transition: .2s;
  border-radius: 34px;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: rgb(var(--md-sys-color-outline));
  transition: .2s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: rgb(var(--md-sys-color-primary-container));
  border-color: rgb(var(--md-sys-color-primary));
}

.toggle-switch input:checked + label:before {
  background-color: rgb(var(--md-sys-color-primary));
  transform: translateX(20px);
}

/* Loading animation */
.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal-container {
    border-radius: 24px 24px 0 0;
    margin-top: auto;
    margin-bottom: 0;
    max-height: 85vh;
  }
  
  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>