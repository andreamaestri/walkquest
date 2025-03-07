<template>
  <Teleport to="#portal-root">
    <Transition name="fade">
      <div v-if="isOpen" class="menu-overlay" @click="handleOverlayClick">
        <div 
          ref="menuRef" 
          class="account-menu"
          :class="{ 'mobile': isMobileComputed }"
          :style="menuPosition"
        >
          <!-- User Info Section -->
          <div class="user-info">
            <div class="avatar">
              <span class="avatar-text">{{ userInitialsComputed }}</span>
            </div>
            <div class="user-details">
              <span class="user-email">{{ emailComputed }}</span>
            </div>
          </div>

          <!-- Menu Items -->
          <div class="menu-items">
            <button class="menu-item" @click="handleAction('profile')">
              <Icon icon="mdi:account-settings" class="menu-icon" />
              <span>Profile Settings</span>
            </button>
            <button class="menu-item" @click="handleAction('logout')">
              <Icon icon="mdi:logout" class="menu-icon" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, markRaw } from 'vue';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { animate } from 'motion';

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

// Component refs
const menuRef = ref(null);

// Store access
const authStore = useAuthStore();
const uiStore = useUiStore();

// Use computed properties to avoid reactivity issues
const isMobileComputed = computed(() => uiStore.isMobile);
const userInitialsComputed = computed(() => authStore.userInitials || '');
const emailComputed = computed(() => authStore.user?.email || '');

// Menu positioning
const menuPosition = computed(() => {
  if (!props.anchorEl || isMobileComputed.value) return {};
  
  try {
    // Check if anchorEl is a Vue ref or a DOM element
    const element = props.anchorEl.value || props.anchorEl;
    
    if (!element || !element.getBoundingClientRect) {
      console.warn('Invalid anchor element for menu positioning');
      return {};
    }
    
    const rect = element.getBoundingClientRect();
    return {
      position: 'absolute',
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    };
  } catch (error) {
    console.error('Error computing menu position:', error);
    return {};
  }
});

// Handle overlay click
const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) {
    emit('close');
  }
};

// Handle menu actions
const handleAction = (action) => {
  emit('action', action);
  emit('close');
};

// Keyboard event handler
function handleKeydown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  
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
      // Fallback if animation fails
      if (menuRef.value) {
        menuRef.value.style.opacity = 1;
      }
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// Watch for changes in isOpen to handle animations
watch(() => props.isOpen, (newValue) => {
  if (newValue && menuRef.value) {
    // Menu is opening, animate in
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
      // Fallback if animation fails
      if (menuRef.value) {
        menuRef.value.style.opacity = 1;
      }
    }
  }
});
</script>

<style scoped>
.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
}

.account-menu {
  background-color: rgb(var(--md-sys-color-surface));
  border-radius: 16px;
  min-width: 280px;
  box-shadow: var(--md-sys-elevation-3);
  overflow: hidden;
  margin: 8px;
}

.account-menu.mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0;
  border-radius: 28px 28px 0 0;
  min-width: 100%;
}

.user-info {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.1);
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
}

.user-email {
  display: block;
  font-size: 14px;
  color: rgb(var(--md-sys-color-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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