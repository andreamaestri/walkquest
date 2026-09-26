<template>
  <M3IconButton
    :icon="icons[mode]"
    :label="`Theme: ${labels[mode]} (click to change)`"
    :variant="variant"
    :size="size"
    @click="cycleMode"
  />
</template>

<script setup>
import M3IconButton from '../m3/M3IconButton.vue';
import { useTheme } from '../../composables/useTheme';

defineProps({
  variant: { type: String, default: 'standard' },
  size: { type: String, default: 'sm' },
});

const { mode, cycleMode } = useTheme();
const icons = {
  light: 'material-symbols:light-mode-outline-rounded',
  dark: 'material-symbols:dark-mode-outline-rounded',
  system: 'material-symbols:brightness-auto-outline-rounded',
};
const labels = { light: 'Light', dark: 'Dark', system: 'System' };
</script>
