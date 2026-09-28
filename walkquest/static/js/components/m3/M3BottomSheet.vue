<template>
  <section
    ref="sheetRef"
    class="m3-sheet"
    :class="{ 'is-dragging': dragging }"
    :style="{ '--_height': `${height}px` }"
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
        @click="onHandleClick"
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
import { animate, motionValue } from 'motion-v';
import { prefersReducedMotion, springs } from '../../design/motion';

const props = defineProps({
  label: { type: String, default: 'Sheet' },
  /** Visible heights: numbers are px, strings like '50%' are viewport fractions. */
  snapPoints: { type: Array, default: () => [148, '50%', '92%'] },
  modelValue: { type: Number, default: 0 },
  headerHeight: { type: Number, default: 36 },
});
/** `height`: visible height on every frame. `settle`: the snap height the sheet is heading to. */
const emit = defineEmits(['update:modelValue', 'height', 'settle']);

const sheetRef = ref(null);
const viewport = ref(window.innerHeight);
const snaps = computed(() =>
  props.snapPoints.map((p) => (typeof p === 'string' ? (parseFloat(p) / 100) * viewport.value : p)),
);
const height = computed(() => Math.max(...snaps.value));
const snapIndex = ref(Math.min(props.modelValue, props.snapPoints.length - 1));
const dragging = ref(false);

// The sheet is always full height and slides; `offset` is how far below its top position it sits.
const offset = motionValue(height.value - snaps.value[snapIndex.value]);
const visible = ref(snaps.value[snapIndex.value]);
const bodyHeight = computed(() => Math.max(0, visible.value - props.headerHeight));
let settle = null;

offset.on('change', (y) => {
  if (sheetRef.value) sheetRef.value.style.transform = `translateY(${y}px)`;
  visible.value = Math.max(0, height.value - y);
});
watch(visible, (value) => emit('height', value), { immediate: true });

/** Springs to the current snap (M3E default spatial), carrying over any fling velocity. */
function glide(velocity = 0) {
  const target = height.value - snaps.value[snapIndex.value];
  emit('settle', snaps.value[snapIndex.value]);
  settle?.stop();
  if (prefersReducedMotion()) {
    offset.set(target);
    return;
  }
  settle = animate(offset, target, { ...springs.defaultSpatial, velocity, restDelta: 0.5 });
}

watch(() => props.modelValue, (value) => {
  const next = Math.min(value, snaps.value.length - 1);
  if (next === snapIndex.value) return;
  snapIndex.value = next;
  glide(offset.getVelocity());
});
watch(snaps, () => glide());

function step(direction) {
  snapIndex.value = Math.max(0, Math.min(snaps.value.length - 1, snapIndex.value + direction));
  emit('update:modelValue', snapIndex.value);
  glide(offset.getVelocity());
}

// ── Drag: follow the finger, rubber-band past the ends, fling to a snap ──
let startY = 0;
let startOffset = 0;
let samples = [];
let moved = false;

function onPointerDown(event) {
  if (event.button !== 0) return;
  settle?.stop();
  dragging.value = true;
  moved = false;
  startY = event.clientY;
  startOffset = offset.get();
  samples = [{ y: event.clientY, t: event.timeStamp }];
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(event) {
  const min = height.value - snaps.value[snaps.value.length - 1];
  const max = height.value - snaps.value[0];
  let y = startOffset + (event.clientY - startY);
  // Resist beyond the first/last snap instead of stopping dead.
  if (y < min) y = min - Math.sqrt(min - y) * 4;
  if (y > max) y = max + Math.sqrt(y - max) * 4;
  if (Math.abs(event.clientY - startY) > 4) moved = true;
  offset.set(y);
  samples.push({ y: event.clientY, t: event.timeStamp });
  if (samples.length > 5) samples.shift();
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  if (!dragging.value) return;
  dragging.value = false;
  if (!moved) {
    glide(); // a tap: the handle's click handler decides
    return;
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = (last.t - first.t) / 1000;
  const velocity = dt > 0 ? (last.y - first.y) / dt : 0; // px/s, positive = downwards
  // Project where the fling would carry the sheet, then take the nearest snap.
  const projected = height.value - (offset.get() + velocity * 0.18);
  let nearest = 0;
  snaps.value.forEach((snap, i) => {
    if (Math.abs(snap - projected) < Math.abs(snaps.value[nearest] - projected)) nearest = i;
  });
  snapIndex.value = nearest;
  emit('update:modelValue', nearest);
  glide(velocity);
}

function onHandleClick() {
  if (moved) return;
  step(snapIndex.value === snaps.value.length - 1 ? -1 : 1);
}

const onResize = () => { viewport.value = window.innerHeight; };
onMounted(() => {
  window.addEventListener('resize', onResize);
  sheetRef.value.style.transform = `translateY(${offset.get()}px)`;
  emit('settle', snaps.value[snapIndex.value]);
});
onBeforeUnmount(() => {
  settle?.stop();
  offset.destroy();
  window.removeEventListener('resize', onResize);
  onPointerUp();
});
defineExpose({
  snapTo: (i) => {
    snapIndex.value = i;
    emit('update:modelValue', i);
    glide();
  },
});
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
  /* Moved by a JS spring (see glide), so there is no CSS transition. */
  will-change: transform;
  padding-bottom: env(safe-area-inset-bottom);
}
.m3-sheet__handle-area { flex: none; touch-action: none; cursor: grab; }
.is-dragging .m3-sheet__handle-area { cursor: grabbing; }
.m3-sheet__handle {
  position: relative;
  display: block;
  inline-size: 32px;
  block-size: 4px;
  margin: 16px auto;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: var(--md-sys-color-on-surface-variant);
  opacity: 0.4;
  cursor: inherit;
  transition: inline-size var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}
/* M3E: the handle stretches while held. */
.is-dragging .m3-sheet__handle { inline-size: 48px; opacity: 0.7; }
.m3-sheet__handle::before { content: ''; position: absolute; inset: -16px -24px; }
.m3-sheet__body { flex: 1; min-block-size: 0; overflow: hidden; display: flex; flex-direction: column; }
</style>
