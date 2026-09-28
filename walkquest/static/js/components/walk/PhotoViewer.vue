<template>
  <!-- Native modal dialog: top layer (escapes the pane/sheet), inert background,
       Esc handling and focus restoration for free. -->
  <dialog
    ref="dialogRef"
    class="photo-viewer"
    :class="{ 'is-settling': settling }"
    :style="{ '--_scrim': scrim }"
    :aria-label="`Photos of ${title}`"
    @cancel.prevent="$emit('close')"
    @keydown="onKeydown"
  >
    <header class="photo-viewer__top">
      <span v-if="slides.length > 1" class="type-label-large photo-viewer__count" aria-hidden="true">
        {{ index + 1 }} / {{ slides.length }}
      </span>
      <M3IconButton
        class="photo-viewer__btn photo-viewer__close"
        icon="material-symbols:close-rounded"
        label="Close photo viewer"
        autofocus
        @click="$emit('close')"
      />
    </header>

    <div
      ref="trackRef"
      class="photo-viewer__track"
      @scroll.passive="onScroll"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <div
        v-for="(photo, i) in slides"
        :key="photo.url"
        class="photo-viewer__slide"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} of ${slides.length}`"
        :aria-hidden="i !== index ? 'true' : undefined"
        @click.self="$emit('close')"
      >
        <img
          class="photo-viewer__img"
          :src="photo.url"
          :alt="photo.caption || `${title} photo ${i + 1}`"
          :width="photo.width || 960"
          :height="photo.height || 640"
          :loading="Math.abs(i - index) <= 1 ? 'eager' : 'lazy'"
          decoding="async"
          draggable="false"
          :style="i === index ? currentStyle : null"
        />
      </div>
    </div>

    <footer class="photo-viewer__bottom">
      <div class="photo-viewer__text" aria-live="polite">
        <p v-if="current?.caption" class="type-body-large photo-viewer__caption">{{ current.caption }}</p>
        <p v-if="current?.credit" class="type-body-small photo-viewer__credit">© {{ current.credit }}</p>
      </div>
      <div v-if="slides.length > 1" class="photo-viewer__nav" role="group" aria-label="Photo navigation">
        <M3IconButton class="photo-viewer__btn" icon="material-symbols:chevron-left-rounded" label="Previous photo" :disabled="index === 0" @click="go(index - 1)" />
        <M3IconButton class="photo-viewer__btn" icon="material-symbols:chevron-right-rounded" label="Next photo" :disabled="index === slides.length - 1" @click="go(index + 1)" />
      </div>
    </footer>
  </dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import M3IconButton from '../m3/M3IconButton.vue';

const props = defineProps({
  slides: { type: Array, required: true },
  index: { type: Number, default: 0 },
  title: { type: String, default: 'walk' },
  /** Names the current photo for the shared-element (view transition) morph. */
  morph: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'update:index']);

const dialogRef = ref(null);
const trackRef = ref(null);
const current = computed(() => props.slides[props.index]);

onMounted(() => {
  // Open synchronously so the view transition's "new" snapshot includes it.
  dialogRef.value.showModal();
  trackRef.value.scrollLeft = props.index * trackRef.value.clientWidth;
});
onBeforeUnmount(() => {
  // close() (not just removal) restores focus to whatever opened the viewer.
  if (dialogRef.value?.open) dialogRef.value.close();
});

// ── Paging ───────────────────────────────────────────────────────────────
function onScroll() {
  const el = trackRef.value;
  const i = Math.round(el.scrollLeft / el.clientWidth);
  if (i !== props.index && i >= 0 && i < props.slides.length) emit('update:index', i);
}
function go(i) {
  const el = trackRef.value;
  const next = Math.max(0, Math.min(props.slides.length - 1, i));
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
}
function onKeydown(event) {
  if (event.key === 'ArrowRight') go(props.index + 1);
  else if (event.key === 'ArrowLeft') go(props.index - 1);
  else if (event.key === 'Home') go(0);
  else if (event.key === 'End') go(props.slides.length - 1);
  else return;
  event.preventDefault();
}

// ── Swipe down to dismiss (touch / pen) ──────────────────────────────────
// The track only lets the browser pan horizontally (touch-action), so a
// vertical drag arrives here as pointer events.
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.6; // px/ms
const dragY = ref(0);
const settling = ref(false);
let gesture = null;

const scrim = computed(() => 1 - Math.min(dragY.value / 400, 1) * 0.75);
const currentStyle = computed(() => {
  const style = { viewTransitionName: props.morph ? 'wq-photo' : 'none' };
  if (dragY.value) style.transform = `translateY(${dragY.value}px) scale(${1 - Math.min(dragY.value / 1200, 0.2)})`;
  return style;
});

function onPointerDown(event) {
  if (event.pointerType === 'mouse' || !event.isPrimary) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, mode: null, lastY: event.clientY, lastT: event.timeStamp, v: 0 };
  settling.value = false;
}
function onPointerMove(event) {
  if (!gesture || event.pointerId !== gesture.id) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (!gesture.mode) {
    if (Math.hypot(dx, dy) < 10) return;
    gesture.mode = dy > 0 && Math.abs(dy) > Math.abs(dx) ? 'dismiss' : 'pan';
    if (gesture.mode === 'dismiss') trackRef.value.setPointerCapture(event.pointerId);
  }
  if (gesture.mode !== 'dismiss') return;
  const dt = event.timeStamp - gesture.lastT;
  if (dt > 0) gesture.v = (event.clientY - gesture.lastY) / dt;
  gesture.lastY = event.clientY;
  gesture.lastT = event.timeStamp;
  dragY.value = Math.max(0, dy);
}
function onPointerUp(event) {
  if (!gesture || event.pointerId !== gesture.id) return;
  const { mode, v } = gesture;
  gesture = null;
  if (mode !== 'dismiss') return;
  if (dragY.value > DISMISS_DISTANCE || v > DISMISS_VELOCITY) {
    emit('close'); // the morph back starts from the dragged position
  } else {
    settling.value = true;
    dragY.value = 0;
  }
}
function onPointerCancel(event) {
  if (!gesture || event.pointerId !== gesture.id) return;
  gesture = null;
  settling.value = true;
  dragY.value = 0;
}
</script>

<style scoped>
.photo-viewer {
  --_fg: #fff;
  --_fg-muted: rgb(255 255 255 / 0.72);
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  inline-size: 100vw;
  block-size: 100dvh;
  max-inline-size: none;
  max-block-size: none;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--_fg);
  color-scheme: dark;
  background: rgb(0 0 0 / calc(0.94 * var(--_scrim, 1)));
  overflow: hidden;
  animation: photo-viewer-in var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects);
}
.photo-viewer::backdrop { background: transparent; }
.photo-viewer:focus { outline: none; }
@keyframes photo-viewer-in { from { opacity: 0; } }

.photo-viewer__top,
.photo-viewer__bottom {
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-inline: max(16px, env(safe-area-inset-left)) max(16px, env(safe-area-inset-right));
  opacity: var(--_scrim);
}
.photo-viewer__top { padding-block: max(12px, env(safe-area-inset-top)) 8px; }
.photo-viewer__bottom { padding-block: 8px max(16px, env(safe-area-inset-bottom)); min-block-size: 64px; }
.photo-viewer__count { color: var(--_fg-muted); font-variant-numeric: tabular-nums; }
.photo-viewer__close { margin-inline-start: auto; }
.photo-viewer__btn {
  background: rgb(255 255 255 / 0.12);
  color: var(--_fg);
}
.photo-viewer__btn:disabled { opacity: 0.3; }

.photo-viewer__track {
  display: flex;
  min-block-size: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  /* Horizontal swipes page natively; vertical drags reach the dismiss gesture. */
  touch-action: pan-x pinch-zoom;
}
.photo-viewer__track::-webkit-scrollbar { display: none; }
.photo-viewer__slide {
  flex: 0 0 100%;
  display: grid;
  /* Definite tracks so the photo's max-block-size: 100% resolves (portraits fit). */
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  place-items: center;
  min-block-size: 0;
  padding: 0 max(8px, env(safe-area-inset-left));
  scroll-snap-align: center;
  scroll-snap-stop: always;
}
.photo-viewer__img {
  display: block;
  inline-size: auto;
  block-size: auto;
  max-inline-size: 100%;
  max-block-size: 100%;
  border-radius: var(--md-sys-shape-corner-medium);
  user-select: none;
  -webkit-user-drag: none;
}
.is-settling .photo-viewer__img {
  transition: transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
.is-settling,
.is-settling .photo-viewer__top,
.is-settling .photo-viewer__bottom {
  transition:
    background-color var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects),
    opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects);
}

.photo-viewer__text { flex: 1; min-inline-size: 0; }
.photo-viewer__text p { margin: 0; }
.photo-viewer__caption { color: var(--_fg); text-wrap: pretty; }
.photo-viewer__credit { color: var(--_fg-muted); margin-top: 2px !important; }
.photo-viewer__nav { display: flex; gap: 8px; flex: none; }
/* Touch users swipe; the buttons are for mouse and keyboard. */
@media (hover: none) and (pointer: coarse) {
  .photo-viewer__nav { display: none; }
}
@media (forced-colors: active) {
  .photo-viewer__btn { border: 1px solid ButtonText; }
}
</style>

<style>
/* Shared-element morph between the carousel card and the fullscreen photo
   (View Transitions; only active while PhotoCarousel runs one). */
:root.photo-vt::view-transition-old(root),
:root.photo-vt::view-transition-new(root) {
  animation: none;
}
:root.photo-vt::view-transition-group(wq-photo) {
  animation-duration: var(--md-sys-motion-spring-default-spatial-duration);
  animation-timing-function: var(--md-sys-motion-spring-default-spatial);
}
:root.photo-vt::view-transition-old(wq-photo),
:root.photo-vt::view-transition-new(wq-photo) {
  /* Card is a 4:3 crop, the viewer shows the whole photo: cover both while
     the box morphs so neither is stretched. */
  block-size: 100%;
  object-fit: cover;
  animation-duration: var(--md-sys-motion-spring-fast-effects-duration);
}
/* The viewer's own scrim and controls fade under the morphing photo. */
:root.photo-vt .photo-viewer { animation: none; view-transition-name: wq-photo-viewer; }
:root.photo-vt::view-transition-group(wq-photo-viewer) {
  animation-duration: var(--md-sys-motion-spring-default-effects-duration);
  animation-timing-function: var(--md-sys-motion-spring-default-effects);
}
</style>
