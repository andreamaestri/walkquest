<template>
  <div
    class="m3-loading"
    :class="{ 'is-contained': contained }"
    :style="{ '--_size': `${size}px` }"
    role="progressbar"
    :aria-label="label"
    aria-busy="true"
  >
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path ref="pathRef" :d="initialPath" />
    </svg>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { LOADING_SEQUENCE, radiiToPath, sampleShape } from '../../design/shapes';
import { prefersReducedMotion } from '../../design/motion';

const props = defineProps({
  size: { type: Number, default: 48 },
  contained: { type: Boolean, default: false },
  label: { type: String, default: 'Loading' },
});

const POINTS = 72;
const MORPH_MS = 650;
const shapes = LOADING_SEQUENCE.map((name) => sampleShape(name, POINTS));
const radius = props.contained ? 30 : 38;
const initialPath = radiiToPath(shapes[0], 50, 50, radius);
const pathRef = ref(null);
let frame = 0;
let start = 0;

// Spring-like ease with a small overshoot (M3E fast spatial).
const ease = (t) => 1 - Math.cos(t * Math.PI * 0.5) ** 3 + Math.sin(t * Math.PI) * 0.06;

function tick(now) {
  if (!start) start = now;
  const elapsed = now - start;
  const step = Math.floor(elapsed / MORPH_MS);
  const progress = ease((elapsed % MORPH_MS) / MORPH_MS);
  const from = shapes[step % shapes.length];
  const to = shapes[(step + 1) % shapes.length];
  const radii = from.map((r, i) => r + (to[i] - r) * progress);
  // Continuous rotation plus a quarter turn per morph, like the spec.
  const rotation = (elapsed / 1000) * Math.PI * 0.9 + (step + progress) * (Math.PI / 2);
  pathRef.value?.setAttribute('d', radiiToPath(radii, 50, 50, radius, rotation));
  frame = requestAnimationFrame(tick);
}

onMounted(() => {
  if (!prefersReducedMotion()) frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<style scoped>
.m3-loading {
  display: inline-grid;
  place-items: center;
  inline-size: var(--_size);
  block-size: var(--_size);
  border-radius: var(--md-sys-shape-corner-full);
  color: var(--md-sys-color-primary);
}
.m3-loading.is-contained {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}
svg { inline-size: 100%; block-size: 100%; overflow: visible; }
path { fill: currentColor; }
@media (prefers-reduced-motion: reduce) {
  svg { animation: m3-loading-spin 2s linear infinite; }
}
@keyframes m3-loading-spin { to { transform: rotate(1turn); } }
</style>
