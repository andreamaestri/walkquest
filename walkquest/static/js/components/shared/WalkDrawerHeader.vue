<template>
  <header class="header-container" :class="{ 'mobile': isMobile }">
    <div class="header-content" :class="{ loading: isLoading }">
      <button class="m3-icon-button" @click="$emit('close')" aria-label="Close drawer">
        <Icon icon="mdi:arrow-back" class="text-2xl" />
      </button>
      <h2 class="m3-headline-small" :class="{ loading: isLoading }">
        {{ walk.title || walk.walk_name }}
      </h2>
    </div>
    <slot name="header-image"></slot>
  </header>
</template>

<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  walk: { 
    type: Object, 
    required: true 
  },
  isLoading: { 
    type: Boolean, 
    default: false 
  },
  isMobile: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close']);
</script>

<style scoped>
.header-container {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  width: 100%;
  background-color: rgb(var(--md-sys-color-surface-container-high));
  z-index: 10;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline-variant), 0.12);
  transition: box-shadow 0.2s ease;
}

.header-container.mobile {
  border-radius: 28px 28px 0 0; /* Match bottom sheet radius */
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.m3-icon-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: rgb(var(--md-sys-color-on-surface));
  position: relative;
  overflow: hidden;
  margin-right: 4px;
  -webkit-tap-highlight-color: transparent;
}

.m3-icon-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: currentColor;
  border-radius: inherit;
  opacity: 0;
  transform: scale(0);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.m3-icon-button:hover {
  background-color: rgba(var(--md-sys-color-on-surface), 0.08);
}

.m3-icon-button:hover::before {
  opacity: 0.08;
  transform: scale(1);
}

.m3-icon-button:active {
  background-color: rgba(var(--md-sys-color-on-surface), 0.12);
  transform: scale(0.96);
}

.m3-icon-button:active::before {
  opacity: 0.12;
  transform: scale(1);
}

.m3-headline-small {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  color: rgb(var(--md-sys-color-on-surface));
  line-height: 32px;
  overflow: visible;
  white-space: normal;
  word-wrap: break-word;
  padding-right: 8px;
}

.loading {
  opacity: 0.5;
  pointer-events: none;
}

.mobile .m3-headline-small {
  font-size: 20px;
  line-height: 28px;
}
</style>