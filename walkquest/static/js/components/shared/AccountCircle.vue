<template>
  <div>
    <!-- Existing AccountCircle template -->
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
        <div v-if="isAuthenticatedComputed && userInitialsComputed" class="avatar-container">
          <div class="avatar-circle" :style="{ backgroundColor: avatarBgColor }">
            <span class="avatar-initials">{{ userInitialsComputed }}</span>
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
    
    <!-- Auth Modal -->
    <AuthModal
      :is-open="showAuthModal"
      @close="showAuthModal = false"
      @submit="handleAuthSubmit"
    />

    <!-- Account Menu -->
    <AccountMenu
      v-if="buttonRef"
      :is-open="showMenu"
      :anchor-el="buttonRef"
      @close="showMenu = false"
      @action="handleMenuAction"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, readonly } from 'vue';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import AuthModal from './AuthModal.vue';
import AccountMenu from './AccountMenu.vue';

// Props with defaults
const props = defineProps({
  isActive: {
    type: Boolean,
    default: false
  }
});

// Emit events that parent components can listen for
const emit = defineEmits(['click', 'auth-submit']);

// Use the UI store for responsive layout
const uiStore = useUiStore();
// Create a computed property to avoid direct reactivity issues
const isMobileComputed = computed(() => uiStore.isMobile);

// State for interactive feedback
const isHovered = ref(false);
const isFocused = ref(false);
const isPressed = ref(false);

// Add auth state management
const showAuthModal = ref(false);

// Use auth store
const authStore = useAuthStore();
// Create computed properties to avoid direct reactivity issues
const isAuthenticatedComputed = computed(() => authStore.isAuthenticated);
const userInitialsComputed = computed(() => authStore.userInitials);
const usernameComputed = computed(() => authStore.user?.email || '');

// Generate a consistent color based on username
const avatarBgColor = computed(() => {
  if (!usernameComputed.value) return 'rgb(var(--md-sys-color-primary))';
  
  // Simple hash function to generate a consistent hue from username
  let hash = 0;
  for (let i = 0; i < usernameComputed.value.length; i++) {
    hash = usernameComputed.value.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to a hue value (0-360)
  const hue = hash % 360;
  
  // Return an MD3 style color using oklch
  return `oklch(70% 0.14 ${hue}deg)`;
});

// Component state
const buttonRef = ref(null);
const showMenu = ref(false);

// Handle click with authentication flow
const handleClick = (event) => {
  isPressed.value = true;
  
  // Show auth modal if not authenticated
  if (!isAuthenticatedComputed.value) {
    showAuthModal.value = true;
  } else {
    // Make sure buttonRef exists before showing menu
    if (buttonRef.value) {
      showMenu.value = true;
    } else {
      console.error('Button reference is null');
    }
  }
  
  // Reset pressed state after animation
  setTimeout(() => {
    isPressed.value = false;
  }, 300);
};

// Handle auth modal events
const handleAuthSubmit = async ({ mode, data }) => {
  if (isPressed.value) return; // Prevent duplicate submissions
  
  try {
    isPressed.value = true;
    if (mode === 'signup') {
      await authStore.signup(data.email, data.password);
    } else {
      await authStore.login(data.email, data.password);
    }
    showAuthModal.value = false;
  } catch (error) {
    console.error('Auth error:', error);
  } finally {
    // Use nextTick to avoid state updates during render
    nextTick(() => {
      isPressed.value = false;
    });
  }
};

// Handle menu actions
const handleMenuAction = async (action) => {
  if (action === 'logout' && !isPressed.value) {
    try {
      isPressed.value = true;
      await authStore.logout();
      showMenu.value = false;
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Use nextTick to avoid state updates during render
      nextTick(() => {
        isPressed.value = false;
      });
    }
  } else if (action === 'profile') {
    showMenu.value = false;
  }
};

// Error handling wrapper for computed properties
function safeComputed(getter) {
  try {
    return computed(getter);
  } catch (error) {
    console.error('Error in computed property:', error);
    return computed(() => null);
  }
}

// Ensure buttonRef is initialized
onMounted(() => {
  // Verify buttonRef is properly set
  if (!buttonRef.value) {
    console.warn('Button reference not initialized on mount');
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
  border-radius: 50%; /* Full corner radius (md.sys.shape.corner.full) */
}

/* Desktop version styling */
.account-circle-button.desktop {
  width: 35px; /* MD3 spec: 30dp */
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
</style>