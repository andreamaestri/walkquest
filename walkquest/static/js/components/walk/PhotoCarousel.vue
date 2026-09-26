<template>
  <section class="carousel" :aria-label="`Photos of ${title}`" aria-roledescription="carousel">
    <div ref="track" class="carousel__track" tabindex="0" @scroll.passive="onScroll" @keydown.left.prevent="go(index - 1)" @keydown.right.prevent="go(index + 1)">
      <figure
        v-for="(photo, i) in slides"
        :key="photo.url"
        class="carousel__slide"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} of ${slides.length}`"
      >
        <WalkThumb
          class="carousel__media"
          :src="i <= index + 1 ? photo.url : ''"
          :alt="photo.caption || `${title} photo ${i + 1}`"
          :width="photo.width || 960"
          :height="photo.height || 640"
        />
        <figcaption v-if="photo.caption" class="carousel__caption type-body-medium">{{ photo.caption }}</figcaption>
      </figure>
    </div>

    <template v-if="slides.length > 1">
      <M3IconButton class="carousel__nav is-prev" variant="tonal" size="sm" icon="material-symbols:chevron-left-rounded" label="Previous photo" :disabled="index === 0" @click="go(index - 1)" />
      <M3IconButton class="carousel__nav is-next" variant="tonal" size="sm" icon="material-symbols:chevron-right-rounded" label="Next photo" :disabled="index === slides.length - 1" @click="go(index + 1)" />
      <div class="carousel__dots" aria-hidden="true">
        <span v-for="(photo, i) in slides" :key="photo.url" :class="{ 'is-active': i === index }" />
      </div>
      <span class="carousel__count type-label-medium">{{ index + 1 }} / {{ slides.length }}</span>
    </template>
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
const track = ref(null);
const index = ref(0);

watch(slides, () => {
  index.value = 0;
  track.value?.scrollTo({ left: 0 });
});

function onScroll() {
  const el = track.value;
  if (!el) return;
  index.value = Math.round(el.scrollLeft / el.clientWidth);
}

function go(i) {
  const el = track.value;
  if (!el) return;
  const next = Math.max(0, Math.min(slides.value.length - 1, i));
  el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
}
</script>

<style scoped>
.carousel { position: relative; }
.carousel__track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  border-radius: var(--md-sys-shape-corner-extra-large);
  outline-offset: 2px;
}
.carousel__track::-webkit-scrollbar { display: none; }
.carousel__slide { position: relative; flex: 0 0 100%; margin: 0; scroll-snap-align: start; }
.carousel__media { inline-size: 100%; aspect-ratio: 3 / 2; }
.carousel__caption {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  margin: 0;
  padding: 40px 16px 32px;
  color: #fff;
  background: linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0));
  text-wrap: pretty;
}
.carousel__nav { position: absolute; top: calc(50% - 20px); opacity: 0.92; }
.carousel__nav.is-prev { left: 8px; }
.carousel__nav.is-next { right: 8px; }
.carousel__nav:disabled { opacity: 0; pointer-events: none; }
.carousel__dots {
  position: absolute;
  bottom: 12px;
  inset-inline: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
}
.carousel__dots span {
  inline-size: 6px;
  block-size: 6px;
  border-radius: 3px;
  background: rgb(255 255 255 / 0.55);
  transition: inline-size var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
.carousel__dots span.is-active { inline-size: 18px; background: #fff; }
.carousel__count {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 2px 10px;
  border-radius: var(--md-sys-shape-corner-full);
  background: rgb(0 0 0 / 0.5);
  color: #fff;
}
</style>
