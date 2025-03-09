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
    
    <!-- Account Menu for authenticated users -->
    <AccountMenu
      v-if="buttonRef && isAuthenticatedComputed"
      :is-open="showMenu"
      :anchor-el="buttonRef"
      @close="showMenu = false"
      @action="handleMenuAction"
    />
    
    <!-- Auth menu for unauthenticated users -->
    <Teleport to="#portal-root">
      <Transition name="fade">
        <div 
          v-if="showAuthMenu && !isAuthenticatedComputed" 
          class="auth-menu" 
          :class="{ 'mobile': isMobileComputed }"
          :style="menuPosition"
        >
          <div class="auth-menu-header">
            <h3 class="auth-menu-title">Account</h3>
            <button class="close-button" @click="showAuthMenu = false">
              <Icon icon="mdi:close" />
            </button>
          </div>
          <div class="auth-menu-content">
            <p class="auth-menu-text">Sign in to save your favorite walks, track your adventures and more.</p>
            <div class="auth-links">
              <RouterLink to="/login" class="auth-link auth-link-primary" @click="showAuthMenu = false">
                <Icon icon="mdi:login" class="auth-icon" />
                <span>Sign In</span>
              </RouterLink>
              <RouterLink to="/signup" class="auth-link auth-link-secondary" @click="showAuthMenu = false">
                <Icon icon="mdi:account-plus" class="auth-icon" />
                <span>Create Account</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useRouter } from 'vue-router';
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

// Router instance
const router = useRouter();

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

// Add menuPosition computed property
const menuPosition = computed(() => {
  if (!buttonRef.value || isMobileComputed.value) return {};
  
  try {
    const rect = buttonRef.value.getBoundingClientRect();
    return {
      position: 'absolute',
      top: `${rect.bottom + 15}px`,
      right: `${window.innerWidth - rect.right}px`
    };
  } catch (error) {
    console.error('Error computing menu position:', error);
    return {};
  }
});

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
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      isPressed.value = false;
    }
  } else if (action === 'profile') {
    showMenu.value = false;
    router.push('/profile');
  }
};

// Add click outside handler
const handleClickOutside = (event) => {
  if (showAuthMenu.value && !isAuthenticatedComputed.value) {
    const target = event.target;
    if (buttonRef.value && !buttonRef.value.contains(target)) {
      showAuthMenu.value = false;
    }
  }
};

// Update lifecycle hooks
onMounted(async () => {
  if (!buttonRef.value) {
    console.warn('Button reference not initialized on mount');
  }
  
  document.addEventListener('mousedown', handleClickOutside);
  
  // Force refresh user data if needed and not already loading
  if (isAuthenticatedComputed.value && !authStore.userDataLoaded && !authStore.isLoading) {
    await authStore.checkAuth();
  }
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
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
  position: absolute;
  top: calc(4 + env(safe-area-inset-top, 0px)); 
  left: calc(4px + env(safe-area-inset-left, 0px)); /* Moved to left side */
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
  width: 52px;
  height: 52px;
  padding: 0!important;
  background-color: transparent;
  color: rgb(var(--md-sys-color-surface));
}

.account-circle-button.mobile:hover,
.account-circle-button.mobile:focus-visible {
  scale: 1.25;
}

.account-icon {
  font-size: 52px!important;
  width: 52px;
  height: 52px;
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
.auth-menu {
  position: absolute;
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 16px;
  width: 280px;
  box-shadow: var(--md-sys-elevation-3);
  overflow: hidden;
  z-index: 1000;
  transform-origin: top right;
}

.auth-menu.mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0;
  border-radius: 28px 28px 0 0;
  width: 100%;
  max-width: 100%;
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

.auth-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: rgb(var(--md-sys-color-surface-container-highest));
  border-bottom: 1px solid rgb(var(--md-sys-color-outline));
}

.auth-menu-title {
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
  color: #FFFFFF;
  text-decoration: none;
  transition: all 0.2s;
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
  color: #FFFFFF;
}

.auth-link-primary:hover {
  background-color: #19093bec;
  box-shadow: var(--md-sys-elevation-1);
}

.auth-link-secondary {
  background-color: rgb(var(--md-sys-color-secondary-container));
  color: #4A4458;
}

.auth-link-secondary:hover {
  background-color: #8474a8ec;
  color: #FFFFFF;
  box-shadow: var(--md-sys-elevation-1);
}

.auth-icon {
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