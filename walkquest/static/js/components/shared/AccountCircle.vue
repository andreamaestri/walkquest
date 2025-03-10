<template>
  <div>
    <div 
      class="account-circle-container"
      :class="{ 'desktop': !isMobileComputed, 'mobile': isMobileComputed }"
    >
      <button
        ref="buttonRef"
        class="m3-icon-button account-circle-button"
        :class="{ 
          'desktop': !isMobileComputed, 
          'mobile': isMobileComputed,
          'user-active': isAuthenticatedComputed
        }"
        aria-label="Account menu"
        @click="handleClick"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
        @focus="isFocused = true"
        @blur="isFocused = false"
      >
        <div 
          class="state-layer" 
          :class="{
            'hovered': isHovered && !isPressed,
            'focused': isFocused && !isPressed,
            'pressed': isPressed
          }"
        ></div>
        <div v-if="isAuthenticatedComputed && (userInitialsComputed || 'U')" class="avatar-container">
          <div class="avatar-circle" :style="{ backgroundColor: avatarBgColor }">
            <span class="avatar-initials">{{ userInitialsComputed || 'U' }}</span>
          </div>
        </div>
        <Icon
          v-else
          icon="mdi:account-circle"
          class="account-icon"
          :class="{ 'active': isActive }"
        />
        <span class="sr-only">Account</span>
      </button>
    </div>
    
    <!-- Account Menu for authenticated users -->
    <AccountMenu
      v-if="buttonRef && isAuthenticatedComputed"
      :is-open="showMenu"
      :anchor-el="buttonRef"
      @close="showMenu = false"
      @action="handleMenuAction"
    />
    
    <!-- Account menu for guests -->
    <div class="account-menu-wrapper">
      <Transition name="fade">
        <div 
          v-if="showAccountMenu && !isAuthenticatedComputed" 
          class="account-menu" 
          :class="{ 'mobile': isMobileComputed }"
          :style="menuPosition"
        >
          <div class="account-menu-header">
            <h3 class="account-menu-title">Account</h3>
            <button class="close-button" @click="showAccountMenu = false">
              <Icon icon="mdi:close" />
            </button>
          </div>
          <div class="account-menu-content">
            <p class="account-menu-text">Sign in to save your favorite walks, track your adventures and more.</p>
            <div class="account-links">
              <a href="#" class="account-link account-link-primary" @click.prevent="goToLogin">
                <Icon icon="mdi:login" class="account-icon" />
                <span>Sign In</span>
              </a>
              <a href="#" class="account-link account-link-secondary" @click.prevent="goToSignup">
                <Icon icon="mdi:account-plus" class="account-icon" />
                <span>Create Account</span>
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import AccountMenu from './AccountMenu.vue';

// Props with defaults
const props = defineProps({
  isActive: {
    type: Boolean,
    default: false
  }
});

// Emit events
const emit = defineEmits(['click']);

// State for interactive feedback
const isHovered = ref(false);
const isFocused = ref(false);
const isPressed = ref(false);
const showAccountMenu = ref(false);
const showMenu = ref(false);
const buttonRef = ref(null);

// Setup store instances inside setup function
const stores = {
  auth: useAuthStore(),
  ui: useUiStore()
};

// Computed properties using store references
const isMobileComputed = computed(() => stores.ui.isMobile);
const isAuthenticatedComputed = computed(() => stores.auth.isAuthenticated);
const userInitialsComputed = computed(() => {
  // Only show initials if user data is fully loaded
  if (!stores.auth.userDataLoaded || !stores.auth.user) return '';
  return stores.auth.userInitials;
});

// Avatar color generation using email or username
const avatarBgColor = computed(() => {
  const identifier = stores.auth.user?.email || stores.auth.user?.username;
  if (!identifier) return 'rgb(var(--md-sys-color-primary))';
  
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `oklch(70% 0.14 ${hue}deg)`;
});

// Add menuPosition computed property
const menuPosition = computed(() => {
  if (!buttonRef.value) return {};
  
  if (isMobileComputed.value) return {};
  
  const rect = buttonRef.value.getBoundingClientRect();
  const spacing = 8; // Space between button and menu
  
  return {
    position: 'relative',
    top: `${rect.bottom + spacing}px`,
    left: 'calc(100% - 280px)',
    maxWidth: 'calc(100vw - 32px)' // Prevent horizontal overflow
  };
});

// Handle click with authentication flow
const handleClick = (event) => {
  isPressed.value = true;
  emit('click', event);
  
  if (!isAuthenticatedComputed.value) {
    showAccountMenu.value = !showAccountMenu.value;
  } else if (buttonRef.value) {
    showMenu.value = !showMenu.value;
  }
  
  // Reset pressed state after animation
  setTimeout(() => {
    isPressed.value = false;
  }, 300);
};

// Handle menu actions for authenticated users
const handleMenuAction = async (action) => {
  if (action === 'logout' && !isPressed.value) {
    try {
      isPressed.value = true;
      await authStore.logout();
      showMenu.value = false;
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      isPressed.value = false;
    }
  } else if (action === 'profile') {
    showMenu.value = false;
    window.location.href = '/profile';
  }
};

// Add click outside handler
const handleClickOutside = (event) => {
  if (showAccountMenu.value && !isAuthenticatedComputed.value) {
    const target = event.target;
    if (buttonRef.value && !buttonRef.value.contains(target)) {
      showAccountMenu.value = false;
    }
  }
};

// Navigation functions for direct HTML navigation
const goToLogin = () => {
  window.location.href = '/accounts/login/';
  showAccountMenu.value = false;
};

const goToSignup = () => {
  window.location.href = '/accounts/signup/';
  showAccountMenu.value = false;
};

// Lifecycle hooks with proper cleanup
onMounted(async () => {
  if (!buttonRef.value) {
    console.warn('Button reference not initialized on mount');
  }
  
  document.addEventListener('mousedown', handleClickOutside);
  
  // Force refresh user data if needed and not already loading
  try {
    if (isAuthenticatedComputed.value && !stores.auth.userDataLoaded && !stores.auth.isLoading) {
      await stores.auth.checkAuth();
    }
  } catch (error) {
    console.error('Error checking auth on mount:', error);
  }
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  if (showMenu.value) {
    showMenu.value = false;
  }
});
</script>

<style scoped>
.m3-icon-button  {  
  left: 0!important;
}

.account-circle-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto; /* Ensure clicks are registered */
}

/* Desktop version (inside search bar as trailing icon) */
.account-circle-container.desktop {
  height: 40px;
  width: 40px;
}

/* Mobile version (standalone) - Moved to left side on mobile */
.account-circle-container.mobile {
  position: fixed;
  top: max(16px, env(safe-area-inset-top, 16px));
  right: max(16px, env(safe-area-inset-right, 16px));
  z-index: 50;
  pointer-events: auto;
}

.account-circle-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
  outline: none;
  border-radius: 50%;
}

/* Desktop version styling */
.account-circle-button.desktop {
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Mobile version styling */
.account-circle-button.mobile {
  width: 48px;
  height: 48px;
  padding: 0 !important;
  background-color: rgba(var(--md-sys-color-surface-container-highest), 0.9);
  color: rgb(var(--md-sys-color-on-surface));
  box-shadow: var(--md-sys-elevation-2);
}

.account-circle-button.mobile:hover,
.account-circle-button.mobile:focus-visible {
  scale: 1.25;
}

.account-icon {
  font-size: 28px;
  width: 28px;
  height: 28px;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.account-circle-button.mobile .account-icon {
  font-size: 24px;
  width: 24px;
  height: 24px;
}

.account-icon.active {
  color: rgb(var(--md-sys-color-primary));
}

/* Avatar styling for authenticated users */
.avatar-container {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0; /* Prevent container from shrinking */
}

.avatar-circle {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-primary));
  font-weight: 500;
  font-size: 14px;
  user-select: none;
  overflow: hidden; /* Prevent content from overflowing */
  flex-shrink: 0; /* Prevent the circle from shrinking */
  box-shadow: var(--md-sys-elevation-2);
}

.avatar-initials {
  color: white;
  text-transform: uppercase;
  line-height: 1; /* Ensure consistent vertical alignment */
  text-align: center; /* Center text horizontally */
}

.account-circle-button.authenticated {
  background-color: transparent;
}

/* Interactive states using state layer pattern from Material Design 3 */
.state-layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1);
}

.account-circle-button.desktop .state-layer.hovered {
  background-color: rgb(var(--md-sys-color-on-surface-variant) / 0.08);
}

.account-circle-button.mobile .state-layer.hovered {
  background-color: rgb(var(--md-sys-color-on-surface) / 0.08);
}

.search-wrapper:not(.search-active) .desktop-avatar {
  top: 55%!important;
  bottom: auto!important;
}

.state-layer.focused {
  background-color: rgb(var(--md-sys-color-on-surface-variant) / 0.12);
}

.state-layer.pressed {
  background-color: rgb(var(--md-sys-color-on-surface-variant) / 0.16);
  animation: ripple 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Auth Menu for unauthenticated users */
.account-menu-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
}
.account-menu {
  position: absolute;
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 16px;
  width: 280px;
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
  width: 100%;
  max-width: 100%;
  transform-origin: bottom center;
  padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1001;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.account-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline));
}

.account-menu-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
}

.close-button {
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: none;
  border-radius: 50%;
  color: rgb(var(--md-sys-color-on-surface-variant));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: rgb(var(--md-sys-color-surface-container-high));
}

.close-button:active {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  transform: scale(0.96);
}

.account-menu-content {
  padding: 16px;
}

.account-menu-text {
  margin-bottom: 16px;
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.account-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.account-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  color: #FFFFFF;
  text-decoration: none;
  transition: all 0.2s;
  font-weight: 500;
  background-color: rgb(var(--md-sys-color-surface-container));
}

.account-link:hover {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  transform: translateY(-1px);
}

.account-link:active {
  transform: translateY(1px);
}

.account-link-primary {
  background-color: rgb(var(--md-sys-color-primary));
  color: #FFFFFF;
}

.account-link-primary:hover {
  background-color: #19093bec;
  box-shadow: var(--md-sys-elevation-1);
}

.account-link-secondary {
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: #4A4458;
}

.account-link-secondary:hover {
  background-color: #8474a8ec;
  color: #FFFFFF;
  box-shadow: var(--md-sys-elevation-1);
}

.account-icon {
  font-size: 20px;
}

/* Ripple animation for pressed state */
@keyframes ripple {
  from {
    transform: scale(0);
    opacity: 0.5;
  }
  to {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* Screen reader only text */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Improve touch interaction */
@media (hover: none) and (pointer: coarse) {
  .account-circle-button:active .account-icon {
    transform: scale(0.95);
  }
  
  .account-circle-button:active .state-layer {
    background-color: rgb(var(--md-sys-color-on-surface-variant) / 0.16);
  }
}

@keyframes menuAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>