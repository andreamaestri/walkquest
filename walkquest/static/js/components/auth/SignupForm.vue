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
            <span>{{ typeof errors.password1 === 'string' ? errors.password1 : errors.password1[0] }}</span>
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
            <span>{{ typeof errors.password2 === 'string' ? errors.password2 : errors.password2[0] }}</span>
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
const name = ref('')  // Added name field ref
const password1 = ref('')
const password2 = ref('')
const activeField = ref(null)
const showPassword1 = ref(false)
const showPassword2 = ref(false)
const error = ref(null)
const errors = ref({})
const response = reactive({ fetching: false, content: null })

// Add a CSRF token ref and a function to get the token
const csrfToken = ref('')

onMounted(async () => {
  // First fetch a fresh CSRF token
  await refreshCSRFToken()
  // Then get it from the cookie
  getCsrfToken()
})

async function refreshCSRFToken() {
  try {
    // Fetch the CSRF token with a non-caching request
    const response = await fetch('/accounts/signup/', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    // Extract the CSRF token from the Set-Cookie header if available
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      if (cookie.trim().startsWith('csrftoken=')) {
        csrfToken.value = cookie.trim().substring('csrftoken='.length);
        break;
      }
    }
  } catch (err) {
    console.error("Failed to refresh CSRF token:", err)
  }
}

function getCsrfToken() {
  // Try to get from cookie
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          return cookieValue;
        }
      }
    }
    return cookieValue;
  }
  
  const token = getCookie('csrftoken');
  if (token) {
    csrfToken.value = token;
    return;
  }
  
  // Try to get from meta tag
  const metaToken = document.querySelector('meta[name="csrf-token"]')
  if (metaToken) {
    csrfToken.value = metaToken.getAttribute('content')
    return
  }
  
  // Try to get from a hidden input (if present)
  const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]')
  if (inputToken) {
    csrfToken.value = inputToken.value
    return
  }
  
  console.warn("CSRF token not found from cookie, meta, or hidden input.")
}

// Handle form submission
async function handleSubmit() {
  errors.value = {}
  error.value = null
  
  // Client-side validation
  if (password1.value !== password2.value) {
    errors.value.password2 = 'Passwords do not match.'
    return
  }
  
  if (password1.value.length < 8) {
    errors.value.password1 = 'Password must be at least 8 characters.'
    return
  }
  
  if (!email.value) {
    errors.value.email = 'Email is required.'
    return
  }
  
  // Get a fresh token before submitting
  await refreshCSRFToken()
  getCsrfToken()
  
  response.fetching = true
  
  try {
    if (!csrfToken.value) {
      throw new Error('CSRF token not available. Please try again.')
    }
    
    console.log('Submitting form with email:', email.value);
    
    // Use FormData which is more robust for form submissions
    const formData = new FormData();
    formData.append('email', email.value);
    formData.append('name', name.value);
    formData.append('password1', password1.value);
    formData.append('password2', password2.value);
    
    // Add redirect field if needed by Django allauth
    if (window.location.search.includes('next=')) {
      const nextUrl = new URLSearchParams(window.location.search).get('next');
      if (nextUrl) {
        formData.append('next', nextUrl);
      }
    }
    
    // Make a direct fetch request - use multipart/form-data which Django expects
    const res = await fetch('/accounts/signup/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken.value,
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin',
      body: formData
    });
    
    console.log('Response status:', res.status);
    
    const contentType = res.headers.get('content-type');
    
    if (!res.ok) {
      try {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          console.log('Server error response:', errorData);
          
          // Handle different error response formats
          if (errorData.errors) {
            errors.value = errorData.errors;
          } else if (errorData.form && errorData.form.errors) {
            // Handle Django form errors format
            errors.value = errorData.form.errors;
          } else if (typeof errorData === 'object') {
            // Handle direct error object from Django
            errors.value = errorData;
          } else {
            error.value = errorData.message || 'Signup failed. Please try again.';
          }
        } else {
          // For HTML responses, we need to extract possible error messages
          const errorText = await res.text();
          console.log('Error response text (first 200 chars):', errorText.substring(0, 200));
          
          try {
            // Try to extract error messages from Django's HTML response
            const parser = new DOMParser();
            const doc = parser.parseFromString(errorText, 'text/html');
            
            // Look for error elements - Django typically puts these in .errorlist elements
            const errorLists = doc.querySelectorAll('.errorlist li');
            if (errorLists && errorLists.length > 0) {
              // Group errors by field
              Array.from(errorLists).forEach(item => {
                // Try to determine which field this error belongs to
                const fieldName = item.closest('[id^="div_id_"]')?.id.replace('div_id_', '') || 'unknown';
                if (!errors.value[fieldName]) errors.value[fieldName] = [];
                if (Array.isArray(errors.value[fieldName])) {
                  errors.value[fieldName].push(item.textContent);
                } else {
                  errors.value[fieldName] = [item.textContent];
                }
              });
              
              if (Object.keys(errors.value).length === 0) {
                error.value = 'Please correct the errors in the form.';
              }
            } else {
              error.value = `Signup failed (${res.status}). Please try again.`;
            }
          } catch (parseError) {
            console.error('Error parsing HTML response:', parseError);
            error.value = `Signup failed (${res.status}). Please try again.`;
          }
        }
      } catch (e) {
        console.error('Error parsing server response:', e);
        error.value = 'Failed to process server response';
      }
      
      throw new Error('Signup failed');
    }
    
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      console.log('Success response:', data);
      
      if (data.success) {
        // Show success message
        authStore.showSnackbar('Account created successfully!');
        
        // Redirect to the next page after successful registration
        await authStore.checkAuth();
        router.push('/');
      }
    } else {
      // Assume success if no JSON response but status was ok
      console.log('Non-JSON success response received');
      authStore.showSnackbar('Account created successfully!');
      await authStore.checkAuth();
      router.push('/');
    }
  } catch (err) {
    console.error('Signup error:', err);
    if (!error.value && !Object.keys(errors.value).length) {
      error.value = err.message || 'Registration failed. Please try again.';
    }
  } finally {
    response.fetching = false;
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