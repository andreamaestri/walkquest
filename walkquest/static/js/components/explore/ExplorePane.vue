<template>
  <div class="explore">
    <slot name="header" />
    <FilterChips @nearby="$emit('nearby')" />

    <div class="explore__summary">
      <p class="type-label-large explore__count" aria-live="polite">
        <template v-if="walksStore.loading && !walksStore.walks.length">Loading walks…</template>
        <template v-else>
          {{ search.results.length }} {{ search.results.length === 1 ? 'walk' : 'walks' }}
          <span v-if="search.isFiltered" class="explore__of">of {{ walksStore.walks.length }}</span>
        </template>
      </p>
      <M3Button v-if="search.isFiltered" variant="text" size="xs" @click="search.clearFilters()">Clear</M3Button>
      <M3Menu :items="sortItems" :model-value="currentSort" @update:model-value="search.sort = $event">
        <template #trigger="{ open, toggle }">
          <M3Button
            variant="text"
            size="xs"
            icon="material-symbols:sort-rounded"
            aria-haspopup="menu"
            :aria-expanded="String(open)"
            @click="toggle"
          >
            {{ sortLabel }}
          </M3Button>
        </template>
      </M3Menu>
    </div>

    <WalkList
      ref="listRef"
      :walks="search.results"
      :selected-id="selectedId"
      :distances="search.distances"
      :highlight="search.categories"
      :loading="walksStore.loading"
      @select="$emit('select', $event)"
      @hover="$emit('hover', $event)"
    >
      <template #empty>
        <div class="explore__empty">
          <span class="explore__empty-shape" aria-hidden="true">
            <Icon :icon="emptyIcon" />
          </span>
          <p class="type-title-medium">{{ emptyTitle }}</p>
          <p class="type-body-medium explore__empty-body">{{ emptyBody }}</p>
          <M3Button v-if="search.isFiltered" variant="tonal" @click="search.clearFilters()">Clear filters</M3Button>
          <M3Button v-else-if="walksStore.error" variant="tonal" @click="walksStore.loadWalks()">Try again</M3Button>
        </div>
      </template>
      <template #footer>
        <p v-if="hasPhotos && search.results.length" class="explore__credit type-body-small">
          Walk photos © iWalk Cornwall
        </p>
      </template>
    </WalkList>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import FilterChips from './FilterChips.vue';
import WalkList from './WalkList.vue';
import M3Button from '../m3/M3Button.vue';
import M3Menu from '../m3/M3Menu.vue';
import { useSearchStore } from '../../stores/searchStore';
import { useWalksStore } from '../../stores/walks';

defineProps({
  selectedId: { type: String, default: null },
});
defineEmits(['select', 'hover', 'nearby']);

const search = useSearchStore();
const walksStore = useWalksStore();
const listRef = ref(null);
const hasPhotos = computed(() => walksStore.walks.some((walk) => walk.thumb));

const sortItems = computed(() => [
  { value: 'relevance', label: search.origin && search.mode === 'nearby' ? 'Nearest first' : 'Best match', icon: 'material-symbols:auto-awesome-outline-rounded' },
  { value: 'name', label: 'A–Z', icon: 'material-symbols:sort-by-alpha-rounded' },
  { value: 'shortest', label: 'Shortest first', icon: 'material-symbols:straighten-rounded' },
  { value: 'longest', label: 'Longest first', icon: 'material-symbols:route-rounded' },
  ...(search.origin ? [{ value: 'distance', label: 'Closest to location', icon: 'material-symbols:near-me-outline-rounded' }] : []),
]);
const currentSort = computed(() => search.sort);
const sortLabel = computed(() => sortItems.value.find((item) => item.value === search.sort)?.label || 'Sort');

const emptyIcon = computed(() => {
  if (walksStore.error) return 'material-symbols:cloud-off-outline-rounded';
  if (search.mode === 'saved') return 'material-symbols:bookmark-outline-rounded';
  return 'material-symbols:travel-explore-rounded';
});
const emptyTitle = computed(() => {
  if (walksStore.error) return 'Walks couldn’t be loaded';
  if (search.mode === 'saved') return 'No saved walks yet';
  return 'No walks match';
});
const emptyBody = computed(() => {
  if (walksStore.error) return 'Check your connection and try again.';
  if (search.mode === 'saved') return 'Tap the bookmark on any walk to keep it here.';
  if (search.mode === 'nearby') return 'Try a wider radius or fewer filters.';
  return 'Try a different search or fewer filters.';
});

defineExpose({ scrollToWalk: (id) => listRef.value?.scrollToWalk(id) });
</script>

<style scoped>
.explore { display: flex; flex-direction: column; min-block-size: 0; block-size: 100%; }
.explore__summary {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px 8px 20px;
  color: var(--md-sys-color-on-surface-variant);
}
.explore__count { margin: 0 auto 0 0; }
.explore__of { opacity: 0.75; font-weight: 400; }
.explore__empty { display: flex; flex-direction: column; align-items: center; gap: 8px; max-inline-size: 280px; }
.explore__empty p { margin: 0; }
.explore__empty-body { color: var(--md-sys-color-on-surface-variant); margin-bottom: 8px !important; }
.explore__empty-shape {
  display: grid;
  place-items: center;
  inline-size: 88px;
  block-size: 88px;
  margin-bottom: 8px;
  font-size: 40px;
  color: var(--md-sys-color-on-tertiary-container);
  background: var(--md-sys-color-tertiary-container);
  /* M3E "cookie" shape */
  clip-path: path('M44 0C51 0 55 6 61 8C67 10 74 8 79 13C83 18 81 25 84 31C86 37 88 40 88 44C88 51 82 55 80 61C78 67 80 74 75 79C70 83 63 81 57 84C51 86 48 88 44 88C37 88 33 82 27 80C21 78 14 80 9 75C5 70 7 63 4 57C2 51 0 48 0 44C0 37 6 33 8 27C10 21 8 14 13 9C18 5 25 7 31 4C37 2 40 0 44 0Z');
}
.explore__credit { margin: 8px 0 0; padding: 0 20px; color: var(--md-sys-color-on-surface-variant); text-align: center; }
</style>
