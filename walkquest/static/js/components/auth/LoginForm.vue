<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="auth-title">Login</h1>
      
      <p class="auth-subtitle">
        No account? <RouterLink to="/signup" class="auth-link">Sign up here.</RouterLink>
      </p>

      <!-- Error display -->
      <div v-if="error" class="md3-error-message error-container">
        <Icon icon="mdi:alert-circle" class="md3-error-icon" />
        <span>{{ error }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form" method="post">
        <!-- Add hidden CSRF field -->
        <input type="hidden" name="csrfmiddlewaretoken" :value="csrfToken" />
        
        <!-- Email Field -->
        <div class="md3-field-container">
          <div class="md3-text-field" :class="{
            'focused': activeField === 'login',
            'filled': login,
            'error': errors.login || errors.email
          }">
            <input 
              id="login"
              v-model="login"
              name="login"
              type="email"
              class="md3-input"
              required
              @focus="activeField = 'login'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="username"
            />
            <label for="login" class="md3-label">Email</label>
            <div class="md3-outline"></div>
          </div>
          <div v-if="errors.login" class="md3-error-message">{{ errors.login }}</div>
          <div v-if="errors.email" class="md3-error-message">{{ errors.email }}</div>
        </div>

        <!-- Password Field -->
        <div class="md3-field-container">
          <div class="md3-text-field" :class="{
            'focused': activeField === 'password',
            'filled': password,
            'error': errors.password
          }">
            <input 
              id="password"
              v-model="password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              class="md3-input"
              required
              @focus="activeField = 'password'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="current-password"
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

        <!-- Remember Me Checkbox -->
        <div class="md3-field-container">
          <label class="remember-me">
            <input 
              type="checkbox" 
              name="remember" 
              v-model="remember"
            >
            Remember Me
          </label>
        </div>

        <div class="auth-links">
          <RouterLink to="/password/reset" class="text-link">Forgot your password?</RouterLink>
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            class="md3-button md3-filled-button"
            :disabled="response.fetching"
          >
            <span v-if="response.fetching" class="md3-button-spinner">
              <Icon icon="mdi:loading" class="spinner-icon" />
            </span>
            <span v-else>Login</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Form state
const login = ref('') // Using 'login' instead of 'email' to match Django's field name
const password = ref('')
const remember = ref(false)
const activeField = ref(null)
const showPassword = ref(false)
const error = ref(null)
const errors = ref({})
const response = reactive({ fetching: false, content: null })
const csrfToken = ref('')

// Get CSRF token on component mount
onMounted(() => {
  getCsrfToken()
})

// Get CSRF token from multiple possible sources
function getCsrfToken() {
  // Try to get from meta tag
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  if (metaToken) {
    csrfToken.value = metaToken.getAttribute('content');
    return;
  }
  
  // Try to get from cookie (if it's not httpOnly)
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let cookie of cookieArray) {
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      csrfToken.value = cookie.substring(name.length, cookie.length);
      return;
    }
  }
  
  // Try to get from the hidden input field
  const xcsrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
  if (xcsrfToken) {
    csrfToken.value = xcsrfToken.value;
    return;
  }
  
  // Removed fallback fetch to avoid 404 error
  console.warn("CSRF token not found from meta, cookie, or hidden input.");
}

// Handle form submission
async function handleSubmit() {
  error.value = null
  errors.value = {}
  response.fetching = true
  
  try {
    // Call login and handle success
    const result = await authStore.login(login.value, password.value, remember.value)
    
    // Handle email verification if needed
    if (result && result.needsEmailVerification) {
      // Redirect to email verification page
      router.push('/verify-email')
      return
    }
    
    // Check if user is authenticated
    if (authStore.isAuthenticated) {
      // If we get here, login was successful
      const redirectTo = router.currentRoute.value.query.next || '/'
      router.push(redirectTo)
    } else {
      // Login succeeded but user isn't authenticated yet (might need other verification)
      console.warn('Login succeeded but user not authenticated')
      // Force a fresh auth check to make sure we have the latest state
      await authStore.forceAuthCheck()
      
      if (authStore.needsEmailVerification) {
        router.push('/verify-email')
      } else if (authStore.isAuthenticated) {
        const redirectTo = router.currentRoute.value.query.next || '/'
        router.push(redirectTo)
      } else {
        // Something is wrong, possibly server-side issue
        error.value = 'Login was successful but unable to confirm authentication state'
      }
    }
  } catch (err) {
    if (err.errors) {
      errors.value = err.errors
      response.content = { errors: err.errors }
    } else {
      error.value = err.message || 'Login failed. Please try again.'
    }
  } finally {
    response.fetching = false
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

.error-container {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: rgb(var(--md-sys-color-error-container));
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

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
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

.auth-links {
  display: flex;
  justify-content: flex-end;
  margin-top: -8px;
}

.text-link {
  color: rgb(var(--md-sys-color-primary));
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.text-link:hover {
  text-decoration: underline;
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
