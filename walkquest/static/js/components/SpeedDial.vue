<template>
  <div class="speed-dial" :class="{ 'is-open': isOpen }">
    <!-- Main FAB button -->
    <button class="speed-dial-fab" @click="toggleMenu" aria-label="Actions menu">
      <Icon :icon="isOpen ? 'mdi:close' : 'mdi:hiking'" class="speed-dial-icon" />
    </button>
    
    <!-- Child FAB menu -->
    <Transition name="fab-menu">
      <div v-if="isOpen" class="speed-dial-menu">
        <button 
          v-for="(action, index) in actions" 
          :key="index"
          class="speed-dial-item"
          :class="{ 'speed-dial-item-first': index === 0 }"
          @click="handleAction(action.id)"
          :aria-label="action.label"
        >
          <div class="speed-dial-item-wrapper">
            <div class="speed-dial-item-label">{{ action.label }}</div>
            <div class="speed-dial-item-button">
              <Icon :icon="action.icon" class="speed-dial-item-icon" />
            </div>
          </div>
        </button>
      </div>
    </Transition>
  </div>
  </template>

<script setup>
import { ref } from 'vue';
import { Icon } from '@iconify/vue';

// Define available actions
const actions = [
  { id: 'explore', label: 'Explore', icon: 'mdi:compass' },
  { id: 'nearby', label: 'Nearby', icon: 'mdi:map-marker' },
  { id: 'categories', label: 'Categories', icon: 'mdi:tag-multiple' }
];

// Component state
const isOpen = ref(false);

// Define emits
const emit = defineEmits(['action']);

// Toggle menu state
function toggleMenu() {
  isOpen.value = !isOpen.value;
}

// Close menu
function closeMenu() {
  isOpen.value = false;
}

// Handle action selection
function handleAction(actionId) {
  emit('action', actionId);
  closeMenu();
}
</script>

<style scoped>
.speed-dial {
  z-index: 1000;
  padding-bottom: var(--safe-area-bottom, env(safe-area-inset-bottom, 0px));
}

.speed-dial-fab {
  width: 56px; 
  height: 56px; 
  border-radius: 16px; /* Updated to MD3's more circular style */
  padding: 16px;
  background-color: #FFB3FB; /* Keeping original color as requested */
  border: none;
  color: #823A86;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2),
              0px 4px 5px 0px rgba(0,0,0,0.14),
              0px 1px 10px 0px rgba(0,0,0,0.12); /* MD3 elevation-2 */
  position: relative;
  z-index: 1001;
  cursor: pointer;
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.2s cubic-bezier(0.0, 0.0, 0.2, 1); /* MD3 standard curves */
  overflow: hidden;
}

/* State hover */
.speed-dial-fab:hover {
  box-shadow: 0px 5px 5px -3px rgba(0,0,0,0.2),
              0px 8px 10px 1px rgba(0,0,0,0.14),
              0px 3px 14px 2px rgba(0,0,0,0.12); /* MD3 elevation-4 on hover */
}

/* State pressed/active */
.speed-dial-fab:active {
  transform: scale(0.97); /* MD3 uses subtle scale for pressed state */
  box-shadow: 0px 3px 5px -1px rgba(0,0,0,0.2),
              0px 6px 10px 0px rgba(0,0,0,0.14),
              0px 1px 18px 0px rgba(0,0,0,0.12); /* MD3 elevation-3 */
}

.speed-dial-icon {
  font-size: 24px; /* Keeping larger icon for better visibility */
  transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1); /* MD3 standard curve */
}

.is-open .speed-dial-icon {
  transform: rotate(90deg);
}

.speed-dial-menu {
  position: absolute;
  bottom: 76px;
  right: 0;
  display: flex;
  flex-direction: column-reverse;
  gap: 16px; /* MD3 recommended spacing between FABs */
  pointer-events: none;
}

.speed-dial-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background: transparent;
  border: none;
  padding: 0;
  pointer-events: auto;
  cursor: pointer;
}

.speed-dial-item-wrapper {
  display: flex;
  align-items: center;
  gap: 16px; /* MD3 spacing between label and button */
}

.speed-dial-item-label {
  background-color: rgb(var(--md-sys-color-surface-container-high));
  color: rgb(var(--md-sys-color-on-surface));
  padding: 6px 16px; /* MD3 label padding */
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.1),
              0px 4px 5px 0px rgba(0,0,0,0.07),
              0px 1px 10px 0px rgba(0,0,0,0.06); /* MD3 elevation-1 */
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.2s cubic-bezier(0.4, 0.0, 0.2, 1),
              transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1); /* MD3 standard curve */
  white-space: nowrap;
}

.speed-dial-item:hover .speed-dial-item-label {
  opacity: 1;
  transform: translateX(0);
}

.speed-dial-item-button {
  width: 40px; /* MD3 small FAB size */
  height: 40px; /* MD3 small FAB size */
  border-radius: 12px;
  background-color: #E8DEF8!important; 
  color: #4A4458!important;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2),
              0px 4px 5px 0px rgba(0,0,0,0.14),
              0px 1px 10px 0px rgba(0,0,0,0.12); /* MD3 elevation-2 */
  transition: transform 0.2s cubic-bezier(0.0, 0.0, 0.2, 1),
              box-shadow 0.2s cubic-bezier(0.4, 0.0, 0.2, 1); /* MD3 standard curves */
}

.speed-dial-item-button:hover {
  box-shadow: 0px 3px 5px -1px rgba(0,0,0,0.2),
              0px 5px 8px 0px rgba(0,0,0,0.14),
              0px 1px 14px 0px rgba(0,0,0,0.12); /* MD3 elevation-3 on hover */
}

.speed-dial-item-button:active {
  transform: scale(0.95);
  box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2),
              0px 4px 5px 0px rgba(0,0,0,0.14),
              0px 1px 10px 0px rgba(0,0,0,0.12); /* MD3 elevation-2 */
}

.speed-dial-item-icon {
  font-size: 24px; /* MD3 icon sizing */
}

.speed-dial-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3); /* MD3 scrim opacity */
  z-index: 999;
}

/* Transitions */
.fab-menu-enter-active,
.fab-menu-leave-active {
  transition: opacity 0.3s cubic-bezier(0.0, 0.0, 0.2, 1); /* MD3 standard curve */
}

.fab-menu-enter-active .speed-dial-item,
.fab-menu-leave-active .speed-dial-item {
  transition: transform 0.3s cubic-bezier(0.0, 0.0, 0.2, 1),
              opacity 0.3s cubic-bezier(0.0, 0.0, 0.2, 1); /* MD3 standard curve */
}

.fab-menu-enter-from .speed-dial-item,
.fab-menu-leave-to .speed-dial-item {
  opacity: 0;
  transform: translateY(16px);
}

/* Staggered animation for items */
.fab-menu-enter-from .speed-dial-item-first,
.fab-menu-leave-to .speed-dial-item-first {
  transition-delay: 0s;
}

.fab-menu-enter-from .speed-dial-item:nth-child(2),
.fab-menu-leave-to .speed-dial-item:nth-child(2) {
  transition-delay: 0.05s;
}

.fab-menu-enter-from .speed-dial-item:nth-child(3),
.fab-menu-leave-to .speed-dial-item:nth-child(3) {
  transition-delay: 0.1s;
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.3s cubic-bezier(0.0, 0.0, 0.2, 1); /* MD3 standard curve */
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}
</style>