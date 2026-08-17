<template>
  <button
    type="button"
    class="m3-icon-button m3-interactive theme-toggle"
    :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    :aria-pressed="isDark"
    @click="toggleTheme"
  >
    <Icon :icon="isDark ? 'mdi:white-balance-sunny' : 'mdi:weather-night'" aria-hidden="true" />
    <span class="sr-only">{{ isDark ? 'Light theme' : 'Dark theme' }}</span>
  </button>
</template>

<script setup>
import { Icon } from '@iconify/vue';
import { useTheme } from '../../composables/useTheme';

const { isDark, toggleTheme } = useTheme();
</script>

<style scoped>
.theme-toggle {
  display: grid;
  place-items: center;
  font-size: 22px;
}
</style>
