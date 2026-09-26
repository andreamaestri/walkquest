<template>
  <div class="chips" role="toolbar" aria-label="Filters">
    <M3Chip
      :selected="search.mode === 'nearby'"
      :icon="search.locating ? 'material-symbols:progress-activity' : 'material-symbols:near-me-outline-rounded'"
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
      <template #trigger="{ toggle }">
        <M3Chip :filter="false" trailing-icon="material-symbols:arrow-drop-down-rounded" @click="toggle">
          Within {{ search.radiusMiles }} mi
        </M3Chip>
      </template>
    </M3Menu>
    <M3Chip :selected="search.mode === 'saved'" icon="material-symbols:bookmark-outline-rounded" @click="toggleSaved">
      Saved
    </M3Chip>
    <M3Menu :items="difficultyItems" :model-value="difficultyValue" align="start" @update:model-value="setDifficulty">
      <template #trigger="{ toggle }">
        <M3Chip
          :selected="search.difficulties.length > 0"
          :filter="false"
          icon="material-symbols:landscape-2-outline-rounded"
          trailing-icon="material-symbols:arrow-drop-down-rounded"
          @click="toggle"
        >
          {{ difficultyLabel }}
        </M3Chip>
      </template>
    </M3Menu>
    <span class="chips__divider" aria-hidden="true" />
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
</template>

<script setup>
import { computed } from 'vue';
import M3Chip from '../m3/M3Chip.vue';
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
</script>

<style scoped>
.chips {
  display: flex;
  gap: 8px;
  padding: 4px 16px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-padding-inline: 16px;
}
.chips::-webkit-scrollbar { display: none; }
.chips__divider { flex: none; inline-size: 1px; margin-block: 4px; background: var(--md-sys-color-outline-variant); }
</style>
