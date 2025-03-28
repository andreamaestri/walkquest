<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="auth-title">Sign Up</h1>
      
      <p class="auth-subtitle">
        Already have an account? <RouterLink to="/login" class="auth-link">Login here.</RouterLink>
      </p>

      <!-- Error display -->
      <div v-if="error" class="md3-error-message error-container">
        <Icon icon="mdi:alert-circle" class="md3-error-icon" />
        <span>{{ error }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Added hidden CSRF field -->
        <input type="hidden" name="csrfmiddlewaretoken" :value="csrfToken" />
        
        <!-- Email Field -->
        <div class="md3-field-container">
          <div class="md3-text-field" :class="{
            'focused': activeField === 'email',
            'filled': email,
            'error': errors.email
          }">
            <input 
              id="email"
              v-model="email"
              type="email"
              class="md3-input"
              required
              @focus="activeField = 'email'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="email"
              name="email"
            />
            <label for="email" class="md3-label">Email</label>
            <div class="md3-outline"></div>
          </div>
          <div v-if="errors.email" class="md3-error-message">
            <Icon icon="mdi:alert-circle" class="md3-error-icon" />
            <span>{{ typeof errors.email === 'string' ? errors.email : errors.email[0] }}</span>
          </div>
        </div>

        <!-- Name Field (Optional) -->
        <div class="md3-field-container">
          <div class="md3-text-field" :class="{
            'focused': activeField === 'name',
            'filled': name,
            'error': errors.name
          }">
            <input 
              id="name"
              v-model="name"
              type="text"
              class="md3-input"
              @focus="activeField = 'name'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="name"
              name="name"
            />
            <label for="name" class="md3-label">Full Name (Optional)</label>
            <div class="md3-outline"></div>
          </div>
          <div v-if="errors.name" class="md3-error-message">
            <Icon icon="mdi:alert-circle" class="md3-error-icon" />
            <span>{{ typeof errors.name === 'string' ? errors.name : errors.name[0] }}</span>
          </div>
        </div>

        <!-- Username Field -->
        <div class="md3-field-container">
          <div class="md3-text-field" :class="{
            'focused': activeField === 'username',
            'filled': username,
            'error': errors.username
          }">
            <input 
              id="username"
              v-model="username"
              type="text"
              class="md3-input"
              required
              @focus="activeField = 'username'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="username"
              name="username"
            />
            <label for="username" class="md3-label">Username</label>
            <div class="md3-outline"></div>
          </div>
          <div v-if="errors.username" class="md3-error-message">
            <Icon icon="mdi:alert-circle" class="md3-error-icon" />
            <span>{{ typeof errors.username === 'string' ? errors.username : errors.username[0] }}</span>
          </div>
        </div>

        <!-- Password Field -->
        <div class="md3-field-container">
          <div class="md3-text-field" :class="{
            'focused': activeField === 'password1',
            'filled': password1,
            'error': errors.password1
          }">
            <input 
              id="password1"
              v-model="password1"
              :type="showPassword1 ? 'text' : 'password'"
              class="md3-input"
              required
              @focus="activeField = 'password1'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="new-password"
              name="password1"
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
          <div v-if="errors.password1" class="md3-error-message">
            <Icon icon="mdi:alert-circle" class="md3-error-icon" />
            <span>{{ typeof errors.password1 === 'string' ? errors.password1 : Array.isArray(errors.password1) ? errors.password1[0] : 'Password is required' }}</span>
          </div>
        </div>

        <!-- Confirm Password Field -->
        <div class="md3-field-container">
          <div class="md3-text-field" :class="{
            'focused': activeField === 'password2',
            'filled': password2,
            'error': errors.password2
          }">
            <input 
              id="password2"
              v-model="password2"
              :type="showPassword2 ? 'text' : 'password'"
              class="md3-input"
              required
              @focus="activeField = 'password2'"
              @blur="activeField = null"
              placeholder=" "
              autocomplete="new-password"
              name="password2"
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
          <div v-if="errors.password2" class="md3-error-message">
            <Icon icon="mdi:alert-circle" class="md3-error-icon" />
            <span>{{ typeof errors.password2 === 'string' ? errors.password2 : Array.isArray(errors.password2) ? errors.password2[0] : 'Confirmation password is required' }}</span>
          </div>
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
            <span v-else>Sign Up</span>
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
const email = ref('')
const name = ref('')  
const username = ref('')  
const password1 = ref('')
const password2 = ref('')
const activeField = ref(null)
const showPassword1 = ref(false)
const showPassword2 = ref(false)
const error = ref(null)
const errors = ref({})
const response = reactive({ fetching: false, content: null })
const csrfToken = ref('')

onMounted(() => {
  // Get CSRF token on mount
  csrfToken.value = getCSRFToken()
})

// Get CSRF token according to Django's recommended method
function getCSRFToken() {
  let token = null
  
  // First try to get from cookie
  const tokenFromCookie = getCookie('csrftoken')
  if (tokenFromCookie) {
    token = tokenFromCookie
  }

  // If not in cookie, try to get from meta tag
  if (!token) {
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
      token = metaTag.getAttribute('content')
    }
  }

  // Finally try the DOM input (this is useful when CSRF_COOKIE_HTTPONLY=True)
  if (!token) {
    const tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]')
    if (tokenInput) {
      token = tokenInput.value
    }
  }

  return token
}

function getCookie(name) {
  let cookieValue = null
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

// Handle form submission
async function handleSubmit() {
  errors.value = {}
  error.value = null
  
  // Client-side validation
  if (!email.value) {
    errors.value.email = 'Email is required'
    return
  }
  
  if (!username.value) {
    errors.value.username = 'Username is required'
    return
  }

  if (!password1.value) {
    errors.value.password1 = 'Password is required'
    return
  }
  
  if (!password2.value) {
    errors.value.password2 = 'Confirmation password is required'
    return
  }

  if (password1.value !== password2.value) {
    errors.value.password2 = 'Passwords do not match'
    return
  }
  
  if (password1.value.length < 8) {
    errors.value.password1 = 'Password must be at least 8 characters'
    return
  }

  response.fetching = true
  
  try {
    // Always get a fresh token before submitting
    const token = getCSRFToken()
    if (!token) {
      throw new Error('CSRF token not available')
    }

    // For debugging
    const requestData = {
      email: email.value,
      username: username.value,
      password1: password1.value,
      password2: password2.value,
      name: name.value || ''
    };
    
    console.log('Signup request data:', requestData);
    
    // Submit using our custom API endpoint
    const res = await fetch('/users/api/signup/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': token,
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      mode: 'same-origin',
      body: JSON.stringify(requestData)
    })

    const responseText = await res.text();
    console.log('Raw response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      error.value = 'Server response was not valid JSON';
      return;
    }
    
    if (!res.ok) {
      // Handle validation errors from API
      console.log('Signup API error response:', data, 'Status:', res.status);
      
      if (data.errors) {
        // Array-style errors format
        if (Array.isArray(data.errors)) {
          data.errors.forEach(error => {
            if (error.param === 'password') {
              // Map password errors to both fields
              errors.value.password1 = error.message;
              errors.value.password2 = error.message;
            } else {
              errors.value[error.param] = error.message;
            }
          });
        } 
        // Django form errors format
        else if (typeof data.errors === 'object') {
          Object.keys(data.errors).forEach(key => {
            if (key === 'password1' || key === 'password2') {
              const errorMsg = Array.isArray(data.errors[key]) 
                ? data.errors[key][0] 
                : data.errors[key];
              errors.value[key] = errorMsg;
            } else {
              const errorMsg = Array.isArray(data.errors[key]) 
                ? data.errors[key][0] 
                : data.errors[key];
              errors.value[key] = errorMsg;
            }
          });
        }
      } 
      // Django field errors in form format
      else if (data.form) {
        Object.keys(data.form).forEach(key => {
          if (data.form[key].errors && data.form[key].errors.length) {
            errors.value[key] = data.form[key].errors[0];
          }
        });
      }
      // Direct error message
      else if (data.message) {
        error.value = data.message;
      } 
      // Default error
      else {
        error.value = 'Signup failed. Please try again.';
      }
      return;
    }

    // Handle successful signup
    if (res.ok) {
      // Check for user data in data.user or data.data.user
      const userData = data.data?.user || data.user;
      
      if (userData) {
        // Store user data in auth store
        authStore.user = userData;
        authStore.isAuthenticated = true;
        authStore.userDataLoaded = true;
        
        // Store session token if provided
        if (data.meta?.session_token) {
          localStorage.setItem('allauth_session_token', data.meta.session_token);
        }

        // Check if email verification is needed
        const needsEmailVerification = 
          (data.status === 401 && data.data?.flows?.includes('verify_email')) || 
          data.email_verification_needed;
          
        if (needsEmailVerification) {
          router.push('/verify-email');
        } else {
          router.push('/');
        }
      } else {
        // Just redirect to home if no user data
        router.push('/');
      }
    }
  } catch (err) {
    console.error('Signup error:', err)
    error.value = err.message || 'Registration failed. Please try again.'
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