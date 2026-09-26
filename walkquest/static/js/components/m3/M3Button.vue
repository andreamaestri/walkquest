<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :type="href ? undefined : type"
    class="m3-btn state-layer shape-morph"
    :class="[`is-${variant}`, `size-${size}`, `shape-${shape}`, { 'has-icon': icon }]"
    :disabled="href ? undefined : disabled"
  >
    <Icon v-if="icon" :icon="icon" class="m3-btn__icon" aria-hidden="true" />
    <span class="m3-btn__label"><slot /></span>
  </component>
</template>

<script setup>
import { Icon } from '@iconify/vue';

defineProps({
  /** filled | tonal | outlined | text | elevated */
  variant: { type: String, default: 'filled' },
  /** xs | sm | md | lg */
  size: { type: String, default: 'sm' },
  /** round | square */
  shape: { type: String, default: 'round' },
  icon: { type: String, default: '' },
  href: { type: String, default: '' },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
});
</script>

<style scoped>
.m3-btn {
  --_height: 40px;
  --_pad: 16px;
  --_gap: 8px;
  --_icon: 20px;
  --_radius: var(--md-sys-shape-corner-full);
  --_pressed-radius: var(--md-sys-shape-corner-small);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--_gap);
  min-block-size: var(--_height);
  padding-inline: var(--_pad);
  border: 0;
  border-radius: var(--_radius);
  font: inherit;
  font-size: var(--md-sys-typescale-label-large-size);
  line-height: var(--md-sys-typescale-label-large-line-height);
  font-weight: 600;
  letter-spacing: 0.1px;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m3-btn__icon { width: var(--_icon); height: var(--_icon); flex: none; }
.size-xs { --_height: 32px; --_pad: 12px; --_gap: 4px; }
.size-sm { --_height: 40px; --_pad: 16px; }
.size-md { --_height: 56px; --_pad: 24px; --_icon: 24px; --_pressed-radius: var(--md-sys-shape-corner-medium); font-size: var(--md-sys-typescale-title-medium-size); }
.size-lg { --_height: 96px; --_pad: 48px; --_icon: 32px; --_gap: 12px; --_pressed-radius: var(--md-sys-shape-corner-large); font-size: var(--md-sys-typescale-headline-small-size); }
.shape-square { --_radius: var(--md-sys-shape-corner-medium); }
.size-md.shape-square { --_radius: var(--md-sys-shape-corner-large); }
.size-lg.shape-square { --_radius: var(--md-sys-shape-corner-extra-large); }
.m3-btn:active:not(:disabled) { border-radius: var(--_pressed-radius); }

.is-filled { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
.is-tonal { background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); }
.is-outlined { background: transparent; color: var(--md-sys-color-on-surface-variant); box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant); }
.is-text { background: transparent; color: var(--md-sys-color-primary); --_pad: 12px; }
.is-elevated { background: var(--md-sys-color-surface-container-low); color: var(--md-sys-color-primary); box-shadow: var(--md-sys-elevation-1); }
.is-filled:hover, .is-tonal:hover { box-shadow: var(--md-sys-elevation-1); }
.m3-btn:disabled { opacity: 0.38; cursor: default; box-shadow: none; }
</style>
