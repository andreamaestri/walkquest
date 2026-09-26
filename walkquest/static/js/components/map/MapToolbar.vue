<template>
  <div class="map-toolbar" role="toolbar" aria-label="Map controls" aria-orientation="vertical">
    <M3IconButton icon="material-symbols:add-rounded" label="Zoom in" @click="$emit('zoom-in')" />
    <M3IconButton icon="material-symbols:remove-rounded" label="Zoom out" @click="$emit('zoom-out')" />
    <M3IconButton
      icon="material-symbols:navigation-outline-rounded"
      label="Reset north"
      :style="{ transform: `rotate(${-bearing}deg)` }"
      @click="$emit('reset-north')"
    />
    <span class="map-toolbar__divider" aria-hidden="true" />
    <M3IconButton
      :icon="locating ? 'material-symbols:progress-activity' : 'material-symbols:my-location-outline-rounded'"
      :class="{ 'is-spinning': locating }"
      label="Show my location"
      variant="tonal"
      @click="$emit('locate')"
    />
  </div>
</template>

<script setup>
import M3IconButton from '../m3/M3IconButton.vue';

defineProps({
  locating: { type: Boolean, default: false },
  bearing: { type: Number, default: 0 },
});
defineEmits(['zoom-in', 'zoom-out', 'reset-north', 'locate']);
</script>

<style scoped>
.map-toolbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
  box-shadow: var(--md-sys-elevation-3);
}
.map-toolbar__divider { inline-size: 24px; block-size: 1px; margin-block: 2px; background: var(--md-sys-color-outline-variant); }
.is-spinning :deep(svg) { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(1turn); } }
</style>
