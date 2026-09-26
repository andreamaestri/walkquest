<template>
  <article
    class="walk-card state-layer shape-morph"
    :class="{ 'is-selected': selected, 'is-dimmed': dimmed }"
    tabindex="0"
    role="button"
    :aria-label="`${walk.walk_name}, ${formatMiles(walk.distance)}, ${walk.difficulty?.short}`"
    :aria-current="selected ? 'true' : undefined"
    @click="$emit('select', walk)"
    @keydown.enter.prevent="$emit('select', walk)"
    @keydown.space.prevent="$emit('select', walk)"
    @pointerenter="$emit('hover', walk)"
    @pointerleave="$emit('hover', null)"
    @focus="$emit('hover', walk)"
    @blur="$emit('hover', null)"
  >
    <WalkThumb
      class="walk-card__media shape-morph"
      :src="walk.thumb?.url"
      :alt="''"
      :width="96"
      :height="96"
    />
    <div class="walk-card__body">
      <h3 class="walk-card__title type-title-medium-emphasized">{{ walk.walk_name }}</h3>
      <p class="walk-card__meta type-body-medium">
        <span class="walk-card__stat">
          <Icon icon="material-symbols:straighten-rounded" aria-hidden="true" />
          {{ formatMiles(walk.distance) }}
        </span>
        <DifficultyMeter :difficulty="walk.difficulty" />
        <span v-if="distanceAway != null" class="walk-card__stat walk-card__away">
          <Icon icon="material-symbols:near-me-rounded" aria-hidden="true" />
          {{ formatMiles(distanceAway) }} away
        </span>
      </p>
      <p v-if="tags.length" class="walk-card__tags type-label-medium">
        <span v-for="tag in tags" :key="tag.slug" class="walk-card__tag">
          <Icon :icon="tag.icon" aria-hidden="true" /><span class="walk-card__tag-text">{{ tag.label }}</span>
        </span>
      </p>
    </div>
    <M3IconButton
      class="walk-card__fav"
      toggle
      size="sm"
      :selected="favorite"
      :disabled="pending"
      icon="material-symbols:bookmark-outline-rounded"
      selected-icon="material-symbols:bookmark-rounded"
      :label="favorite ? `Remove ${walk.walk_name} from saved` : `Save ${walk.walk_name}`"
      :tooltip="false"
      @click.stop="$emit('toggle-favorite', walk)"
      @keydown.enter.stop
      @keydown.space.stop
    />
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import M3IconButton from '../m3/M3IconButton.vue';
import DifficultyMeter from './DifficultyMeter.vue';
import WalkThumb from './WalkThumb.vue';
import { categoryIcon, categoryLabel, formatMiles } from '../../utils/walks';

const props = defineProps({
  walk: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  pending: { type: Boolean, default: false },
  dimmed: { type: Boolean, default: false },
  distanceAway: { type: Number, default: null },
  /** Category slugs to show first (e.g. the active filters). */
  highlight: { type: Array, default: () => [] },
});
defineEmits(['select', 'hover', 'toggle-favorite']);

const tags = computed(() => {
  const slugs = props.walk.categories || [];
  const ordered = [...slugs.filter((s) => props.highlight.includes(s)), ...slugs.filter((s) => !props.highlight.includes(s))];
  return ordered
    .filter((slug) => slug !== 'circular-walks' || props.highlight.includes(slug))
    .slice(0, 2)
    .map((slug) => ({ slug, label: categoryLabel(slug), icon: categoryIcon(slug) }));
});
</script>

<style scoped>
.walk-card {
  --_radius: var(--md-sys-shape-corner-large);
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  block-size: 112px;
  padding: 8px 4px 8px 8px;
  border-radius: var(--_radius);
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  outline-offset: -2px;
  contain: layout paint;
}
.walk-card__media {
  inline-size: 96px;
  block-size: 96px;
  border-radius: var(--md-sys-shape-corner-medium);
}
.walk-card__body { min-inline-size: 0; padding-block: 4px; }
.walk-card__title {
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--md-sys-color-on-surface);
}
.walk-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin: 0 0 6px;
  color: var(--md-sys-color-on-surface-variant);
}
.walk-card__stat { display: inline-flex; align-items: center; gap: 4px; }
.walk-card__stat svg { font-size: 16px; }
.walk-card__away { color: var(--md-sys-color-primary); font-weight: 600; }
.walk-card__tags { display: flex; gap: 6px; margin: 0; overflow: hidden; color: var(--md-sys-color-on-surface-variant); }
.walk-card__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 6px;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container-high);
  white-space: nowrap;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.walk-card__tag-text { overflow: hidden; text-overflow: ellipsis; }
.walk-card__tag:last-child { flex-shrink: 1; }
.walk-card__tag:first-child { flex-shrink: 0; max-inline-size: 60%; }
.walk-card__tag svg { flex: none; font-size: 14px; color: var(--md-sys-color-primary); }
.walk-card__fav { margin-top: -2px; }

/* Expressive selection: corners and colour morph with a spring. */
.walk-card.is-selected {
  --_radius: var(--md-sys-shape-corner-extra-large);
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
.walk-card.is-selected .walk-card__media { border-radius: var(--md-sys-shape-corner-extra-large); }
.walk-card:active { transform: scale(0.985); }
.walk-card.is-dimmed { opacity: 0.55; }
</style>
