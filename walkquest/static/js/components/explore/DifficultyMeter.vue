<template>
  <span class="difficulty" :title="difficulty?.label" :aria-label="`Difficulty: ${difficulty?.short} (${difficulty?.label})`">
    <span class="difficulty__bars" aria-hidden="true">
      <span v-for="n in 5" :key="n" :class="{ 'is-on': n <= (difficulty?.level || 1) }" />
    </span>
    <span v-if="showLabel" class="difficulty__label">{{ difficulty?.short }}</span>
  </span>
</template>

<script setup>
defineProps({
  difficulty: { type: Object, default: null },
  showLabel: { type: Boolean, default: true },
});
</script>

<style scoped>
.difficulty { display: inline-flex; align-items: center; gap: 6px; }
.difficulty__bars { display: inline-flex; align-items: flex-end; gap: 2px; block-size: 12px; }
.difficulty__bars span {
  inline-size: 4px;
  border-radius: 2px;
  background: var(--md-sys-color-outline-variant);
}
.difficulty__bars span:nth-child(1) { block-size: 5px; }
.difficulty__bars span:nth-child(2) { block-size: 7px; }
.difficulty__bars span:nth-child(3) { block-size: 9px; }
.difficulty__bars span:nth-child(4) { block-size: 11px; }
.difficulty__bars span:nth-child(5) { block-size: 13px; }
.difficulty__bars span.is-on { background: var(--md-sys-color-tertiary); }
</style>
