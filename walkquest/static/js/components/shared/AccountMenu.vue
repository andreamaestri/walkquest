<template>
  <Teleport to="#portal-root">
    <Transition name="fade">
      <div v-if="isOpen" 
        ref="menuRef" 
        class="account-menu"
        :class="{ 'mobile': isMobileComputed }"
        :style="menuPosition"
      >
        <!-- User Info Section -->
        <div class="user-info">
          <div class="avatar" :style="{ backgroundColor: avatarBgColor }">
            <span class="avatar-text" v-if="!isLoadingUser">{{ userInitialsComputed || defaultInitials }}</span>
            <Icon v-else icon="mdi:loading" class="loading-icon" />
          </div>
          <div class="user-details">
            <span class="user-email" v-if="!isLoadingUser">{{ emailComputed || defaultEmail }}</span>
            <span v-else class="user-loading">Loading...</span>
          </div>
        </div>
        <!-- Menu Items -->
        <div class="menu-items">
          <button class="menu-item" @click="handleProfileClick">
            <Icon icon="mdi:account-settings" class="menu-icon" />
            <span>Profile Settings</span>
          </button>
          
          <button class="menu-item" @click="handleAdventuresClick">
            <Icon icon="mdi:map-marker-path" class="menu-icon" />
            <span>My Adventures</span>
          </button>
          
          <a :href="authUrls.emailUrl" class="menu-item">
            <Icon icon="mdi:email" class="menu-icon" />
            <span>Manage Email</span>
          </a>
          
          <a :href="authUrls.passwordChangeUrl" class="menu-item">
            <Icon icon="mdi:key" class="menu-icon" />
            <span>Change Password</span>
          </a>
          
          <!-- Show logout button -->
          <button @click="showLogoutConfirmation = true" class="menu-item">
            <Icon icon="mdi:logout" class="menu-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </Transition>
    
    <!-- Logout Confirmation Modal -->
    <ConfirmationModal
      v-if="showLogoutConfirmation"
      title="Sign Out"
      message="Are you sure you want to sign out? You'll need to log in again to access your account."
      confirmText="Sign Out"
      cancelText="Cancel"
      :isSubmitting="isLoggingOut"
      @confirm="confirmLogout"
      @cancel="showLogoutConfirmation = false"
    />
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { useRouter } from 'vue-router';
import { animate } from 'motion';
import { useSnackbar } from '../../composables/useSnackbar';
import ConfirmationModal from './ConfirmationModal.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  anchorEl: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'action']);

// Component refs and state
const menuRef = ref(null);
const logoutForm = ref(null);
const isLoadingUser = ref(false);
const showLogoutConfirmation = ref(false);
const isLoggingOut = ref(false);

// Default values if user data isn't loaded yet
const defaultInitials = "U";
const defaultEmail = "User";

// Store access
const authStore = useAuthStore();
const uiStore = useUiStore();
const router = useRouter();
const snackbar = useSnackbar();

// Use computed properties to avoid reactivity issues
const isMobileComputed = computed(() => uiStore.isMobile);
const userInitialsComputed = computed(() => authStore.userInitials);
const emailComputed = computed(() => authStore.user?.email || '');
const csrfToken = ref('');

// Get authentication URLs from window.djangoAllAuth object
const authUrls = computed(() => ({
  loginUrl: window.djangoAllAuth?.loginUrl || '/users/api/login/',
  signupUrl: window.djangoAllAuth?.signupUrl || '/users/api/signup/',
  logoutUrl: window.djangoAllAuth?.logoutUrl || '/users/api/logout/',
  passwordResetUrl: window.djangoAllAuth?.passwordResetUrl || '/_allauth/app/v1/auth/password/reset/',
  passwordChangeUrl: window.djangoAllAuth?.passwordChangeUrl || '/_allauth/app/v1/account/password/change/',
  emailUrl: window.djangoAllAuth?.emailUrl || '/_allauth/app/v1/account/email/'
}));

// Avatar color generation
const avatarBgColor = computed(() => {
  const identifier = emailComputed.value;
  if (!identifier) return 'rgb(var(--md-sys-color-primary))';
  
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `oklch(70% 0.14 ${hue}deg)`;
});

// Menu positioning
const menuPosition = computed(() => {
  if (!props.anchorEl || isMobileComputed.value) return {};
  
  try {
    const element = props.anchorEl.value || props.anchorEl;
    if (!element || !element.getBoundingClientRect) {
      console.warn('Invalid anchor element for menu positioning');
      return {};
    }
    
    const rect = element.getBoundingClientRect();
    return {
      position: 'absolute',
      top: `${rect.bottom + 16}px`,
      right: `${window.innerWidth - rect.right}px`
    };
  } catch (error) {
    console.error('Error computing menu position:', error);
    return {};
  }
});

// Handle profile click navigation
const handleProfileClick = () => {
  router.push('/profile');
  emit('close');
  emit('action', 'profile');
};

// Handle adventures click navigation
const handleAdventuresClick = () => {
  router.push('/adventures');
  emit('close');
  emit('action', 'adventures');
};

// Show the logout confirmation modal
const handleLogout = () => {
  showLogoutConfirmation.value = true;
};

// Handle the confirmation from the modal
const confirmLogout = async () => {
  try {
    // Show loading state
    isLoggingOut.value = true;
    
    // Use the auth store to logout
    await authStore.logout();
    
    // Close the modals
    showLogoutConfirmation.value = false;
    emit('close');
    emit('action', 'logout');
    
    // Show a success message
    snackbar.show('You have been successfully logged out');
    
    // Redirect to home page
    router.push('/');
  } catch (error) {
    console.error('Logout error:', error);
    
    // If auth store logout fails, try a direct API call
    try {
      const response = await fetch(authUrls.value.logoutUrl, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        // Show success message
        snackbar.show('You have been successfully logged out');
        
        // Force a refresh of the page to ensure clean state
        showLogoutConfirmation.value = false;
        window.location.href = '/';
      } else {
        // As a last resort, try the standard logout
        showLogoutConfirmation.value = false;
        window.location.href = '/accounts/logout/';
      }
    } catch (e) {
      console.error('Direct logout failed, using fallback:', e);
      // Last resort: redirect to standard Django logout
      showLogoutConfirmation.value = false;
      window.location.href = '/accounts/logout/';
    }
  } finally {
    isLoggingOut.value = false;
  }
};

// Handle overlay click
const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) {
    emit('close');
  }
};

// Handle escape key
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

// Add click outside handler
const handleClickOutside = (event) => {
  if (props.isOpen && menuRef.value && !menuRef.value.contains(event.target)) {
    // Check if click was on the anchor element (AccountCircle button)
    const anchorElement = props.anchorEl?.value || props.anchorEl;
    if (!anchorElement || !anchorElement.contains(event.target)) {
      emit('close');
    }
  }
};

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousedown', handleClickOutside);
  // Set the CSRF token on mount, so the logout form has a valid token.
  csrfToken.value = getCSRFToken();
  
  // Refresh user data when menu opens if needed
  if (props.isOpen && (!authStore.userDataLoaded || !authStore.user?.email)) {
    isLoadingUser.value = true;
    authStore.checkAuth().finally(() => {
      isLoadingUser.value = false;
    });
  }
  
  // Animate menu entry
  if (menuRef.value) {
    try {
      animate(
        menuRef.value,
        {
          opacity: [0, 1],
          scale: [0.95, 1],
          y: ['-0.5rem', '0']
        },
        {
          duration: 0.2,
          easing: [0.4, 0, 0.2, 1]
        }
      );
    } catch (error) {
      console.error('Animation error:', error);
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('mousedown', handleClickOutside);
});

// Watch for menu open to refresh user data
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && (!authStore.userDataLoaded || !authStore.user?.email)) {
    isLoadingUser.value = true;
    await authStore.checkAuth();
    isLoadingUser.value = false;
  }
});

// Add function to get CSRF token
function getCSRFToken() {
  // First try the cookie (Django's default approach)
  let token = getCsrfCookie();
  
  // If not found in cookie, try meta tag
  if (!token) {
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
      token = metaToken.getAttribute('content');
    }
  }
  
  // If still not found, try hidden input field
  if (!token) {
    const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (inputToken) {
      token = inputToken.value;
    }
  }
  
  return token;
}

// Helper for getting CSRF cookie
function getCsrfCookie() {
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let cookie of cookieArray) {
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
}
</script>

<style scoped>
.account-menu {
  position: absolute;
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 16px;
  min-width: 280px;
  box-shadow: var(--md-sys-elevation-3);
  overflow: hidden;
  z-index: 1000;
  transform-origin: top right;
}

.account-menu.mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0;
  border-radius: 28px 28px 0 0;
  min-width: 100%;
  transform-origin: bottom center;
  padding-bottom: env(safe-area-inset-bottom, 16px);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.user-info {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline));
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 16px;
}

.user-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.user-email {
  display: block;
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-loading {
  font-size: 12px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-style: italic;
}

.menu-items {
  padding: 8px;
}

.menu-item {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  text-decoration: none;
}

.menu-item:hover {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  color: rgb(var(--md-sys-color-on-surface));
}

.menu-item:active {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  transform: scale(0.98);
}

.menu-icon {
  font-size: 20px;
  color: rgb(var(--md-sys-color-primary));
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Update loading state styles */
.user-loading {
  font-size: 12px;
  color: rgb(var(--md-sys-color-on-surface-variant));
  font-style: italic;
}

.menu-items {
  padding: 8px;
}

.menu-item {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgb(var(--md-sys-color-on-surface));
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
  text-decoration: none;
}

.menu-item:hover {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

.menu-icon {
  font-size: 20px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>