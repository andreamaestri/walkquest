<template>
  <section class="carousel" :class="{ 'is-single': slides.length < 2 }" :aria-label="`Photos of ${title}`" aria-roledescription="carousel">
    <!-- M3 hero carousel: one large item with the next one peeking in. -->
    <div
      ref="track"
      class="carousel__track"
      tabindex="0"
      @scroll.passive="onScroll"
      @keydown.left.prevent="go(index - 1)"
      @keydown.right.prevent="go(index + 1)"
    >
      <div
        v-for="(photo, i) in slides"
        :key="photo.url"
        class="carousel__item"
        :class="{ 'is-current': i === index }"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} of ${slides.length}`"
        @click="i !== index && go(i)"
      >
        <WalkThumb
          class="carousel__media"
          :src="i <= index + 2 ? photo.url : ''"
          :alt="photo.caption || `${title} photo ${i + 1}`"
          :width="photo.width || 960"
          :height="photo.height || 640"
        />
      </div>
    </div>

    <div v-if="current?.caption || slides.length > 1" class="carousel__bar">
      <Transition name="caption" mode="out-in">
        <p :key="index" class="carousel__caption type-body-medium">{{ current?.caption }}</p>
      </Transition>
      <template v-if="slides.length > 1">
        <span class="carousel__count type-label-medium" aria-hidden="true">{{ index + 1 }}/{{ slides.length }}</span>
        <div class="carousel__nav" role="group" aria-label="Photo navigation">
          <M3IconButton variant="tonal" size="sm" icon="material-symbols:chevron-left-rounded" label="Previous photo" :disabled="index === 0" @click="go(index - 1)" />
          <M3IconButton variant="tonal" size="sm" icon="material-symbols:chevron-right-rounded" label="Next photo" :disabled="index === slides.length - 1" @click="go(index + 1)" />
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import M3IconButton from '../m3/M3IconButton.vue';
import WalkThumb from '../explore/WalkThumb.vue';

const props = defineProps({
  photos: { type: Array, default: () => [] },
  fallback: { type: Object, default: null },
  title: { type: String, default: 'walk' },
});

const slides = computed(() => (props.photos.length ? props.photos : props.fallback ? [props.fallback] : []));
const current = computed(() => slides.value[index.value]);
const track = ref(null);
const index = ref(0);

watch(slides, () => {
  index.value = 0;
  track.value?.scrollTo({ left: 0 });
});

// Distance between item starts: item width plus the gap.
function stride(el) {
  const first = el.firstElementChild;
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  return first ? first.offsetWidth + gap : el.clientWidth;
}

function onScroll() {
  const el = track.value;
  if (!el) return;
  // Items are narrower than the track, so the last one can only align to the end.
  const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
  index.value = atEnd ? slides.value.length - 1 : Math.round(el.scrollLeft / stride(el));
}

function go(i) {
  const el = track.value;
  if (!el) return;
  const next = Math.max(0, Math.min(slides.value.length - 1, i));
  el.scrollTo({ left: next * stride(el), behavior: 'smooth' });
}
</script>

<style scoped>
.carousel {
  --_peek: 56px;
  --_gap: 8px;
  --_radius: var(--md-sys-shape-corner-extra-large);
}
.carousel__track {
  display: flex;
  gap: var(--_gap);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  border-radius: var(--_radius);
}
.carousel__track::-webkit-scrollbar { display: none; }
.carousel__track:focus-visible { outline: 3px solid var(--md-sys-color-secondary); outline-offset: 2px; }

.carousel__item {
  position: relative;
  flex: 0 0 calc(100% - var(--_peek) - var(--_gap));
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--_radius);
  scroll-snap-align: start;
  background: var(--md-sys-color-surface-container-highest);
  cursor: pointer;
  view-timeline: --carousel-item inline;
}
.carousel__item.is-current { cursor: default; }
.is-single .carousel__item { flex-basis: 100%; }
.carousel__media { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; }

/* Peeking item: its photo is offset and slightly scaled, and settles as it
   scrolls into the hero position (parallax, as in the M3 carousel). */
@supports (animation-timeline: view()) {
  .carousel__media {
    animation: carousel-parallax linear both;
    animation-timeline: --carousel-item;
    animation-range: entry 0% contain 0%;
  }
}
@keyframes carousel-parallax {
  from { transform: translateX(-24%) scale(1.08); }
  to { transform: none; }
}

.carousel__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-inline-start: 4px;
  min-block-size: 40px;
}
.carousel__caption {
  flex: 1;
  min-inline-size: 0;
  margin: 0;
  color: var(--md-sys-color-on-surface);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-wrap: pretty;
}
.carousel__count {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  font-variant-numeric: tabular-nums;
}
/* Connected button group: inner corners tighten, outer stay round. */
.carousel__nav { display: flex; gap: 2px; flex: none; }
.carousel__nav :deep(.m3-icon-btn:first-child) { border-start-end-radius: var(--md-sys-shape-corner-small); border-end-end-radius: var(--md-sys-shape-corner-small); }
.carousel__nav :deep(.m3-icon-btn:last-child) { border-start-start-radius: var(--md-sys-shape-corner-small); border-end-start-radius: var(--md-sys-shape-corner-small); }
.carousel__nav :deep(.m3-icon-btn:active:not(:disabled)) { border-radius: var(--md-sys-shape-corner-small); }

.caption-enter-active {
  transition:
    opacity var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects),
    translate var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
.caption-leave-active { transition: opacity var(--md-sys-motion-spring-fast-effects-duration) var(--md-sys-motion-spring-fast-effects); }
.caption-enter-from { opacity: 0; translate: 0 6px; }
.caption-leave-to { opacity: 0; }
</style>
