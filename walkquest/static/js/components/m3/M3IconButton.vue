<template>
  <button
    type="button"
    class="m3-icon-btn state-layer shape-morph"
    :class="[`is-${variant}`, `size-${size}`, { 'is-selected': selected, 'is-toggle': toggle }]"
    :aria-label="label"
    :title="tooltip ? label : undefined"
    :aria-pressed="toggle ? String(selected) : undefined"
    :disabled="disabled"
  >
    <Icon :icon="selected && selectedIcon ? selectedIcon : icon" class="m3-icon-btn__icon" aria-hidden="true" />
    <slot />
  </button>
</template>

<script setup>
import { Icon } from '@iconify/vue';

defineProps({
  icon: { type: String, required: true },
  selectedIcon: { type: String, default: '' },
  label: { type: String, required: true },
  /** standard | filled | tonal | outlined */
  variant: { type: String, default: 'standard' },
  /** xs | sm | md | lg */
  size: { type: String, default: 'sm' },
  toggle: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  tooltip: { type: Boolean, default: true },
});
</script>

<style scoped>
.m3-icon-btn {
  --_size: 40px;
  --_icon: 24px;
  --_radius: var(--md-sys-shape-corner-full);
  --_pressed-radius: var(--md-sys-shape-corner-small);
  display: inline-grid;
  place-items: center;
  flex: none;
  inline-size: var(--_size);
  block-size: var(--_size);
  border: 0;
  border-radius: var(--_radius);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m3-icon-btn__icon { width: var(--_icon); height: var(--_icon); }
.size-xs { --_size: 32px; --_icon: 20px; }
.size-sm { --_size: 40px; --_icon: 24px; }
.size-md { --_size: 56px; --_icon: 24px; --_pressed-radius: var(--md-sys-shape-corner-medium); }
.size-lg { --_size: 96px; --_icon: 32px; --_pressed-radius: var(--md-sys-shape-corner-large); }

/* Expressive: corners tighten on press, toggles become square when selected. */
.m3-icon-btn:active:not(:disabled) { border-radius: var(--_pressed-radius); }
.is-toggle.is-selected { --_radius: var(--md-sys-shape-corner-medium); }

.is-filled { background: var(--md-sys-color-surface-container-highest); color: var(--md-sys-color-primary); }
.is-filled.is-selected,
.is-filled:not(.is-toggle) { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
.is-tonal { background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); }
.is-tonal.is-toggle:not(.is-selected) { background: var(--md-sys-color-surface-container-highest); color: var(--md-sys-color-on-surface-variant); }
.is-outlined { box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant); }
.is-outlined.is-selected { box-shadow: none; background: var(--md-sys-color-inverse-surface); color: var(--md-sys-color-inverse-on-surface); }
.is-standard.is-selected { color: var(--md-sys-color-primary); }

.m3-icon-btn:disabled { opacity: 0.38; cursor: default; }
</style>
