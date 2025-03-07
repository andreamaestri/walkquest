<template>
  <div class="profile-settings" :class="{ 'mobile': isMobile }">
    <!-- Header -->
    <header class="profile-header">
      <button class="back-button" @click="$router.back()">
        <Icon icon="mdi:arrow-back" />
      </button>
      <h1 class="profile-title">Profile Settings</h1>
    </header>

    <!-- Content -->
    <div class="profile-content">
      <!-- User Info Section -->
      <section class="profile-section">
        <h2 class="section-title">Account Information</h2>
        <div class="user-info-container">
          <div class="avatar-section">
            <div class="avatar" :style="{ backgroundColor: avatarBgColor }">
              <span class="avatar-text">{{ userInitials }}</span>
            </div>
          </div>
          <div class="info-section">
            <div class="info-field">
              <label class="md3-label">Email</label>
              <div class="md3-text-field">
                <input 
                  v-model="email" 
                  type="email" 
                  class="md3-input"
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Password Section -->
      <section class="profile-section">
        <h2 class="section-title">Password</h2>
        <form @submit.prevent="handlePasswordChange" class="password-form">
          <div class="md3-field-container">
            <div class="md3-text-field" :class="{
              'focused': activeField === 'currentPassword',
              'filled': form.currentPassword,
              'error': errors.currentPassword
            }">
              <input 
                id="currentPassword"
                v-model="form.currentPassword"
                :type="showPasswords.current ? 'text' : 'password'"
                class="md3-input"
                @focus="activeField = 'currentPassword'"
                @blur="activeField = null"
                placeholder=" "
              />
              <label for="currentPassword" class="md3-label">Current Password</label>
              <button 
                type="button"
                class="password-toggle"
                @click="showPasswords.current = !showPasswords.current"
              >
                <Icon :icon="showPasswords.current ? 'mdi:eye-off' : 'mdi:eye'" />
              </button>
              <div class="md3-outline"></div>
            </div>
            <div v-if="errors.currentPassword" class="md3-error-message">{{ errors.currentPassword }}</div>
          </div>

          <div class="md3-field-container">
            <div class="md3-text-field" :class="{
              'focused': activeField === 'newPassword',
              'filled': form.newPassword,
              'error': errors.newPassword
            }">
              <input 
                id="newPassword"
                v-model="form.newPassword"
                :type="showPasswords.new ? 'text' : 'password'"
                class="md3-input"
                @focus="activeField = 'newPassword'"
                @blur="activeField = null"
                placeholder=" "
              />
              <label for="newPassword" class="md3-label">New Password</label>
              <button 
                type="button"
                class="password-toggle"
                @click="showPasswords.new = !showPasswords.new"
              >
                <Icon :icon="showPasswords.new ? 'mdi:eye-off' : 'mdi:eye'" />
              </button>
              <div class="md3-outline"></div>
            </div>
            <div v-if="errors.newPassword" class="md3-error-message">{{ errors.newPassword }}</div>
          </div>

          <div class="md3-field-container">
            <div class="md3-text-field" :class="{
              'focused': activeField === 'confirmPassword',
              'filled': form.confirmPassword,
              'error': errors.confirmPassword
            }">
              <input 
                id="confirmPassword"
                v-model="form.confirmPassword"
                :type="showPasswords.confirm ? 'text' : 'password'"
                class="md3-input"
                @focus="activeField = 'confirmPassword'"
                @blur="activeField = null"
                placeholder=" "
              />
              <label for="confirmPassword" class="md3-label">Confirm New Password</label>
              <button 
                type="button"
                class="password-toggle"
                @click="showPasswords.confirm = !showPasswords.confirm"
              >
                <Icon :icon="showPasswords.confirm ? 'mdi:eye-off' : 'mdi:eye'" />
              </button>
              <div class="md3-outline"></div>
            </div>
            <div v-if="errors.confirmPassword" class="md3-error-message">{{ errors.confirmPassword }}</div>
          </div>

          <!-- Submit Error -->
          <div v-if="errors.submit" class="md3-submit-error">
            <Icon icon="mdi:alert-circle" class="md3-error-icon" />
            <span>{{ errors.submit }}</span>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <button 
              type="submit" 
              class="md3-button md3-filled-button"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="md3-button-spinner">
                <Icon icon="mdi:loading" class="spinner-icon" />
              </span>
              <span v-else>Change Password</span>
            </button>
          </div>
        </form>
      </section>

      <!-- Danger Zone -->
      <section class="profile-section danger-zone">
        <h2 class="section-title">Danger Zone</h2>
        <div class="danger-actions">
          <button 
            class="md3-button md3-outlined-button danger"
            @click="confirmDeleteAccount"
          >
            Delete Account
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'

// Composables
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

// Responsive state
const isMobile = computed(() => uiStore.isMobile)

// User data
const email = computed(() => authStore.user?.email || '')
const userInitials = computed(() => authStore.userInitials)

// Form state
const activeField = ref(null)
const isSubmitting = ref(false)
const showPasswords = ref({
  current: false,
  new: false,
  confirm: false
})

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = ref({
  currentPassword: null,
  newPassword: null,
  confirmPassword: null,
  submit: null
})

// Avatar color
const avatarBgColor = computed(() => {
  if (!email.value) return 'rgb(var(--md-sys-color-primary))'
  
  let hash = 0
  for (let i = 0; i < email.value.length; i++) {
    hash = email.value.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `oklch(70% 0.14 ${hue}deg)`
})

// Handle password change
async function handlePasswordChange() {
  // Clear previous errors
  errors.value = {}
  
  // Validate form
  if (!form.value.currentPassword) {
    errors.value.currentPassword = 'Current password is required'
  }
  if (!form.value.newPassword) {
    errors.value.newPassword = 'New password is required'
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
  }
  if (form.value.newPassword && form.value.newPassword.length < 8) {
    errors.value.newPassword = 'Password must be at least 8 characters'
  }

  // If there are any errors, don't submit
  if (Object.keys(errors.value).length > 0) return

  isSubmitting.value = true

  try {
    // Make API request to change password
    const response = await fetch('/accounts/password/change/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
      },
      body: JSON.stringify({
        old_password: form.value.currentPassword,
        new_password1: form.value.newPassword,
        new_password2: form.value.confirmPassword
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to change password')
    }

    // Reset form
    form.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }

    // Show success message
    uiStore.showToast('Password changed successfully')
  } catch (error) {
    errors.value.submit = error.message
  } finally {
    isSubmitting.value = false
  }
}

// Handle account deletion confirmation
function confirmDeleteAccount() {
  // Show confirmation dialog
  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    handleDeleteAccount()
  }
}

// Handle account deletion
async function handleDeleteAccount() {
  try {
    const response = await fetch('/accounts/delete/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete account')
    }

    // Log out and redirect to home
    await authStore.logout()
    router.push({ name: 'home' })
  } catch (error) {
    errors.value.submit = error.message
  }
}
</script>

<style scoped>
.profile-settings {
  height: 100vh;
  background-color: rgb(var(--md-sys-color-surface));
  color: rgb(var(--md-sys-color-on-surface));
}

.profile-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 16px;
  background-color: rgb(var(--md-sys-color-surface));
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.12);
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgb(var(--md-sys-color-on-surface));
}

.back-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
}

.profile-title {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
  color: rgb(var(--md-sys-color-on-surface));
}

.profile-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

.profile-section {
  background-color: rgb(var(--md-sys-color-surface-container));
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 16px;
  color: rgb(var(--md-sys-color-on-surface));
}

.user-info-container {
  display: flex;
  gap: 24px;
  align-items: center;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-primary));
}

.info-section {
  flex: 1;
}

.info-field {
  margin-bottom: 16px;
}

.md3-field-container {
  margin-bottom: 24px;
}

.md3-text-field {
  position: relative;
  height: 56px;
  width: 100%;
  border-radius: 4px;
  background-color: rgb(var(--md-sys-color-surface-container-lowest));
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

.md3-input:disabled {
  color: rgb(var(--md-sys-color-on-surface-variant));
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
  margin-bottom: 16px;
}

.md3-error-icon {
  font-size: 20px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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

.md3-outlined-button {
  background: transparent;
  border: 1px solid rgb(var(--md-sys-color-outline));
  color: rgb(var(--md-sys-color-primary));
}

.md3-outlined-button:hover {
  background-color: rgba(var(--md-sys-color-primary), 0.08);
}

.md3-outlined-button.danger {
  color: rgb(var(--md-sys-color-error));
  border-color: rgb(var(--md-sys-color-error));
}

.md3-outlined-button.danger:hover {
  background-color: rgba(var(--md-sys-color-error), 0.08);
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

.danger-zone {
  background-color: rgb(var(--md-sys-color-error-container));
}

.danger-zone .section-title {
  color: rgb(var(--md-sys-color-on-error-container));
}

/* Mobile optimizations */
.profile-settings.mobile .profile-content {
  padding: 16px;
}

.profile-settings.mobile .profile-section {
  padding: 16px;
  border-radius: 12px;
}

.profile-settings.mobile .user-info-container {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.profile-settings.mobile .avatar {
  margin-bottom: 16px;
}
</style>