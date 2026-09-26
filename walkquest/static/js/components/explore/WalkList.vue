<template>
  <div class="walk-list" :aria-busy="loading ? 'true' : 'false'">
    <div v-if="loading && !walks.length" class="walk-list__skeletons" aria-hidden="true">
      <div v-for="n in 6" :key="n" class="walk-list__skeleton">
        <span class="sk-media" /><span class="sk-lines"><span /><span /><span /></span>
      </div>
    </div>

    <RecycleScroller
      v-else-if="walks.length"
      ref="scroller"
      class="walk-list__scroller"
      :items="walks"
      :item-size="ITEM_SIZE"
      key-field="id"
      :buffer="480"
      role="list"
      aria-label="Walks"
    >
      <template #default="{ item }">
        <div class="walk-list__row" role="listitem">
          <WalkCard
            :walk="item"
            :selected="item.id === selectedId"
            :favorite="walksStore.isFavorite(item.id)"
            :pending="walksStore.isPendingFavorite(item.id)"
            :distance-away="distances.get(item.id) ?? null"
            :highlight="highlight"
            @select="$emit('select', $event)"
            @hover="$emit('hover', $event)"
            @toggle-favorite="walksStore.toggleFavorite($event)"
          />
        </div>
      </template>
      <template #after>
        <slot name="footer" />
      </template>
    </RecycleScroller>

    <div v-else class="walk-list__empty" role="status">
      <slot name="empty" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import WalkCard from './WalkCard.vue';
import { useWalksStore } from '../../stores/walks';

/** Card (112px) + gap (8px). Fixed heights make scrolling O(1) with no measuring. */
const ITEM_SIZE = 120;

const props = defineProps({
  walks: { type: Array, required: true },
  selectedId: { type: String, default: null },
  distances: { type: Map, default: () => new Map() },
  highlight: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});
defineEmits(['select', 'hover']);

const walksStore = useWalksStore();
const scroller = ref(null);

/** Brings the selected walk into view (e.g. after a pin is clicked on the map). */
function scrollToWalk(id) {
  const index = props.walks.findIndex((walk) => walk.id === id);
  const el = scroller.value?.$el;
  if (index < 0 || !el) return;
  const top = index * ITEM_SIZE;
  if (top < el.scrollTop || top + ITEM_SIZE > el.scrollTop + el.clientHeight) {
    el.scrollTo({ top: Math.max(0, top - el.clientHeight / 3), behavior: 'smooth' });
  }
}

// New results start from the top.
watch(() => props.walks, async (next, prev) => {
  if (next === prev) return;
  await nextTick();
  // The scroller unmounts when results become empty.
  const el = scroller.value?.$el;
  if (el) el.scrollTop = 0;
});

defineExpose({ scrollToWalk });
</script>

<style scoped>
.walk-list { position: relative; flex: 1; min-block-size: 0; display: flex; flex-direction: column; }
.walk-list__scroller { flex: 1; min-block-size: 0; padding-block-end: 16px; }
.walk-list__row { padding: 0 12px 8px; block-size: 120px; box-sizing: border-box; }
.walk-list__empty { flex: 1; display: grid; place-items: center; padding: 32px 24px; text-align: center; }
.walk-list__skeletons { padding: 0 12px; display: grid; gap: 8px; }
.walk-list__skeleton {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 12px;
  block-size: 112px;
  padding: 8px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container-low);
}
.sk-media, .sk-lines span {
  border-radius: var(--md-sys-shape-corner-medium);
  background: linear-gradient(90deg, var(--md-sys-color-surface-container-high) 0%, var(--md-sys-color-surface-container-highest) 50%, var(--md-sys-color-surface-container-high) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
.sk-lines { display: grid; align-content: start; gap: 10px; padding-top: 6px; }
.sk-lines span { block-size: 14px; }
.sk-lines span:nth-child(1) { inline-size: 80%; block-size: 18px; }
.sk-lines span:nth-child(2) { inline-size: 55%; }
.sk-lines span:nth-child(3) { inline-size: 40%; }
@keyframes shimmer { to { background-position: -200% 0; } }
</style>
