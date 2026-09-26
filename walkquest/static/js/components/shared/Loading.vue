<template>
  <Transition name="loading-fade">
    <div v-if="visible" class="loading-scrim" role="status" aria-live="polite">
      <div class="loading-card">
        <M3LoadingIndicator :size="56" contained :label="message || 'Loading'" />
        <span v-if="message" class="type-body-large">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue';
import M3LoadingIndicator from '../m3/M3LoadingIndicator.vue';

const visible = ref(false);
const message = ref('');

const show = (msg = '') => {
  message.value = msg;
  visible.value = true;
};
const hide = () => {
  visible.value = false;
  message.value = '';
};

defineExpose({ show, hide });
</script>

<style scoped>
.loading-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--md-sys-color-surface) 72%, transparent);
  backdrop-filter: blur(4px);
}
.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--md-sys-color-on-surface);
}
.loading-fade-enter-active,
.loading-fade-leave-active { transition: opacity var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects); }
.loading-fade-enter-from,
.loading-fade-leave-to { opacity: 0; }
</style>
