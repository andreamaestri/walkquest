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
  background-color: rgb(var(--md-sys-color-surface));
  z-index: 10;
  padding: env(safe-area-inset-top, 12px) 16px 12px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(var(--md-sys-color-outline), 0.08);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-container.mobile {
  border-radius: 28px 28px 0 0;
  background-color: rgb(var(--md-sys-color-surface));
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  margin-top: 7px;
  min-height: 56px;
  margin-left: 10px;
}

.m3-icon-button {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #4F378B;
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 0;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.m3-icon-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: #4F378B;
  border-radius: inherit;
  opacity: 0;
  transform: scale(0);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
              opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.m3-icon-button:hover::before {
  opacity: 0.08;
  transform: scale(1);
}

.m3-icon-button:active {
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
  color: #4F378B;
  line-height: 32px;
  letter-spacing: 0;
  overflow: hidden;
  padding-right: 16px;
  flex: 1;
}

.mobile .m3-headline-small {
  font-size: 20px;
  line-height: 28px;
}

.loading {
  opacity: 0.5;
  pointer-events: none;
}

/* Ensure consistent height */
.header-content {
  min-height: 56px;
}

/* Add transition for loading state */
.loading {
  transition: opacity 0.2s ease;
}

/* Improve touch feedback */
@media (hover: hover) {
  .m3-icon-button:hover {
    background-color: rgba(var(--md-sys-color-on-surface), 0.08);
  }
}

@media (hover: none) {
  .m3-icon-button:active {
    background-color: rgba(var(--md-sys-color-on-surface), 0.12);
  }
}
</style>