<template>
  <span class="walk-thumb" :class="{ 'is-loaded': loaded, 'has-image': !!src }">
    <img
      v-if="src && !failed"
      :key="src"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      loading="lazy"
      decoding="async"
      fetchpriority="low"
      @load="loaded = true"
      @error="failed = true"
    />
    <span v-if="!loaded || failed || !src" class="walk-thumb__placeholder" aria-hidden="true">
      <Icon icon="material-symbols:hiking-rounded" />
    </span>
  </span>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  width: { type: Number, default: 96 },
  height: { type: Number, default: 96 },
});
const loaded = ref(false);
const failed = ref(false);
// Rows are recycled by the virtual list: reset state when the image changes.
watch(() => props.src, () => { loaded.value = false; failed.value = false; });
</script>

<style scoped>
.walk-thumb {
  position: relative;
  display: block;
  overflow: hidden;
  background: var(--md-sys-color-surface-container-highest);
}
.walk-thumb img {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--md-sys-motion-spring-slow-effects-duration) var(--md-sys-motion-spring-slow-effects);
}
.walk-thumb.is-loaded img { opacity: 1; }
.walk-thumb__placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 32px;
  opacity: 0.5;
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent), transparent 60%),
    radial-gradient(circle at 80% 90%, color-mix(in srgb, var(--md-sys-color-tertiary) 16%, transparent), transparent 55%);
}
</style>
