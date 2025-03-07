<!-- AuthModal.vue -->
<template>
  <Teleport to="#portal-root">
    <Transition name="fade">
      <div v-if="isOpen" class="auth-overlay" @click="handleScrimClick">
        <div ref="modalRef" class="auth-modal" :class="{ 'mobile': isMobile }">
          <!-- Modal Header -->
          <div class="auth-header">
            <h2 class="auth-title">{{ isSignup ? 'Create Account' : 'Sign In' }}</h2>
            <button class="close-button" @click="handleClose">
              <Icon icon="mdi:close" />
            </button>
          </div>

          <!-- Modal Content -->
          <div class="auth-content">
            <form @submit.prevent="handleSubmit" class="auth-form">
              <div class="form-scroll-container">
                <!-- Email Field -->
                <div class="md3-field-container">
                  <div class="md3-text-field" :class="{ 
                    'focused': activeField === 'email',
                    'filled': form.email,
                    'error': errors.email 
                  }">
                    <input 
                      id="email"
                      v-model="form.email" 
                      type="email" 
                      class="md3-input"
                      @focus="activeField = 'email'"
                      @blur="activeField = null"
                      placeholder=" "
                    />
                    <label for="email" class="md3-label">Email</label>
                    <div class="md3-outline"></div>
                  </div>
                  <div v-if="errors.email" class="md3-error-message">{{ errors.email }}</div>
                </div>

                <!-- Password Field -->
                <div class="md3-field-container">
                  <div class="md3-text-field" :class="{
                    'focused': activeField === 'password',
                    'filled': form.password,
                    'error': errors.password
                  }">
                    <input 
                      id="password"
                      v-model="form.password" 
                      :type="showPassword ? 'text' : 'password'"
                      class="md3-input"
                      @focus="activeField = 'password'"
                      @blur="activeField = null"
                      placeholder=" "
                    />
                    <label for="password" class="md3-label">Password</label>
                    <button 
                      type="button"
                      class="password-toggle"
                      @click="showPassword = !showPassword"
                    >
                      <Icon :icon="showPassword ? 'mdi:eye-off' : 'mdi:eye'" />
                    </button>
                    <div class="md3-outline"></div>
                  </div>
                  <div v-if="errors.password" class="md3-error-message">{{ errors.password }}</div>
                </div>

                <!-- Confirm Password Field (Signup only) -->
                <div v-if="isSignup" class="md3-field-container">
                  <div class="md3-text-field" :class="{
                    'focused': activeField === 'confirmPassword',
                    'filled': form.confirmPassword,
                    'error': errors.confirmPassword
                  }">
                    <input 
                      id="confirmPassword"
                      v-model="form.confirmPassword" 
                      :type="showPassword ? 'text' : 'password'"
                      class="md3-input"
                      @focus="activeField = 'confirmPassword'"
                      @blur="activeField = null"
                      placeholder=" "
                    />
                    <label for="confirmPassword" class="md3-label">Confirm Password</label>
                    <div class="md3-outline"></div>
                  </div>
                  <div v-if="errors.confirmPassword" class="md3-error-message">{{ errors.confirmPassword }}</div>
                </div>

                <!-- General Submit Error -->
                <div v-if="errors.submit" class="md3-submit-error">
                  <Icon icon="mdi:alert-circle" class="md3-error-icon" />
                  <span>{{ errors.submit }}</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="md3-form-actions">
                <button 
                  type="button" 
                  class="md3-button md3-text-button" 
                  @click="toggleMode"
                >
                  {{ isSignup ? 'Already have an account?' : 'Need an account?' }}
                </button>
                <button 
                  type="submit" 
                  class="md3-button md3-filled-button"
                  :disabled="isSubmitting"
                >
                  <span v-if="isSubmitting" class="md3-button-spinner">
                    <Icon icon="mdi:loading" class="spinner-icon" />
                  </span>
                  <span v-else>{{ isSignup ? 'Sign Up' : 'Sign In' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '../../stores/ui'
import { animate } from 'motion'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'submit'])

// Store access
const uiStore = useUiStore()
const isMobile = computed(() => uiStore.isMobile)

// Component refs
const modalRef = ref(null)

// Form state
const isSignup = ref(false)
const isSubmitting = ref(false)
const activeField = ref(null)
const showPassword = ref(false)

const form = ref({
  email: '',
  password: '',
  confirmPassword: ''
})

const errors = ref({
  email: null,
  password: null,
  confirmPassword: null,
  submit: null
})

// Handle form submission
async function handleSubmit() {
  // Clear previous errors
  errors.value = {}
  
  // Basic validation
  if (!form.value.email) {
    errors.value.email = 'Email is required'
  }
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  }
  if (isSignup.value && form.value.password !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
  }

  // If there are any errors, don't submit
  if (Object.keys(errors.value).length > 0) return

  isSubmitting.value = true

  try {
    emit('submit', {
      mode: isSignup.value ? 'signup' : 'login',
      data: {
        email: form.value.email,
        password: form.value.password
      }
    })
  } catch (error) {
    errors.value.submit = error.message || 'An error occurred'
  } finally {
    isSubmitting.value = false
  }
}

// Toggle between login and signup modes
function toggleMode() {
  isSignup.value = !isSignup.value
  errors.value = {}
  
  // Animate the container height change
  if (modalRef.value) {
    try {
      animate(
        modalRef.value,
        {
          height: ['auto', 'auto'],
          scale: [1, 0.98, 1]
        },
        {
          duration: 0.3,
          easing: [0.4, 0, 0.2, 1]
        }
      )
    } catch (error) {
      console.error('Animation error:', error);
    }
  }
}

// Handle close click on scrim
function handleScrimClick(e) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}

// Handle close with animation
function handleClose() {
  if (modalRef.value) {
    try {
      animate(
        modalRef.value,
        {
          scale: [1, 0.95],
          opacity: [1, 0]
        },
        {
          duration: 0.2,
          easing: [0.4, 0, 0.2, 1],
          onComplete: () => {
            emit('close')
            resetForm()
          }
        }
      )
    } catch (error) {
      console.error('Animation error:', error);
      emit('close')
      resetForm()
    }
  } else {
    emit('close')
    resetForm()
  }
}

// Reset form state
function resetForm() {
  form.value = {
    email: '',
    password: '',
    confirmPassword: ''
  }
  errors.value = {}
  isSignup.value = false
  activeField.value = null
  showPassword.value = false
}

// Keyboard event handler
function handleKeydown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Watch for isOpen changes to handle animations
watch(() => props.isOpen, (newValue) => {
  if (newValue && modalRef.value) {
    // Modal is opening, animate in
    try {
      nextTick(() => {
        animate(
          modalRef.value,
          {
            scale: [0.95, 1],
            opacity: [0, 1]
          },
          {
            duration: 0.2,
            easing: [0.4, 0, 0.2, 1]
          }
        )
      })
    } catch (error) {
      console.error('Animation error:', error);
    }
  }
})
</script>

<style scoped>
.auth-overlay {
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
  padding: 16px;
  overflow: hidden;
  backdrop-filter: blur(3px);
}

.auth-modal {
  background-color: rgb(var(--md-sys-color-surface));
  color: rgb(var(--md-sys-color-on-surface));
  border-radius: 28px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  box-shadow: var(--md-sys-elevation-3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  will-change: transform, opacity;
}

.auth-modal.mobile {
  max-width: 100%;
  max-height: 98vh;
  width: 100%;
  border-radius: 28px;
}

.auth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.1);
  background-color: rgb(var(--md-sys-color-surface-container-high));
  flex-shrink: 0;
}

.auth-title {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  letter-spacing: -0.5px;
}

.close-button {
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface-variant));
  transition: background-color 0.2s;
  margin-right: -8px;
}

.close-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
}

.close-button:active {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.12);
  transform: scale(0.95);
}

.auth-content {
  flex: 1;
  overflow-y: auto;
}

.auth-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.form-scroll-container {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.md3-field-container {
  margin-bottom: 8px;
}

.md3-text-field {
  position: relative;
  height: 56px;
  width: 100%;
  border-radius: 4px;
  background-color: rgb(var(--md-sys-color-surface-container));
  transition: all 0.2s;
}

.md3-text-field.focused {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

.md3-input {
  width: 100%;
  height: 100%;
  padding: 24px 16px 8px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: rgb(var(--md-sys-color-on-surface));
  outline: none;
}

.md3-label {
  position: absolute;
  left: 16px;
  top: 18px;
  font-size: 16px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  pointer-events: none;
  transition: all 0.2s ease;
}

.md3-text-field.focused .md3-label,
.md3-text-field.filled .md3-label {
  transform: translateY(-10px) scale(0.75);
  transform-origin: left;
  color: rgb(var(--md-sys-color-primary));
}

.md3-outline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 4px;
  border: 1px solid rgba(var(--md-sys-color-outline), 0.6);
  pointer-events: none;
  transition: all 0.2s;
}

.md3-text-field.focused .md3-outline {
  border-color: rgb(var(--md-sys-color-primary));
  border-width: 2px;
}

.md3-text-field.error .md3-outline {
  border-color: rgb(var(--md-sys-color-error));
}

.md3-error-message {
  font-size: 12px;
  color: rgb(var(--md-sys-color-error));
  margin-top: 4px;
  margin-left: 16px;
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  padding: 8px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-toggle:hover {
  background-color: rgba(var(--md-sys-color-on-surface-variant), 0.08);
}

.md3-submit-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: rgba(var(--md-sys-color-error-container), 0.7);
  color: rgb(var(--md-sys-color-on-error-container));
}

.md3-error-icon {
  font-size: 20px;
}

.md3-form-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-top: 1px solid rgba(var(--md-sys-color-outline), 0.1);
}

.md3-button {
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.1px;
}

.md3-filled-button {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  box-shadow: var(--md-sys-elevation-1);
}

.md3-filled-button:hover {
  box-shadow: var(--md-sys-elevation-2);
  background-color: rgb(var(--md-sys-color-primary) / 0.92);
}

.md3-filled-button:active {
  box-shadow: var(--md-sys-elevation-1);
  background-color: rgb(var(--md-sys-color-primary) / 0.85);
}

.md3-text-button {
  background: transparent;
  color: rgb(var(--md-sys-color-primary));
}

.md3-text-button:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.08);
}

.md3-button-spinner {
  display: inline-flex;
  animation: spin 1s linear infinite;
}

.spinner-icon {
  font-size: 18px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .form-scroll-container {
    padding: 16px;
    gap: 16px;
  }
  
  .auth-modal {
    border-radius: 24px 24px 0 0;
    max-height: 100vh;
    height: 90vh;
  }
}
</style>