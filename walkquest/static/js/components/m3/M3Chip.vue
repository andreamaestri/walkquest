<template>
  <button
    type="button"
    class="m3-chip state-layer shape-morph"
    :class="{ 'is-selected': selected, 'is-elevated': elevated }"
    :aria-pressed="filter ? String(selected) : undefined"
  >
    <span v-if="filter && selected" class="m3-chip__lead" aria-hidden="true">
      <Icon icon="material-symbols:check-rounded" />
    </span>
    <span v-else-if="icon" class="m3-chip__lead" aria-hidden="true"><Icon :icon="icon" /></span>
    <span class="m3-chip__label"><slot /></span>
    <span v-if="trailingIcon" class="m3-chip__trail" aria-hidden="true"><Icon :icon="trailingIcon" /></span>
  </button>
</template>

<script setup>
import { Icon } from '@iconify/vue';

defineProps({
  selected: { type: Boolean, default: false },
  /** Filter chips toggle and show a check mark when selected. */
  filter: { type: Boolean, default: true },
  icon: { type: String, default: '' },
  trailingIcon: { type: String, default: '' },
  elevated: { type: Boolean, default: false },
});
</script>

<style scoped>
.m3-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
  block-size: 32px;
  padding-inline: 12px 16px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface-variant);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
  font: inherit;
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: 500;
  letter-spacing: 0.1px;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m3-chip:active { border-radius: var(--md-sys-shape-corner-medium); }
.m3-chip.is-elevated { box-shadow: var(--md-sys-elevation-1); background: var(--md-sys-color-surface-container-low); }
.m3-chip.is-selected {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  box-shadow: none;
  border-radius: var(--md-sys-shape-corner-large);
}
.m3-chip__lead, .m3-chip__trail { display: inline-grid; place-items: center; font-size: 18px; margin-inline-start: -4px; }
.m3-chip__trail { margin-inline: 0 -8px; }
.m3-chip:not(.is-selected) .m3-chip__lead { color: var(--md-sys-color-primary); }
</style>
