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
    
    // Prepare data for submission
    const signupData = {
      email: email.value,
      username: username.value || email.value.split('@')[0],
      password1: password1.value,
      password2: password2.value
    };
    
    // Add name if provided
    if (name.value) {
      // Split name into first_name and last_name if it contains a space
      const nameParts = name.value.trim().split(/\s+/);
      if (nameParts.length > 1) {
        signupData.first_name = nameParts[0];
        signupData.last_name = nameParts.slice(1).join(' ');
      } else {
        signupData.first_name = name.value;
      }
    }
    
    // Add redirect field if needed
    if (window.location.search.includes('next=')) {
      const nextUrl = new URLSearchParams(window.location.search).get('next');
      if (nextUrl) {
        signupData.next = nextUrl;
      }
    }
    
    // Use the headless API endpoint
    const res = await fetch('/_allauth/browser/v1/auth/signup/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken.value,
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin',
      body: JSON.stringify(signupData)
    });
    
    console.log('Response status:', res.status);
    
    // Always try to parse as JSON first
    let data;
    try {
      data = await res.json();
      console.log('Response data:', data);
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      // If not JSON, get the text
      const text = await res.text();
      data = { message: text };
    }
    
    // Handle authentication flow responses according to the headless API spec
    if (res.status === 401 || res.status === 410) {
      // Authentication required or re-authentication required
      if (data.meta && data.meta.flows) {
        // Handle the authentication flows
        if (data.meta.flows.verify_email) {
          // Email verification required
          authStore.needsEmailVerification = true;
          authStore.showSnackbar('Please verify your email address to continue.');
          router.push('/verify-email');
          return;
        }
        
        // Handle other flows as needed
        if (data.meta.flows.mfa_authenticate) {
          // MFA required
          router.push('/mfa');
          return;
        }
      }
    }
    
    // Handle error responses
    if (!res.ok) {
      if (data.errors) {
        // Map errors to form fields
        errors.value = data.errors;
      } else if (data.form && data.form.errors) {
        errors.value = data.form.errors;
      } else if (data.message) {
        error.value = data.message;
      } else {
        error.value = 'Signup failed. Please try again.';
      }
      throw new Error('Signup failed');
    }
    
    // Handle successful signup
    if (res.status === 200 || res.status === 201) {
      // Check if the server wants us to redirect somewhere
      if (data.location) {
        console.log('Server requested redirect to:', data.location);
        // Redirect to the location specified by the server
        window.location.href = data.location;
        return;
      }
      
      // Check if we're authenticated now
      if (data.meta && data.meta.is_authenticated) {
        // Show success message
        authStore.showSnackbar('Account created successfully!');
        
        // Update auth store with user data if available
        if (data.user) {
          authStore.user = data.user;
          authStore.isAuthenticated = true;
          authStore.userDataLoaded = true;
        } else {
          // Force a fresh auth check to get user data
          await authStore.forceAuthCheck();
        }
        
        // Redirect to home or next page
        router.push(authStore.getRedirectPath());
      } else {
        // We're not authenticated yet, might need additional steps
        // Force a fresh auth check
        await authStore.forceAuthCheck();
        
        if (authStore.needsEmailVerification) {
          router.push('/verify-email');
        } else if (authStore.isAuthenticated) {
          router.push(authStore.getRedirectPath());
        } else {
          // Something else is needed, show a generic message
          authStore.showSnackbar('Account created. Additional steps may be required.');
          router.push('/login');
        }
      }
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