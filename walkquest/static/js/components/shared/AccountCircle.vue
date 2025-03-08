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
          'authenticated': isAuthenticatedComputed
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
    
    <!-- Account Menu for authenticated users only -->
    <AccountMenu
      v-if="buttonRef && isAuthenticatedComputed"
      :is-open="showMenu"
      :anchor-el="buttonRef"
      @close="showMenu = false"
      @action="handleMenuAction"
    />
    
    <!-- Use standard Django auth menu for unauthenticated users -->
    <Teleport to="#portal-root">
      <Transition name="fade">
        <div v-if="showAuthMenu && !isAuthenticatedComputed" class="auth-menu-container" :class="{ 'mobile': isMobileComputed }">
          <div class="auth-menu-backdrop" @click="showAuthMenu = false"></div>
          <div class="auth-menu">
            <div class="auth-menu-header">
              <h3 class="auth-menu-title">Account</h3>
              <button class="close-button" @click="showAuthMenu = false">
                <Icon icon="mdi:close" />
              </button>
            </div>
            <div class="auth-menu-content">
              <p class="auth-menu-text">Sign in to save your favorite walks, track your adventures and more.</p>
              <div class="auth-links">
                <a :href="authUrls.loginUrl" class="auth-link auth-link-primary">
                  <Icon icon="mdi:login" class="auth-icon" />
                  <span>Sign In</span>
                </a>
                <a :href="authUrls.signupUrl" class="auth-link auth-link-secondary">
                  <Icon icon="mdi:account-plus" class="auth-icon" />
                  <span>Create Account</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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

// Use the UI store for responsive layout
const uiStore = useUiStore();
const isMobileComputed = computed(() => uiStore.isMobile);

// State for interactive feedback
const isHovered = ref(false);
const isFocused = ref(false);
const isPressed = ref(false);
const showAuthMenu = ref(false);
const showMenu = ref(false);
const buttonRef = ref(null);

// Use auth store with better reactive state handling
const authStore = useAuthStore();
const isAuthenticatedComputed = computed(() => authStore.isAuthenticated);
const userInitialsComputed = computed(() => {
  // Only show initials if user data is fully loaded
  if (!authStore.userDataLoaded || !authStore.user) return '';
  return authStore.userInitials;
});

// Avatar color generation using email or username
const avatarBgColor = computed(() => {
  const identifier = authStore.user?.email || authStore.user?.username;
  if (!identifier) return 'rgb(var(--md-sys-color-primary))';
  
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `oklch(70% 0.14 ${hue}deg)`;
});

// Get authentication URLs
const authUrls = computed(() => ({
  loginUrl: window.djangoAllAuth?.loginUrl || '/accounts/login/',
  signupUrl: window.djangoAllAuth?.signupUrl || '/accounts/signup/',
  logoutUrl: window.djangoAllAuth?.logoutUrl || '/accounts/logout/',
  passwordResetUrl: window.djangoAllAuth?.passwordResetUrl || '/accounts/password/reset/',
  passwordChangeUrl: window.djangoAllAuth?.passwordChangeUrl || '/accounts/password/change/',
  emailUrl: window.djangoAllAuth?.emailUrl || '/accounts/email/'
}));

// Handle click with authentication flow
const handleClick = (event) => {
  isPressed.value = true;
  emit('click', event);
  
  if (!isAuthenticatedComputed.value) {
    showAuthMenu.value = !showAuthMenu.value;
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
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      isPressed.value = false;
    }
  } else if (action === 'profile') {
    showMenu.value = false;
  }
};

// Initialize and clean up
onMounted(async () => {
  if (!buttonRef.value) {
    console.warn('Button reference not initialized on mount');
  }
  
  // Force refresh user data if needed and not already loading
  if (isAuthenticatedComputed.value && !authStore.userDataLoaded && !authStore.isLoading) {
    await authStore.checkAuth();
  }
});
</script>

<style scoped>
.account-circle-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Desktop version (inside search bar as trailing icon) */
.account-circle-container.desktop {
  height: 30px;
  width: 30px;
}

/* Mobile version (standalone) */
.account-circle-container.mobile {
  position: absolute;
  top: calc(4px + env(safe-area-inset-top, 0px));
  right: calc(4px + env(safe-area-inset-right, 0px));
  z-index: 20;
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
  width: 35px;
  height: 35px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

/* Mobile version styling */
.account-circle-button.mobile {
  width: 40px;
  height: 40px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface));
  box-shadow: var(--md-sys-elevation-3);
}

.account-circle-button.mobile:hover,
.account-circle-button.mobile:focus-visible {
  background-color: rgb(var(--md-sys-color-surface-container-highest));
}

.account-icon {
  font-size: 38px;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.account-icon.active {
  color: rgb(var(--md-sys-color-primary));
}

/* Avatar styling for authenticated users */
.avatar-container {
  position: relative;
  z-index: 1;
  height: 85%;
  width: 85%;
}

.avatar-circle {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--md-sys-color-on-primary));
  font-weight: 500;
  font-size: 14px;
  user-select: none;
}

.avatar-initials {
  color: white;
  text-transform: uppercase;
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

.state-layer.focused {
  background-color: rgb(var(--md-sys-color-on-surface-variant) / 0.12);
}

.state-layer.pressed {
  background-color: rgb(var(--md-sys-color-on-surface-variant) / 0.16);
  animation: ripple 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Auth Menu for unauthenticated users */
.auth-menu-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

.auth-menu-container.mobile .auth-menu {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: auto;
  margin: 0;
  border-radius: 28px 28px 0 0;
  max-width: 100%;
  width: 100%;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.auth-menu-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  z-index: -1;
}

.auth-menu {
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-3);
  overflow: hidden;
  width: 280px;
  margin: 8px;
  margin-top: calc(env(safe-area-inset-top, 0px) + 56px);
  animation: menuAppear 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.1);
}

.auth-menu-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.auth-menu-content {
  padding: 16px;
}

.auth-menu-text {
  margin-bottom: 16px;
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface-variant));
}

.auth-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  color: rgb(var(--md-sys-color-on-surface));
  text-decoration: none;
  transition: background-color 0.2s, transform 0.1s;
  font-weight: 500;
  background-color: rgb(var(--md-sys-color-surface-container));
}

.auth-link:hover {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  transform: translateY(-1px);
}

.auth-link:active {
  transform: translateY(1px);
}

.auth-link-primary {
  background-color: rgb(var(--md-sys-color-primary));
  color: rgb(var(--md-sys-color-on-primary));
}

.auth-link-secondary {
  background-color: rgb(var(--md-sys-color-secondary));
  color: rgb(var(--md-sys-color-on-secondary));
}

.auth-icon {
  font-size: 22px;
  color: rgb(var(--md-sys-color-primary));
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