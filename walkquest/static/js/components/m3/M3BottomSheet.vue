<template>
  <section
    ref="sheetRef"
    class="m3-sheet"
    :class="{ 'is-dragging': dragging }"
    :style="{ '--_height': `${height}px`, transform: `translateY(${offset}px)` }"
    :aria-label="label"
  >
    <div
      class="m3-sheet__handle-area"
      @pointerdown="onPointerDown"
      @keydown.up.prevent="step(1)"
      @keydown.down.prevent="step(-1)"
    >
      <button
        type="button"
        class="m3-sheet__handle"
        :aria-label="`Resize ${label}`"
        @click="step(snapIndex === snaps.length - 1 ? -1 : 1)"
      />
      <slot name="header" />
    </div>
    <div class="m3-sheet__body">
      <slot :height="bodyHeight" />
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  label: { type: String, default: 'Sheet' },
  /** Visible heights: numbers are px, strings like '50%' are viewport fractions. */
  snapPoints: { type: Array, default: () => [148, '50%', '92%'] },
  modelValue: { type: Number, default: 0 },
  headerHeight: { type: Number, default: 36 },
});
const emit = defineEmits(['update:modelValue', 'height']);

const viewport = ref(window.innerHeight);
const snaps = computed(() =>
  props.snapPoints.map((p) => (typeof p === 'string' ? (parseFloat(p) / 100) * viewport.value : p)),
);
const height = computed(() => Math.max(...snaps.value));
const snapIndex = ref(Math.min(props.modelValue, props.snapPoints.length - 1));
const dragDelta = ref(0);
const dragging = ref(false);
const visible = computed(() => Math.max(0, snaps.value[snapIndex.value] - dragDelta.value));
const offset = computed(() => height.value - visible.value);
const bodyHeight = computed(() => Math.max(0, visible.value - props.headerHeight));

watch(() => props.modelValue, (value) => { snapIndex.value = Math.min(value, snaps.value.length - 1); });
watch(visible, (value) => emit('height', value), { immediate: true });

function step(direction) {
  snapIndex.value = Math.max(0, Math.min(snaps.value.length - 1, snapIndex.value + direction));
  emit('update:modelValue', snapIndex.value);
}

let startY = 0;
let startTime = 0;
function onPointerDown(event) {
  if (event.button !== 0) return;
  dragging.value = true;
  startY = event.clientY;
  startTime = performance.now();
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
}
function onPointerMove(event) {
  dragDelta.value = event.clientY - startY;
}
function onPointerUp(event) {
  window.removeEventListener('pointermove', onPointerMove);
  const velocity = (event.clientY - startY) / Math.max(1, performance.now() - startTime);
  const target = snaps.value[snapIndex.value] - dragDelta.value;
  let nearest = 0;
  snaps.value.forEach((snap, i) => {
    if (Math.abs(snap - target) < Math.abs(snaps.value[nearest] - target)) nearest = i;
  });
  if (Math.abs(velocity) > 0.6) nearest = Math.max(0, Math.min(snaps.value.length - 1, snapIndex.value + (velocity < 0 ? 1 : -1)));
  dragging.value = false;
  dragDelta.value = 0;
  snapIndex.value = nearest;
  emit('update:modelValue', nearest);
}

const onResize = () => { viewport.value = window.innerHeight; };
onMounted(() => window.addEventListener('resize', onResize));
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('pointermove', onPointerMove);
});
defineExpose({ snapTo: (i) => { snapIndex.value = i; emit('update:modelValue', i); } });
</script>

<style scoped>
.m3-sheet {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  block-size: var(--_height);
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  border-radius: var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large) 0 0;
  box-shadow: var(--md-sys-elevation-2);
  transition: transform var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial);
  will-change: transform;
  padding-bottom: env(safe-area-inset-bottom);
}
.m3-sheet.is-dragging { transition: none; }
.m3-sheet__handle-area { flex: none; touch-action: none; cursor: grab; }
.m3-sheet__handle {
  display: block;
  inline-size: 32px;
  block-size: 4px;
  margin: 16px auto;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: var(--md-sys-color-on-surface-variant);
  opacity: 0.4;
  cursor: grab;
}
.m3-sheet__handle::before { content: ''; position: absolute; inset: -16px -24px; }
.m3-sheet__handle { position: relative; }
.m3-sheet__body { flex: 1; min-block-size: 0; overflow: hidden; display: flex; flex-direction: column; }
</style>
