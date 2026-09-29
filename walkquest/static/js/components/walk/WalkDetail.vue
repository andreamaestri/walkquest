<template>
  <article class="detail" :aria-label="walk.walk_name">
    <header class="detail__top">
      <M3IconButton icon="material-symbols:arrow-back-rounded" label="Back to walks" @click="$emit('close')" />
      <span class="detail__top-title type-title-medium" :class="{ 'is-visible': compactTitle }">{{ walk.walk_name }}</span>
      <M3IconButton icon="material-symbols:my-location-rounded" label="Show route on map" @click="$emit('recenter')" />
    </header>

    <div ref="scrollEl" class="detail__scroll" @scroll.passive="onScroll">
      <PhotoCarousel
        class="detail__carousel"
        :photos="detail?.photos || []"
        :fallback="walk.thumb ? { url: walk.thumb.url, width: walk.thumb.width, height: walk.thumb.height } : null"
        :title="walk.walk_name"
      />
      <p v-if="detail?.photos?.length" class="detail__credit type-body-small">
        Photos © {{ detail.photo_credit || 'iWalk Cornwall' }}
        <template v-if="detail.photo_source_url">
          ·
          <a :href="detail.photo_source_url" target="_blank" rel="noopener">View the original walk</a>
        </template>
      </p>

      <h1 class="detail__title type-headline-small-emphasized">{{ walk.walk_name }}</h1>

      <div class="detail__stats">
        <div class="stat">
          <Icon icon="material-symbols:straighten-rounded" class="stat__icon" aria-hidden="true" />
          <span class="stat__value type-title-large-emphasized">{{ formatMiles(walk.distance) }}</span>
          <span class="stat__label type-label-medium">Distance</span>
        </div>
        <div class="stat">
          <Icon icon="material-symbols:schedule-outline-rounded" class="stat__icon" aria-hidden="true" />
          <span class="stat__value type-title-large-emphasized">{{ formatDuration(minutes) }}</span>
          <span class="stat__label type-label-medium">Est. time</span>
        </div>
        <div class="stat">
          <DifficultyMeter class="stat__icon" :difficulty="walk.difficulty" :show-label="false" />
          <span class="stat__value type-title-medium-emphasized">{{ walk.difficulty?.short }}</span>
          <span class="stat__label type-label-medium">{{ walk.difficulty?.label }}</span>
        </div>
      </div>

      <div class="detail__actions">
        <M3Button variant="filled" size="md" icon="material-symbols:edit-note-rounded" class="detail__primary" @click="$emit('log-adventure', detail || walk)">
          {{ logged ? 'Log again' : 'Log adventure' }}
        </M3Button>
        <div class="detail__group" role="group" aria-label="Walk actions">
          <M3IconButton
            toggle
            variant="tonal"
            size="md"
            :selected="favorite"
            :disabled="pending"
            icon="material-symbols:bookmark-outline-rounded"
            selected-icon="material-symbols:bookmark-rounded"
            :label="favorite ? 'Remove from saved' : 'Save walk'"
            @click="$emit('favorite', walk)"
          />
          <M3IconButton variant="tonal" size="md" icon="material-symbols:directions-rounded" label="Directions to the start" @click="$emit('directions', walk)" />
          <M3IconButton variant="tonal" size="md" icon="material-symbols:share-outline" label="Share walk" @click="share" />
        </div>
      </div>

      <p v-if="logged" class="detail__logged type-body-medium">
        <Icon icon="material-symbols:check-circle-rounded" aria-hidden="true" />
        <span>You walked this on {{ formatDay(logged.start_date) }}.</span>
        <RouterLink :to="{ name: 'adventures' }">My adventures</RouterLink>
      </p>

      <section class="card">
        <h2 class="card__title type-title-medium-emphasized">Highlights</h2>
        <ul v-if="highlights.length > 1" class="card__bullets type-body-large">
          <li v-for="item in highlights" :key="item">{{ item }}</li>
        </ul>
        <p v-else class="type-body-large card__text">{{ highlights[0] || walk.excerpt }}</p>
      </section>

      <section v-if="walk.points_of_interest?.length" class="card">
        <h2 class="card__title type-title-medium-emphasized">Along the way</h2>
        <div class="chip-cloud">
          <span v-for="poi in walk.points_of_interest" :key="poi" class="chip-static type-label-large">
            <Icon icon="material-symbols:location-on-outline-rounded" aria-hidden="true" />{{ poi }}
          </span>
        </div>
      </section>

      <section v-if="walk.categories?.length" class="card">
        <h2 class="card__title type-title-medium-emphasized">Good for</h2>
        <div class="chip-cloud">
          <M3Chip
            v-for="slug in walk.categories"
            :key="slug"
            :filter="false"
            :icon="categoryIcon(slug)"
            @click="$emit('category', slug)"
          >
            {{ categoryLabel(slug, categoryNames) }}
          </M3Chip>
        </div>
      </section>

      <template v-if="detail">
        <section v-if="detail.pubs_list?.length" class="card">
          <h2 class="card__title type-title-medium-emphasized">Pubs on the route</h2>
          <a
            v-for="pub in detail.pubs_list"
            :key="pub.name"
            class="list-row state-layer"
            :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pub.name} Cornwall`)}`"
            target="_blank"
            rel="noopener"
          >
            <span class="list-row__icon"><Icon icon="material-symbols:sports-bar-rounded" aria-hidden="true" /></span>
            <span class="type-body-large">{{ pub.name }}</span>
            <Icon icon="material-symbols:open-in-new-rounded" class="list-row__trail" aria-hidden="true" />
          </a>
        </section>

        <section v-if="bus || train" class="card">
          <h2 class="card__title type-title-medium-emphasized">Getting there</h2>
          <div v-if="bus" class="transit" :class="{ 'transit--muted': !bus.reachable }">
            <span class="list-row__icon">
              <Icon
                :icon="bus.stops.length ? 'material-symbols:directions-bus-outline-rounded' : 'material-symbols:no-transfer-outline-rounded'"
                aria-hidden="true"
              />
            </span>
            <div class="transit__body">
              <p class="type-title-medium transit__headline">{{ bus.headline }}</p>
              <div v-for="stop in bus.stops" :key="stop.role" class="transit__stop">
                <p class="type-body-medium transit__sub">
                  <template v-if="bus.stops.length > 1">{{ stop.role }}: </template>{{ stop.label }} · {{ stop.distance }}
                </p>
                <p v-for="line in stop.lines" :key="line.line" class="transit__line type-body-medium">
                  <span class="transit__badge type-label-large-emphasized">{{ line.line }}</span>
                  <span class="transit__sub">{{ line.detail }}</span>
                </p>
                <p v-if="stop.more" class="type-body-small transit__sub">
                  +{{ stop.more }} more {{ stop.more === 1 ? 'line' : 'lines' }}
                </p>
              </div>
            </div>
          </div>
          <div v-if="train" class="transit">
            <span class="list-row__icon"><Icon icon="material-symbols:train-outline-rounded" aria-hidden="true" /></span>
            <div class="transit__body">
              <p class="type-title-medium transit__headline">{{ train.headline }}</p>
              <p v-if="train.detail" class="type-body-medium transit__sub">{{ train.detail }}</p>
            </div>
          </div>
          <p class="type-body-small transit__source">
            Timetables from Bus Open Data, NaPTAN and TransportAPI. Check before you travel.
          </p>
        </section>

        <section class="card">
          <h2 class="card__title type-title-medium-emphasized">Good to know</h2>
          <div class="facts">
            <div class="fact">
              <Icon icon="material-symbols:steps-outline-rounded" aria-hidden="true" />
              <span>{{ detail.has_stiles ? 'Has stiles' : 'No stiles' }}</span>
            </div>
            <div v-if="detail.footwear_category" class="fact">
              <Icon icon="material-symbols:hiking-rounded" aria-hidden="true" />
              <span>{{ detail.footwear_category }}</span>
            </div>
            <div v-if="detail.os_explorer_reference" class="fact">
              <Icon icon="material-symbols:map-outline-rounded" aria-hidden="true" />
              <span>OS Explorer {{ detail.os_explorer_reference }}</span>
            </div>
          </div>
          <div v-for="note in considerations" :key="note.text" class="note">
            <p class="note__title type-label-large-emphasized">
              <Icon :icon="note.icon" aria-hidden="true" />{{ note.heading }}
            </p>
            <p class="type-body-medium note__text">{{ note.text }}</p>
          </div>
          <p v-if="detail.recommended_footwear" class="type-body-medium note__text detail__footwear">
            {{ detail.recommended_footwear }}
          </p>
        </section>
      </template>
      <div v-else-if="loadingDetail" class="card detail__loading">
        <M3LoadingIndicator :size="40" />
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import M3Button from '../m3/M3Button.vue';
import M3Chip from '../m3/M3Chip.vue';
import M3IconButton from '../m3/M3IconButton.vue';
import M3LoadingIndicator from '../m3/M3LoadingIndicator.vue';
import DifficultyMeter from '../explore/DifficultyMeter.vue';
import PhotoCarousel from './PhotoCarousel.vue';
import { useToastStore } from '../../stores/toast';
import { formatDay } from '../../utils/adventureLog';
import {
  categoryIcon,
  categoryLabel,
  describeBusAccess,
  describeTrainAccess,
  estimateMinutes,
  formatDuration,
  formatMiles,
} from '../../utils/walks';

const props = defineProps({
  walk: { type: Object, required: true },
  detail: { type: Object, default: null },
  loadingDetail: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  pending: { type: Boolean, default: false },
  categoryNames: { type: Map, default: () => new Map() },
  /** The signed-in user's latest log of this walk, if they have one. */
  logged: { type: Object, default: null },
});
defineEmits(['close', 'favorite', 'directions', 'recenter', 'log-adventure', 'category']);

const scrollEl = ref(null);
const compactTitle = ref(false);
function onScroll() {
  compactTitle.value = (scrollEl.value?.scrollTop || 0) > 280;
}
watch(() => props.walk.id, () => {
  scrollEl.value?.scrollTo({ top: 0 });
  compactTitle.value = false;
});

const minutes = computed(() => estimateMinutes(props.walk.distance, props.walk.difficulty?.level));

const highlights = computed(() => {
  const text = props.detail?.highlights || props.walk.excerpt || '';
  return text
    .split(/;\s*/)
    .map((item) => item.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));
});

const bus = computed(() => describeBusAccess(props.detail));
const train = computed(() => describeTrainAccess(props.detail));

const NOTE_ICONS = {
  Dogs: 'material-symbols:pets-rounded',
  Terrain: 'material-symbols:landscape-rounded',
  Livestock: 'material-symbols:agriculture-rounded',
  Tides: 'material-symbols:waves-rounded',
  Access: 'material-symbols:accessible-rounded',
};

// "DogsDogs are likely…" → heading "Dogs", text "Dogs are likely…"
const considerations = computed(() => {
  const raw = props.detail?.trail_considerations || '';
  if (!raw || /^no trail considerations/i.test(raw)) return [];
  return raw
    .split(/;\s*(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^([A-Z][a-z]+)(?=[A-Z])/);
      const heading = match ? match[1] : 'Note';
      const text = match ? part.slice(match[1].length) : part;
      return { heading, text, icon: NOTE_ICONS[heading] || 'material-symbols:info-outline-rounded' };
    });
});

async function share() {
  const url = `${window.location.origin}/walk/${props.walk.walk_id}`;
  const toast = useToastStore();
  try {
    if (navigator.share) {
      await navigator.share({ title: props.walk.walk_name, text: props.walk.excerpt, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.show('Link copied', 'success', 2500);
    }
  } catch (error) {
    if (error?.name !== 'AbortError') toast.show('Could not share this walk', 'error', 3000);
  }
}
</script>

<style scoped>
.detail { display: flex; flex-direction: column; block-size: 100%; min-block-size: 0; }
.detail__top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 4px;
  flex: none;
}
.detail__top-title {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity var(--md-sys-motion-spring-default-effects-duration) var(--md-sys-motion-spring-default-effects),
    transform var(--md-sys-motion-spring-fast-spatial-duration) var(--md-sys-motion-spring-fast-spatial);
}
.detail__top-title.is-visible { opacity: 1; transform: none; }
.detail__scroll { flex: 1; min-block-size: 0; overflow-y: auto; padding: 0 16px 32px; overscroll-behavior: contain; }
/* M3E: content rises in, staggered, as the view arrives (and as detail data lands). */
.detail__scroll > * {
  animation:
    detail-rise var(--md-sys-motion-spring-slow-spatial-duration) var(--md-sys-motion-spring-slow-spatial) both,
    detail-fade var(--md-sys-motion-spring-slow-effects-duration) var(--md-sys-motion-spring-slow-effects) both;
  animation-delay: calc(var(--_i, 8) * 35ms + 60ms);
}
.detail__scroll > :nth-child(1) { --_i: 0; }
.detail__scroll > :nth-child(2) { --_i: 1; }
.detail__scroll > :nth-child(3) { --_i: 2; }
.detail__scroll > :nth-child(4) { --_i: 3; }
.detail__scroll > :nth-child(5) { --_i: 4; }
.detail__scroll > :nth-child(6) { --_i: 5; }
.detail__scroll > :nth-child(7) { --_i: 6; }
@keyframes detail-rise { from { translate: 0 20px; } }
@keyframes detail-fade { from { opacity: 0; } }
.detail__credit { margin: 8px 4px 0; color: var(--md-sys-color-on-surface-variant); }
.detail__credit a { color: var(--md-sys-color-primary); font-weight: 600; }
.detail__title { margin: 16px 4px 16px; color: var(--md-sys-color-on-surface); text-wrap: balance; }
.detail__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container-high);
}
.stat__icon { font-size: 20px; color: var(--md-sys-color-primary); margin-bottom: 6px; min-block-size: 20px; display: inline-flex; align-items: center; }
.stat__value { color: var(--md-sys-color-on-surface); }
.stat__label { color: var(--md-sys-color-on-surface-variant); }
.detail__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 16px; }
.detail__primary { flex: 1 1 auto; }
.detail__group { display: flex; gap: 4px; }
.detail__logged {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin: -4px 0 16px;
  color: var(--md-sys-color-on-surface-variant);
}
.detail__logged svg { flex: none; inline-size: 20px; block-size: 20px; color: var(--md-sys-color-primary); }
.detail__logged a { color: var(--md-sys-color-primary); font-weight: 600; text-decoration: none; }
.detail__logged a:hover { text-decoration: underline; }
.card {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-extra-large);
  background: var(--md-sys-color-surface-container);
}
.card__title { margin: 0 0 12px; color: var(--md-sys-color-on-surface); }
.card__text { margin: 0; color: var(--md-sys-color-on-surface-variant); }
.card__bullets { margin: 0; padding-inline-start: 20px; list-style: disc; color: var(--md-sys-color-on-surface-variant); display: grid; gap: 8px; }
.card__bullets li::marker { color: var(--md-sys-color-primary); }
.chip-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-static {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 8px;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}
.chip-static svg { color: var(--md-sys-color-primary); font-size: 18px; }
.list-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-block-size: 56px;
  padding: 8px 12px;
  margin-inline: -8px;
  border-radius: var(--md-sys-shape-corner-large);
  color: var(--md-sys-color-on-surface);
  text-decoration: none;
}
.list-row__icon {
  display: grid;
  place-items: center;
  inline-size: 40px;
  block-size: 40px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
  font-size: 20px;
}
.list-row__trail { margin-inline-start: auto; color: var(--md-sys-color-on-surface-variant); }
.facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.fact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-high);
  font-size: var(--md-sys-typescale-body-medium-size);
}
.fact svg { flex: none; font-size: 20px; color: var(--md-sys-color-primary); }
.transit { display: flex; align-items: flex-start; gap: 16px; padding: 8px 0; }
.transit__body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.transit__headline { margin: 0; color: var(--md-sys-color-on-surface); }
.transit__stop { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.transit__sub { margin: 0; color: var(--md-sys-color-on-surface-variant); }
.transit__line { display: flex; align-items: baseline; gap: 8px; margin: 0; }
.transit__badge {
  flex: none;
  min-width: 36px;
  padding: 2px 8px;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  text-align: center;
}
.transit--muted .list-row__icon {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}
.transit__source { margin: 8px 0 0; color: var(--md-sys-color-on-surface-variant); }
.note { margin-top: 12px; }
.note__title { display: flex; align-items: center; gap: 6px; margin: 0 0 4px; color: var(--md-sys-color-on-surface); }
.note__title svg { color: var(--md-sys-color-tertiary); font-size: 18px; }
.note__text { margin: 0; color: var(--md-sys-color-on-surface-variant); }
.detail__footwear { margin-top: 12px; }
.detail__loading { display: grid; place-items: center; min-block-size: 120px; }
</style>
