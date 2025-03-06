<template>
  <div 
    class="account-circle-container"
    :class="{ 'desktop': !isMobile, 'mobile': isMobile }"
  >
    <button
      class="m3-icon-button account-circle-button"
      :class="{ 'desktop': !isMobile, 'mobile': isMobile }"
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
      <Icon
        icon="mdi:account-circle"
        class="account-icon"
        :class="{ 'active': isActive }"
      />
      <span class="sr-only">Account</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Icon } from '@iconify/vue';
import useResponsiveLayout from '../../composables/useResponsiveLayout';

// Props with defaults
const props = defineProps({
  isActive: {
    type: Boolean,
    default: false
  }
});

// Emit events that parent components can listen for
const emit = defineEmits(['click']);

// Use the responsive layout composable to detect mobile/desktop
const { isMobile } = useResponsiveLayout();

// State for interactive feedback
const isHovered = ref(false);
const isFocused = ref(false);
const isPressed = ref(false);

// Handle click with ripple effect
const handleClick = (event) => {
  isPressed.value = true;
  
  // Emit click event to parent
  emit('click', event);
  
  // Reset pressed state after animation
  setTimeout(() => {
    isPressed.value = false;
  }, 300);
};
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