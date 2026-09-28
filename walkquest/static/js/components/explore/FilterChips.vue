<template>
  <div class="chips" :class="{ 'can-back': canBack, 'can-forward': canForward, 'is-dragging': dragging }">
    <div
      ref="trackRef"
      class="chips__track"
      role="toolbar"
      aria-label="Filters"
      @scroll.passive="updateEdges"
      @keydown="onKeydown"
      @focusin="onFocusin"
    >
      <M3Chip
        :selected="search.mode === 'nearby'"
        :icon="search.locating ? 'material-symbols:progress-activity' : 'material-symbols:near-me-outline-rounded'"
        :aria-busy="search.locating ? 'true' : undefined"
        @click="$emit('nearby')"
      >
        {{ search.mode === 'nearby' && search.origin ? nearbyLabel : 'Nearby' }}
      </M3Chip>
      <M3Menu
        v-if="search.mode === 'nearby' && search.origin"
        :items="radiusItems"
        :model-value="search.radiusMiles"
        align="start"
        @update:model-value="search.radiusMiles = $event"
      >
        <template #trigger="{ open, toggle }">
          <M3Chip
            :filter="false"
            trailing-icon="material-symbols:arrow-drop-down-rounded"
            aria-haspopup="menu"
            :aria-expanded="String(open)"
            @click="toggle"
          >
            Within {{ search.radiusMiles }} mi
          </M3Chip>
        </template>
      </M3Menu>
      <M3Chip :selected="search.mode === 'saved'" icon="material-symbols:bookmark-outline-rounded" @click="toggleSaved">
        Saved
      </M3Chip>
      <M3Menu :items="difficultyItems" :model-value="difficultyValue" align="start" @update:model-value="setDifficulty">
        <template #trigger="{ open, toggle }">
          <M3Chip
            :selected="search.difficulties.length > 0"
            :filter="false"
            icon="material-symbols:landscape-2-outline-rounded"
            trailing-icon="material-symbols:arrow-drop-down-rounded"
            aria-haspopup="menu"
            :aria-expanded="String(open)"
            @click="toggle"
          >
            {{ difficultyLabel }}
          </M3Chip>
        </template>
      </M3Menu>
      <span class="chips__divider" role="separator" aria-orientation="vertical" />
      <M3Chip
        v-for="slug in categorySlugs"
        :key="slug"
        :selected="search.categories.includes(slug)"
        :icon="categoryIcon(slug)"
        @click="search.toggleCategory(slug)"
      >
        {{ categoryLabel(slug, walksStore.categoryNames) }}
      </M3Chip>
    </div>

    <!-- Mouse affordance only (hidden on touch, see CSS). Keyboard and screen-reader
         users move through the toolbar with arrow keys, so these stay out of the
         tab order and the accessibility tree rather than adding redundant stops. -->
    <M3IconButton
      class="chips__arrow chips__arrow--back"
      icon="material-symbols:chevron-left-rounded"
      label="Scroll filters back"
      size="xs"
      tabindex="-1"
      aria-hidden="true"
      @click="page(-1)"
    />
    <M3IconButton
      class="chips__arrow chips__arrow--forward"
      icon="material-symbols:chevron-right-rounded"
      label="Scroll filters forward"
      size="xs"
      tabindex="-1"
      aria-hidden="true"
      @click="page(1)"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { usePreferredReducedMotion, useResizeObserver } from '@vueuse/core';
import M3Chip from '../m3/M3Chip.vue';
import M3IconButton from '../m3/M3IconButton.vue';
import M3Menu from '../m3/M3Menu.vue';
import { useSearchStore } from '../../stores/searchStore';
import { useWalksStore } from '../../stores/walks';
import { categoryIcon, categoryLabel, CATEGORY_META } from '../../utils/walks';

defineEmits(['nearby']);
const search = useSearchStore();
const walksStore = useWalksStore();

const categorySlugs = computed(() => {
  const used = walksStore.categoryUsage.length ? walksStore.categoryUsage : Object.keys(CATEGORY_META);
  // Keep selected categories first so they stay visible.
  return [...search.categories, ...used.filter((slug) => !search.categories.includes(slug))];
});

const nearbyLabel = computed(() => {
  const label = search.origin?.label || 'Nearby';
  return label.length > 22 ? `${label.slice(0, 21)}…` : label;
});

const radiusItems = [2, 5, 10, 20, 40].map((value) => ({ value, label: `Within ${value} miles` }));

const LEVELS = ['Easy', 'Easy–moderate', 'Moderate', 'Challenging', 'Strenuous'];
const difficultyItems = [
  { value: 0, label: 'Any difficulty' },
  ...LEVELS.map((label, i) => ({ value: i + 1, label })),
];
const difficultyValue = computed(() => search.difficulties[0] ?? 0);
const difficultyLabel = computed(() => (search.difficulties.length ? LEVELS[search.difficulties[0] - 1] : 'Difficulty'));
function setDifficulty(value) {
  search.difficulties = value ? [value] : [];
}

function toggleSaved() {
  search.setMode(search.mode === 'saved' ? 'explore' : 'saved');
}

const trackRef = ref(null);
const chipEls = () => [...(trackRef.value?.querySelectorAll('.m3-chip') || [])];

// ── Keyboard: ARIA toolbar pattern ───────────────────────────────────────
// One tab stop for the whole row; arrow keys, Home and End move between chips.
// Tracked by element, not index: selecting a category moves its chip to the front.
let activeChip = null;

function syncTabStops() {
  const chips = chipEls();
  if (!chips.includes(activeChip)) activeChip = chips[0] || null;
  chips.forEach((chip) => { chip.tabIndex = chip === activeChip ? 0 : -1; });
}
function onFocusin(event) {
  if (!chipEls().includes(event.target)) return;
  activeChip = event.target;
  syncTabStops();
}
function onKeydown(event) {
  const chips = chipEls();
  const index = chips.indexOf(event.target);
  if (index === -1) return; // e.g. focus is inside an open menu
  const next = {
    ArrowRight: Math.min(index + 1, chips.length - 1),
    ArrowLeft: Math.max(index - 1, 0),
    Home: 0,
    End: chips.length - 1,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  chips[next].focus(); // scroll-padding keeps it clear of the edge fades
}

// ── Pointer: wheel, drag and arrow buttons ───────────────────────────────
// Touch swipes the row natively; a mouse can't reach a hidden horizontal
// scrollbar, so these give it the same reach.
const canBack = ref(false);
const canForward = ref(false);
const dragging = ref(false);
const reducedMotion = usePreferredReducedMotion();

function updateEdges() {
  const el = trackRef.value;
  if (!el) return;
  canBack.value = el.scrollLeft > 1;
  canForward.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
}
useResizeObserver(trackRef, updateEdges);
// Chips come, go and reorder (radius chip, selected categories, labels) without
// resizing the track. Moving a focused chip in the DOM blurs it, so put focus back.
watch(
  () => [categorySlugs.value.join(), search.mode, search.origin, difficultyLabel.value, walksStore.categoryNames],
  () => {
    const hadFocus = trackRef.value?.contains(document.activeElement);
    nextTick(() => {
      updateEdges();
      syncTabStops();
      if (hadFocus && activeChip && !trackRef.value?.contains(document.activeElement)) activeChip.focus();
    });
  },
);

function page(direction) {
  const el = trackRef.value;
  if (!el) return;
  const max = el.scrollWidth - el.clientWidth;
  let left = el.scrollLeft + direction * el.clientWidth * 0.75;
  // Don't strand the row a few pixels short of either end.
  if (left < 24) left = 0;
  else if (left > max - 24) left = max;
  el.scrollTo({ left, behavior: reducedMotion.value === 'reduce' ? 'auto' : 'smooth' });
}

/** Vertical wheel → horizontal scroll; once the row runs out, let the list scroll instead. */
function onWheel(event) {
  const el = trackRef.value;
  if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
  const max = el.scrollWidth - el.clientWidth;
  if ((delta < 0 && el.scrollLeft <= 0) || (delta > 0 && el.scrollLeft >= max - 1)) return;
  event.preventDefault();
  el.scrollLeft += delta;
}

// Click-and-drag with a mouse. The threshold keeps ordinary chip clicks working.
const DRAG_THRESHOLD = 5;
let drag = null;
let suppressClick = false;

function onPointerDown(event) {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  drag = { id: event.pointerId, x: event.clientX, left: trackRef.value.scrollLeft, moved: false };
}
function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  if (!drag.moved) {
    if (Math.abs(dx) < DRAG_THRESHOLD) return;
    drag.moved = true;
    dragging.value = true;
    trackRef.value.setPointerCapture(event.pointerId);
  }
  trackRef.value.scrollLeft = drag.left - dx;
}
function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.id) return;
  if (drag.moved) {
    // Swallow the click that ends a drag; clear it next task in case none follows.
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
  }
  drag = null;
  dragging.value = false;
}
function onClickCapture(event) {
  if (!suppressClick) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}

const listeners = [
  ['wheel', onWheel, { passive: false }],
  ['pointerdown', onPointerDown],
  ['pointermove', onPointerMove],
  ['pointerup', onPointerUp],
  ['pointercancel', onPointerUp],
  ['click', onClickCapture, true],
];
onMounted(() => {
  listeners.forEach(([type, fn, options]) => trackRef.value.addEventListener(type, fn, options));
  updateEdges();
  syncTabStops();
});
onBeforeUnmount(() => {
  listeners.forEach(([type, fn, options]) => trackRef.value?.removeEventListener(type, fn, options));
});
</script>

<style scoped>
.chips {
  --_fade: 40px;
  position: relative;
}
.chips__track {
  --_fade-start: 0px;
  --_fade-end: 0px;
  display: flex;
  gap: 8px;
  padding: 4px 16px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  /* Focused chips scroll fully clear of the edge fade (and arrow buttons). */
  scroll-padding-inline: var(--_fade);
  overscroll-behavior-x: contain;
  /* Fade whichever edge still has chips beyond it. */
  mask-image: linear-gradient(to right,
    transparent 0, #000 var(--_fade-start),
    #000 calc(100% - var(--_fade-end)), transparent 100%);
}
.chips__track::-webkit-scrollbar { display: none; }
/* The row clips overflow: keep the global 3px focus ring inside its 4px padding. */
.chips__track :deep(.m3-chip:focus-visible) { outline-offset: 0; }
.can-back .chips__track { --_fade-start: var(--_fade); }
.can-forward .chips__track { --_fade-end: var(--_fade); }
.chips__divider { flex: none; inline-size: 1px; margin-block: 4px; background: var(--md-sys-color-outline-variant); }

.chips__arrow { display: none; }

@media (hover: hover) and (pointer: fine) {
  .chips { --_fade: 64px; }
  .chips__track { cursor: grab; }
  .is-dragging .chips__track { cursor: grabbing; user-select: none; }
  .is-dragging .chips__track :deep(.m3-chip) { pointer-events: none; }

  .chips__arrow {
    position: absolute;
    z-index: 1;
    inset-block-start: 4px;
    display: inline-grid;
    background: var(--md-sys-color-surface-container-highest);
    color: var(--md-sys-color-on-surface);
    box-shadow: var(--md-sys-elevation-1);
    opacity: 0;
    scale: 0.6;
    pointer-events: none;
    transition:
      opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects),
      scale var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
  }
  .chips__arrow--back { inset-inline-start: 8px; }
  .chips__arrow--forward { inset-inline-end: 8px; }
  .can-back .chips__arrow--back,
  .can-forward .chips__arrow--forward {
    opacity: 1;
    scale: 1;
    pointer-events: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chips__arrow { scale: 1; transition-property: opacity; }
}

/* High-contrast mode drops shadows and backgrounds: keep the arrows visible. */
@media (forced-colors: active) {
  .chips__arrow { border: 1px solid ButtonText; }
}
</style>
