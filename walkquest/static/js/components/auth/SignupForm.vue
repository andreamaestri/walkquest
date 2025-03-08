<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="auth-title">Sign Up</h1>
      
      <p class="auth-subtitle">
        Already have an account? <RouterLink to="/login" class="auth-link">Login here.</RouterLink>
      </p>

      <!-- Error display -->
      <div v-if="error" class="md3-error-message">
        <Icon icon="mdi:alert-circle" class="md3-error-icon" />
        <span>{{ error }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
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
              required
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
            'focused': activeField === 'password1',
            'filled': form.password1,
            'error': errors.password1
          }">
            <input 
              id="password1"
              v-model="form.password1"
              :type="showPassword1 ? 'text' : 'password'"
              class="md3-input"
              required
              @focus="activeField = 'password1'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="new-password"
            />
            <label for="password1" class="md3-label">Password</label>
            <button 
              type="button"
              class="password-toggle"
              @click="showPassword1 = !showPassword1"
            >
              <Icon :icon="showPassword1 ? 'mdi:eye-off' : 'mdi:eye'" />
            </button>
            <div class="md3-outline"></div>
          </div>
          <div v-if="errors.password1" class="md3-error-message">{{ errors.password1 }}</div>
        </div>

        <!-- Confirm Password Field -->
        <div class="md3-field-container">
          <div class="md3-text-field" :class="{
            'focused': activeField === 'password2',
            'filled': form.password2,
            'error': errors.password2
          }">
            <input 
              id="password2"
              v-model="form.password2"
              :type="showPassword2 ? 'text' : 'password'"
              class="md3-input"
              required
              @focus="activeField = 'password2'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="new-password"
            />
            <label for="password2" class="md3-label">Confirm Password</label>
            <button 
              type="button"
              class="password-toggle"
              @click="showPassword2 = !showPassword2"
            >
              <Icon :icon="showPassword2 ? 'mdi:eye-off' : 'mdi:eye'" />
            </button>
            <div class="md3-outline"></div>
          </div>
          <div v-if="errors.password2" class="md3-error-message">{{ errors.password2 }}</div>
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            class="md3-button md3-filled-button"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="md3-button-spinner">
              <Icon icon="mdi:loading" class="spinner-icon" />
            </span>
            <span v-else>Sign Up</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Form state
const form = ref({
  email: '',
  password1: '',
  password2: ''
})

const activeField = ref(null)
const showPassword1 = ref(false)
const showPassword2 = ref(false)
const error = ref(null)
const errors = ref({})

// Computed state from store
const isLoading = computed(() => authStore.isLoading)

// Handle form submission
async function handleSubmit() {
  error.value = null
  errors.value = {}

  // Validate passwords match
  if (form.value.password1 !== form.value.password2) {
    errors.value.password2 = 'Passwords do not match'
    return
  }

  try {
    await authStore.signup(form.value.email, form.value.password1, form.value.password2)
  } catch (err) {
    if (err.errors) {
      errors.value = err.errors
    } else {
      error.value = err.message || 'Registration failed. Please try again.'
    }
  }
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: rgb(var(--md-sys-color-surface));
}

.auth-card {
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 28px;
  padding: 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--md-sys-elevation-2);
}

.auth-title {
  font-size: 24px;
  font-weight: 500;
  margin: 0 0 8px;
  color: rgb(var(--md-sys-color-on-surface));
}

.auth-subtitle {
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  margin-bottom: 24px;
}

.auth-link {
  color: rgb(var(--md-sys-color-primary));
  text-decoration: none;
  font-weight: 500;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.md3-field-container {
  margin-bottom: 8px;
}

.md3-text-field {
  position: relative;
  height: 56px;
  width: 100%;
  border-radius: 4px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
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
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgb(var(--md-sys-color-error));
  margin-top: 4px;
  margin-left: 16px;
}

.md3-error-icon {
  font-size: 16px;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.md3-button {
  padding: 0 24px;
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
}

.md3-filled-button {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
}

.md3-filled-button:disabled {
  background-color: rgba(var(--md-sys-color-on-surface), 0.12);
  color: rgba(var(--md-sys-color-on-surface), 0.38);
  cursor: not-allowed;
}

.md3-button-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .auth-card {
    padding: 24px;
  }
}
</style>